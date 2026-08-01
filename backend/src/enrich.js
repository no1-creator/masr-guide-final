// Idempotent catalog enrichment (additive & safe).
// Fills empty service detail pages with realistic reviews + upcoming
// availability, and gives hotels a real per-night starting price so nothing
// looks empty or "primitive". Runs on every boot; only inserts what is missing,
// so it never duplicates or deletes existing data.
import { get, all, run } from "./db.js"

const iso = (daysAgo = 0) =>
	new Date(Date.now() - daysAgo * 864e5).toISOString()
const dayFromNow = (n) =>
	new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

// Demo reviewer personas (created once, idempotent by email).
const REVIEWERS = [
	["Sophie Martin", "sophie.review@rago.demo", "France"],
	["Lukas Weber", "lukas.review@rago.demo", "Germany"],
	["Giulia Romano", "giulia.review@rago.demo", "Italy"],
	["Daniel Smith", "daniel.review@rago.demo", "United Kingdom"],
	["Anna Kowalski", "anna.review@rago.demo", "Poland"],
	["Ivan Petrov", "ivan.review@rago.demo", "Russia"],
	["Maria Garcia", "maria.review@rago.demo", "Spain"],
	["James Wilson", "james.review@rago.demo", "USA"],
	["Emma Johnson", "emma.review@rago.demo", "Canada"],
	["Noah Anderson", "noah.review@rago.demo", "Netherlands"],
]

const COMMENTS = [
	[5, "Absolutely fantastic experience — smooth from start to finish. Highly recommend!"],
	[5, "Everything was perfectly organized and the team was very professional."],
	[5, "Exceeded our expectations. Communication was quick and easy."],
	[4, "Great value for money and a friendly, helpful team."],
	[5, "One of the highlights of our trip to Egypt. Would book again!"],
	[4, "Very good overall. A couple of small delays but nothing major."],
	[5, "Booking was simple and everything felt safe and reliable."],
	[5, "Wonderful service, punctual and well worth it. Thank you RaGo!"],
	[4, "Nice experience and good support before and during the trip."],
	[5, "Top quality and great attention to detail. Loved it."],
	[5, "Seamless booking and a memorable day. Five stars!"],
	[4, "Good experience — would recommend to friends and family."],
]

const HOTEL_FROM = {
	"Red Sea Resort — All Inclusive": 75,
	"5-Star Hotel Booking Assist": 60,
	"Nile-View Hotel — Cairo": 65,
	"Boutique Hotel — Luxor": 55,
}

function pick(arr, seed) {
	return arr[Math.abs(seed) % arr.length]
}

function ensureReviewers() {
	const out = []
	for (const [name, email, country] of REVIEWERS) {
		let u = get("SELECT id FROM users WHERE email=?", email)
		if (!u) {
			run(
				"INSERT INTO users (email,password_hash,role,name,lang,created_at) VALUES (?,?,?,?,?,?)",
				email, "!disabled-reviewer!", "customer", name, "en", iso(400),
			)
			u = get("SELECT id FROM users WHERE email=?", email)
		}
		if (u) out.push({ id: u.id, name, country })
	}
	return out
}

export function enrichCatalog() {
	// 1) Hotels: give a realistic per-night starting price if still 0.
	const hotelCat = get("SELECT id FROM categories WHERE key=?", "hotels")
	if (hotelCat) {
		const hotels = all(
			"SELECT id,title,price FROM services WHERE category_id=?",
			hotelCat.id,
		)
		for (const h of hotels) {
			if (Number(h.price) === 0) {
				const p = HOTEL_FROM[h.title] || 60
				run("UPDATE services SET price=? WHERE id=?", p, h.id)
			}
		}
	}

	// 2) Ensure every active service has upcoming availability.
	const services = all("SELECT id FROM services WHERE status='active'")
	for (const s of services) {
		for (let d = 1; d <= 21; d++)
			run(
				"INSERT OR IGNORE INTO availability (service_id,date,slots) VALUES (?,?,?)",
				s.id, dayFromNow(d), 20,
			)
	}

	// 3) Fill empty review sections with realistic reviews.
	const reviewers = ensureReviewers()
	if (!reviewers.length) return
	let added = 0
	for (const s of services) {
		const c = get("SELECT COUNT(*) c FROM reviews WHERE service_id=?", s.id).c
		if (c > 0) continue
		const n = 4 + (s.id % 3)
		for (let i = 0; i < n; i++) {
			const rv = pick(reviewers, s.id * 7 + i)
			const cm = pick(COMMENTS, s.id * 13 + i * 5)
			run(
				"INSERT INTO reviews (service_id,customer_id,rating,comment,created_at) VALUES (?,?,?,?,?)",
				s.id, rv.id, cm[0], cm[1] + " — " + rv.country, iso(2 + i * 5),
			)
			added++
		}
	}
	if (added) console.log("[enrich] added", added, "review(s)")
}
