import { get, all, run, walletFor } from "../db.js"
import { err } from "../util.js"
import { hashPassword } from "../auth.js"

function genCode(seed) {
	return (
		(String(seed).replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() || "AFF") +
		"-" +
		Math.floor(1000 + Math.random() * 9000)
	)
}
function vendorOwns(user, vendorId) {
	if (user.role === "admin") return
	const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
	if (!v || v.id !== vendorId) err(403, "not your marketer")
}
const PUBLIC_URL = process.env.PUBLIC_URL || "https://masr.guide"

export const routes = [
	{
		method: "GET",
		path: "/api/affiliates",
		auth: ["vendor", "admin"],
		handler: ({ user }) => {
			if (user.role === "admin")
				return all(
					"SELECT a.*, u.name, u.email FROM affiliates a JOIN users u ON u.id=a.user_id ORDER BY a.id",
				)
			const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
			if (!v) err(404, "no vendor")
			return all(
				"SELECT a.*, u.name, u.email FROM affiliates a JOIN users u ON u.id=a.user_id WHERE a.vendor_id=? ORDER BY a.id",
				v.id,
			)
		},
	},
	{
		method: "GET",
		path: "/api/affiliates/me",
		auth: ["affiliate"],
		handler: ({ user }) => {
			const a = get("SELECT * FROM affiliates WHERE user_id=?", user.id)
			if (!a) err(404, "no affiliate profile")
			return { ...a, link: `${PUBLIC_URL}/?ref=${a.code}` }
		},
	},
	{
		method: "POST",
		path: "/api/affiliates",
		auth: ["vendor", "admin"],
		handler: ({ user, body }) => {
			const vendor =
				user.role === "admin"
					? get("SELECT * FROM vendors WHERE id=?", body.vendor_id)
					: get("SELECT * FROM vendors WHERE user_id=?", user.id)
			if (!vendor) err(400, "vendor not found")
			if (!body.email) err(400, "email required")
			let u = get("SELECT * FROM users WHERE email=?", body.email)
			if (!u) {
				run(
					"INSERT INTO users (email,password_hash,role,name,lang,created_at) VALUES (?,?,?,?,?,?)",
					body.email, hashPassword(body.password || "changeme123"),
					"affiliate", body.name || null, body.lang || "en", new Date().toISOString(),
				)
				u = get("SELECT * FROM users WHERE email=?", body.email)
			}
			const code = (body.code || genCode(body.name || body.email)).toUpperCase()
			if (get("SELECT id FROM affiliates WHERE code=?", code))
				err(409, "code already used")
			run(
				"INSERT INTO affiliates (user_id,vendor_id,code,commission_rate,clicks,created_at) VALUES (?,?,?,?,?,?)",
				u.id, vendor.id, code, Number(body.commission_rate) || 0.05, 0, new Date().toISOString(),
			)
			const a = get("SELECT * FROM affiliates WHERE code=?", code)
			walletFor("affiliate", a.id)
			return a
		},
	},
	{
		method: "PUT",
		path: "/api/affiliates/:id",
		auth: ["vendor", "admin"],
		handler: ({ user, params, body }) => {
			const a = get("SELECT * FROM affiliates WHERE id=?", params.id)
			if (!a) err(404, "not found")
			vendorOwns(user, a.vendor_id)
			if ("commission_rate" in body)
				run("UPDATE affiliates SET commission_rate=? WHERE id=?", Number(body.commission_rate) || 0, a.id)
			return get("SELECT * FROM affiliates WHERE id=?", a.id)
		},
	},
	{
		method: "DELETE",
		path: "/api/affiliates/:id",
		auth: ["vendor", "admin"],
		handler: ({ user, params }) => {
			const a = get("SELECT * FROM affiliates WHERE id=?", params.id)
			if (!a) err(404, "not found")
			vendorOwns(user, a.vendor_id)
			run("DELETE FROM affiliates WHERE id=?", a.id)
			return { deleted: true }
		},
	},
	{
		method: "POST",
		path: "/api/track/:code",
		handler: ({ params }) => {
			const a = get("SELECT * FROM affiliates WHERE code=?", params.code)
			if (!a) return { ok: false }
			run("UPDATE affiliates SET clicks=clicks+1 WHERE id=?", a.id)
			return { ok: true, vendor_id: a.vendor_id }
		},
	},
]
