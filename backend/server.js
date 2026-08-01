// Masr Guide API — zero-dependency Node.js HTTP server.
import http from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join } from "node:path"
import { migrate, get, all, run } from "./src/db.js"
import { seed } from "./src/seed.js"
import { topupCatalog } from "./src/topup.js"
import { enrichCatalog } from "./src/enrich.js"
import { verifyToken, bearer } from "./src/auth.js"
import { sendJSON, preflight, readBody, parseQuery, HttpError } from "./src/util.js"

import { routes as authRoutes } from "./src/routes/auth.js"
import { routes as catalogRoutes } from "./src/routes/catalog.js"
import { routes as vendorRoutes } from "./src/routes/vendors.js"
import { routes as affiliateRoutes } from "./src/routes/affiliates.js"
import { routes as bookingRoutes } from "./src/routes/bookings.js"
import { routes as walletRoutes } from "./src/routes/wallets.js"
import { routes as bannerRoutes } from "./src/routes/banners.js"
import { routes as reviewRoutes } from "./src/routes/reviews.js"
import { routes as adminRoutes } from "./src/routes/admin.js"
import { routes as groupTripRoutes } from "./src/routes/groupTrips.js"

migrate()

// Ensure the Pharmacy & Health category exists (idempotent).
run(
  "INSERT OR IGNORE INTO categories (key,icon,labels) VALUES (?,?,?)",
  "pharmacy",
  "pharmacy",
  JSON.stringify({
    en: "Pharmacy & Health",
    fr: "Pharmacie & santé",
    de: "Apotheke & Gesundheit",
    it: "Farmacia & salute",
    es: "Farmacia y salud",
    ru: "Аптека и здоровье",
  }),
)

// Prices are shown in US Dollars ($). Idempotent — only changes the label.
run("UPDATE services SET currency='USD' WHERE currency IS NULL OR currency='EGP'")
run("UPDATE bookings SET currency='USD' WHERE currency IS NULL OR currency='EGP'")

// Restore service images to local /img/cat-<key>.jpg files.
// A previous server version replaced them with Unsplash URLs. This migration
// reverses that change so the original category images are shown again.
// Idempotent: only runs if Unsplash URLs are still present.
{
  const badCount = get(
    "SELECT COUNT(*) c FROM service_images WHERE url LIKE 'https://images.unsplash.com/%'"
  ).c
  if (badCount > 0) {
    const rows = all(
      "SELECT si.id si_id, c.key cat " +
      "FROM service_images si " +
      "JOIN services s ON s.id = si.service_id " +
      "JOIN categories c ON c.id = s.category_id"
    )
    for (const row of rows) {
      run(
        "UPDATE service_images SET url=? WHERE id=?",
        "/img/cat-" + row.cat + ".jpg",
        row.si_id
      )
    }
    console.log("[migration] Restored", badCount, "service image(s) to local /img/ URLs")
  }

  // Restore banner images to our original hero shots.
  const badBanners = get(
    "SELECT COUNT(*) c FROM banners WHERE image LIKE 'https://images.unsplash.com/%'"
  ).c
  if (badBanners > 0) {
    const bannerRows = all(
      "SELECT id FROM banners WHERE image LIKE 'https://images.unsplash.com/%' ORDER BY id"
    )
    const heroImgs = ["/img/giza.png", "/img/nile.png", "/img/redsea.png", "/img/desert.png", "/img/karnak.png"]
    bannerRows.forEach((b, i) => {
      run("UPDATE banners SET image=? WHERE id=?", heroImgs[i % heroImgs.length], b.id)
    })
    console.log("[migration] Restored", badBanners, "banner image(s) to local /img/ paths")
  }
}

if (get("SELECT COUNT(*) c FROM users").c === 0) {
  console.log("empty database \u2014 seeding demo data...")
  seed()
}

// Enrich thin/empty categories with more real services (idempotent, additive).
// Never duplicates or deletes existing rows; safe to run on every boot.
try {
  topupCatalog()
} catch (e) {
  console.error("[topup] skipped:", (e && e.message) || e)
}

// Fill empty detail pages with reviews + availability and give hotels a real
// per-night price (idempotent, additive).
try {
  enrichCatalog()
} catch (e) {
  console.error("[enrich] skipped:", (e && e.message) || e)
}

const ROUTES = [
  ...authRoutes,
  ...catalogRoutes,
  ...vendorRoutes,
  ...affiliateRoutes,
  ...bookingRoutes,
  ...walletRoutes,
  ...bannerRoutes,
  ...reviewRoutes,
  ...adminRoutes,
  ...groupTripRoutes,
].map((r) => ({ ...r, seg: r.path.split("/").filter(Boolean) }))

function matchRoute(method, pathname) {
  const parts = pathname.split("/").filter(Boolean)
  for (const r of ROUTES) {
    if (r.method !== method) continue
    if (r.seg.length !== parts.length) continue
    const params = {}
    let ok = true
    for (let i = 0; i < r.seg.length; i++) {
      const s = r.seg[i]
      if (s.startsWith(":")) params[s.slice(1)] = decodeURIComponent(parts[i])
      else if (s !== parts[i]) {
        ok = false
        break
      }
    }
    if (ok) return { route: r, params }
  }
  return null
}

const PORT = process.env.PORT || 4000
const PUBLIC_DIR = new URL("./public/", import.meta.url).pathname

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
}

// Files that are rebuilt/redeployed frequently must always be revalidated so
// users never see a stale cached version after a deploy. Images are stable
// content so we allow long caching for performance.
const ALWAYS_FRESH = new Set([".html", ".js", ".css", ".json", ".svg"])

async function serveStatic(res, pathname, req) {
  try {
    const rel = pathname === "/" ? "/app.html" : pathname
    const fp = join(PUBLIC_DIR, rel)
    if (!fp.startsWith(PUBLIC_DIR)) return false
    const st = await stat(fp)
    if (!st.isFile()) return false
    const ext = extname(fp)
    const fresh = ALWAYS_FRESH.has(ext)
    const lastModified = st.mtime.toUTCString()

    // Fast path: if the browser already has the current version, return 304.
    if (fresh && req && req.headers["if-modified-since"] === lastModified) {
      res.writeHead(304, {
        "Cache-Control": "no-cache, must-revalidate",
        "Last-Modified": lastModified,
      })
      res.end()
      return true
    }

    const buf = await readFile(fp)
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Last-Modified": lastModified,
      "Cache-Control": fresh
        ? "no-cache, must-revalidate"
        : "public, max-age=604800",
    })
    res.end(buf)
    return true
  } catch {
    return false
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return preflight(res)
    const url = req.url || "/"
    const pathname = decodeURIComponent(url.split("?")[0])

    if (pathname === "/health")
      return sendJSON(res, 200, { name: "Masr Guide API", status: "ok", version: "0.1.0" })
    if (pathname === "/api")
      return sendJSON(res, 200, { routes: ROUTES.map((r) => `${r.method} ${r.path}`) })

    if (pathname.startsWith("/api/")) {
      const m = matchRoute(req.method, pathname)
      if (!m) return sendJSON(res, 404, { error: "not found", path: pathname })
      const { route, params } = m
      let user = null
      const token = bearer(req)
      if (token) {
        const payload = verifyToken(token)
        if (payload) user = get("SELECT * FROM users WHERE id=?", payload.sub)
      }
      if (route.auth) {
        if (!user) return sendJSON(res, 401, { error: "authentication required" })
        if (
          Array.isArray(route.auth) &&
          route.auth.length &&
          !route.auth.includes(user.role) &&
          user.role !== "admin"
        )
          return sendJSON(res, 403, { error: "forbidden for role " + user.role })
      }
      const body =
        req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
          ? await readBody(req)
          : {}
      const query = parseQuery(url)
      const data = await route.handler({ req, res, params, query, body, user })
      return sendJSON(res, 200, data)
    }

    if (await serveStatic(res, pathname, req)) return
    // Fallback: any non-API, non-file path serves the app shell.
    if (await serveStatic(res, "/app.html", req)) return
    return sendJSON(res, 404, { error: "not found" })
  } catch (e) {
    if (e instanceof HttpError)
      return sendJSON(res, e.status, { error: e.message, details: e.details })
    console.error("ERR", e)
    return sendJSON(res, 500, { error: "internal error", message: String((e && e.message) || e) })
  }
})

server.listen(PORT, () => console.log(`Masr Guide API on http://localhost:${PORT}`))
