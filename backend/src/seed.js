// Idempotent demo seed. Run: node src/seed.js  (add --reset to wipe first).
import { db, migrate, get, run, walletFor } from "./db.js"
import { hashPassword } from "./auth.js"
import { createBooking, setBookingStatus } from "./logic.js"

const iso = () => new Date().toISOString()
const dayFromNow = (n) =>
	new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

// Full tourist journey (arrival -> departure). Icon keys map to modern inline
// SVG icons in public/app.html. All the excursion sheet trips live under the
// single "internal-trips" category; every other category is a distinct service.
const CATS = [
	["airport", "plane", { en: "Airport Services", fr: "Services a\u00e9roport", de: "Flughafenservice", it: "Servizi aeroportuali", es: "Servicios aeroportuarios", ru: "\u0423\u0441\u043b\u0443\u0433\u0438 \u0432 \u0430\u044d\u0440\u043e\u043f\u043e\u0440\u0442\u0443" }],
	["visa", "file", { en: "Visa & Entry", fr: "Visa & entr\u00e9e", de: "Visum & Einreise", it: "Visto & ingresso", es: "Visado y entrada", ru: "\u0412\u0438\u0437\u0430 \u0438 \u0432\u044a\u0435\u0437\u0434" }],
	["transfers", "car", { en: "Transfers", fr: "Transferts", de: "Transfers", it: "Trasferimenti", es: "Traslados", ru: "\u0422\u0440\u0430\u043d\u0441\u0444\u0435\u0440\u044b" }],
	["hotels", "bed", { en: "Hotels & Stays", fr: "H\u00f4tels", de: "Hotels", it: "Hotel", es: "Hoteles", ru: "\u041e\u0442\u0435\u043b\u0438" }],
	["internal-trips", "compass", { en: "Internal Trips", fr: "Excursions internes", de: "Inlandsausfl\u00fcge", it: "Escursioni interne", es: "Excursiones internas", ru: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u0442\u0443\u0440\u044b" }],
	["tours", "landmark", { en: "Tours & Sightseeing", fr: "Visites", de: "Touren", it: "Tour", es: "Tours", ru: "\u042d\u043a\u0441\u043a\u0443\u0440\u0441\u0438\u0438" }],
	["nile-cruise", "ship", { en: "Nile Cruises", fr: "Croisi\u00e8res sur le Nil", de: "Nilkreuzfahrten", it: "Crociere sul Nilo", es: "Cruceros por el Nilo", ru: "\u041a\u0440\u0443\u0438\u0437\u044b \u043f\u043e \u041d\u0438\u043b\u0443" }],
	["diving", "waves", { en: "Diving & Water Sports", fr: "Plong\u00e9e", de: "Tauchen", it: "Immersioni", es: "Buceo", ru: "\u0414\u0430\u0439\u0432\u0438\u043d\u0433" }],
	["safari", "mountain", { en: "Desert Safari", fr: "Safari d\u00e9sert", de: "W\u00fcstensafari", it: "Safari nel deserto", es: "Safari en el desierto", ru: "\u0421\u0430\u0444\u0430\u0440\u0438" }],
	["carrental", "key", { en: "Car Rental", fr: "Location de voiture", de: "Autovermietung", it: "Noleggio auto", es: "Alquiler de coches", ru: "\u0410\u0440\u0435\u043d\u0434\u0430 \u0430\u0432\u0442\u043e" }],
	["guide", "user", { en: "Private Guides", fr: "Guides priv\u00e9s", de: "Private Guides", it: "Guide private", es: "Gu\u00edas privados", ru: "\u0427\u0430\u0441\u0442\u043d\u044b\u0435 \u0433\u0438\u0434\u044b" }],
	["sim", "phone", { en: "SIM & Internet", fr: "SIM & Internet", de: "SIM & Internet", it: "SIM & Internet", es: "SIM e Internet", ru: "SIM \u0438 \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442" }],
	["dining", "utensils", { en: "Dining", fr: "Restauration", de: "Gastronomie", it: "Ristorazione", es: "Gastronom\u00eda", ru: "\u0420\u0435\u0441\u0442\u043e\u0440\u0430\u043d\u044b" }],
	["shopping", "bag", { en: "Shopping & Bazaars", fr: "Shopping", de: "Einkaufen", it: "Shopping", es: "Compras", ru: "\u0428\u043e\u043f\u043f\u0438\u043d\u0433" }],
	["spa", "sparkles", { en: "Spa & Wellness", fr: "Spa", de: "Wellness", it: "Spa", es: "Spa", ru: "\u0421\u043f\u0430" }],
	["events", "ticket", { en: "Events & Shows", fr: "\u00c9v\u00e9nements", de: "Events", it: "Eventi", es: "Eventos", ru: "\u041c\u0435\u0440\u043e\u043f\u0440\u0438\u044f\u0442\u0438\u044f" }],
	["insurance", "shield", { en: "Travel Insurance", fr: "Assurance voyage", de: "Reiseversicherung", it: "Assicurazione viaggio", es: "Seguro de viaje", ru: "\u0421\u0442\u0440\u0430\u0445\u043e\u0432\u043a\u0430" }],
	["departure", "luggage", { en: "Departure Assist", fr: "Assistance d\u00e9part", de: "Abreise-Service", it: "Assistenza partenza", es: "Asistencia de salida", ru: "\u041f\u043e\u043c\u043e\u0449\u044c \u043f\u0440\u0438 \u0432\u044b\u043b\u0435\u0442\u0435" }],
]

// [category, title, location, imgKey, description, price, duration, rating, reviews, featured]
const SVC = [
	// === Internal Trips (all the excursion sheet items live here) ===
	["internal-trips", "Giftun Island Snorkeling", "Hurghada", "redsea", "Full-day boat trip to Giftun Island with snorkeling stops and lunch on board.", 45, "8h", 4.8, 214, 1],
	["internal-trips", "Super Safari Quad & Bedouin Dinner", "Eastern Desert", "desert", "Quad biking, camel ride, Bedouin village and BBQ dinner under the stars.", 35, "6h", 4.7, 168, 1],
	["internal-trips", "Dolphin House Sea Trip", "Hurghada", "redsea", "Cruise to Dolphin House reef, swim with wild dolphins, snorkeling and lunch.", 40, "7h", 4.9, 301, 1],
	["internal-trips", "Luxor Day Trip \u2014 Valley of the Kings", "Luxor", "karnak", "Full-day guided tour: Karnak, Valley of the Kings and Hatshepsut Temple.", 80, "14h", 4.9, 142, 1],
	["internal-trips", "Cairo & Pyramids Day Trip", "Cairo", "giza", "Giza Pyramids, Sphinx and the Egyptian Museum with a private guide.", 95, "16h", 4.8, 120, 1],
	["internal-trips", "Sunset Nile Felucca", "Aswan", "nile", "Relaxing felucca sail on the Nile at sunset with refreshments.", 20, "2h", 4.6, 88, 0],
	["internal-trips", "Paradise Island Boat Trip", "Hurghada", "redsea", "Boat trip to Paradise Island beach with snorkeling and free time.", 30, "7h", 4.5, 97, 0],
	["internal-trips", "Oriental Spa & Hammam Day", "Hurghada", "redsea", "Traditional hammam, massage and wellness session at a 5-star spa.", 25, "2h", 4.7, 54, 0],
	["internal-trips", "Makadi Water World", "Makadi Bay", "redsea", "Full-day access to Makadi water park with hotel transfers.", 28, "8h", 4.4, 76, 0],
	["internal-trips", "Intro Scuba Diving", "Hurghada", "redsea", "Beginner-friendly intro dive with a certified instructor, no experience needed.", 55, "5h", 4.8, 133, 1],
	// === Airport ===
	["airport", "Airport Meet & Greet + Fast Track", "Hurghada", "giza", "VIP welcome, fast-track immigration and luggage assistance on arrival.", 20, "1h", 4.9, 64, 1],
	["airport", "Private Airport Transfer (Sedan)", "Hurghada", "desert", "Private air-conditioned transfer between the airport and your hotel.", 15, "45m", 4.8, 90, 0],
	// === Visa ===
	["visa", "Egypt e-Visa Assistance", "Nationwide", "giza", "Fast online visa processing support before you travel.", 30, "24h", 4.7, 41, 0],
	// === Transfers ===
	["transfers", "Private Intercity Transfer", "Nationwide", "desert", "Comfortable private car between cities with a professional driver.", 60, "varies", 4.7, 38, 0],
	// === Hotels ===
	["hotels", "5-Star Hotel Booking Assist", "Nationwide", "nile", "Handpicked hotels and resorts with best-rate booking support.", 0, "\u2014", 4.8, 52, 0],
	// === Tours ===
	["tours", "Cairo City & Museum Guided Tour", "Cairo", "giza", "Half-day guided city tour including the Egyptian Museum.", 55, "6h", 4.8, 77, 1],
	// === Nile Cruise ===
	["nile-cruise", "4-Day Nile Cruise Luxor\u2013Aswan", "Luxor", "nile", "All-inclusive Nile cruise with guided temple visits and full board.", 320, "4d", 4.9, 210, 1],
	// === Diving ===
	["diving", "PADI Open Water Course (3 days)", "Hurghada", "redsea", "Certified PADI course with equipment and training dives.", 260, "3d", 4.9, 118, 1],
	// === Safari ===
	["safari", "Overnight Desert Camp & Stargazing", "Eastern Desert", "desert", "Bedouin camp, BBQ dinner, stargazing and sunrise over the dunes.", 85, "18h", 4.8, 66, 1],
	// === Car Rental ===
	["carrental", "Economy Car Rental (per day)", "Nationwide", "desert", "Self-drive economy car with insurance, per-day rate.", 35, "1d", 4.5, 29, 0],
	// === Guides ===
	["guide", "Private Egyptologist Guide (per day)", "Nationwide", "karnak", "Licensed Egyptologist guide for a fully personalized experience.", 70, "1d", 4.9, 84, 1],
	// === SIM ===
	["sim", "Tourist eSIM + Data Plan", "Nationwide", "giza", "Instant eSIM with data and a local number, activated on arrival.", 12, "\u2014", 4.6, 47, 0],
	// === Dining ===
	["dining", "Nile Dinner Cruise with Show", "Cairo", "nile", "Dinner cruise on the Nile with a live oriental show and belly dance.", 45, "3h", 4.7, 133, 1],
	// === Shopping ===
	["shopping", "Guided Khan el-Khalili Bazaar Tour", "Cairo", "giza", "Guided shopping tour through Cairo's historic bazaar.", 25, "3h", 4.6, 39, 0],
	// === Spa ===
	["spa", "Luxury Beachfront Spa Day", "Hurghada", "redsea", "Full-day spa access with massage, sauna and pool.", 40, "6h", 4.8, 44, 0],
	// === Events ===
	["events", "Sound & Light Show \u2014 Giza", "Giza", "giza", "Evening sound and light show at the Pyramids with transfers.", 30, "2h", 4.7, 58, 0],
	// === Insurance ===
	["insurance", "Travel Insurance (per week)", "Nationwide", "nile", "Medical and trip travel insurance coverage during your stay.", 18, "7d", 4.6, 22, 0],
	// === Departure ===
	["departure", "Departure Fast-Track & Lounge", "Hurghada", "giza", "Airport assistance, fast-track and lounge access on departure.", 25, "2h", 4.8, 31, 0],
]

const imgUrl = (k) => `/img/${k}.png`

export function seed({ reset = false } = {}) {
	migrate()
	if (reset) {
		for (const t of [
			"wallet_txns", "payouts", "wallets", "commissions", "bookings",
			"reviews", "service_images", "availability", "services",
			"affiliates", "banners", "vendors", "categories", "users", "settings",
		])
			db.exec(`DELETE FROM ${t};`)
		console.log("cleared all tables")
	}
	if (get("SELECT COUNT(*) c FROM users").c > 0 && !reset) {
		console.log("already seeded (users exist). Use --reset to reseed.")
		return
	}

	run("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)", "platform_commission", "0.10")

	const mkUser = (email, pw, role, name, lang = "en") => {
		run("INSERT INTO users (email,password_hash,role,name,lang,created_at) VALUES (?,?,?,?,?,?)", email, hashPassword(pw), role, name, lang, iso())
		return get("SELECT id FROM users WHERE email=?", email).id
	}

	mkUser("admin@masrguide.com", "admin123", "admin", "Platform Admin")
	const vendorUserId = mkUser("vendor@rodina.com", "vendor123", "vendor", "Rodina Travel Manager")
	const custId = mkUser("tourist@example.com", "tourist123", "customer", "Ivan Tourist", "ru")
	const ivanU = mkUser("ivan@aff.com", "aff123", "affiliate", "Ivan Petrov", "ru")
	const annaU = mkUser("anna@aff.com", "aff123", "affiliate", "Anna M\u00fcller", "de")
	const marcoU = mkUser("marco@aff.com", "aff123", "affiliate", "Marco Rossi", "it")

	run("INSERT INTO vendors (user_id,name,logo,city,description,languages,status,commission_rate,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
		vendorUserId, "Rodina Travel", null, "Hurghada", "VIP excursions & domestic trips across Egypt", "en,ru,de,it", "approved", 0.1, iso())
	const vendorId = get("SELECT id FROM vendors WHERE user_id=?", vendorUserId).id

	for (const [key, icon, labels] of CATS)
		run("INSERT INTO categories (key,icon,labels) VALUES (?,?,?)", key, icon, JSON.stringify(labels))
	const catId = (k) => get("SELECT id FROM categories WHERE key=?", k).id

	const serviceIds = []
	for (const [cat, title, loc, imgKey, desc, price, dur, rating, reviews, featured] of SVC) {
		const info = run(
			"INSERT INTO services (vendor_id,category_id,title,location,description,price,currency,duration,rating,reviews_count,featured,cancel_policy,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
			vendorId, catId(cat), title, loc, desc, price, "EGP", dur, rating, reviews, featured,
			"Free cancellation up to 24h before start", "active", iso())
		const sid = Number(info.lastInsertRowid)
		serviceIds.push(sid)
		const imgs = [imgKey, "nile", "giza"]
		imgs.forEach((k, i) => run("INSERT INTO service_images (service_id,url,position) VALUES (?,?,?)", sid, imgUrl(k), i))
		for (let d = 1; d <= 14; d++)
			run("INSERT OR IGNORE INTO availability (service_id,date,slots) VALUES (?,?,?)", sid, dayFromNow(d), 20)
	}

	const addAff = (userId, code, rate) => {
		run("INSERT INTO affiliates (user_id,vendor_id,code,commission_rate,clicks,created_at) VALUES (?,?,?,?,?,?)", userId, vendorId, code, rate, 0, iso())
		const a = get("SELECT id FROM affiliates WHERE code=?", code)
		walletFor("affiliate", a.id)
		return a.id
	}
	addAff(ivanU, "IVAN-2026", 0.06)
	addAff(annaU, "ANNA-DE", 0.05)
	addAff(marcoU, "MARCO-IT", 0.05)

	walletFor("platform", 0)
	walletFor("vendor", vendorId)

	run("INSERT INTO banners (title,image,service_id,active,position) VALUES (?,?,?,?,?)", "Red Sea Diving \u2014 Best Sellers", imgUrl("redsea"), serviceIds[0], 1, 0)
	run("INSERT INTO banners (title,image,service_id,active,position) VALUES (?,?,?,?,?)", "Luxor Full-Day Tour", imgUrl("karnak"), serviceIds[3], 1, 1)
	run("INSERT INTO banners (title,image,service_id,active,position) VALUES (?,?,?,?,?)", "Desert Safari Adventure", imgUrl("desert"), serviceIds[1], 1, 2)

	const b1 = createBooking({ service_id: serviceIds[0], customer_id: custId, referral_code: "IVAN-2026", date: dayFromNow(3), pax: 2 })
	setBookingStatus(b1.id, "confirmed")
	const b2 = createBooking({ service_id: serviceIds[2], customer_id: custId, referral_code: "ANNA-DE", date: dayFromNow(5), pax: 1 })
	setBookingStatus(b2.id, "completed")
	createBooking({ service_id: serviceIds[4], customer_id: custId, date: dayFromNow(7), pax: 3 })

	console.log("seed complete:", {
		users: get("SELECT COUNT(*) c FROM users").c,
		services: get("SELECT COUNT(*) c FROM services").c,
		categories: get("SELECT COUNT(*) c FROM categories").c,
		bookings: get("SELECT COUNT(*) c FROM bookings").c,
	})
}

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
	seed({ reset: process.argv.includes("--reset") })
}
