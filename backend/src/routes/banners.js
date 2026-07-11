import { get, all, run } from "../db.js"
import { err } from "../util.js"

function withService(b) {
	const s = b.service_id
		? get("SELECT id,title FROM services WHERE id=?", b.service_id)
		: null
	return { ...b, active: !!b.active, service: s }
}

export const routes = [
	{
		method: "GET",
		path: "/api/banners",
		handler: ({ query }) => {
			const rows =
				query.all === "1"
					? all("SELECT * FROM banners ORDER BY position, id")
					: all("SELECT * FROM banners WHERE active=1 ORDER BY position, id")
			return rows.map(withService)
		},
	},
	{
		method: "POST",
		path: "/api/banners",
		auth: ["admin"],
		handler: ({ body }) => {
			const info = run(
				"INSERT INTO banners (title,image,service_id,active,position) VALUES (?,?,?,?,?)",
				body.title || null, body.image || null, body.service_id || null,
				body.active === false ? 0 : 1, Number(body.position) || 0,
			)
			return withService(get("SELECT * FROM banners WHERE id=?", Number(info.lastInsertRowid)))
		},
	},
	{
		method: "PUT",
		path: "/api/banners/:id",
		auth: ["admin"],
		handler: ({ params, body }) => {
			const b = get("SELECT * FROM banners WHERE id=?", params.id)
			if (!b) err(404, "not found")
			for (const f of ["title", "image", "service_id", "position"])
				if (f in body) run(`UPDATE banners SET ${f}=? WHERE id=?`, body[f], b.id)
			if ("active" in body)
				run("UPDATE banners SET active=? WHERE id=?", body.active ? 1 : 0, b.id)
			return withService(get("SELECT * FROM banners WHERE id=?", b.id))
		},
	},
	{
		method: "DELETE",
		path: "/api/banners/:id",
		auth: ["admin"],
		handler: ({ params }) => {
			run("DELETE FROM banners WHERE id=?", params.id)
			return { deleted: true }
		},
	},
]
