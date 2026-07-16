// Group Trips — tourist-created custom group trips with vehicle-based pricing.
// Phase A (booking/confirm): money is recorded manually by admin from the
// dashboard OR by the member's "Pay" action. Wiring a real payment gateway
// later needs no schema change — it plugs into the same /pay step.
//
// v3 adds the full member lifecycle:
//   • creator picks an AVAILABLE DATE RANGE (from -> to)
//   • each joiner picks the scattered days that work for them within the range
//   • joining stays open (reserved, free) until the trip is FULL (max_people)
//   • when the minimum is reached the trip enters 'voting'; members vote
//   • after the vote deadline the winning day is auto-picked -> 'confirmed'
//   • confirming opens a PAYMENT WINDOW (gt_pay_hours); unpaid seats expire and
//     reopen automatically so anyone else can take them
//   • cancelling is free until gt_cancel_hours before the trip day
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
  { title: "Giza Pyramids & Sphinx Day Tour", places: "Giza Pyramids, The Egyptian Museum, Cairo", plan: "Full-day guided tour of the Pyramids, the Sphinx and the Grand Egyptian Museum, with lunch by the plateau.", price_small: 180, price_group: 500, joined: 6, days: 9 },
  { title: "Luxor: Valley of the Kings & Karnak", places: "Luxor, Karnak Temple, Valley of the Kings", plan: "Two days exploring the East & West Banks of Luxor — Karnak, Hatshepsut Temple and the royal tombs.", price_small: 240, price_group: 650, joined: 4, days: 12 },
  { title: "Aswan & Abu Simbel Escape", places: "Aswan, Abu Simbel, Philae Temple", plan: "Nubian culture, the High Dam, Philae Temple and an early trip to the great temples of Abu Simbel.", price_small: 280, price_group: 750, joined: 7, days: 15, voting: true },
  { title: "Hurghada Red Sea Getaway", places: "Hurghada, Red Sea", plan: "Three relaxed days on the Red Sea — a snorkeling boat trip, Orange Bay island and free beach time.", price_small: 220, price_group: 600, joined: 5, days: 10 },
  { title: "Sharm El-Sheikh & Ras Mohamed", places: "Sharm El-Sheikh, Ras Mohamed", plan: "Diving and snorkeling in Ras Mohamed National Park plus a desert quad-bike sunset.", price_small: 260, price_group: 700, joined: 3, days: 18 },
  { title: "White Desert & Bahariya Camping", places: "White Desert, Bahariya Oasis", plan: "Overnight desert safari — the White Desert chalk formations, the Black Desert and a Bedouin dinner under the stars.", price_small: 210, price_group: 580, joined: 8, days: 7, voting: true },
  { title: "Siwa Oasis Adventure", places: "Siwa Oasis", plan: "Salt lakes, Cleopatra's spring, the Oracle Temple and dune surfing in the Great Sand Sea.", price_small: 300, price_group: 800, joined: 4, days: 20 },
  { title: "Alexandria Mediterranean Day Trip", places: "Alexandria", plan: "The Bibliotheca, Qaitbay Citadel, the Catacombs and a seafood lunch on the Corniche.", price_small: 170, price_group: 450, joined: 6, days: 6 },
  { title: "Dahab & the Blue Hole", places: "Dahab, Blue Hole", plan: "Laid-back Dahab — snorkeling the Blue Hole, the Colored Canyon and a Bedouin camp evening.", price_small: 240, price_group: 640, joined: 5, days: 14 },
  { title: "Nile Cruise Luxor to Aswan", places: "Nile Cruise, Luxor, Aswan", plan: "Four-night Nile cruise visiting Edfu and Kom Ombo temples between Luxor and Aswan.", price_small: 420, price_group: 1100, joined: 7, days: 22 },
]

let READY = false
function ensureCol(table, col, type) {
  try {
    const cols = all(`PRAGMA table_info(${table})`)
    if (!cols.some((c) => c.name === col))
      run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)
  } catch (e) {}
}
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
  // --- v2/v3 migrations (added lazily on a live DB, no data loss) ---
  ensureCol("group_trips", "date_from", "TEXT")
  ensureCol("group_trips", "date_to", "TEXT")
  ensureCol("group_trips", "final_date", "TEXT")
  ensureCol("group_trips", "vote_deadline", "TEXT")
  ensureCol("group_trips", "pay_deadline", "TEXT")
  ensureCol("group_members", "phone", "TEXT")
  ensureCol("group_members", "available_days", "TEXT")
  ensureCol("group_members", "vote_date", "TEXT")
  ensureCol("group_members", "paid_at", "TEXT")
  const defaults = {
    gt_enabled: "1",
    gt_min_people: "10",
    gt_max_people: "14",
    gt_small_size: "2",
    gt_deadline_days: "7",
    gt_refund_hours: "6",
    gt_vote_hours: "48",
    gt_pay_hours: "24", // payment window (hours) after the day is confirmed
    gt_cancel_hours: "72", // cancellation cutoff (hours) before the trip day
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
    vote_hours: Number(setting("gt_vote_hours", "48")),
    pay_hours: Number(setting("gt_pay_hours", "24")),
    cancel_hours: Number(setting("gt_cancel_hours", "72")),
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

// Parse a JSON-encoded day array stored in group_members.available_days.
function parseDays(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try {
    const a = JSON.parse(v)
    return Array.isArray(a) ? a.filter(Boolean) : []
  } catch {
    return []
  }
}

// Expand an inclusive from..to range into an array of YYYY-MM-DD strings.
function daysInRange(from, to) {
  const out = []
  if (!from || !to) return out
  let d = new Date(from + "T00:00:00")
  const end = new Date(to + "T00:00:00")
  if (isNaN(d.getTime()) || isNaN(end.getTime())) return out
  let g = 0
  while (d <= end && g < 400) {
    out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86400000)
    g++
  }
  return out
}

// For a trip, rank candidate days by (votes desc, availability desc, date asc).
function candidateDays(trip) {
  const members = all(
    "SELECT available_days, vote_date FROM group_members WHERE trip_id=? AND status IN ('reserved','paid')",
    trip.id,
  )
  const map = {}
  const seed = daysInRange(trip.date_from, trip.date_to)
  for (const day of seed) map[day] = { date: day, available_count: 0, votes: 0 }
  for (const m of members) {
    for (const day of parseDays(m.available_days)) {
      if (!map[day]) map[day] = { date: day, available_count: 0, votes: 0 }
      map[day].available_count++
    }
    if (m.vote_date) {
      if (!map[m.vote_date])
        map[m.vote_date] = { date: m.vote_date, available_count: 0, votes: 0 }
      map[m.vote_date].votes++
    }
  }
  const arr = Object.keys(map).map((k) => map[k])
  arr.sort(
    (a, b) =>
      b.votes - a.votes ||
      b.available_count - a.available_count ||
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
  )
  return arr
}

// Auto-finalize a trip whose voting deadline has passed: pick the winning day
// and open the payment window.
function maybeFinalize(t) {
  if (!t || t.status !== "voting") return t
  if (!t.vote_deadline || new Date(t.vote_deadline).getTime() > Date.now())
    return t
  const cands = candidateDays(t)
  const final = (cands[0] && cands[0].date) || t.date_from || t.preferred_date
  const payHours = Number(setting("gt_pay_hours", "24")) || 24
  const payDeadline = new Date(Date.now() + payHours * 3600000).toISOString()
  run(
    "UPDATE group_trips SET status='confirmed', final_date=?, pay_deadline=?, confirmed_at=? WHERE id=?",
    final,
    payDeadline,
    nowISO(),
    t.id,
  )
  return get("SELECT * FROM group_trips WHERE id=?", t.id)
}

// After the payment window closes, drop members who never paid so their seats
// reopen for other travellers. Lazy (no scheduler) — same pattern as finalize.
function maybeExpireUnpaid(t) {
  if (!t || t.status !== "confirmed" || !t.pay_deadline) return t
  if (new Date(t.pay_deadline).getTime() > Date.now()) return t
  run(
    "UPDATE group_members SET status='expired' WHERE trip_id=? AND status='reserved'",
    t.id,
  )
  return t
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

// A single, shared "phase" so the website, app and dashboard all agree.
function phaseOf(t, count) {
  const s = t.status
  if (s === "confirmed") return "confirmed"
  if (s === "completed") return "completed"
  if (s === "cancelled" || s === "expired" || s === "closed") return "closed"
  if (s === "pending" || s === "quoted") return "preparing"
  if (t.max_people && count >= t.max_people) return "full"
  if (t.min_people && count >= t.min_people) return "ready" // minimum met, room left
  return "filling"
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
  const minReached = t.min_people ? count >= t.min_people : false
  const isFull = t.max_people ? count >= t.max_people : false
  const payOpen =
    t.status === "confirmed" &&
    !!t.pay_deadline &&
    new Date(t.pay_deadline).getTime() > Date.now()
  const canJoin =
    !isFull &&
    (t.status === "open" ||
      t.status === "voting" ||
      (t.status === "confirmed" && payOpen))
  return {
    ...t,
    members_count: count,
    // seats still needed to reach the MINIMUM (back-compat)
    spots_left: t.min_people ? Math.max(0, t.min_people - count) : null,
    // seats still available until the trip is FULL
    spots_to_max: t.max_people ? Math.max(0, t.max_people - count) : null,
    seats_to_group: t.group_size ? Math.max(0, t.group_size - count) : null,
    min_reached: minReached,
    is_full: isFull,
    can_join: canJoin,
    pay_open: payOpen,
    phase: phaseOf(t, count),
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

  // --- Public list: open trips, trips still in 'voting' with room, and
  //     confirmed trips (so travellers see "complete" ones and can grab a
  //     freed seat). Auto-finalizes + auto-expires unpaid seats on read. ---
  {
    method: "GET",
    path: "/api/group-trips",
    handler: ({ query }) => {
      ensureGt()
      const rows = query.status
        ? all(
            "SELECT * FROM group_trips WHERE status=? ORDER BY deadline ASC",
            query.status,
          )
        : all(
            "SELECT * FROM group_trips WHERE status IN ('open','voting','confirmed') ORDER BY deadline ASC",
          )
      return {
        trips: rows.map((r) => {
          let t = maybeFinalize(r)
          maybeExpireUnpaid(t)
          return tripView(t)
        }),
      }
    },
  },

  // --- My membership on a trip (available days + my vote) --- before /:id ---
  {
    method: "GET",
    path: "/api/group-trips/:id/me",
    auth: true,
    handler: ({ user, params }) => {
      ensureGt()
      const m = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        params.id,
        user.id,
      )
      return {
        member: m ? { ...m, available_days: parseDays(m.available_days) } : null,
      }
    },
  },

  // --- Public trip detail + members + ranked candidate days ---
  {
    method: "GET",
    path: "/api/group-trips/:id",
    handler: ({ params }) => {
      ensureGt()
      let t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      t = maybeFinalize(t)
      maybeExpireUnpaid(t)
      const members = all(
        "SELECT id,name,seats,status,joined_at FROM group_members WHERE trip_id=? AND status IN ('reserved','paid') ORDER BY joined_at ASC",
        t.id,
      )
      return { trip: tripView(t), members, candidate_days: candidateDays(t) }
    },
  },

  // --- Tourist creates a trip request (awaits admin quote) ---
  // Creator provides an available date RANGE (date_from -> date_to).
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
      const date_from = body.date_from || null
      const date_to = body.date_to || null
      if (date_from && date_to && date_from > date_to)
        err(400, "date_to must be on or after date_from")
      const info = run(
        "INSERT INTO group_trips (creator_id,title,itinerary_text,preferred_date,date_from,date_to,min_people,max_people,small_size,share_code,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        user.id,
        title,
        itinerary,
        date_from, // preferred_date mirrors the range start for back-compat
        date_from,
        date_to,
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
  // The creator is auto-added as the first member, available across the range.
  {
    method: "POST",
    path: "/api/group-trips/:id/accept",
    auth: true,
    handler: ({ user, params, body }) => {
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
      // Auto-enroll the creator as the first traveller (full availability).
      const existing = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (!existing) {
        const pp = perPerson(t, 1)
        run(
          "INSERT INTO group_members (trip_id,user_id,name,phone,seats,amount,status,available_days,referral_code,joined_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
          t.id,
          user.id,
          user.name || null,
          body.phone || user.phone || null,
          1,
          pp != null ? round2(pp) : 0,
          "reserved",
          JSON.stringify(daysInRange(t.date_from, t.date_to)),
          null,
          nowISO(),
        )
      }
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Anyone (logged-in) joins while the trip still has room, picking days.
  //     Allowed for 'open', 'voting', and 'confirmed' (during the pay window)
  //     until the trip is FULL (max_people) -> then it is "complete". ---
  {
    method: "POST",
    path: "/api/group-trips/:id/join",
    auth: true,
    handler: ({ user, params, body }) => {
      ensureGt()
      let t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      t = maybeFinalize(t)
      maybeExpireUnpaid(t)
      const joinable =
        t.status === "open" ||
        t.status === "voting" ||
        (t.status === "confirmed" &&
          t.pay_deadline &&
          new Date(t.pay_deadline).getTime() > Date.now())
      if (!joinable) err(400, "trip is not open for joining")
      const seats = Math.max(1, Number(body.seats) || 1)
      const count = seatsCount(t.id)
      if (t.max_people && count >= t.max_people)
        err(400, "trip is complete — no spots left")
      if (t.max_people && count + seats > t.max_people)
        err(400, "only " + (t.max_people - count) + " spot(s) left")
      const existing = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (existing) err(400, "you already joined this trip")
      // Validate the picked days fall inside the creator's range.
      const range = daysInRange(t.date_from, t.date_to)
      let avail = parseDays(body.available_days)
      if (range.length) {
        avail = avail.filter((d) => range.indexOf(d) >= 0)
        if (!avail.length)
          err(400, "pick at least one available day within the trip range")
      }
      const pp = perPerson(t, count + seats)
      const amount = pp != null ? round2(pp * seats) : 0
      run(
        "INSERT INTO group_members (trip_id,user_id,name,phone,seats,amount,status,available_days,referral_code,joined_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        t.id,
        user.id,
        body.name || user.name || null,
        body.phone || user.phone || null,
        seats,
        amount,
        "reserved",
        JSON.stringify(avail),
        body.referral_code || null,
        nowISO(),
      )
      // When the minimum is first reached, open voting on the final day (once).
      const newCount = seatsCount(t.id)
      if (t.min_people && newCount >= t.min_people && t.status === "open") {
        const voteHours = Number(setting("gt_vote_hours", "48")) || 48
        const vd = new Date(Date.now() + voteHours * 3600000).toISOString()
        run(
          "UPDATE group_trips SET status='voting', vote_deadline=? WHERE id=?",
          vd,
          t.id,
        )
      }
      return {
        ok: true,
        trip: tripView(get("SELECT * FROM group_trips WHERE id=?", t.id)),
      }
    },
  },

  // --- Member casts / changes their vote for the final day ---
  {
    method: "POST",
    path: "/api/group-trips/:id/vote",
    auth: true,
    handler: ({ user, params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      if (t.status !== "voting") err(400, "voting is not open for this trip")
      const m = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (!m) err(403, "join the trip before voting")
      const day = String(body.date || body.vote_date || "")
      if (!day) err(400, "date is required")
      const avail = parseDays(m.available_days)
      if (avail.length && avail.indexOf(day) < 0)
        err(400, "you can only vote for a day you marked as available")
      run("UPDATE group_members SET vote_date=? WHERE id=?", day, m.id)
      return { ok: true, candidate_days: candidateDays(t) }
    },
  },

  // --- Member pays to lock their seat (Phase A: marks paid; a real payment
  //     gateway will call this same step later with no schema change). ---
  {
    method: "POST",
    path: "/api/group-trips/:id/pay",
    auth: true,
    handler: ({ user, params }) => {
      ensureGt()
      let t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      t = maybeFinalize(t)
      if (t.status !== "confirmed")
        err(400, "payment opens after the trip day is confirmed")
      if (t.pay_deadline && new Date(t.pay_deadline).getTime() < Date.now())
        err(400, "the payment window has closed")
      const m = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (!m) err(404, "join the trip before paying")
      run(
        "UPDATE group_members SET status='paid', paid_at=? WHERE id=?",
        nowISO(),
        m.id,
      )
      return {
        ok: true,
        member: get("SELECT * FROM group_members WHERE id=?", m.id),
      }
    },
  },

  // --- Leave / cancel my seat. Free before a day is fixed; after that,
  //     allowed until gt_cancel_hours before the trip. Frees the seat. ---
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
      // The cutoff only applies once the trip day is fixed (confirmed).
      const refDate = t.final_date || null
      if (refDate) {
        const cutoff = new Date(refDate).getTime() - s.cancel_hours * 3600000
        if (Date.now() > cutoff)
          err(
            400,
            "cancellation window has closed (" +
              s.cancel_hours +
              "h before the trip)",
          )
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
        gt_vote_hours: "vote_hours",
        gt_pay_hours: "pay_hours",
        gt_cancel_hours: "cancel_hours",
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

  // --- Admin changes trip status (open/voting/confirmed/completed/...) ---
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
        "voting",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
      ]
      if (!allowed.includes(status)) err(400, "invalid status")
      const confirmed_at =
        status === "confirmed" ? t.confirmed_at || nowISO() : t.confirmed_at
      // Opening 'confirmed' manually also starts the payment window.
      let pay_deadline = t.pay_deadline
      if (status === "confirmed" && !pay_deadline) {
        const payHours = Number(setting("gt_pay_hours", "24")) || 24
        pay_deadline = new Date(Date.now() + payHours * 3600000).toISOString()
      }
      run(
        "UPDATE group_trips SET status=?, confirmed_at=?, pay_deadline=? WHERE id=?",
        status,
        confirmed_at,
        pay_deadline,
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Admin force-finalizes the winning day (skips waiting for the deadline) ---
  {
    method: "POST",
    path: "/api/admin/group-trips/:id/finalize",
    auth: ["admin"],
    handler: ({ params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      const cands = candidateDays(t)
      const final =
        body.final_date || (cands[0] && cands[0].date) || t.date_from
      if (!final) err(400, "no candidate day available to finalize")
      const payHours = Number(setting("gt_pay_hours", "24")) || 24
      const payDeadline = new Date(Date.now() + payHours * 3600000).toISOString()
      run(
        "UPDATE group_trips SET status='confirmed', final_date=?, pay_deadline=?, confirmed_at=? WHERE id=?",
        final,
        payDeadline,
        nowISO(),
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Admin lists members of a trip (full rows incl. phone + days) ---
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
        "UPDATE group_members SET status=?, amount=?, paid_at=? WHERE id=?",
        status,
        amount,
        status === "paid" ? nowISO() : m.paid_at || null,
        m.id,
      )
      return get("SELECT * FROM group_members WHERE id=?", m.id)
    },
  },

  // =================== TEMP DEMO SHOWCASE (remove at go-live) ===============

  // --- Seed 10 ready-made trips (8 open + 2 in voting), each with a range ---
  // Safe to re-run: it wipes previous demo rows first. All rows are tagged
  // admin_note='__DEMO__' and removed by /clear-demo below.
  {
    method: "POST",
    path: "/api/admin/group-trips/seed-demo",
    auth: ["admin"],
    handler: ({ user }) => {
      ensureGt()
      for (const o of all(
        "SELECT id FROM group_trips WHERE admin_note=?",
        "__DEMO__",
      )) {
        run("DELETE FROM group_members WHERE trip_id=?", o.id)
        run("DELETE FROM group_trips WHERE id=?", o.id)
      }
      const now = Date.now()
      const voteHours = Number(setting("gt_vote_hours", "48")) || 48
      let created = 0
      DEMO_TRIPS.forEach((d, idx) => {
        const dateFrom = new Date(now + d.days * 86400000)
          .toISOString()
          .slice(0, 10)
        const dateTo = new Date(now + (d.days + 6) * 86400000)
          .toISOString()
          .slice(0, 10)
        const deadline = new Date(now + d.days * 86400000).toISOString()
        const range = daysInRange(dateFrom, dateTo)
        const isVoting = !!d.voting
        const status = isVoting ? "voting" : "open"
        const voteDeadline = isVoting
          ? new Date(now + voteHours * 3600000).toISOString()
          : null
        const info = run(
          "INSERT INTO group_trips (creator_id,title,itinerary_text,preferred_date,date_from,date_to,min_people,max_people,small_size,group_size,price_small,price_group,vehicle_small,vehicle_group,deadline,vote_deadline,share_code,admin_note,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          user.id,
          d.title,
          "Places: " + d.places + "\n\n" + d.plan,
          dateFrom,
          dateFrom,
          dateTo,
          10,
          14,
          2,
          10,
          d.price_small,
          d.price_group,
          "ملاكي",
          "باص",
          deadline,
          voteDeadline,
          "DEMO-" + (1001 + idx),
          "__DEMO__",
          status,
          nowISO(),
        )
        const tripId = Number(info.lastInsertRowid)
        const amount = round2(d.price_group / 10)
        const memberCount = isVoting ? Math.max(d.joined, 11) : d.joined
        for (let i = 0; i < memberCount; i++) {
          const av = []
          for (let k = 0; k < 3; k++) {
            const day = range[(i + k * 2) % range.length]
            if (day && av.indexOf(day) < 0) av.push(day)
          }
          let voteDate = null
          if (isVoting && i % 4 !== 0) voteDate = av[0] || null
          run(
            "INSERT INTO group_members (trip_id,user_id,name,phone,seats,amount,status,available_days,vote_date,joined_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            tripId,
            null,
            DEMO_NAMES[(idx + i) % DEMO_NAMES.length],
            "2010" + String(1000000 + idx * 100 + i),
            1,
            amount,
            "reserved",
            JSON.stringify(av),
            voteDate,
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
