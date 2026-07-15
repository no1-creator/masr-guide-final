// Group Trips — tourist-created custom group trips with vehicle-based pricing.
// Phase A (booking/confirm): money is recorded manually by admin from the
// dashboard. Wiring a real payment gateway later needs no schema change.
//
// Date flow: the creator sets an AVAILABLE DATE RANGE (date_from..date_to).
// Each joiner picks the specific days that work for them from that range.
// When the minimum group size is reached the trip enters 'voting': members
// vote for a final date among the days they are available on. After the
// voting window passes, the highest-voted day is auto-selected as final_date
// and the trip is confirmed — then payment is arranged.
//
// This module is self-contained: it creates its own tables + default settings
// lazily (idempotent) and also migrates missing columns on a live DB.
import { get, all, run, setting } from "../db.js"
import { err, nowISO, round2 } from "../util.js"

// ---------------------------------------------------------------------------
// Schema + default settings (idempotent, safe on a live DB with real data).
// ---------------------------------------------------------------------------
const DEFAULT_TIERS = [
  { name: "ملاكي", min: 1, max: 3 },
  { name: "هاي-إيص", min: 4, max: 7 },
  { name: "باص", min: 8, max: 14 },
]

let READY = false
function ensureCol(table, col, decl) {
  const cols = all(`PRAGMA table_info(${table})`)
  if (!cols.some((c) => c.name === col))
    run(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`)
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
    date_from TEXT,
    date_to TEXT,
    final_date TEXT,
    vote_deadline TEXT,
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
    phone TEXT,
    seats INTEGER NOT NULL DEFAULT 1,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved',
    available_days TEXT,
    vote_date TEXT,
    referral_code TEXT,
    joined_at TEXT NOT NULL
  )`)
  // Migrate older DBs that pre-date the date/voting columns.
  ensureCol("group_trips", "date_from", "TEXT")
  ensureCol("group_trips", "date_to", "TEXT")
  ensureCol("group_trips", "final_date", "TEXT")
  ensureCol("group_trips", "vote_deadline", "TEXT")
  ensureCol("group_members", "phone", "TEXT")
  ensureCol("group_members", "available_days", "TEXT")
  ensureCol("group_members", "vote_date", "TEXT")
  const defaults = {
    gt_enabled: "1",
    gt_min_people: "10",
    gt_max_people: "14",
    gt_small_size: "2",
    gt_deadline_days: "7",
    gt_refund_hours: "6",
    gt_vote_hours: "48",
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

function parseDays(s) {
  if (!s) return []
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a.filter(Boolean) : []
  } catch {
    return []
  }
}

// Every calendar day (YYYY-MM-DD) between two inclusive dates.
function daysInRange(from, to) {
  const out = []
  if (!from || !to) return out
  let d = new Date(from + "T00:00:00Z")
  const end = new Date(to + "T00:00:00Z")
  if (isNaN(d.getTime()) || isNaN(end.getTime())) return out
  let guard = 0
  while (d <= end && guard < 400) {
    out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86400000)
    guard++
  }
  return out
}

// Candidate days for the vote, ranked by votes, then availability, then date.
function candidateDays(tripId) {
  const ms = all(
    "SELECT available_days, vote_date FROM group_members WHERE trip_id=? AND status IN ('reserved','paid')",
    tripId,
  )
  const avail = {},
    votes = {}
  for (const m of ms) {
    for (const d of parseDays(m.available_days)) avail[d] = (avail[d] || 0) + 1
    if (m.vote_date) votes[m.vote_date] = (votes[m.vote_date] || 0) + 1
  }
  const dates = Object.keys(avail)
  dates.sort(
    (a, b) =>
      (votes[b] || 0) - (votes[a] || 0) ||
      avail[b] - avail[a] ||
      (a < b ? -1 : a > b ? 1 : 0),
  )
  return dates.map((d) => ({
    date: d,
    available_count: avail[d],
    votes: votes[d] || 0,
  }))
}

// If the voting window has elapsed, auto-pick the winning day and confirm.
function maybeFinalize(t) {
  if (
    t &&
    t.status === "voting" &&
    t.vote_deadline &&
    Date.now() > new Date(t.vote_deadline).getTime()
  ) {
    const cands = candidateDays(t.id)
    if (cands.length) {
      const win = cands[0].date
      run(
        "UPDATE group_trips SET status='confirmed', final_date=?, preferred_date=?, confirmed_at=? WHERE id=?",
        win,
        win,
        nowISO(),
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    }
  }
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
      )
        .map(maybeFinalize)
        .map(tripView)
      const joined = all(
        "SELECT gt.* FROM group_trips gt JOIN group_members gm ON gm.trip_id=gt.id WHERE gm.user_id=? AND gm.status IN ('reserved','paid') ORDER BY gt.created_at DESC",
        user.id,
      )
        .map(maybeFinalize)
        .map(tripView)
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

  // --- My membership on a specific trip (availability + vote) --- before /:id ---
  {
    method: "GET",
    path: "/api/group-trips/:id/me",
    auth: true,
    handler: ({ user, params }) => {
      ensureGt()
      const m = get(
        "SELECT id,seats,status,phone,available_days,vote_date FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        params.id,
        user.id,
      )
      return {
        member: m ? { ...m, available_days: parseDays(m.available_days) } : null,
      }
    },
  },

  // --- Public trip detail + members + vote candidates ---
  {
    method: "GET",
    path: "/api/group-trips/:id",
    handler: ({ params }) => {
      ensureGt()
      let t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      t = maybeFinalize(t)
      const members = all(
        "SELECT id,name,seats,status,available_days,vote_date,joined_at FROM group_members WHERE trip_id=? AND status IN ('reserved','paid') ORDER BY joined_at ASC",
        t.id,
      ).map((m) => ({ ...m, available_days: parseDays(m.available_days) }))
      return {
        trip: tripView(t),
        members,
        candidate_days: candidateDays(t.id),
      }
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
      const date_from = body.date_from || null
      const date_to = body.date_to || null
      if (date_from && date_to && date_from > date_to)
        err(400, "date_to must be after date_from")
      const info = run(
        "INSERT INTO group_trips (creator_id,title,itinerary_text,preferred_date,date_from,date_to,min_people,max_people,small_size,share_code,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        user.id,
        title,
        itinerary,
        date_from || body.preferred_date || null,
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
      // The creator is also a traveller: available on the whole range they set.
      const exists = get(
        "SELECT id FROM group_members WHERE trip_id=? AND user_id=?",
        t.id,
        t.creator_id,
      )
      if (!exists) {
        const allDays = daysInRange(t.date_from, t.date_to)
        run(
          "INSERT INTO group_members (trip_id,user_id,name,phone,seats,amount,status,available_days,joined_at) VALUES (?,?,?,?,?,?,?,?,?)",
          t.id,
          t.creator_id,
          (body && body.name) || user.name || null,
          (body && body.phone) || null,
          1,
          0,
          "reserved",
          JSON.stringify(allDays),
          nowISO(),
        )
      }
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
      // Availability: must pick days that fall inside the creator's range.
      let days = Array.isArray(body.available_days)
        ? body.available_days.filter(Boolean)
        : []
      const range = daysInRange(t.date_from, t.date_to)
      if (range.length) {
        if (!days.length) err(400, "select at least one available day")
        const valid = new Set(range)
        for (const d of days)
          if (!valid.has(d)) err(400, "day out of range: " + d)
      }
      const pp = perPerson(t, count + seats)
      const amount = pp != null ? round2(pp * seats) : 0
      run(
        "INSERT INTO group_members (trip_id,user_id,name,phone,seats,amount,status,available_days,referral_code,joined_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        t.id,
        user.id,
        body.name || user.name || null,
        body.phone || null,
        seats,
        amount,
        "reserved",
        JSON.stringify(days),
        body.referral_code || null,
        nowISO(),
      )
      // When the minimum is reached, open the vote instead of confirming.
      const newCount = seatsCount(t.id)
      if (t.min_people && newCount >= t.min_people && t.status === "open") {
        const s = gtSettings()
        const vd = new Date(
          Date.now() + (s.vote_hours || 48) * 3600000,
        ).toISOString()
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

  // --- Member votes for a final date (must be a day they are available on) ---
  {
    method: "POST",
    path: "/api/group-trips/:id/vote",
    auth: true,
    handler: ({ user, params, body }) => {
      ensureGt()
      let t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      t = maybeFinalize(t)
      if (t.status !== "voting") err(400, "voting is not open")
      const m = get(
        "SELECT * FROM group_members WHERE trip_id=? AND user_id=? AND status IN ('reserved','paid')",
        t.id,
        user.id,
      )
      if (!m) err(403, "you are not a member of this trip")
      const date = String(body.date || "")
      if (!parseDays(m.available_days).includes(date))
        err(400, "you can only vote for a day you are available on")
      run("UPDATE group_members SET vote_date=? WHERE id=?", date, m.id)
      return {
        ok: true,
        candidate_days: candidateDays(t.id),
        vote_deadline: t.vote_deadline,
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
      const tripDate = t.final_date || t.preferred_date
      if (tripDate) {
        const cutoff = new Date(tripDate).getTime() - s.refund_hours * 3600000
        if (Date.now() > cutoff)
          err(
            400,
            "refund window has passed (" + s.refund_hours + "h before trip)",
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
      return { trips: rows.map(maybeFinalize).map(tripView) }
    },
  },

  // --- Admin prices a request (small price + group price) -> status 'quoted' ---
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

  // --- Admin force-finalizes the date (pick top vote now or a specific date) ---
  {
    method: "POST",
    path: "/api/admin/group-trips/:id/finalize",
    auth: ["admin"],
    handler: ({ params, body }) => {
      ensureGt()
      const t = get("SELECT * FROM group_trips WHERE id=?", params.id)
      if (!t) err(404, "trip not found")
      let date = body.date
      if (!date) {
        const c = candidateDays(t.id)
        if (!c.length) err(400, "no candidate days to finalize")
        date = c[0].date
      }
      run(
        "UPDATE group_trips SET status='confirmed', final_date=?, preferred_date=?, confirmed_at=? WHERE id=?",
        date,
        date,
        nowISO(),
        t.id,
      )
      return get("SELECT * FROM group_trips WHERE id=?", t.id)
    },
  },

  // --- Admin changes trip status ---
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
        ).map((m) => ({ ...m, available_days: parseDays(m.available_days) })),
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
]
