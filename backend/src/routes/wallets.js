import { get, all, run, walletFor } from "../db.js"
import { err } from "../util.js"

function myWallet(user) {
	if (user.role === "vendor") {
		const v = get("SELECT id FROM vendors WHERE user_id=?", user.id)
		return v ? walletFor("vendor", v.id) : null
	}
	if (user.role === "affiliate") {
		const a = get("SELECT id FROM affiliates WHERE user_id=?", user.id)
		return a ? walletFor("affiliate", a.id) : null
	}
	if (user.role === "admin") return walletFor("platform", 0)
	return null
}

export const routes = [
	{
		method: "GET",
		path: "/api/wallets/me",
		auth: true,
		handler: ({ user }) => {
			const w = myWallet(user)
			if (!w) err(404, "no wallet for this role")
			const transactions = all(
				"SELECT amount,type,ref,created_at FROM wallet_txns WHERE wallet_id=? ORDER BY id DESC LIMIT 100",
				w.id,
			)
			return { ...w, transactions }
		},
	},
	{
		method: "POST",
		path: "/api/payouts",
		auth: true,
		handler: ({ user, body }) => {
			const w = myWallet(user)
			if (!w) err(404, "no wallet")
			const amt = Number(body.amount) || 0
			if (amt <= 0) err(400, "invalid amount")
			if (amt > w.balance) err(400, "insufficient balance")
			const info = run(
				"INSERT INTO payouts (wallet_id,amount,status,requested_at) VALUES (?,?,?,?)",
				w.id, amt, "requested", new Date().toISOString(),
			)
			return get("SELECT * FROM payouts WHERE id=?", Number(info.lastInsertRowid))
		},
	},
	{
		method: "GET",
		path: "/api/payouts",
		auth: ["admin"],
		handler: () =>
			all(
				"SELECT p.*, w.owner_type, w.owner_id FROM payouts p JOIN wallets w ON w.id=p.wallet_id ORDER BY p.id DESC",
			),
	},
	{
		method: "PUT",
		path: "/api/payouts/:id",
		auth: ["admin"],
		handler: ({ params, body }) => {
			const p = get("SELECT * FROM payouts WHERE id=?", params.id)
			if (!p) err(404, "not found")
			if (!["approved", "rejected", "paid"].includes(body.status))
				err(400, "invalid status")
			run("UPDATE payouts SET status=?, resolved_at=? WHERE id=?", body.status, new Date().toISOString(), p.id)
			if (body.status === "paid") {
				run("UPDATE wallets SET balance=balance-? WHERE id=?", p.amount, p.wallet_id)
				run(
					"INSERT INTO wallet_txns (wallet_id,amount,type,ref,created_at) VALUES (?,?,?,?,?)",
					p.wallet_id, -p.amount, "payout", "PO-" + p.id, new Date().toISOString(),
				)
			}
			return get("SELECT * FROM payouts WHERE id=?", p.id)
		},
	},
]
