import { get, all } from "../db.js"
import { err } from "../util.js"
import { createBooking, setBookingStatus } from "../logic.js"

export const routes = [
	{
		method: "GET",
		path: "/api/bookings",
		auth: true,
		handler: ({ user, query }) => {
			let sql =
				"SELECT b.*, s.title service_title, c.platform_share, c.vendor_share, c.affiliate_share, c.status commission_status FROM bookings b JOIN services s ON s.id=b.service_id LEFT JOIN commissions c ON c.booking_id=b.id"
			const p = []
			const w = []
			if (user.role === "customer") {
				w.push("b.customer_id=?")
				p.push(user.id)
			} else if (user.role === "vendor") {
				const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
				w.push("b.vendor_id=?")
				p.push(v ? v.id : -1)
			} else if (user.role === "affiliate") {
				const a = get("SELECT id FROM affiliates WHERE user_id=?", user.id)
				w.push("b.affiliate_id=?")
				p.push(a ? a.id : -1)
			}
			if (query.status) {
				w.push("b.status=?")
				p.push(query.status)
			}
			if (w.length) sql += " WHERE " + w.join(" AND ")
			sql += " ORDER BY b.id DESC"
			return all(sql, ...p)
		},
	},
	{
		method: "POST",
		path: "/api/bookings",
		auth: true,
		handler: ({ user, body }) => {
			if (!body.service_id) err(400, "service_id required")
			return createBooking({
				service_id: body.service_id,
				customer_id: user.id,
				referral_code: body.referral_code || null,
				date: body.date || null,
				pax: Number(body.pax) || 1,
			})
		},
	},
	{
		method: "PUT",
		path: "/api/bookings/:id/status",
		auth: ["vendor", "admin"],
		handler: ({ user, params, body }) => {
			const b = get("SELECT * FROM bookings WHERE id=?", params.id)
			if (!b) err(404, "booking not found")
			if (user.role === "vendor") {
				const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
				if (!v || v.id !== b.vendor_id) err(403, "not your booking")
			}
			if (!["pending", "confirmed", "completed", "cancelled"].includes(body.status))
				err(400, "invalid status")
			return setBookingStatus(b.id, body.status)
		},
	},
	{
		method: "GET",
		path: "/api/commissions",
		auth: ["admin"],
		handler: () =>
			all(
				"SELECT c.*, b.ref, b.amount FROM commissions c JOIN bookings b ON b.id=c.booking_id ORDER BY c.id DESC",
			),
	},
]
