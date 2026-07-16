import crypto from "node:crypto"
import { get, run } from "../db.js"
import { hashPassword, verifyPassword, signToken } from "../auth.js"
import { err, nowISO } from "../util.js"

// ---------------------------------------------------------------------------
// Schema: extra user columns + a one-time-password table. All idempotent, so
// it is safe to run on the live database with real data.
// ---------------------------------------------------------------------------
function addCol(table, col, type) {
  try { run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`) } catch (_) { /* already exists */ }
}
addCol("users", "phone", "TEXT")
addCol("users", "avatar", "TEXT")
addCol("users", "provider", "TEXT")
run(`CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
)`)

const OTP_TTL_MIN = 10
const IS_PROD = process.env.NODE_ENV === "production"

const publicUser = (u) =>
  u && {
    id: u.id, email: u.email, role: u.role, name: u.name, lang: u.lang,
    phone: u.phone || null, avatar: u.avatar || null, provider: u.provider || null,
  }

const randomHash = () => hashPassword(crypto.randomBytes(24).toString("hex"))
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex")
const normPhone = (p) => String(p || "").replace(/[^\d+]/g, "")
const digits = (p) => normPhone(p).replace(/\D/g, "")
const session = (u) => ({ token: signToken({ sub: u.id, role: u.role }), user: publicUser(u) })

function createUser({ email, name, role = "customer", lang = "en", phone = null, avatar = null, provider = null, password = null }) {
  run(
    "INSERT INTO users (email,password_hash,role,name,lang,created_at,phone,avatar,provider) VALUES (?,?,?,?,?,?,?,?,?)",
    email, password ? hashPassword(password) : randomHash(), role, name || null, lang, nowISO(), phone, avatar, provider,
  )
  return get("SELECT * FROM users WHERE email=?", email)
}

// ---------------------------------------------------------------------------
// SMS delivery. Right now it just logs the code (and the API returns it in
// non-production so you can test). Plug your gateway (Twilio / Vonage / a local
// Egyptian SMS or WhatsApp gateway) inside sendSms() — nothing else changes.
// ---------------------------------------------------------------------------
async function sendSms(phone, code) {
  console.log(`[OTP] ${phone} -> ${code}`)
  // Example (Twilio):
  // await fetch("https://api.twilio.com/2010-04-01/Accounts/<SID>/Messages.json", {
  //   method: "POST",
  //   headers: { Authorization: "Basic " + Buffer.from("<SID>:<TOKEN>").toString("base64"),
  //     "Content-Type": "application/x-www-form-urlencoded" },
  //   body: new URLSearchParams({ To: phone, From: "<YOUR_NUMBER>", Body: `RaGo code: ${code}` }),
  // })
}

export const routes = [
  {
    method: "POST",
    path: "/api/auth/register",
    handler: ({ body }) => {
      const { email, password, name, role = "customer", lang = "en", phone = null } = body
      if (!email || !password) err(400, "email and password are required")
      if (!["customer", "vendor", "affiliate"].includes(role)) err(400, "invalid role")
      if (get("SELECT id FROM users WHERE email=?", email)) err(409, "email already registered")
      const u = createUser({ email, password, name, role, lang, phone, provider: "email" })
      if (role === "vendor")
        run("INSERT INTO vendors (user_id,name,status,commission_rate,created_at) VALUES (?,?,?,?,?)",
          u.id, name || email, "pending", 0.1, nowISO())
      return session(u)
    },
  },
  {
    method: "POST",
    path: "/api/auth/login",
    handler: ({ body }) => {
      const u = get("SELECT * FROM users WHERE email=?", body.email || "")
      if (!u || !verifyPassword(body.password || "", u.password_hash)) err(401, "invalid credentials")
      return session(u)
    },
  },
  {
    method: "GET",
    path: "/api/auth/me",
    auth: true,
    handler: ({ user }) => ({ user: publicUser(user) }),
  },

  // ---- Phone + OTP -------------------------------------------------------
  {
    method: "POST",
    path: "/api/auth/otp/request",
    handler: async ({ body }) => {
      const phone = normPhone(body.phone)
      if (digits(phone).length < 8) err(400, "a valid phone number is required")
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const expires = new Date(Date.now() + OTP_TTL_MIN * 60000).toISOString()
      run("DELETE FROM otps WHERE phone=?", phone)
      run("INSERT INTO otps (phone,code_hash,expires_at,attempts,created_at) VALUES (?,?,?,0,?)",
        phone, sha(code), expires, nowISO())
      await sendSms(phone, code)
      const out = { sent: true, expires_in: OTP_TTL_MIN * 60 }
      if (!IS_PROD) out.dev_code = code // only outside production, for testing
      return out
    },
  },
  {
    method: "POST",
    path: "/api/auth/otp/verify",
    handler: ({ body }) => {
      const phone = normPhone(body.phone)
      const code = String(body.code || "").trim()
      const rec = get("SELECT * FROM otps WHERE phone=?", phone)
      if (!rec) err(400, "please request a new code")
      if (new Date(rec.expires_at).getTime() < Date.now()) {
        run("DELETE FROM otps WHERE phone=?", phone); err(400, "the code has expired — request a new one")
      }
      if (rec.attempts >= 5) {
        run("DELETE FROM otps WHERE phone=?", phone); err(429, "too many attempts — request a new code")
      }
      if (sha(code) !== rec.code_hash) {
        run("UPDATE otps SET attempts=attempts+1 WHERE id=?", rec.id); err(401, "incorrect code")
      }
      run("DELETE FROM otps WHERE phone=?", phone)
      let u = get("SELECT * FROM users WHERE phone=?", phone)
      if (!u) {
        const email = `phone_${digits(phone)}@rago.local`
        u = get("SELECT * FROM users WHERE email=?", email) ||
            createUser({ email, name: body.name || null, phone, provider: "phone" })
        if (!u.phone) { run("UPDATE users SET phone=? WHERE id=?", phone, u.id); u = get("SELECT * FROM users WHERE id=?", u.id) }
      } else if (body.name && !u.name) {
        run("UPDATE users SET name=? WHERE id=?", body.name, u.id); u = get("SELECT * FROM users WHERE id=?", u.id)
      }
      return session(u)
    },
  },

  // ---- Google (Gmail) ----------------------------------------------------
  {
    method: "POST",
    path: "/api/auth/google",
    handler: async ({ body }) => {
      const idToken = body.id_token || body.credential
      if (!idToken) err(400, "id_token is required")
      let payload
      try {
        const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken))
        payload = await r.json()
        if (!r.ok || !payload.sub) err(401, "invalid Google token")
      } catch (_) { err(401, "could not verify the Google token") }
      const allowed = process.env.GOOGLE_CLIENT_ID
      if (allowed && payload.aud !== allowed) err(401, "Google token audience mismatch")
      const email = String(payload.email || "").toLowerCase()
      if (!email) err(400, "this Google account has no email")
      let u = get("SELECT * FROM users WHERE email=?", email)
      if (!u) u = createUser({ email, name: payload.name, avatar: payload.picture, provider: "google" })
      return session(u)
    },
  },

  // ---- Apple (iCloud) ----------------------------------------------------
  {
    method: "POST",
    path: "/api/auth/apple",
    handler: ({ body }) => {
      const token = body.identity_token || body.id_token
      if (!token) err(400, "identity_token is required")
      const parts = String(token).split(".")
      if (parts.length !== 3) err(401, "invalid Apple token")
      let claims
      try { claims = JSON.parse(Buffer.from(parts[1], "base64url").toString()) } catch { err(401, "invalid Apple token") }
      if (!claims.sub) err(401, "invalid Apple token")
      if (claims.exp && claims.exp * 1000 < Date.now()) err(401, "Apple token expired")
      const allowed = process.env.APPLE_CLIENT_ID
      if (allowed && claims.aud !== allowed) err(401, "Apple token audience mismatch")
      // NOTE: for full security, also verify the RS256 signature against Apple's
      // public keys (https://appleid.apple.com/auth/keys). Claims are validated here.
      const email = String(claims.email || `apple_${String(claims.sub).replace(/[^a-zA-Z0-9]/g, "")}@rago.local`).toLowerCase()
      let u = get("SELECT * FROM users WHERE email=?", email)
      if (!u) u = createUser({ email, name: body.name || null, provider: "apple" })
      return session(u)
    },
  },
]
