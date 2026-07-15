import { get, all, run } from "../db.js"
import { err } from "../util.js"

function imagesFor(id) {
	return all(
		"SELECT url FROM service_images WHERE service_id=? ORDER BY position, id",
		id,
	).map((r) => r.url)
}
function withImages(s) {
	if (!s) return s
	const images = imagesFor(s.id)
	return { ...s, featured: !!s.featured, images, cover: images[0] || null }
}
function ownCheck(user, vendorId) {
	if (user.role === "admin") return
	const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
	if (!v || v.id !== vendorId) err(403, "not your resource")
}

export const routes = [
	{
		method: "GET",
		path: "/api/categories",
		handler: () =>
			all("SELECT id,key,icon,labels FROM categories ORDER BY id").map((c) => ({
				...c,
				labels: JSON.parse(c.labels || "{}"),
			})),
	},
	{
		method: "GET",
		path: "/api/services",
		handler: ({ query }) => {
			let sql = "SELECT s.* FROM services s WHERE s.status='active'"
			const p = []
			if (query.cat) {
				sql += " AND s.category_id=(SELECT id FROM categories WHERE key=?)"
				p.push(query.cat)
			}
			if (query.q) {
				sql += " AND (s.title LIKE ? OR s.location LIKE ? OR s.description LIKE ?)"
				const t = "%" + query.q + "%"
				p.push(t, t, t)
			}
			if (query.city) {
				sql += " AND s.location LIKE ?"
				p.push("%" + query.city + "%")
			}
			if (query.featured === "1") sql += " AND s.featured=1"
			const sort =
				{
					price_asc: "s.price ASC",
					price_desc: "s.price DESC",
					rating: "s.rating DESC",
					newest: "s.id DESC",
				}[query.sort] || "s.featured DESC, s.rating DESC"
			sql += " ORDER BY " + sort
			return all(sql, ...p).map(withImages)
		},
	},
	{
		method: "GET",
		path: "/api/services/:id",
		handler: ({ params }) => {
			const s = get("SELECT * FROM services WHERE id=?", params.id)
			if (!s) err(404, "service not found")
			const v = get(
				"SELECT id,name,city,logo,status FROM vendors WHERE id=?",
				s.vendor_id,
			)
			return {
				...withImages(s),
				vendor: v,
				availability: all(
					"SELECT date,slots FROM availability WHERE service_id=? AND date>=date('now') ORDER BY date",
					s.id,
				),
			}
		},
	},
	{
		method: "POST",
		path: "/api/services",
		auth: ["vendor", "admin"],
		handler: ({ user, body }) => {
			const vendor =
				user.role === "admin"
					? get("SELECT * FROM vendors WHERE id=?", body.vendor_id)
					: get("SELECT * FROM vendors WHERE user_id=?", user.id)
			if (!vendor) err(400, "vendor profile not found")
			const cat = body.category_key
				? get("SELECT id FROM categories WHERE key=?", body.category_key)
				: null
			const info = run(
				"INSERT INTO services (vendor_id,category_id,title,location,description,price,currency,duration,rating,reviews_count,featured,cancel_policy,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
				vendor.id, cat ? cat.id : null, body.title || "Untitled",
				body.location || null, body.description || null, Number(body.price) || 0,
body.currency || "USD", body.duration || null, 0, 0,
				body.featured ? 1 : 0, body.cancel_policy || null, body.status || "active",
				new Date().toISOString(),
			)
			const sid = Number(info.lastInsertRowid)
			;(body.images || []).forEach((url, i) =>
				run("INSERT INTO service_images (service_id,url,position) VALUES (?,?,?)", sid, url, i),
			)
			return withImages(get("SELECT * FROM services WHERE id=?", sid))
		},
	},
	{
		method: "PUT",
		path: "/api/services/:id",
		auth: ["vendor", "admin"],
		handler: ({ user, params, body }) => {
			const s = get("SELECT * FROM services WHERE id=?", params.id)
			if (!s) err(404, "service not found")
			ownCheck(user, s.vendor_id)
			for (const f of ["title", "location", "description", "price", "currency", "duration", "cancel_policy", "status"])
				if (f in body) run(`UPDATE services SET ${f}=? WHERE id=?`, body[f], s.id)
			if ("featured" in body)
				run("UPDATE services SET featured=? WHERE id=?", body.featured ? 1 : 0, s.id)
			if ("category_key" in body) {
				const c = get("SELECT id FROM categories WHERE key=?", body.category_key)
				run("UPDATE services SET category_id=? WHERE id=?", c ? c.id : null, s.id)
			}
			if (Array.isArray(body.images)) {
				run("DELETE FROM service_images WHERE service_id=?", s.id)
				body.images.forEach((url, i) =>
					run("INSERT INTO service_images (service_id,url,position) VALUES (?,?,?)", s.id, url, i),
				)
			}
			return withImages(get("SELECT * FROM services WHERE id=?", s.id))
		},
	},
	{
		method: "DELETE",
		path: "/api/services/:id",
		auth: ["vendor", "admin"],
		handler: ({ user, params }) => {
			const s = get("SELECT * FROM services WHERE id=?", params.id)
			if (!s) err(404, "service not found")
			ownCheck(user, s.vendor_id)
			run("DELETE FROM services WHERE id=?", s.id)
			return { deleted: true }
		},
	},
	{
		method: "POST",
		path: "/api/services/:id/images",
		auth: ["vendor", "admin"],
		handler: ({ user, params, body }) => {
			const s = get("SELECT * FROM services WHERE id=?", params.id)
			if (!s) err(404, "service not found")
			ownCheck(user, s.vendor_id)
			const max = get(
				"SELECT COALESCE(MAX(position),-1) m FROM service_images WHERE service_id=?",
				s.id,
			).m
			const urls = body.url ? [body.url] : body.images || []
			urls.forEach((u, i) =>
				run("INSERT INTO service_images (service_id,url,position) VALUES (?,?,?)", s.id, u, max + 1 + i),
			)
			return withImages(get("SELECT * FROM services WHERE id=?", s.id))
		},
	},
	{
		method: "DELETE",
		path: "/api/images/:id",
		auth: ["vendor", "admin"],
		handler: ({ user, params }) => {
			const img = get(
				"SELECT si.*, s.vendor_id v FROM service_images si JOIN services s ON s.id=si.service_id WHERE si.id=?",
				params.id,
			)
			if (!img) err(404, "image not found")
			ownCheck(user, img.v)
			run("DELETE FROM service_images WHERE id=?", params.id)
			return { deleted: true }
		},
	},
	{
		method: "GET",
		path: "/api/availability",
		handler: ({ query }) => {
			if (!query.service_id) err(400, "service_id required")
			return all(
				"SELECT date,slots FROM availability WHERE service_id=? ORDER BY date",
				query.service_id,
			)
		},
	},
	{
		method: "POST",
		path: "/api/availability",
		auth: ["vendor", "admin"],
		handler: ({ user, body }) => {
			const s = get("SELECT * FROM services WHERE id=?", body.service_id)
			if (!s) err(404, "service not found")
			ownCheck(user, s.vendor_id)
			run(
				"INSERT INTO availability (service_id,date,slots) VALUES (?,?,?) ON CONFLICT(service_id,date) DO UPDATE SET slots=excluded.slots",
				body.service_id, body.date, Number(body.slots) || 0,
			)
			return { ok: true }
		},
	},
]
