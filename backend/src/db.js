// SQLite layer using Node's built-in node:sqlite (no native deps).
import { DatabaseSync } from "node:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

const DB_PATH =
	process.env.DB_PATH || new URL("../data/app.db", import.meta.url).pathname
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec("PRAGMA journal_mode = WAL;")
db.exec("PRAGMA foreign_keys = ON;")

export function migrate() {
	db.exec(`
  CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    name TEXT, lang TEXT DEFAULT 'en',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    name TEXT NOT NULL, logo TEXT, city TEXT, description TEXT, languages TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    commission_rate REAL NOT NULL DEFAULT 0.10,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL, icon TEXT, labels TEXT
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id),
    category_id INTEGER REFERENCES categories(id),
    title TEXT NOT NULL, location TEXT, description TEXT,
    price REAL NOT NULL DEFAULT 0, currency TEXT DEFAULT 'EGP',
    duration TEXT, rating REAL DEFAULT 0, reviews_count INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0, cancel_policy TEXT,
    status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS service_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    url TEXT NOT NULL, position INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    date TEXT NOT NULL, slots INTEGER NOT NULL DEFAULT 0,
    UNIQUE(service_id, date)
  );

  CREATE TABLE IF NOT EXISTS affiliates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    vendor_id INTEGER REFERENCES vendors(id),
    code TEXT UNIQUE NOT NULL,
    commission_rate REAL NOT NULL DEFAULT 0.05,
    clicks INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT UNIQUE NOT NULL,
    service_id INTEGER REFERENCES services(id),
    vendor_id INTEGER REFERENCES vendors(id),
    customer_id INTEGER REFERENCES users(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    referral_code TEXT, date TEXT, pax INTEGER DEFAULT 1,
    amount REAL NOT NULL DEFAULT 0, currency TEXT DEFAULT 'EGP',
    status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    platform_share REAL DEFAULT 0, vendor_share REAL DEFAULT 0,
    affiliate_share REAL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    UNIQUE(owner_type, owner_id)
  );

  CREATE TABLE IF NOT EXISTS wallet_txns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER REFERENCES wallets(id),
    amount REAL NOT NULL, type TEXT NOT NULL, ref TEXT, created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER REFERENCES wallets(id),
    amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'requested',
    requested_at TEXT NOT NULL, resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER REFERENCES services(id),
    customer_id INTEGER REFERENCES users(id),
    rating INTEGER NOT NULL, comment TEXT, created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, image TEXT, service_id INTEGER REFERENCES services(id),
    active INTEGER DEFAULT 1, position INTEGER DEFAULT 0
  );
  `)
}

// Tiny query helpers.
export const get = (sql, ...p) => db.prepare(sql).get(...p)
export const all = (sql, ...p) => db.prepare(sql).all(...p)
export const run = (sql, ...p) => db.prepare(sql).run(...p)

export function setting(key, def) {
	const r = get("SELECT value FROM settings WHERE key=?", key)
	return r ? r.value : def
}

export function walletFor(type, id) {
	let w = get(
		"SELECT * FROM wallets WHERE owner_type=? AND owner_id=?",
		type,
		id,
	)
	if (!w) {
		run(
			"INSERT INTO wallets (owner_type,owner_id,balance) VALUES (?,?,0)",
			type,
			id,
		)
		w = get(
			"SELECT * FROM wallets WHERE owner_type=? AND owner_id=?",
			type,
			id,
		)
	}
	return w
}

export function credit(walletId, amount, type, ref) {
	run("UPDATE wallets SET balance = balance + ? WHERE id=?", amount, walletId)
	run(
		"INSERT INTO wallet_txns (wallet_id,amount,type,ref,created_at) VALUES (?,?,?,?,?)",
		walletId,
		amount,
		type,
		ref || null,
		new Date().toISOString(),
	)
}
