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

const CHROME_CSS =
  "#dash-title{font-size:23px;font-weight:800;letter-spacing:-.4px;color:var(--text)}" +
  "#dnav{display:flex;flex-direction:column;gap:5px}" +
  "#dnav button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:11px 13px;border-radius:11px;border:1px solid transparent;background:transparent;color:var(--text2);font-size:14px;font-weight:600;cursor:pointer;transition:background .15s ease,color .15s ease,transform .15s ease,box-shadow .15s ease}" +
  "#dnav button svg,#dnav button .ci,#dnav button img{width:19px;height:19px;flex:0 0 auto;opacity:.85}" +
  "#dnav button:hover{background:var(--soft);color:var(--text);transform:translateX(2px)}" +
  "#dnav button.on{background:linear-gradient(135deg,var(--blue),var(--blue-h));color:#fff;box-shadow:0 10px 22px rgba(18,59,76,.24)}" +
  "#dnav button.on svg,#dnav button.on .ci{opacity:1;color:#fff}" +
  "#dnav button.on:hover{transform:none;color:#fff}" +
  "#dash-view .btn,#dash-view button.btn{border-radius:10px;font-weight:700;transition:transform .15s ease,box-shadow .15s ease,filter .15s ease}" +
  "#dash-view .btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(18,59,76,.16);filter:brightness(1.03)}" +
  "#dash-view .btn.primary,#dash-view .btn-primary,#dash-view .btn.blue{background:linear-gradient(135deg,var(--blue),var(--blue-h));border-color:transparent;color:#fff}" +
  "#dmain button{border-radius:9px;cursor:pointer;transition:box-shadow .15s ease,filter .15s ease}" +
  "#dmain button:hover{filter:brightness(1.03)}" +
  ".dp-kpi,.dp-panel{box-shadow:0 1px 2px rgba(18,59,76,.05)}" +
  ".dp-panel:hover{box-shadow:0 10px 24px rgba(18,59,76,.07)}"

const NOFILL_JS =
  "(function(){function fix(){var q=document.getElementById('q');if(!q)return;" +
  "if(!q.__ragoInit){q.__ragoInit=1;q.setAttribute('autocomplete','off');" +
  "q.setAttribute('name','rago_s_'+Math.random().toString(36).slice(2,7));" +
  "q.setAttribute('readonly','readonly');" +
  "var unlock=function(){q.__ragoTyped=1;q.removeAttribute('readonly');};" +
  "q.addEventListener('focus',unlock);q.addEventListener('pointerdown',unlock);}" +
  "if(!q.__ragoTyped&&q.value&&q.value.indexOf('@')>=0){q.value='';" +
  "if(window.loadServices){try{loadServices()}catch(e){}}}}" +
  "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fix);}else{fix();}" +
  "var n=0,iv=setInterval(function(){fix();if(++n>25){clearInterval(iv);}},140);})();"

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

const RENDERER_FILES = [
  "service-detail-transport.js",
]

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
      if (!html.includes('id="rago-chrome"')) {
        const styleTag = '\n<style id="rago-chrome">' + CHROME_CSS + "</style>\n"
        if (html.includes("</head>")) html = html.replace("</head>", styleTag + "</head>")
        else if (html.includes("</body>")) html = html.replace("</body>", styleTag + "</body>")
        else html = styleTag + html
      }
      if (!html.includes("dashboard-pro.js?b=")) {
        const tag = '\n<script src="dashboard-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", tag + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", tag + "</html>")
        else html = html + tag
      }
      if (!html.includes("admin-pro.js?b=")) {
        const ap = '\n<script src="admin-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", ap + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", ap + "</html>")
        else html = html + ap
      }
      if (!html.includes("dash-plus.js?b=")) {
        const dpx = '\n<script src="dash-plus.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", dpx + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", dpx + "</html>")
        else html = html + dpx
      }
      if (!html.includes("service-detail-data.js?b=")) {
        const sdd = '\n<script src="service-detail-data.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", sdd + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", sdd + "</html>")
        else html = html + sdd
      }
      for (let i = 1; i <= 5; i++) {
        const scMark = "service-content-" + i + ".js?b="
        if (!html.includes(scMark)) {
          const sc = '\n<script src="service-content-' + i + '.js?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", sc + "</body>")
          else if (html.includes("</html>")) html = html.replace("</html>", sc + "</html>")
          else html = html + sc
        }
      }
      for (const rf of RENDERER_FILES) {
        const rfMark = rf + "?b="
        if (!html.includes(rfMark)) {
          const rft = '\n<script src="' + rf + '?b=' + BUILD_ID + '"></script>\n'
          if (html.includes("</body>")) html = html.replace("</body>", rft + "</body>")
          else if (html.includes("</html>")) html = html.replace("</html>", rft + "</html>")
          else html = html + rft
        }
      }
      if (!html.includes("service-detail-pro.js?b=")) {
        const sdp = '\n<script src="service-detail-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", sdp + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", sdp + "</html>")
        else html = html + sdp
      }
      if (!html.includes("home-pro.js?b=")) {
        const hp = '\n<script src="home-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", hp + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", hp + "</html>")
        else html = html + hp
      }
      if (!html.includes("fix-opendetail.js?b=")) {
        const fix = '\n<script src="fix-opendetail.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", fix + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", fix + "</html>")
        else html = html + fix
      }
      if (!html.includes('id="rago-nofill"')) {
        const nf = '\n<script id="rago-nofill">' + NOFILL_JS + "</script>\n"
        if (html.includes("</body>")) html = html.replace("</body>", nf + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", nf + "</html>")
        else html = html + nf
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
