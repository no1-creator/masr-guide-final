import { get, all, run } from "../db.js"

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
      customers: get("SELECT COUNT(*) c FROM users WHERE role='customer'").c,
      revenue: get(
        "SELECT COALESCE(SUM(amount),0) v FROM bookings WHERE status IN ('confirmed','completed')",
      ).v,
      platform_commission: get(
        "SELECT COALESCE(SUM(platform_share),0) s FROM commissions",
      ).s,
      pending_payouts: get(
        "SELECT COUNT(*) c FROM payouts WHERE status='requested'",
      ).c,
      recent_bookings: all(
        "SELECT b.ref, b.amount, b.status, s.title FROM bookings b JOIN services s ON s.id=b.service_id ORDER BY b.id DESC LIMIT 8",
      ),
      top_affiliates: all(
        "SELECT u.name, a.code, a.clicks, COUNT(b.id) bookings FROM affiliates a JOIN users u ON u.id=a.user_id LEFT JOIN bookings b ON b.affiliate_id=a.id GROUP BY a.id ORDER BY bookings DESC, a.clicks DESC LIMIT 5",
      ),
    }),
  },
  {
    method: "GET",
    path: "/api/admin/settings",
    auth: ["admin"],
    handler: () => all("SELECT key, value FROM settings ORDER BY key"),
  },
  {
    method: "PUT",
    path: "/api/admin/settings",
    auth: ["admin"],
    handler: ({ body }) => {
      const entries =
        body && typeof body === "object" ? Object.entries(body) : []
      for (const [key, value] of entries)
        run(
          "INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)",
          String(key),
          String(value),
        )
      return all("SELECT key, value FROM settings ORDER BY key")
    },
  },
  {
    method: "GET",
    path: "/api/admin/customers",
    auth: ["admin"],
    handler: () =>
      all(
        "SELECT u.id, u.name, u.email, u.lang, u.created_at, COUNT(b.id) bookings, COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.amount ELSE 0 END),0) spent FROM users u LEFT JOIN bookings b ON b.customer_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.id DESC",
      ),
  },
  {
    method: "GET",
    path: "/api/admin/reviews",
    auth: ["admin"],
    handler: () =>
      all(
        "SELECT r.*, u.name, s.title service_title FROM reviews r LEFT JOIN users u ON u.id=r.customer_id LEFT JOIN services s ON s.id=r.service_id ORDER BY r.id DESC LIMIT 200",
      ),
  },
  {
    method: "DELETE",
    path: "/api/admin/reviews/:id",
    auth: ["admin"],
    handler: ({ params }) => {
      const r = get("SELECT * FROM reviews WHERE id=?", params.id)
      if (r) {
        run("DELETE FROM reviews WHERE id=?", params.id)
        const agg = get(
          "SELECT AVG(rating) a, COUNT(*) c FROM reviews WHERE service_id=?",
          r.service_id,
        )
        run(
          "UPDATE services SET rating=?, reviews_count=? WHERE id=?",
          agg.a ? Math.round(agg.a * 10) / 10 : 0,
          agg.c,
          r.service_id,
        )
      }
      return { ok: true }
    },
  },
]
