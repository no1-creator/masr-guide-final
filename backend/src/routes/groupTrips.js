// Group Trips — tourist-created custom group trips with vehicle-based pricing.
// Phase A (booking/confirm): money is recorded manually by admin from the
// dashboard. Wiring a real payment gateway later needs no schema change.
//
// This module is self-contained: it creates its own tables + default settings
// lazily (idempotent) so it works no matter the import order in server.js.
import { get, all, run, setting } from "../db.js"
import { err, nowISO, round2 } from "../util.js"

// ---------------------------------------------------------------------------
// Schema + default settings (idempotent, safe on a live DB with real data).
// ---------------------------------------------------------------------------
const DEFAULT_TIERS = [
  { name: "ملاكي", min: 1, max: 3 },
  { name: "هاي-إيس", min: 4, max: 7 },
  { name: "باص", min: 8, max: 14 },
]

// ---------------------------------------------------------------------------
// DEMO showcase data (temporary). Seed via POST /api/admin/group-trips/seed-demo
// and remove any time via POST /api/admin/group-trips/clear-demo. All demo rows
// are tagged admin_note='__DEMO__' so they are 100% safe to wipe before go-live.
// ---------------------------------------------------------------------------
const DEMO_NAMES = [
  "Omar", "Sara", "Youssef", "Nour", "Ahmed", "Mariam", "Khaled",
  "Laila", "Hassan", "Dina", "Tarek", "Salma", "Amr", "Yara",
]
const DEMO_TRIPS = [
  { title: "Giza Pyramids & Sphinx Day Tour", places: "Giza Pyramids, The Egyptian Museum, Cairo", plan: "Full-day guided tour of the Pyramids, the Sphinx and the Grand Egyptian Museum, with lunch by the plateau.", price_small: 2400, price_group: 9000, joined: 6, days: 9 },
  { title: "Luxor: Valley of the Kings & Karnak", places: "Luxor, Karnak Temple, Valley of the Kings", plan: "Two days exploring the East & West Banks of Luxor — Karnak, Hatshepsut Temple and the royal tombs.", price_small: 3200, price_group: 12000, joined: 4, days: 12 },
  { title: "Aswan & Abu Simbel Escape", places: "Aswan, Abu Simbel, Philae Temple", plan: "Nubian culture, the High Dam, Philae Temple and an early trip to the great temples of Abu Simbel.", price_small: 3600, price_group: 13500, joined: 7, days: 15 },
  { title: "Hurghada Red Sea Getaway", places: "Hurghada, Red Sea", plan: "Three relaxed days on the Red Sea — a snorkeling boat trip, Orange Bay island and free beach time.", price_small: 3000, price_group: 11000, joined: 5, days: 10 },
  { title: "Sharm El-Sheikh & Ras Mohamed", places: "Sharm El-Sheikh, Ras Mohamed", plan: "Diving and snorkeling in Ras Mohamed National Park plus a desert quad-bike sunset.", price_small: 3400, price_group: 12500, joined: 3, days: 18 },
  { title: "White Desert & Bahariya Camping", places: "White Desert, Bahariya Oasis", plan: "Overnight desert safari — the White Desert chalk formations, the Black Desert and a Bedouin dinner under the stars.", price_small: 2800, price_group: 10500, joined: 8, days: 7 },
  { title: "Siwa Oasis Adventure", places: "Siwa Oasis", plan: "Salt lakes, Cleopatra's spring, the Oracle Temple and dune surfing in the Great Sand Sea.", price_small: 3800, price_group: 14000, joined: 4, days: 20 },
  { title: "Alexandria Mediterranean Day Trip", places: "Alexandria", plan: "The Bibliotheca, Qaitbay Citadel, the Catacombs and a seafood lunch on the Corniche.", price_small: 2200, price_group: 8500, joined: 6, days: 6 },
  { title: "Dahab & the Blue Hole", places: "Dahab, Blue Hole", plan: "Laid-back Dahab — snorkeling the Blue Hole, the Colored Canyon and a Bedouin camp evening.", price_small: 3100, price_group: 11500, joined: 5, days: 14 },
  { title: "Nile Cruise Luxor to Aswan", places: "Nile Cruise, Luxor, Aswan", plan: "Four-night Nile cruise visiting Edfu and Kom Ombo temples between Luxor and Aswan.", price_small: 5200, price_group: 19000, joined: 7, days: 22 },
]

let READY = false
function ensureGt() {
  if (READY) return
  run(`CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT )`)
  run(`CREATE TABLE IF NOT EXISTS group_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER REFERENCES users(id),
    title TEXT,
    itinerary_text TEXT,
    preferred_date TEXT,
    min_people INTEGER,
    max_people INTEGER,
    small_size INTEGER,
    group_size INTEGER,
    price_small REAL,
    price_group REAL,
    vehicle_small TEXT,
    vehicle_group TEXT,
    deadline TEXT,
    share_code TEXT UNIQUE,
    admin_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    confirmed_at TEXT
  )`)
  run(`CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER REFERENCES group_trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    name TEXT,
    seats INTEGER NOT NULL DEFAULT 1,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved',
    referral_code TEXT,
    joined_at TEXT NOT NULL
  )`)
  const defaults = {
    gt_enabled: "1",
    gt_min_people: "10",
    gt_max_people: "14",
    gt_small_size: "2",
    gt_deadline_days: "7",
    gt_refund_hours: "6",
    gt_vehicle_tiers: JSON.stringify(DEFAULT_TIERS),
  }
  for (const [k, v] of Object.entries(defaults))
    run("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)", k, v)
  READY = true
}

function setSetting(k, v) {
  run(
    "INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    k,
    v,
  )
}

function gtSettings() {
  ensureGt()
  let tiers = DEFAULT_TIERS
  const raw = setting("gt_vehicle_tiers", null)
  if (raw) {
    try {
      tiers = JSON.parse(raw)
    } catch {}
  }
  return {
    enabled: setting("gt_enabled", "1") === "1",
    min_people: Number(setting("gt_min_people", "10")),
    max_people: Number(setting("gt_max_people", "14")),
    small_size: Number(setting("gt_small_size", "2")),
    deadline_days: Number(setting("gt_deadline_days", "7")),
    refund_hours: Number(setting("gt_refund_hours", "6")),
    vehicle_tiers: tiers,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function seatsCount(tripId) {
  const r = get(
    "SELECT COALESCE(SUM(seats),0) c FROM group_members WHERE trip_id=? AND status IN ('reserved','paid')",
    tripId,
  )
  return Number(r.c) || 0
}

// Current per-person price given how many seats are filled. Vehicle-based:
// once the group size is reached, the cheaper group price/person applies.
function perPerson(t, count) {
  if (t.price_group != null && t.group_size && count >= t.group_size)
    return round2(t.price_group / t.group_size)
  if (t.price_small != null && t.small_size)
    return round2(t.price_small / t.small_size)
  return null
}

function tripView(t) {
  const count = seatsCount(t.id)
  const gpp =
    t.price_group != null && t.group_size
      ? round2(t.price_group / t.group_size)
      : null
  const spp =
    t.price_small != null && t.small_size
      ? round2(t.price_small / t.small_size)
      : null
  return {
    ...t,
    members_count: count,
    spots_left: t.min_people ? Math.max(0, t.min_people - count) : null,
    seats_to_group: t.group_size ? Math.max(0, t.group_size - count) : null,
    current_per_person: perPerson(t, count),
    small_per_person: spp,
    group_per_person: gpp,
  }
}

function genCode() {
  return "GT-" + Math.floor(1000 + Math.random() * 9000)
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const routes = [
  // --- Settings (public read so the UI knows min people / vehicle tiers) ---
  {
    method: "GET",
    path: "/api/group-trips/settings",
    handler: () => gtSettings(),
  },

  // --- My trips (created + joined) --- must precede /:id ---
  {
    method: "GET",
    path: "/api/group-trips/mine",
    auth: true,
    handler: ({ user }) => {
      ensureGt()
      const created = all(
        "SELECT * FROM group_trips WHERE creator_id=? ORDER BY created_at DESC",
        user.id,
      ).map(tripView)
      const joined = all(
        "SELECT gt.* FROM group_trips gt JOIN group_members gm ON gm.trip_id=gt.id WHERE gm.user_id=? AND gm.status IN ('reserved','paid') ORDER BY gt.created_at DESC",
        user.id,
      ).map(tripView)
      return { created, joined }
    },
  },

  // --- Public list of open trips ---
  {
    method: "GET",
    path: "/api/group-trips",
    handler: ({ query }) => {
      ensureGt()
      const status = query.status || "open"
      const rows = all(
        "SELECT * FROM group_trips WHERE status=? ORDER BY deadline ASC",
        status,
      )
      return { trips: rows.map(tripView) }
    },
  },

  // --- Public trip detail + members ---
  {
    method: "GET",
    path: "/api/group-trips/:id",
    handler: ({ params }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      const members = all(
        "SELECT id,name,seats,status,joined_at FROM group_members WHERE trip_id=? AND status IN ('reserved','paid') ORDER BY joined_at ASC",
        t.id,
      )
      return { trip: tripView(t), members }
    },
  },

  // --- Tourist creates a trip request (awaits admin quote) ---
  {
    method: "POST",
    path: "/api/group-trips/request",
    auth: true,
    handler: ({ user, body }) => {
      const s = gtSettings()
      if (!s.enabled) err(403, "group trips are disabled")
      const itinerary = String(body.itinerary_text || "").trim()
      if (!itinerary) err(400, "itinerary_text is required")
      const title = String(body.title || "").trim() || "رحلة مخصّصة"
      const info = run(
        "INSERT INTO group_trips (creator_id,title,itinerary_text,preferred_date,min_people,max_people,small_size,share_code,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        user.id,
        title,
        itinerary,
        body.preferred_date || null,
        s.min_people,
        s.max_people,
        s.small_size,
        genCode(),
        "pending",
        nowISO(),
      )
      return get(
        "SELECT * FROM group_trips WHERE id=?",
        Number(info.lastInsertRowid),
      )
    },
  },

  // --- Creator accepts the admin quote -> trip goes open for everyone ---
  {
    method: "POST",
    path: "/api/group-trips/:id/accept",
    auth: true,
    handler: ({ user, params }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      if (t.creator_id !== user.id && user.role !== "admin")
        err(403, "not your trip")
      if (t.status !== "quoted") err(400, "trip is not quoted yet")
      const s = gtSettings()
      const deadline =
        t.deadline ||
        new Date(Date.now() + s.deadline_days * 86400000).toISOString()
      run(
        "UPDATE group_trips SET status='open', deadline=? WHERE id=?",
        deadline,
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Anyone (logged-in) joins an open trip ---
  {
    method: "POST",
    path: "/api/group-trips/:id/join",
    auth: true,
    handler: ({ user, params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      if (t.status !== "open") err(400, "trip is not open for joining")
      const seats = Math.max(1, Number(body.seats) || 1)
      const count = seatsCount(t.id)
      if (t.max_people && count + seats > t.max_people)
        err(400, "not enough spots left")
      const existing = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (existing) err(400, "you already joined this trip")
      const pp = perPerson(t, count + seats)
      const amount = pp != null ? round2(pp * seats) : 0
      run(
        "INSERT INTO group_members (trip_id,user_id,name,seats,amount,status,referral_code,joined_at) VALUES (?,?,?,?,?,?,?,?)",
        t.id,
        user.id,
        body.name || user.name || null,
        seats,
        amount,
        "reserved",
        body.referral_code || null,
        nowISO(),
      )
      // Auto-confirm when the minimum is reached.
      const newCount = seatsCount(t.id)
      if (t.min_people && newCount >= t.min_people && t.status === "open")
        run(
          "UPDATE group_trips SET status='confirmed', confirmed_at=? WHERE id=?",
          nowISO(),
          t.id,
        )
      return {
        ok: true,
        trip: tripView(get("SELECT * FROM group_trips WHERE id=?", t.id)),
      }
    },
  },

  // --- Leave / cancel my seat (respects refund window) ---
  {
    method: "POST",
    path: "/api/group-trips/:id/leave",
    auth: true,
    handler: ({ user, params }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      const m = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (!m) err(404, "you are not a member of this trip")
      const s = gtSettings()
      if (t.preferred_date) {
        const cutoff =
          new Date(t.preferred_date).getTime() - s.refund_hours * 3600000
        if (Date.now() > cutoff)
          err(400, "refund window has passed (" + s.refund_hours + "h before trip)")
      }
      run("UPDATE group_members SET status='cancelled' WHERE id=?", m.id)
      return { ok: true }
    },
  },

  // =========================== ADMIN (dashboard) ===========================

  // --- Update feature rules (all configurable from the dashboard) ---
  {
    method: "POST",
    path: "/api/admin/group-trips/settings",
    auth: ["admin"],
    handler: ({ body }) => {
      ensureGt()
      const num = {
        gt_min_people: "min_people",
        gt_max_people: "max_people",
        gt_small_size: "small_size",
        gt_deadline_days: "deadline_days",
        gt_refund_hours: "refund_hours",
      }
      for (const [key, field] of Object.entries(num))
        if (body[field] !== undefined && body[field] !== null)
          setSetting(key, String(Number(body[field])))
      if (body.enabled !== undefined)
        setSetting("gt_enabled", body.enabled ? "1" : "0")
      if (body.vehicle_tiers !== undefined)
        setSetting("gt_vehicle_tiers", JSON.stringify(body.vehicle_tiers))
      return gtSettings()
    },
  },

  // --- List every trip (with optional ?status=) ---
  {
    method: "GET",
    path: "/api/admin/group-trips",
    auth: ["admin"],
    handler: ({ query }) => {
      ensureGt()
      const rows = query.status
        ? all(
            "SELECT * FROM group_trips WHERE status=? ORDER BY created_at DESC",
            query.status,
          )
        : all("SELECT * FROM group_trips ORDER BY created_at DESC")
      return { trips: rows.map(tripView) }
    },
  },

  // --- Admin prices a request (ملاكي price + باص price) -> status 'quoted' ---
  {
    method: "POST",
    path: "/api/admin/group-trips/:id/quote",
    auth: ["admin"],
    handler: ({ params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      const price_small = Number(body.price_small)
      const price_group = Number(body.price_group)
      if (!(price_small > 0) || !(price_group > 0))
        err(400, "price_small and price_group are required and must be > 0")
      const small_size = Number(body.small_size) || t.small_size || 2
      const group_size = Number(body.group_size) || t.min_people || 10
      const min_people = Number(body.min_people) || t.min_people
      const max_people = Number(body.max_people) || t.max_people
      run(
        "UPDATE group_trips SET price_small=?,price_group=?,vehicle_small=?,vehicle_group=?,small_size=?,group_size=?,min_people=?,max_people=?,admin_note=?,status='quoted' WHERE id=?",
        price_small,
        price_group,
        body.vehicle_small || "ملاكي",
        body.vehicle_group || "باص",
        small_size,
        group_size,
        min_people,
        max_people,
        body.admin_note || null,
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Admin changes trip status (open/confirmed/completed/cancelled/expired) ---
  {
    method: "POST",
    path: "/api/admin/group-trips/:id/status",
    auth: ["admin"],
    handler: ({ params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      const status = String(body.status || "")
      const allowed = [
        "pending",
        "quoted",
        "open",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
      ]
      if (!allowed.includes(status)) err(400, "invalid status")
      const confirmed_at =
        status === "confirmed" ? t.confirmed_at || nowISO() : t.confirmed_at
      run(
        "UPDATE group_trips SET status=?, confirmed_at=? WHERE id=?",
        status,
        confirmed_at,
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Admin lists members of a trip ---
  {
    method: "GET",
    path: "/api/admin/group-trips/:id/members",
    auth: ["admin"],
    handler: ({ params }) => {
      ensureGt()
      return {
        members: all(
          "SELECT * FROM group_members WHERE trip_id=? ORDER BY joined_at ASC",
          params.id,
        ),
      }
    },
  },

  // --- Admin records manual payment / refund for a member (Phase A) ---
  {
    method: "POST",
    path: "/api/admin/group-members/:id/pay",
    auth: ["admin"],
    handler: ({ params, body }) => {
      ensureGt()
      const m = get("SELECT * FROM group_members WHERE id=?", params.id)
      if (!m) err(404, "member not found")
      const status =
        body.status === "refunded"
          ? "refunded"
          : body.status === "cancelled"
            ? "cancelled"
            : "paid"
      const amount = body.amount !== undefined ? Number(body.amount) : m.amount
      run(
        "UPDATE group_members SET status=?, amount=? WHERE id=?",
        status,
        amount,
        m.id,
      )
      return get("SELECT * FROM group_members WHERE id=?", m.id)
    },
  },

  // =================== TEMP DEMO SHOWCASE (remove at go-live) ===============

  // --- Seed 10 ready-made OPEN trips so the public strip has content ---
  // Safe to re-run: it wipes previous demo rows first. All rows are tagged
  // admin_note='__DEMO__' and removed by /clear-demo below.
  {
    method: "POST",
    path: "/api/admin/group-trips/seed-demo",
    auth: ["admin"],
    handler: ({ user }) => {
      ensureGt()
      // wipe any previous demo rows first (idempotent)
      for (const o of all(
        "SELECT id FROM group_trips WHERE admin_note=?",
        "__DEMO__",
      )) {
        run("DELETE FROM group_members WHERE trip_id=?", o.id)
        run("DELETE FROM group_trips WHERE id=?", o.id)
      }
      const now = Date.now()
      let created = 0
      DEMO_TRIPS.forEach((d, idx) => {
        const deadline = new Date(now + d.days * 86400000).toISOString()
        const preferred = new Date(now + (d.days + 5) * 86400000)
          .toISOString()
          .slice(0, 10)
        const info = run(
          "INSERT INTO group_trips (creator_id,title,itinerary_text,preferred_date,min_people,max_people,small_size,group_size,price_small,price_group,vehicle_small,vehicle_group,deadline,share_code,admin_note,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          user.id,
          d.title,
          "Places: " + d.places + "\n\n" + d.plan,
          preferred,
          10,
          14,
          2,
          10,
          d.price_small,
          d.price_group,
          "ملاكي",
          "باص",
          deadline,
          "DEMO-" + (1001 + idx),
          "__DEMO__",
          "open",
          nowISO(),
        )
        const tripId = Number(info.lastInsertRowid)
        const amount = round2(d.price_group / 10)
        for (let i = 0; i < d.joined; i++) {
          run(
            "INSERT INTO group_members (trip_id,user_id,name,seats,amount,status,joined_at) VALUES (?,?,?,?,?,?,?)",
            tripId,
            null,
            DEMO_NAMES[(idx + i) % DEMO_NAMES.length],
            1,
            amount,
            "reserved",
            nowISO(),
          )
        }
        created++
      })
      return { ok: true, created }
    },
  },

  // --- Remove ALL demo trips + their demo members in one shot ---
  {
    method: "POST",
    path: "/api/admin/group-trips/clear-demo",
    auth: ["admin"],
    handler: () => {
      ensureGt()
      const rows = all(
        "SELECT id FROM group_trips WHERE admin_note=?",
        "__DEMO__",
      )
      for (const o of rows) {
        run("DELETE FROM group_members WHERE trip_id=?", o.id)
        run("DELETE FROM group_trips WHERE id=?", o.id)
      }
      return { ok: true, removed: rows.length }
    },
  },
]
