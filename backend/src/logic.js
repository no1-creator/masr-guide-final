// Shared business logic: booking creation + commission split + wallet payout.
import { get, run, walletFor, credit, setting } from "./db.js"
import { round2 } from "./util.js"

export function genRef() {
	return "MG-" + Math.floor(100000 + Math.random() * 900000)
}

// Create a booking and its commission split (platform / vendor / affiliate).
export function createBooking({
	service_id,
	customer_id,
	referral_code = null,
	date = null,
	pax = 1,
}) {
	const svc = get("SELECT * FROM services WHERE id=?", service_id)
	if (!svc) throw new Error("service not found")
	const amount = round2(Number(svc.price) * (Number(pax) || 1))

	let affiliate = null
	if (referral_code)
		affiliate =
			get("SELECT * FROM affiliates WHERE code=?", referral_code) || null

	const platformRate = Number(setting("platform_commission", "0.10"))
	const platform_share = round2(amount * platformRate)
	const affiliate_share = affiliate
		? round2(amount * Number(affiliate.commission_rate))
		: 0
	const vendor_share = round2(amount - platform_share - affiliate_share)

	const ref = genRef()
	const info = run(
		"INSERT INTO bookings (ref,service_id,vendor_id,customer_id,affiliate_id,referral_code,date,pax,amount,currency,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
		ref,
		service_id,
		svc.vendor_id,
		customer_id,
		affiliate ? affiliate.id : null,
		referral_code,
		date,
		Number(pax) || 1,
		amount,
		svc.currency || "EGP",
		"pending",
		new Date().toISOString(),
	)
	const bid = Number(info.lastInsertRowid)
	run(
		"INSERT INTO commissions (booking_id,platform_share,vendor_share,affiliate_share,status) VALUES (?,?,?,?,?)",
		bid,
		platform_share,
		vendor_share,
		affiliate_share,
		"pending",
	)
	return get("SELECT * FROM bookings WHERE id=?", bid)
}

// Change booking status. On 'completed', credit wallets and mark commission paid.
export function setBookingStatus(bid, status) {
	const b = get("SELECT * FROM bookings WHERE id=?", bid)
	if (!b) throw new Error("booking not found")
	run("UPDATE bookings SET status=? WHERE id=?", status, bid)
	if (status === "completed") {
		const c = get("SELECT * FROM commissions WHERE booking_id=?", bid)
		if (c && c.status !== "paid") {
			const pw = walletFor("platform", 0)
			credit(pw.id, c.platform_share, "commission", b.ref)
			const vw = walletFor("vendor", b.vendor_id)
			credit(vw.id, c.vendor_share, "earning", b.ref)
			if (b.affiliate_id) {
				const aw = walletFor("affiliate", b.affiliate_id)
				credit(aw.id, c.affiliate_share, "commission", b.ref)
			}
			run("UPDATE commissions SET status='paid' WHERE booking_id=?", bid)
		}
	}
	return get("SELECT * FROM bookings WHERE id=?", bid)
}
