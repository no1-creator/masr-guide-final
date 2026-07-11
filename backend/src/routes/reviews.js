import { get, all, run } from "../db.js"
import { err } from "../util.js"

export const routes = [
	{
		method: "GET",
		path: "/api/reviews",
		handler: ({ query }) => {
			if (!query.service_id) err(400, "service_id required")
			return all(
				"SELECT r.*, u.name FROM reviews r LEFT JOIN users u ON u.id=r.customer_id WHERE r.service_id=? ORDER BY r.id DESC",
				query.service_id,
			)
		},
	},
	{
		method: "POST",
		path: "/api/reviews",
		auth: true,
		handler: ({ user, body }) => {
			if (!body.service_id || !body.rating)
				err(400, "service_id and rating required")
			const rating = Math.max(1, Math.min(5, Number(body.rating)))
			run(
				"INSERT INTO reviews (service_id,customer_id,rating,comment,created_at) VALUES (?,?,?,?,?)",
				body.service_id, user.id, rating, body.comment || null, new Date().toISOString(),
			)
			const agg = get(
				"SELECT AVG(rating) a, COUNT(*) c FROM reviews WHERE service_id=?",
				body.service_id,
			)
			run(
				"UPDATE services SET rating=?, reviews_count=? WHERE id=?",
				Math.round(agg.a * 10) / 10, agg.c, body.service_id,
			)
			return { ok: true }
		},
	},
]
