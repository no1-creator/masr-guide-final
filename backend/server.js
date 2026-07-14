// Masr Guide API — zero-dependency Node.js HTTP server.
import http from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join } from "node:path"
import { migrate, get, run } from "./src/db.js"
import { seed } from "./src/seed.js"
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

migrate()

// Ensure the Pharmacy & Health category exists. Idempotent and safe on a live
// database with real data — INSERT OR IGNORE only adds it if the key is missing.
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

if (get("SELECT COUNT(*) c FROM users").c === 0) {
  console.log("empty database — seeding demo data...")
  seed()
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
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

async function serveStatic(res, pathname) {
  try {
    const rel = pathname === "/" ? "/app.html" : pathname
    const fp = join(PUBLIC_DIR, rel)
    if (!fp.startsWith(PUBLIC_DIR)) return false
    const st = await stat(fp)
    if (!st.isFile()) return false
    const buf = await readFile(fp)
    res.writeHead(200, {
      "Content-Type": MIME[extname(fp)] || "application/octet-stream",
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

    if (await serveStatic(res, pathname)) return
    if (pathname === "/")
      return sendJSON(res, 200, { name: "Masr Guide API", status: "ok", docs: "/api" })
    return sendJSON(res, 404, { error: "not found" })
  } catch (e) {
    if (e instanceof HttpError)
      return sendJSON(res, e.status, { error: e.message, details: e.details })
    console.error("ERR", e)
    return sendJSON(res, 500, { error: "internal error", message: String((e && e.message) || e) })
  }
})

server.listen(PORT, () => console.log(`Masr Guide API on http://localhost:${PORT}`))
