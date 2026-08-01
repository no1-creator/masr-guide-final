// Masr Guide API — zero-dependency Node.js HTTP server.
import http from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join } from "node:path"
import { migrate, get, all, run } from "./src/db.js"
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
import { routes as groupTripRoutes } from "./src/routes/groupTrips.js"

migrate()

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

run("UPDATE services SET currency='USD' WHERE currency IS NULL OR currency='EGP'")
run("UPDATE bookings SET currency='USD' WHERE currency IS NULL OR currency='EGP'")

const CAT_IMG = {
  airport:        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
  visa:           "https://images.unsplash.com/photo-1618044733300-9472054094ee?w=800&q=80",
  transfers:      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
  hotels:         "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  "internal-trips": "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800&q=80",
  tours:          "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80",
  "nile-cruise":  "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=800&q=80",
  diving:         "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
  safari:         "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80",
  carrental:      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
  guide:          "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=80",
  sim:            "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80",
  dining:         "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  shopping:       "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
  spa:            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
  events:         "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  insurance:      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
  departure:      "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80",
  pharmacy:       "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
}

const oldImgCount = get("SELECT COUNT(*) c FROM service_images WHERE url LIKE '/img/%'").c
if (oldImgCount > 0) {
  const svcs = all(
    "SELECT s.id, c.key cat FROM services s LEFT JOIN categories c ON c.id = s.category_id"
  )
  for (const svc of svcs) {
    const img = CAT_IMG[svc.cat] || CAT_IMG["internal-trips"]
    run("UPDATE service_images SET url=? WHERE service_id=?", img, svc.id)
  }
  run("UPDATE banners SET image='https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80' WHERE image LIKE '/img/redsea%'")
  run("UPDATE banners SET image='https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&q=80' WHERE image LIKE '/img/karnak%'")
  run("UPDATE banners SET image='https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80' WHERE image LIKE '/img/desert%'")
  console.log("[migration] Fixed", oldImgCount, "service image(s) to Unsplash URLs")
}

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
const BUILD_ID = Date.now()
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
    const ext = extname(fp)

    if (ext === ".html") {
      let html = (await readFile(fp)).toString("utf8")

      // ✅ V3-CLEAN: fully self-contained — inject NOTHING at all
      if (html.includes("<!-- RAGO-V3-CLEAN -->")) {
        res.writeHead(200, {
          "Content-Type": MIME[ext],
          "Cache-Control": "no-store, must-revalidate",
        })
        res.end(html)
        return true
      }

      // Legacy v1/v2 injection below
      const isV2 = html.includes("<!-- RAGO-V2 -->")

      if (!html.includes('id="rago-chrome"')) {
        const styleTag = '\n<style id="rago-chrome">' +
          "#dash-title{font-size:23px;font-weight:800;color:var(--text)}" +
          "#dnav{display:flex;flex-direction:column;gap:5px}" +
          "#dnav button{display:flex;align-items:center;gap:11px;width:100%;padding:11px 13px;border-radius:11px;border:1px solid transparent;background:transparent;color:var(--text2);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}" +
          "#dnav button.on{background:linear-gradient(135deg,var(--blue),var(--blue-h));color:#fff}" +
          "</style>\n"
        if (html.includes("</head>")) html = html.replace("</head>", styleTag + "</head>")
        else html = styleTag + html
      }
      if (!html.includes("dashboard-pro.js?b=")) {
        const tag = '\n<script src="dashboard-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", tag + "</body>")
        else html = html + tag
      }
      if (!html.includes("admin-pro.js?b=")) {
        const ap = '\n<script src="admin-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", ap + "</body>")
        else html = html + ap
      }
      if (!html.includes("dash-plus.js?b=")) {
        const dpx = '\n<script src="dash-plus.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", dpx + "</body>")
        else html = html + dpx
      }
      if (!isV2) {
        if (!html.includes("service-detail-data.js?b=")) {
          const sdd = '\n<script src="service-detail-data.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", sdd + "</body>")
          else html = html + sdd
        }
        for (let i = 1; i <= 5; i++) {
          const scMark = "service-content-" + i + ".js?b="
          if (!html.includes(scMark)) {
            const sc = '\n<script src="service-content-' + i + '.js?b=' + BUILD_ID + '"></script>\n'
            if (html.includes("</body>")) html = html.replace("</body>", sc + "</body>")
            else html = html + sc
          }
        }
        if (!html.includes("service-detail-transport.js?b=")) {
          const rft = '\n<script src="service-detail-transport.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", rft + "</body>")
          else html = html + rft
        }
        if (!html.includes("service-detail-pro.js?b=")) {
          const sdp = '\n<script src="service-detail-pro.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", sdp + "</body>")
          else html = html + sdp
        }
        if (!html.includes("home-pro.js?b=")) {
          const hp = '\n<script src="home-pro.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", hp + "</body>")
          else html = html + hp
        }
        if (!html.includes("fix-opendetail.js?b=")) {
          const fix = '\n<script src="fix-opendetail.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", fix + "</body>")
          else html = html + fix
        }
      }
      res.writeHead(200, {
        "Content-Type": MIME[ext],
        "Cache-Control": "no-store, must-revalidate",
      })
      res.end(html)
      return true
    }

    const buf = await readFile(fp)
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
    }
    if (ext === ".js") headers["Cache-Control"] = "no-store, must-revalidate"
    res.writeHead(200, headers)
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
    if (pathname === "/" || !pathname.includes("."))
      if (await serveStatic(res, "/app.html")) return
    return sendJSON(res, 404, { error: "not found" })
  } catch (e) {
    if (e instanceof HttpError)
      return sendJSON(res, e.status, { error: e.message, details: e.details })
    console.error("ERR", e)
    return sendJSON(res, 500, { error: "internal error", message: String((e && e.message) || e) })
  }
})

server.listen(PORT, () => console.log(`Masr Guide API on http://localhost:${PORT}`))
