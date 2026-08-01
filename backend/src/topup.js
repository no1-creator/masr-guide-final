// Idempotent catalog top-up.
// Enriches every category with additional real services so no category page
// looks empty or thin. Runs on every server boot but only inserts services
// whose exact title does not already exist — so it never duplicates rows and
// never touches existing data. Safe/additive only.
import { get, run } from "./db.js"

const iso = () => new Date().toISOString()
const dayFromNow = (n) =>
	new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const imgUrl = (k) => `/img/${k}.png`

// [category, title, location, imgKey, description, price(USD), duration, rating, reviews, featured]
const EXTRA = [
	// === Airport ===
	["airport", "VIP Airport Lounge Access", "Cairo", "giza", "Relax before your flight with premium lounge access, snacks and Wi-Fi.", 30, "3h", 4.7, 52, 0],
	["airport", "Airport Assistance for Families", "Hurghada", "giza", "A dedicated helper for families with kids: check-in, luggage and fast-track.", 25, "1h", 4.8, 37, 0],
	// === Visa & Entry ===
	["visa", "Visa on Arrival Fast-Track", "Cairo", "giza", "Skip the queue with pre-arranged visa-on-arrival assistance at the airport.", 35, "1h", 4.8, 63, 1],
	["visa", "Multiple-Entry Visa Support", "Nationwide", "giza", "Guidance and paperwork for multiple-entry tourist visas.", 45, "48h", 4.6, 28, 0],
	["visa", "Visa Extension Assistance", "Cairo", "giza", "Help extending your tourist stay legally and hassle-free.", 40, "72h", 4.5, 19, 0],
	// === Transfers ===
	["transfers", "Airport–Hotel Shared Shuttle", "Hurghada", "desert", "Affordable shared shuttle between the airport and major hotels.", 10, "1h", 4.5, 71, 0],
	["transfers", "Private Minivan Transfer (up to 7)", "Hurghada", "desert", "Spacious private minivan for groups and families with luggage.", 40, "varies", 4.7, 44, 0],
	["transfers", "Luxury VIP Car Transfer", "Cairo", "desert", "Mercedes-class private transfer with a professional chauffeur.", 90, "varies", 4.9, 33, 1],
	// === Hotels & Stays ===
	["hotels", "Red Sea Resort — All Inclusive", "Hurghada", "redsea", "Handpicked 5-star all-inclusive beach resort with best-rate support.", 0, "—", 4.8, 96, 1],
	["hotels", "Nile-View Hotel — Cairo", "Cairo", "nile", "Central Cairo hotel with Nile views and easy access to landmarks.", 0, "—", 4.7, 58, 0],
	["hotels", "Boutique Hotel — Luxor", "Luxor", "karnak", "Charming boutique stay near the temples and the West Bank.", 0, "—", 4.6, 41, 0],
	// === Tours & Sightseeing ===
	["tours", "Alexandria Full-Day Tour", "Alexandria", "giza", "Catacombs, Citadel of Qaitbay and the Library of Alexandria.", 70, "12h", 4.7, 84, 1],
	["tours", "Islamic & Coptic Cairo Walking Tour", "Cairo", "giza", "Explore historic Cairo: mosques, churches and Khan el-Khalili.", 45, "5h", 4.7, 52, 0],
	["tours", "Memphis, Saqqara & Dahshur Tour", "Giza", "giza", "Discover the Step Pyramid and the earliest royal capitals.", 65, "7h", 4.8, 66, 0],
	["tours", "Abu Simbel Day Trip", "Aswan", "karnak", "Guided visit to the majestic temples of Ramses II at Abu Simbel.", 120, "14h", 4.9, 73, 1],
	// === Nile Cruises ===
	["nile-cruise", "5-Star Nile Cruise Aswan–Luxor", "Aswan", "nile", "Luxury 5-star cruise with full board and guided temple tours.", 420, "5d", 4.9, 141, 1],
	["nile-cruise", "Dahabiya Sailing Cruise", "Esna", "nile", "Intimate traditional dahabiya sailing experience on the Nile.", 560, "6d", 4.9, 38, 0],
	["nile-cruise", "Cairo Nile Dinner Cruise", "Cairo", "nile", "Evening dinner cruise with live entertainment in the capital.", 50, "3h", 4.6, 88, 0],
	// === Diving & Water Sports ===
	["diving", "Discover Scuba Diving (Beginners)", "Hurghada", "redsea", "Try scuba with a certified instructor — no experience required.", 50, "4h", 4.8, 127, 1],
	["diving", "Two-Tank Boat Dive", "Hurghada", "redsea", "Full-day boat dive to two of the Red Sea's best reef sites.", 70, "7h", 4.9, 102, 1],
	["diving", "Snorkeling Reef Adventure", "Hurghada", "redsea", "Guided snorkeling trip to vibrant coral reefs with equipment included.", 30, "5h", 4.6, 64, 0],
	["diving", "Liveaboard Diving Safari (3 nights)", "Red Sea", "redsea", "Multi-day liveaboard covering the top offshore dive sites.", 650, "4d", 4.9, 29, 0],
	// === Desert Safari ===
	["safari", "Sunset Desert Quad Safari", "Hurghada", "desert", "Quad biking across the desert with a Bedouin tea stop at sunset.", 30, "4h", 4.7, 118, 1],
	["safari", "Jeep Desert Adventure & BBQ", "Hurghada", "desert", "4x4 desert adventure, camel ride and BBQ dinner with a live show.", 45, "6h", 4.7, 87, 0],
	["safari", "White Desert Overnight Camp", "Bahariya", "desert", "Overnight camping among the surreal White Desert rock formations.", 180, "2d", 4.9, 42, 1],
	// === Car Rental ===
	["carrental", "SUV Rental (per day)", "Nationwide", "desert", "Self-drive SUV with full insurance, ideal for longer trips.", 55, "1d", 4.6, 24, 0],
	["carrental", "Luxury Car Rental (per day)", "Cairo", "desert", "Premium sedan rental with insurance and 24/7 support.", 120, "1d", 4.7, 17, 0],
	["carrental", "Car with Driver (per day)", "Nationwide", "desert", "Private car with an experienced local driver at your disposal.", 80, "1d", 4.8, 39, 1],
	// === Private Guides ===
	["guide", "Multilingual Tour Guide (per day)", "Nationwide", "karnak", "Guide fluent in English, German, Italian or Russian.", 65, "1d", 4.8, 56, 1],
	["guide", "Photography Guide & Tour", "Cairo", "giza", "A local guide who takes you to the best photo spots in the city.", 55, "5h", 4.7, 31, 0],
	["guide", "Family-Friendly Kids Guide", "Giza", "giza", "An engaging guide who makes history fun for children and families.", 60, "6h", 4.8, 22, 0],
	// === SIM & Internet ===
	["sim", "Tourist SIM Card + 20GB Data", "Nationwide", "giza", "Local SIM with generous data, delivered to your hotel.", 15, "—", 4.6, 58, 0],
	["sim", "Pocket Wi-Fi Rental", "Nationwide", "giza", "Portable 4G Wi-Fi hotspot for the whole family, per week.", 25, "7d", 4.5, 33, 0],
	// === Dining ===
	["dining", "Traditional Egyptian Cooking Class", "Cairo", "nile", "A hands-on class preparing classic Egyptian dishes with a chef.", 40, "3h", 4.8, 47, 1],
	["dining", "Rooftop Fine-Dining Experience", "Cairo", "nile", "Reserved table at a top rooftop restaurant with skyline views.", 60, "3h", 4.7, 39, 0],
	["dining", "Bedouin Dinner Under the Stars", "Hurghada", "desert", "Authentic Bedouin dinner in the desert with live music.", 35, "4h", 4.7, 72, 0],
	// === Shopping & Bazaars ===
	["shopping", "Handicrafts & Souvenirs Tour", "Cairo", "giza", "A curated tour to authentic workshops for genuine local crafts.", 30, "4h", 4.6, 28, 0],
	["shopping", "Gold & Jewelry Bazaar Tour", "Cairo", "giza", "Guided visit to trusted jewelers in Khan el-Khalili.", 25, "3h", 4.5, 21, 0],
	["shopping", "Spice & Perfume Market Experience", "Cairo", "giza", "Discover Egyptian spices and pure perfume oils with an expert.", 20, "2h", 4.6, 34, 0],
	// === Spa & Wellness ===
	["spa", "Traditional Hammam & Massage", "Hurghada", "redsea", "An authentic hammam ritual followed by a relaxing massage.", 30, "2h", 4.8, 61, 1],
	["spa", "Couples Spa Retreat", "Hurghada", "redsea", "Private couples spa package with massage and pool access.", 70, "3h", 4.8, 29, 0],
	["spa", "Wellness & Yoga Day by the Sea", "El Gouna", "redsea", "Yoga session, spa access and a healthy lunch by the Red Sea.", 55, "6h", 4.7, 24, 0],
	// === Events & Shows ===
	["events", "Cairo Opera House Evening", "Cairo", "nile", "Reserved seats for a classical or oriental performance.", 40, "3h", 4.7, 26, 0],
	["events", "Tanoura Spinning Show", "Cairo", "karnak", "Traditional Sufi Tanoura dance show in historic Cairo.", 20, "2h", 4.6, 44, 0],
	["events", "Hot Air Balloon over Luxor", "Luxor", "karnak", "Sunrise hot air balloon flight over the West Bank temples.", 110, "3h", 4.9, 97, 1],
	// === Travel Insurance ===
	["insurance", "Family Travel Insurance (per week)", "Nationwide", "nile", "Comprehensive medical and trip cover for the whole family.", 45, "7d", 4.6, 18, 0],
	["insurance", "Adventure Sports Insurance", "Nationwide", "nile", "Extra cover for diving, safari and adventure activities.", 28, "7d", 4.5, 14, 0],
	// === Departure Assist ===
	["departure", "Late Check-out & Day Room", "Hurghada", "giza", "Day-use hotel room and late check-out before an evening flight.", 35, "—", 4.6, 21, 0],
	["departure", "Departure Transfer + Fast-Track", "Hurghada", "giza", "Private transfer to the airport with departure fast-track service.", 30, "2h", 4.7, 26, 0],
	// === Pharmacy & Health (was empty) ===
	["pharmacy", "24/7 Medicine Delivery to Hotel", "Hurghada", "nile", "Round-the-clock delivery of medicines and essentials to your room.", 8, "1h", 4.7, 53, 1],
	["pharmacy", "Doctor House-Call Service", "Hurghada", "nile", "A licensed doctor visits your hotel for consultation and care.", 50, "1h", 4.8, 37, 1],
	["pharmacy", "Tourist First-Aid Kit", "Nationwide", "nile", "An essential travel first-aid kit delivered to your accommodation.", 15, "—", 4.5, 19, 0],
	["pharmacy", "Prescription Assistance", "Nationwide", "nile", "Help sourcing prescription medicines with pharmacist guidance.", 12, "2h", 4.6, 22, 0],

	// ===================================================================
	// ENRICHMENT v2 — real products & priced ticket tiers (additive only)
	// ===================================================================
	// --- Shopping & Bazaars: real products with prices ---
	["shopping", "Papyrus Art Painting (Hand-Painted)", "Cairo", "giza", "Authentic hand-painted papyrus with a certificate of authenticity, delivered to your hotel.", 18, "—", 4.7, 41, 1],
	["shopping", "Alabaster Pharaoh Statue", "Luxor", "karnak", "A hand-carved alabaster statue made by Luxor artisans.", 35, "—", 4.6, 27, 0],
	["shopping", "Gold Cartouche Name Necklace (18K)", "Cairo", "giza", "A personalized 18K gold cartouche engraved with your name in hieroglyphs.", 120, "—", 4.8, 63, 1],
	["shopping", "Silver Cartouche Name Necklace", "Cairo", "giza", "A personalized sterling-silver cartouche with your name in hieroglyphs.", 45, "—", 4.7, 52, 0],
	["shopping", "Egyptian Cotton Galabeya", "Cairo", "giza", "A handmade traditional galabeya in premium Egyptian cotton.", 28, "—", 4.6, 34, 0],
	["shopping", "Luxury Egyptian Cotton Bed Set", "Cairo", "nile", "A premium 100% Egyptian-cotton bed-linen set, gift-boxed.", 90, "—", 4.7, 22, 0],
	["shopping", "Egyptian Spice Gift Box", "Cairo", "giza", "A curated box of authentic Egyptian spices and herbs.", 22, "—", 4.6, 38, 0],
	["shopping", "Pure Perfume Oils Set", "Cairo", "giza", "A set of pure Egyptian perfume oils: jasmine, lotus and sandalwood.", 30, "—", 4.7, 45, 0],
	["shopping", "Handmade Bedouin Wool Rug", "Sinai", "desert", "An authentic hand-woven Bedouin rug with traditional patterns.", 75, "—", 4.6, 18, 0],
	["shopping", "Decorative Handmade Shisha", "Cairo", "giza", "A handcrafted decorative Egyptian shisha, ready to display or use.", 40, "—", 4.5, 20, 0],
	["shopping", "Khan el-Khalili Souvenir Pack", "Cairo", "giza", "A curated bundle of authentic small souvenirs and gifts.", 25, "—", 4.6, 29, 0],
	// --- Pharmacy & Health: real products with prices ---
	["pharmacy", "Sunscreen SPF 50+ (Delivered)", "Nationwide", "redsea", "High-protection SPF 50+ sunscreen delivered to your hotel.", 14, "—", 4.7, 46, 1],
	["pharmacy", "Insect Repellent Pack", "Nationwide", "nile", "Effective insect-repellent spray and wipes for trips and cruises.", 9, "—", 4.5, 27, 0],
	["pharmacy", "Oral Rehydration Salts (10 sachets)", "Nationwide", "nile", "Electrolyte rehydration sachets — essential in hot weather.", 7, "—", 4.6, 33, 0],
	["pharmacy", "Motion-Sickness Tablets", "Nationwide", "nile", "Anti-nausea tablets for cruises, boats and long transfers.", 6, "—", 4.5, 25, 0],
	["pharmacy", "Traveler Pain-Relief Pack", "Nationwide", "nile", "A paracetamol and ibuprofen essentials pack for travelers.", 8, "—", 4.6, 31, 0],
	["pharmacy", "Allergy & Antihistamine Pack", "Nationwide", "nile", "Antihistamine tablets and relief essentials for allergies.", 10, "—", 4.5, 17, 0],
	["pharmacy", "Hand Sanitizer & Masks Kit", "Nationwide", "nile", "A travel hygiene kit with sanitizer gel and face masks.", 8, "—", 4.5, 21, 0],
	// --- Events & Shows: ticket tiers, each priced ---
	["events", "Sound & Light Show — VIP Seating", "Giza", "karnak", "Premium front-section seating for the Pyramids sound & light show, with transfers.", 55, "2h", 4.8, 34, 1],
	["events", "Sound & Light Show — Private Dinner Package", "Giza", "karnak", "VIP seating plus a private dinner with pyramid views and transfers.", 95, "4h", 4.9, 19, 1],
	["events", "Cairo Opera House — VIP Box", "Cairo", "nile", "Private VIP box seating for a classical or oriental performance.", 80, "3h", 4.8, 15, 1],
	["events", "Football Match Ticket — Category 2", "Cairo", "giza", "A standard-tier seat for a local league or cup football match.", 25, "2h", 4.5, 28, 0],
	["events", "Football Match Ticket — Category 1", "Cairo", "giza", "A premium mid-tier seat with a great view of the pitch.", 45, "2h", 4.6, 22, 0],
	["events", "Football Match Ticket — VIP Box", "Cairo", "giza", "A VIP box experience with hospitality for a football match.", 120, "3h", 4.8, 12, 1],
	["events", "Live Music Night — General Admission", "Cairo", "nile", "General admission to a live concert or music night in Cairo.", 30, "3h", 4.6, 24, 0],
	["events", "Live Music Night — Front Row", "Cairo", "nile", "Front-row premium tickets to a live concert or music night.", 65, "3h", 4.7, 16, 1],
	["events", "Tanoura Show — Premium Seating", "Cairo", "karnak", "Front-row premium seating for the traditional Tanoura show.", 35, "2h", 4.6, 18, 0],
	["events", "Hot Air Balloon over Luxor — Private Basket", "Luxor", "karnak", "An exclusive private balloon basket at sunrise over Luxor.", 220, "3h", 4.9, 21, 1],
	// --- More depth across other categories ---
	["tours", "Giza Pyramids & Sphinx Private Half-Day", "Giza", "giza", "A private half-day tour of the Pyramids, Sphinx and Valley Temple.", 55, "5h", 4.8, 91, 1],
	["tours", "Luxor East & West Bank Full-Day", "Luxor", "karnak", "Karnak, Luxor Temple, Valley of the Kings and Hatshepsut in one day.", 90, "10h", 4.8, 77, 0],
	["dining", "Cairo Street-Food Walking Tour", "Cairo", "nile", "Taste the best of Egyptian street food with a local foodie guide.", 30, "3h", 4.7, 58, 0],
	["dining", "Seafood Dinner in Alexandria", "Alexandria", "nile", "A fresh Mediterranean seafood dinner at a top Alexandria spot.", 45, "3h", 4.6, 26, 0],
	["spa", "Full-Body Aromatherapy Massage", "Hurghada", "redsea", "A relaxing full-body aromatherapy massage with premium oils.", 40, "90m", 4.8, 33, 0],
	["guide", "Egyptologist Expert Guide (per day)", "Nationwide", "karnak", "A certified Egyptologist for an in-depth historical experience.", 95, "1d", 4.9, 41, 1],
	["sim", "Unlimited Data eSIM (30 days)", "Nationwide", "giza", "A 30-day unlimited-data eSIM activated instantly on arrival.", 30, "30d", 4.6, 37, 0],
	["insurance", "Solo Traveler Insurance (per week)", "Nationwide", "nile", "Essential medical and trip cover for solo travelers.", 22, "7d", 4.5, 15, 0],
	["insurance", "Annual Multi-Trip Insurance", "Nationwide", "nile", "Year-round cover for frequent travelers across multiple trips.", 120, "1y", 4.6, 11, 0],
	["carrental", "Economy Car Rental (per day)", "Nationwide", "desert", "An affordable economy car with full insurance for self-drive.", 35, "1d", 4.5, 26, 0],
	["transfers", "Intercity Private Transfer (Cairo–Alexandria)", "Cairo", "desert", "A comfortable private intercity transfer between Cairo and Alexandria.", 90, "3h", 4.7, 19, 0],
	["airport", "Meet & Greet + Fast-Track Arrival", "Cairo", "giza", "A personal greeter and fast-track through arrival formalities.", 28, "1h", 4.8, 44, 1],
]

export function topupCatalog() {
	const vendor = get("SELECT id FROM vendors ORDER BY id LIMIT 1")
	if (!vendor) return
	const vendorId = vendor.id
	let added = 0
	for (const [cat, title, loc, imgKey, desc, price, dur, rating, reviews, featured] of EXTRA) {
		const catRow = get("SELECT id FROM categories WHERE key=?", cat)
		if (!catRow) continue
		if (get("SELECT id FROM services WHERE title=?", title)) continue
		const info = run(
			"INSERT INTO services (vendor_id,category_id,title,location,description,price,currency,duration,rating,reviews_count,featured,cancel_policy,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
			vendorId, catRow.id, title, loc, desc, price, "USD", dur, rating, reviews, featured,
			"Free cancellation up to 24h before start", "active", iso())
		const sid = Number(info.lastInsertRowid)
		const imgs = [imgKey, "nile", "giza"]
		imgs.forEach((k, i) => run("INSERT INTO service_images (service_id,url,position) VALUES (?,?,?)", sid, imgUrl(k), i))
		for (let d = 1; d <= 14; d++)
			run("INSERT OR IGNORE INTO availability (service_id,date,slots) VALUES (?,?,?)", sid, dayFromNow(d), 20)
		added++
	}
	if (added) console.log("[topup] added", added, "catalog service(s)")
}
