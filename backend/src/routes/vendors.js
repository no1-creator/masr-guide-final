import { get, all, run } from "../db.js"
import { err } from "../util.js"

export const routes = [
	{
		method: "GET",
		path: "/api/vendors",
		auth: ["admin"],
		handler: () =>
			all(
				"SELECT v.*, u.email FROM vendors v JOIN users u ON u.id=v.user_id ORDER BY v.id",
			),
	},
	{
		method: "GET",
		path: "/api/vendors/me",
		auth: ["vendor"],
		handler: ({ user }) => {
			const v = get("SELECT * FROM vendors WHERE user_id=?", user.id)
			if (!v) err(404, "no vendor profile")
			return v
		},
	},
	{
		method: "PUT",
		path: "/api/vendors/me",
		auth: ["vendor"],
		handler: ({ user, body }) => {
			const v = get("SELECT * FROM vendors WHERE user_id=?", user.id)
			if (!v) err(404, "no vendor profile")
			for (const f of ["name", "logo", "city", "description", "languages"])
				if (f in body) run(`UPDATE vendors SET ${f}=? WHERE id=?`, body[f], v.id)
			return get("SELECT * FROM vendors WHERE id=?", v.id)
		},
	},
	{
		method: "PUT",
		path: "/api/vendors/:id/status",
		auth: ["admin"],
		handler: ({ params, body }) => {
			if (!["pending", "approved", "rejected", "suspended"].includes(body.status))
				err(400, "invalid status")
			run("UPDATE vendors SET status=? WHERE id=?", body.status, params.id)
			return get("SELECT * FROM vendors WHERE id=?", params.id)
		},
	},
]
