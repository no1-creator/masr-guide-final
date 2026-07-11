import { get, run } from "../db.js"
import { hashPassword, verifyPassword, signToken } from "../auth.js"
import { err } from "../util.js"

const publicUser = (u) =>
	u && { id: u.id, email: u.email, role: u.role, name: u.name, lang: u.lang }

export const routes = [
	{
		method: "POST",
		path: "/api/auth/register",
		handler: ({ body }) => {
			const { email, password, name, role = "customer", lang = "en" } = body
			if (!email || !password) err(400, "email and password are required")
			if (!["customer", "vendor", "affiliate"].includes(role))
				err(400, "invalid role")
			if (get("SELECT id FROM users WHERE email=?", email))
				err(409, "email already registered")
			run(
				"INSERT INTO users (email,password_hash,role,name,lang,created_at) VALUES (?,?,?,?,?,?)",
				email, hashPassword(password), role, name || null, lang, new Date().toISOString(),
			)
			const u = get("SELECT * FROM users WHERE email=?", email)
			if (role === "vendor")
				run(
					"INSERT INTO vendors (user_id,name,status,commission_rate,created_at) VALUES (?,?,?,?,?)",
					u.id, name || email, "pending", 0.1, new Date().toISOString(),
				)
			return { token: signToken({ sub: u.id, role: u.role }), user: publicUser(u) }
		},
	},
	{
		method: "POST",
		path: "/api/auth/login",
		handler: ({ body }) => {
			const u = get("SELECT * FROM users WHERE email=?", body.email || "")
			if (!u || !verifyPassword(body.password || "", u.password_hash))
				err(401, "invalid credentials")
			return { token: signToken({ sub: u.id, role: u.role }), user: publicUser(u) }
		},
	},
	{
		method: "GET",
		path: "/api/auth/me",
		auth: true,
		handler: ({ user }) => ({ user: publicUser(user) }),
	},
]
