/* RaGo — Group Trips ("Create Your Journey") front-end add-on.
 * Fully self-contained. Reuses the global helpers already defined in app.html:
 *   api, show, toast, money, esc, v, openModal, closeModal, iconSvg, qrSvg,
 *   openLogin, loadSec, and the globals USER, NAV, SEC, NAVICON.
 * Load it AFTER app.html's main <script>, i.e. right before </body>:
 *   <script src="group-trips.js"></script>
 */
(function () {
  "use strict"

  // ---------- small helpers ----------
  function loggedIn() {
    return typeof USER !== "undefined" && USER
  }
  function fmtDate(s) {
    if (!s) return "—"
    try {
      return new Date(s).toLocaleDateString()
    } catch (e) {
      return s
    }
  }
  function countdown(deadline) {
    if (!deadline) return "no deadline"
    var ms = new Date(deadline).getTime() - Date.now()
    if (ms <= 0) return "deadline passed"
    var d = Math.floor(ms / 86400000)
    var h = Math.floor((ms % 86400000) / 3600000)
    return d > 0 ? d + "d " + h + "h left" : h + "h left"
  }
  function pctOf(t) {
    return t.min_people
      ? Math.min(100, Math.round((t.members_count / t.min_people) * 100))
      : 0
  }

  // ========================================================================
  // TRAVELLER-FACING UI
  // ========================================================================

  // Inject the "Create Your Journey" banner + open-trips list at the top of the
  // public view (no edits to existing markup required).
  function injectEntry() {
    var pv = document.getElementById("public-view")
    if (!pv || document.getElementById("gt-entry")) return
    var sec = document.createElement("div")
    sec.id = "gt-entry"
    sec.className = "container"
    sec.style.margin = "14px auto 0"
    sec.innerHTML =
      '<div style="background:linear-gradient(135deg,#123B4C,#0E2E3B);border-radius:14px;padding:22px 24px;color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:16px">' +
      '<div style="flex:1;min-width:220px">' +
      '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E8850F">Create Your Journey</div>' +
      '<h2 style="margin:6px 0 4px;font-size:22px;color:#fff">Design your own trip — other travellers can join</h2>' +
      '<div style="opacity:.85;font-size:14px;max-width:640px">Pick the places you want to visit, write your own plan, and we\u2019ll price it. The more travellers join your group, the lower the price per person.</div>' +
      "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn" style="background:#E8850F" onclick="GT.openRequest()">+ Create your journey</button>' +
      '<button class="btn ghost" onclick="GT.scrollToOpen()">Browse open trips</button>' +
      "</div></div>" +
      '<div id="gt-open" style="margin-top:22px"></div>'
    pv.insertBefore(sec, pv.firstChild)
    loadOpen()
  }

  async function loadOpen() {
    var box = document.getElementById("gt-open")
    if (!box) return
    box.innerHTML = '<div class="muted">Loading group trips…</div>'
    try {
      var r = await api("/api/group-trips")
      var trips = (r && r.trips) || []
      if (!trips.length) {
        box.innerHTML = ""
        return
      }
      box.innerHTML =
        '<h2 style="margin-bottom:2px">Open Group Trips</h2>' +
        '<div class="muted" style="margin-bottom:14px">Join a trip created by another traveller</div>' +
        '<div class="grid">' +
        trips.map(tripCard).join("") +
        "</div>"
    } catch (e) {
      box.innerHTML = ""
    }
  }

  function tripCard(t) {
    var pct = pctOf(t)
    var pp =
      t.current_per_person != null
        ? money(t.current_per_person) + " / person"
        : "Price pending"
    return (
      '<div class="card" onclick="GT.openTrip(' +
      t.id +
      ')"><div class="body">' +
      '<div class="t">' +
      esc(t.title || "Custom trip") +
      "</div>" +
      '<div class="loc">🗓 ' +
      fmtDate(t.preferred_date) +
      " · ⏳ " +
      esc(countdown(t.deadline)) +
      "</div>" +
      '<div class="muted" style="font-size:13px;margin:8px 0;height:36px;overflow:hidden">' +
      esc((t.itinerary_text || "").slice(0, 96)) +
      "</div>" +
      '<div style="background:var(--soft2);border-radius:999px;height:8px;overflow:hidden;margin:8px 0"><div style="height:100%;width:' +
      pct +
      '%;background:var(--green)"></div></div>' +
      '<div class="meta"><span class="price">' +
      pp +
      '</span><span class="muted" style="font-size:13px">' +
      t.members_count +
      "/" +
      (t.min_people || "?") +
      " joined</span></div>" +
      "</div></div>"
    )
  }

  function openRequest() {
    if (!loggedIn()) {
      toast("Please log in to create a journey")
      if (window.openLogin) openLogin()
      return
    }
    ensureModals()
    v0("gtq-title", "")
    v0("gtq-plan", "")
    v0("gtq-date", "")
    openModal("gt-req-modal")
  }

  async function submitRequest() {
    var plan = (document.getElementById("gtq-plan").value || "").trim()
    if (!plan) {
      toast("Please describe your trip plan")
      return
    }
    try {
      await api("/api/group-trips/request", {
        method: "POST",
        body: {
          title: v("gtq-title"),
          itinerary_text: plan,
          preferred_date: v("gtq-date") || null,
        },
      })
      closeModal("gt-req-modal")
      toast("Request sent! We\u2019ll price it and get back to you.")
    } catch (e) {
      toast(e.message)
    }
  }

  async function openTrip(id) {
    try {
      var r = await api("/api/group-trips/" + id)
      var t = r.trip,
        members = r.members || []
      var pct = pctOf(t)
      var isCreator = loggedIn() && USER && t.creator_id === USER.id
      var shareUrl = location.origin + location.pathname + "?trip=" + t.id
      var priceBlock =
        t.current_per_person != null
          ? '<div class="price" style="font-size:26px">' +
            money(t.current_per_person) +
            "<small> / person now</small></div>" +
            (t.group_per_person != null &&
            t.group_per_person < t.current_per_person
              ? '<div class="muted" style="font-size:13px">Drops to ' +
                money(t.group_per_person) +
                " / person when " +
                t.group_size +
                " travellers join</div>"
              : "")
          : '<div class="muted">Awaiting price from our team</div>'
      var joinBtn =
        t.status === "open"
          ? '<button class="btn" style="width:100%;margin-top:12px" onclick="GT.openJoin(' +
            t.id +
            ')">Join this trip</button>'
          : '<div class="tag ' +
            esc(t.status) +
            '" style="margin-top:12px;display:inline-block">' +
            esc(t.status) +
            "</div>"
      var acceptBtn =
        isCreator && t.status === "quoted"
          ? '<button class="btn" style="width:100%;margin-top:8px;background:var(--green)" onclick="GT.accept(' +
            t.id +
            ')">Accept quote &amp; open trip</button>'
          : ""
      var body = document.getElementById("detail-body")
      body.innerHTML =
        '<div class="two"><div>' +
        '<div class="eyebrow">Group Trip</div>' +
        "<h2>" +
        esc(t.title || "Custom trip") +
        "</h2>" +
        '<div class="muted">🗓 ' +
        fmtDate(t.preferred_date) +
        " · ⏳ " +
        esc(countdown(t.deadline)) +
        " · " +
        t.members_count +
        "/" +
        (t.min_people || "?") +
        " joined</div>" +
        '<div class="box" style="margin-top:14px"><b>Trip plan &amp; places to visit</b><div style="white-space:pre-wrap;margin-top:6px">' +
        esc(t.itinerary_text || "") +
        "</div></div>" +
        '<div class="box" style="margin-top:14px"><b>Travellers (' +
        members.length +
        ')</b><div style="margin-top:8px">' +
        (members
          .map(function (m) {
            return (
              '<span class="chip" style="margin:3px">' +
              esc(m.name || "Traveller") +
              " ×" +
              m.seats +
              "</span>"
            )
          })
          .join("") || '<span class="muted">Be the first to join!</span>') +
        "</div></div></div>" +
        '<div><div class="box">' +
        priceBlock +
        '<div style="background:var(--soft2);border-radius:999px;height:10px;overflow:hidden;margin:14px 0"><div style="height:100%;width:' +
        pct +
        '%;background:var(--green)"></div></div>' +
        '<div class="muted" style="font-size:13px">' +
        (t.spots_left != null
          ? t.spots_left > 0
            ? t.spots_left + " more travellers needed to confirm"
            : "Minimum reached — trip confirmed!"
          : "") +
        "</div>" +
        joinBtn +
        acceptBtn +
        '<div style="margin-top:16px"><b style="font-size:13px">Share &amp; invite</b>' +
        '<div class="linkbox"><input id="gt-share" value="' +
        esc(shareUrl) +
        '" readonly><button class="btn ghost sm" onclick="GT.copyShare()">Copy</button></div>' +
        '<div style="margin-top:10px" class="qr">' +
        (window.qrSvg ? qrSvg(shareUrl) : "") +
        "</div></div>" +
        "</div></div></div>"
      show("detail-view")
      window.scrollTo(0, 0)
    } catch (e) {
      toast(e.message)
    }
  }

  function openJoin(id) {
    if (!loggedIn()) {
      toast("Please log in to join")
      if (window.openLogin) openLogin()
      return
    }
    ensureModals()
    document.getElementById("gtj-id").value = id
    document.getElementById("gtj-seats").value = 1
    document.getElementById("gtj-name").value = (USER && USER.name) || ""
    openModal("gt-join-modal")
  }

  async function submitJoin() {
    var id = v("gtj-id")
    try {
      await api("/api/group-trips/" + id + "/join", {
        method: "POST",
        body: {
          seats: Number(v("gtj-seats")) || 1,
          name: v("gtj-name") || null,
          referral_code: localStorage.getItem("mg_ref") || null,
        },
      })
      closeModal("gt-join-modal")
      toast("You joined the trip!")
      openTrip(id)
      loadOpen()
    } catch (e) {
      toast(e.message)
    }
  }

  async function accept(id) {
    try {
      await api("/api/group-trips/" + id + "/accept", { method: "POST" })
      toast("Your trip is now open for others to join!")
      openTrip(id)
      loadOpen()
    } catch (e) {
      toast(e.message)
    }
  }

  function copyShare() {
    var el = document.getElementById("gt-share")
    el.select()
    navigator.clipboard.writeText(el.value).then(function () {
      toast("Link copied")
    })
  }
  function scrollToOpen() {
    var el = document.getElementById("gt-open")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  function v0(id, val) {
    var el = document.getElementById(id)
    if (el) el.value = val
  }

  function ensureModals() {
    if (document.getElementById("gt-req-modal")) return
    var wrap = document.createElement("div")
    wrap.innerHTML =
      '<div class="overlay" id="gt-req-modal"><div class="modal">' +
      "<h3>Create your journey</h3>" +
      '<div class="field"><label>Trip title</label><input id="gtq-title" placeholder="e.g. Luxor &amp; Aswan — 3 days"></div>' +
      '<div class="field"><label>Preferred date</label><input id="gtq-date" type="date"></div>' +
      '<div class="field"><label>Your plan &amp; places to visit</label><textarea id="gtq-plan" rows="6" placeholder="List the places you want to visit and the kind of trip you want…"></textarea></div>' +
      '<div class="muted" style="font-size:13px;margin-bottom:12px">We\u2019ll review your plan, set the price (private car / bus), then publish it so other travellers can join your group.</div>' +
      '<div class="row"><button class="btn" onclick="GT.submitRequest()">Send request</button><button class="btn ghost" onclick="closeModal(\'gt-req-modal\')">Cancel</button></div>' +
      "</div></div>" +
      '<div class="overlay" id="gt-join-modal"><div class="modal">' +
      "<h3>Join this trip</h3><input type=\"hidden\" id=\"gtj-id\">" +
      '<div class="field"><label>Your name</label><input id="gtj-name"></div>' +
      '<div class="field"><label>Seats</label><input id="gtj-seats" type="number" min="1" value="1"></div>' +
      '<div class="muted" style="font-size:13px;margin-bottom:12px">You\u2019ll reserve your seat now. Payment is arranged once the group is confirmed.</div>' +
      '<div class="row"><button class="btn" onclick="GT.submitJoin()">Confirm &amp; join</button><button class="btn ghost" onclick="closeModal(\'gt-join-modal\')">Cancel</button></div>' +
      "</div></div>"
    document.body.appendChild(wrap)
  }

  // ========================================================================
  // ADMIN DASHBOARD (adds a "Trips" section to the existing admin dashboard)
  // ========================================================================
  var MEM_TRIP = null

  function adminActions(t) {
    var b = ""
    if (t.status === "pending" || t.status === "quoted")
      b +=
        '<button class="btn sm" onclick="GT.openQuote(' +
        t.id +
        ')">' +
        (t.status === "pending" ? "Set price" : "Edit price") +
        "</button> "
    b +=
      '<button class="btn sm ghost" onclick="GT.members(' +
      t.id +
      ')">Members</button> '
    if (t.status !== "completed" && t.status !== "cancelled") {
      if (t.status === "quoted")
        b +=
          '<button class="btn sm" onclick="GT.setStatus(' +
          t.id +
          ",'open')\">Open</button> "
      if (t.status === "open" || t.status === "confirmed")
        b +=
          '<button class="btn sm" onclick="GT.setStatus(' +
          t.id +
          ",'completed')\">Complete</button> "
      b +=
        '<button class="btn sm danger" onclick="GT.setStatus(' +
        t.id +
        ",'cancelled')\">Cancel</button>"
    }
    return b
  }

  async function dashSection(m) {
    var s = await api("/api/group-trips/settings").catch(function () {
      return null
    })
    var r = await api("/api/admin/group-trips")
    var trips = (r && r.trips) || []
    var setForm = s
      ? '<div class="box" style="margin-bottom:18px"><b>Group Trips rules — dashboard-controlled (change anytime)</b>' +
        '<div class="row" style="margin-top:10px">' +
        '<div class="field"><label>Min people (confirm)</label><input id="gts-min" type="number" value="' +
        s.min_people +
        '"></div>' +
        '<div class="field"><label>Max people</label><input id="gts-max" type="number" value="' +
        s.max_people +
        '"></div>' +
        '<div class="field"><label>Private-car size</label><input id="gts-small" type="number" value="' +
        s.small_size +
        '"></div></div>' +
        '<div class="row">' +
        '<div class="field"><label>Deadline (days)</label><input id="gts-dl" type="number" value="' +
        s.deadline_days +
        '"></div>' +
        '<div class="field"><label>Refund window (hours before trip)</label><input id="gts-refund" type="number" value="' +
        s.refund_hours +
        '"></div>' +
        '<div class="field"><label>Feature</label><select id="gts-en"><option value="1"' +
        (s.enabled ? " selected" : "") +
        '>Enabled</option><option value="0"' +
        (!s.enabled ? " selected" : "") +
        ">Disabled</option></select></div></div>" +
        '<button class="btn" onclick="GT.saveSettings()">Save rules</button></div>'
      : ""
    var rows = trips.map(function (t) {
      return [
        "#" + t.id,
        esc(t.title || "—"),
        fmtDate(t.preferred_date),
        statusTag(t.status),
        t.members_count + "/" + (t.min_people || "?"),
        t.price_small != null
          ? money(t.price_small) + " / " + money(t.price_group)
          : "—",
        adminActions(t),
      ]
    })
    m.innerHTML =
      '<h2 style="margin-bottom:12px">Group Trips</h2>' +
      setForm +
      tbl(
        ["#", "Title", "Date", "Status", "Joined", "Car / Bus price", "Actions"],
        rows,
      )
  }

  async function openQuote(id) {
    ensureAdminModals()
    var r = await api("/api/group-trips/" + id).catch(function () {
      return null
    })
    var t = (r && r.trip) || {}
    v0("gtqt-id", id)
    v0("gtqt-vsmall", t.vehicle_small || "Private car")
    v0("gtqt-ssize", t.small_size || 2)
    v0("gtqt-psmall", t.price_small || "")
    v0("gtqt-vgroup", t.vehicle_group || "Bus")
    v0("gtqt-gsize", t.group_size || t.min_people || 10)
    v0("gtqt-pgroup", t.price_group || "")
    v0("gtqt-min", t.min_people || 10)
    v0("gtqt-max", t.max_people || 14)
    v0("gtqt-note", t.admin_note || "")
    openModal("gt-quote-modal")
  }

  async function submitQuote() {
    var id = v("gtqt-id")
    var body = {
      price_small: Number(v("gtqt-psmall")),
      price_group: Number(v("gtqt-pgroup")),
      vehicle_small: v("gtqt-vsmall"),
      vehicle_group: v("gtqt-vgroup"),
      small_size: Number(v("gtqt-ssize")),
      group_size: Number(v("gtqt-gsize")),
      min_people: Number(v("gtqt-min")),
      max_people: Number(v("gtqt-max")),
      admin_note: v("gtqt-note"),
    }
    if (!(body.price_small > 0) || !(body.price_group > 0)) {
      toast("Enter both car and bus prices")
      return
    }
    try {
      await api("/api/admin/group-trips/" + id + "/quote", {
        method: "POST",
        body: body,
      })
      closeModal("gt-quote-modal")
      toast("Price sent to traveller")
      if (window.loadSec) loadSec()
    } catch (e) {
      toast(e.message)
    }
  }

  async function setStatus(id, st) {
    if (st === "cancelled" && !confirm("Cancel this trip?")) return
    try {
      await api("/api/admin/group-trips/" + id + "/status", {
        method: "POST",
        body: { status: st },
      })
      toast("Trip " + st)
      if (window.loadSec) loadSec()
    } catch (e) {
      toast(e.message)
    }
  }

  async function members(id) {
    ensureAdminModals()
    MEM_TRIP = id
    try {
      var r = await api("/api/admin/group-trips/" + id + "/members")
      var ms = (r && r.members) || []
      document.getElementById("gt-mem-body").innerHTML = ms.length
        ? tbl(
            ["Name", "Seats", "Amount", "Status", "Action"],
            ms.map(function (mm) {
              return [
                esc(mm.name || "—"),
                mm.seats,
                money(mm.amount),
                statusTag(mm.status),
                (mm.status !== "paid"
                  ? '<button class="btn sm" onclick="GT.pay(' +
                    mm.id +
                    ",'paid')\">Mark paid</button> "
                  : "") +
                  (mm.status !== "refunded"
                    ? '<button class="btn sm ghost" onclick="GT.pay(' +
                      mm.id +
                      ",'refunded')\">Refund</button>"
                    : ""),
              ]
            }),
          )
        : '<div class="muted">No travellers have joined yet.</div>'
      openModal("gt-mem-modal")
    } catch (e) {
      toast(e.message)
    }
  }

  async function pay(mid, st) {
    try {
      await api("/api/admin/group-members/" + mid + "/pay", {
        method: "POST",
        body: { status: st },
      })
      toast("Saved")
      if (MEM_TRIP) members(MEM_TRIP)
    } catch (e) {
      toast(e.message)
    }
  }

  async function saveSettings() {
    var body = {
      min_people: Number(v("gts-min")),
      max_people: Number(v("gts-max")),
      small_size: Number(v("gts-small")),
      deadline_days: Number(v("gts-dl")),
      refund_hours: Number(v("gts-refund")),
      enabled: v("gts-en") === "1",
    }
    try {
      await api("/api/admin/group-trips/settings", { method: "POST", body: body })
      toast("Rules saved")
      if (window.loadSec) loadSec()
    } catch (e) {
      toast(e.message)
    }
  }

  function ensureAdminModals() {
    if (document.getElementById("gt-quote-modal")) return
    var wrap = document.createElement("div")
    wrap.innerHTML =
      '<div class="overlay" id="gt-quote-modal"><div class="modal">' +
      "<h3>Set trip price</h3><input type=\"hidden\" id=\"gtqt-id\">" +
      '<div class="row"><div class="field"><label>Small vehicle</label><input id="gtqt-vsmall"></div><div class="field"><label>Seats</label><input id="gtqt-ssize" type="number"></div><div class="field"><label>Total price</label><input id="gtqt-psmall" type="number"></div></div>' +
      '<div class="row"><div class="field"><label>Group vehicle</label><input id="gtqt-vgroup"></div><div class="field"><label>Seats</label><input id="gtqt-gsize" type="number"></div><div class="field"><label>Total price</label><input id="gtqt-pgroup" type="number"></div></div>' +
      '<div class="row"><div class="field"><label>Min people</label><input id="gtqt-min" type="number"></div><div class="field"><label>Max people</label><input id="gtqt-max" type="number"></div></div>' +
      '<div class="field"><label>Note to traveller (optional)</label><input id="gtqt-note"></div>' +
      '<div class="muted" style="font-size:13px;margin-bottom:12px">Per-person price = total ÷ seats. When the group fills up, travellers automatically get the cheaper bus price.</div>' +
      '<div class="row"><button class="btn" onclick="GT.submitQuote()">Send price</button><button class="btn ghost" onclick="closeModal(\'gt-quote-modal\')">Cancel</button></div>' +
      "</div></div>" +
      '<div class="overlay" id="gt-mem-modal"><div class="modal">' +
      "<h3>Trip travellers</h3>" +
      '<div id="gt-mem-body"></div>' +
      '<div style="margin-top:14px"><button class="btn ghost" onclick="closeModal(\'gt-mem-modal\')">Close</button></div>' +
      "</div></div>"
    document.body.appendChild(wrap)
  }

  // Register the admin "Trips" section into the existing dashboard.
  function registerDashboard() {
    try {
      if (typeof SEC !== "undefined") SEC["admin:trips"] = dashSection
      if (typeof NAVICON !== "undefined") NAVICON.trips = "users"
      if (typeof NAV !== "undefined" && NAV.admin && NAV.admin.indexOf("trips") < 0)
        NAV.admin.splice(Math.max(0, NAV.admin.indexOf("bookings")), 0, "trips")
    } catch (e) {}
  }

  // ---------- deep link ?trip=ID ----------
  function checkDeepLink() {
    try {
      var id = new URL(location.href).searchParams.get("trip")
      if (id) openTrip(id)
    } catch (e) {}
  }

  function init() {
    registerDashboard()
    injectEntry()
    checkDeepLink()
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init)
  else init()

  // Public namespace for inline onclick handlers.
  window.GT = {
    openRequest: openRequest,
    submitRequest: submitRequest,
    openTrip: openTrip,
    openJoin: openJoin,
    submitJoin: submitJoin,
    accept: accept,
    copyShare: copyShare,
    scrollToOpen: scrollToOpen,
    loadOpen: loadOpen,
    openQuote: openQuote,
    submitQuote: submitQuote,
    setStatus: setStatus,
    members: members,
    pay: pay,
    saveSettings: saveSettings,
  }
})()
