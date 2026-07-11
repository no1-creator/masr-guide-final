// Auth: scrypt password hashing + HMAC-SHA256 JWT. Zero dependencies.
import crypto from "node:crypto"

const SECRET = process.env.JWT_SECRET || "masr-guide-dev-secret-change-me"

export function hashPassword(pw) {
	const salt = crypto.randomBytes(16).toString("hex")
	const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex")
	return `${salt}:${hash}`
}

export function verifyPassword(pw, stored) {
	if (!stored || !stored.includes(":")) return false
	const [salt, hash] = stored.split(":")
	const test = crypto.scryptSync(String(pw), salt, 64).toString("hex")
	const a = Buffer.from(hash, "hex")
	const b = Buffer.from(test, "hex")
	return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const b64uJSON = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url")

export function signToken(payload, expiresInSec = 60 * 60 * 24 * 7) {
	const header = { alg: "HS256", typ: "JWT" }
	const now = Math.floor(Date.now() / 1000)
	const body = { ...payload, iat: now, exp: now + expiresInSec }
	const data = `${b64uJSON(header)}.${b64uJSON(body)}`
	const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url")
	return `${data}.${sig}`
}

export function verifyToken(token) {
	if (!token) return null
	const parts = token.split(".")
	if (parts.length !== 3) return null
	const [h, p, s] = parts
	const expected = crypto
		.createHmac("sha256", SECRET)
		.update(`${h}.${p}`)
		.digest("base64url")
	const a = Buffer.from(s)
	const b = Buffer.from(expected)
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
	try {
		const payload = JSON.parse(Buffer.from(p, "base64url").toString())
		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
		return payload
	} catch {
		return null
	}
}

export function bearer(req) {
	const h = req.headers["authorization"] || ""
	return h.startsWith("Bearer ") ? h.slice(7) : null
}
