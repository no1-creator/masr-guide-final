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

// Prices are shown in US Dollars ($) across the website and app. This
// idempotent migration relabels any legacy EGP rows to USD on the live DB.
// It only changes the currency label — it never touches the numeric price.
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
// A unique id per server start (per deploy). Used to version the dashboard
// enhancement URL so a fresh copy is fetched after every deploy.
const BUILD_ID = Date.now()
const PUBLIC_DIR = new URL("./public/", import.meta.url).pathname

// World-class dashboard chrome (server-injected CSS, additive & safe).
// Restyles the sidebar menu, buttons, header and adds premium shadows across
// ALL role dashboards. It only overrides visual properties via a <style> tag
// added to the served HTML; no source file and no behaviour is changed.
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

// Autofill guard (server-injected JS, additive & safe). Some browsers dump the
// saved login email into the public "Search trips" box (#q) because it is a lone
// text field. This makes #q readonly-until-focus (which browsers never autofill)
// and clears any email that slipped in, then refreshes the results. It never
// interferes once the user actually focuses/typing in the box, and no source
// file is modified — only the SERVED HTML gets this tiny guard.
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

async function serveStatic(res, pathname) {
  try {
    const rel = pathname === "/" ? "/app.html" : pathname
    const fp = join(PUBLIC_DIR, rel)
    if (!fp.startsWith(PUBLIC_DIR)) return false
    const st = await stat(fp)
    if (!st.isFile()) return false
    const ext = extname(fp)

    // Serve the HTML shell fresh every time, guarantee the world-class
    // dashboard enhancement loads, and inject premium chrome styles. All
    // changes are purely additive: the file on disk is never modified, we only
    // adjust the SERVED response.
    if (ext === ".html") {
      let html = (await readFile(fp)).toString("utf8")
      // Premium chrome styles (menu/buttons/colors) for all dashboards.
      if (!html.includes('id="rago-chrome"')) {
        const styleTag = '\n<style id="rago-chrome">' + CHROME_CSS + "</style>\n"
        if (html.includes("</head>")) html = html.replace("</head>", styleTag + "</head>")
        else if (html.includes("</body>")) html = html.replace("</body>", styleTag + "</body>")
        else html = styleTag + html
      }
      // Force-load dashboard-pro.js with a per-deploy version, independent of
      // any cached demo-trips.js loader or cached dashboard-pro.js. The script
      // is idempotent (it guards against double-install), so this is safe even
      // when the existing loader also runs.
      if (!html.includes("dashboard-pro.js?b=")) {
        const tag = '\n<script src="dashboard-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", tag + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", tag + "</html>")
        else html = html + tag
      }
      // Load the Admin control center (providers / services / bookings
      // management). Self-contained file that chains after dashboard-pro.js;
      // purely additive, no source file changed.
      if (!html.includes("admin-pro.js?b=")) {
        const ap = '\n<script src="admin-pro.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", ap + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", ap + "</html>")
        else html = html + ap
      }
      // Load the Provider & Marketer control enhancements (dash-plus.js).
      // Self-contained; chains after admin-pro.js. Purely additive, no source
      // file changed.
      if (!html.includes("dash-plus.js?b=")) {
        const dpx = '\n<script src="dash-plus.js?b=' + BUILD_ID + '"></script>\n'
        if (html.includes("</body>")) html = html.replace("</body>", dpx + "</body>")
        else if (html.includes("</html>")) html = html.replace("</html>", dpx + "</html>")
        else html = html + dpx
      }
      // Stop browser autofill from dumping the saved login email into the public
      // "Search trips" box (#q). Purely additive guard; no source file changed.
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
    // Never cache JS bundles so updates reach users immediately.
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
