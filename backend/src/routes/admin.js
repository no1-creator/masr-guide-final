import { get, all } from "../db.js"

export const routes = [
	{
		method: "GET",
		path: "/api/admin/overview",
		auth: ["admin"],
		handler: () => ({
			vendors: get("SELECT COUNT(*) c FROM vendors").c,
			services: get("SELECT COUNT(*) c FROM services").c,
			affiliates: get("SELECT COUNT(*) c FROM affiliates").c,
			bookings: get("SELECT COUNT(*) c FROM bookings").c,
			revenue: get(
				"SELECT COALESCE(SUM(amount),0) v FROM bookings WHERE status IN ('confirmed','completed')",
			).v,
			platform_commission: get(
				"SELECT COALESCE(SUM(platform_share),0) s FROM commissions",
			).s,
			recent_bookings: all(
				"SELECT b.ref, b.amount, b.status, s.title FROM bookings b JOIN services s ON s.id=b.service_id ORDER BY b.id DESC LIMIT 8",
			),
			top_affiliates: all(
				"SELECT u.name, a.code, a.clicks, COUNT(b.id) bookings FROM affiliates a JOIN users u ON u.id=a.user_id LEFT JOIN bookings b ON b.affiliate_id=a.id GROUP BY a.id ORDER BY bookings DESC, a.clicks DESC LIMIT 5",
			),
		}),
	},
]
