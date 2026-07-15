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

  // ---- date + voting + whatsapp helpers ----
  var JDAYS = {}
  var MEM_LIST = []
  var MEM_TRIPOBJ = null
  function daysBetween(from, to) {
    var out = []
    if (!from || !to) return out
    var d = new Date(from + "T00:00:00")
    var end = new Date(to + "T00:00:00")
    if (isNaN(d.getTime()) || isNaN(end.getTime())) return out
    var g = 0
    while (d <= end && g < 400) {
      out.push(d.toISOString().slice(0, 10))
      d = new Date(d.getTime() + 86400000)
      g++
    }
    return out
  }
  function fmtDay(s) {
    if (!s) return "—"
    try {
      return new Date(s + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    } catch (e) {
      return s
    }
  }
  function toggleDay(el) {
    var d = el.getAttribute("data-d")
    if (JDAYS[d]) {
      delete JDAYS[d]
      el.className = "gt-day"
    } else {
      JDAYS[d] = 1
      el.className = "gt-day gt-on"
    }
  }
  function buildVoteBlock(t, cands, mine) {
    var avail = (mine && mine.available_days) || []
    var myVote = mine && mine.vote_date
    var dl = t.vote_deadline ? countdown(t.vote_deadline) : ""
    var rows = cands
      .map(function (c) {
        var canVote = avail.indexOf(c.date) >= 0
        var isMine = myVote === c.date
        return (
          '<div class="gt-vote-row"><div><b>' +
          fmtDay(c.date) +
          '</b> <span class="muted" style="font-size:12px">· ' +
          c.available_count +
          " available · " +
          c.votes +
          " votes</span></div>" +
          (mine
            ? canVote
              ? '<button class="btn sm' +
                (isMine ? "" : " ghost") +
                '" onclick="GT.vote(' +
                t.id +
                ",'" +
                c.date +
                "')\">" +
                (isMine ? "✓ Your vote" : "Vote") +
                "</button>"
              : '<span class="muted" style="font-size:12px">not available</span>'
            : "") +
          "</div>"
        )
      })
      .join("")
    return (
      '<div class="box" style="margin-top:12px"><b>🗳 Vote for the final date</b>' +
      (dl
        ? '<div class="muted" style="font-size:12px;margin:4px 0 8px">Voting closes in ' +
          esc(dl) +
          " · highest-voted day wins</div>"
        : "") +
      (mine
        ? ""
        : '<div class="muted" style="font-size:12px;margin:4px 0 8px">Join the trip to vote.</div>') +
      (rows || '<div class="muted">No candidate days yet.</div>') +
      "</div>"
    )
  }
  async function vote(id, date) {
    try {
      await api("/api/group-trips/" + id + "/vote", {
        method: "POST",
        body: { date: date },
      })
      toast("Vote saved")
      openTrip(id)
    } catch (e) {
      toast(e.message)
    }
  }
  function waLink(phone, msg) {
    var p = String(phone || "").replace(/[^0-9]/g, "")
    return "https://wa.me/" + p + "?text=" + encodeURIComponent(msg)
  }
  function tripUrl(trip) {
    return location.origin + location.pathname + "?trip=" + (trip && trip.id)
  }
  function waMsg(trip, m) {
    var name = (m && m.name) || "traveller"
    var title = (trip && trip.title) || "your RaGo trip"
    if (trip && trip.status === "voting")
      return (
        "Hi " +
        name +
        '! Good news — the group for "' +
        title +
        '" is complete 🎉 Open RaGo to vote on the final date: ' +
        tripUrl(trip)
      )
    if (trip && trip.final_date)
      return (
        "Hi " +
        name +
        '! The final date for "' +
        title +
        '" is ' +
        fmtDay(trip.final_date) +
        ". Please complete your payment on RaGo: " +
        tripUrl(trip)
      )
    return (
      "Hi " + name + '! Update about your RaGo trip "' + title + '": ' + tripUrl(trip)
    )
  }
  function notifyAll() {
    MEM_LIST.forEach(function (m) {
      if (m.phone) window.open(waLink(m.phone, waMsg(MEM_TRIPOBJ, m)), "_blank")
    })
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
      '<div id="gt-banner-wrap" style="position:relative">' +
      '<div id="gt-banner" style="background:linear-gradient(135deg,#123B4C,#0E2E3B);border-radius:14px;padding:22px 24px 26px;color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:16px">' +
      '<div style="flex:1;min-width:220px">' +
      '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E8850F">Create Your Journey</div>' +
      '<h2 style="margin:6px 0 4px;font-size:22px;color:#fff">Design your own trip — other travellers can join</h2>' +
      '<div style="opacity:.85;font-size:14px;max-width:640px">Pick the places you want to visit, write your own plan, and we\u2019ll price it. The more travellers join your group, the lower the price per person.</div>' +
      "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn" style="background:#E8850F" onclick="GT.openRequest()">+ Create your journey</button>' +
      '<button class="btn ghost" onclick="GT.scrollToOpen()">Browse open trips</button>' +
      "</div></div>" +
      '<div id="gt-open-row" class="gt-open-row" style="display:none">' +
      '<button class="gt-arrow" onclick="GT.scrollStrip(-1)" style="left:2px">\u2039</button>' +
      '<div id="gt-open" class="gt-strip"></div>' +
      '<button class="gt-arrow" onclick="GT.scrollStrip(1)" style="right:2px">\u203a</button>' +
      "</div></div>"
    pv.insertBefore(sec, pv.firstChild)
    loadOpen()
  }

  async function loadOpen() {
    var box = document.getElementById("gt-open")
    if (!box) return
    var row = document.getElementById("gt-open-row")
    var banner = document.getElementById("gt-banner")
    box.innerHTML = '<div class="muted" style="padding:10px">Loading…</div>'
    function collapse() {
      box.innerHTML = ""
      if (row) row.style.display = "none"
      if (banner) banner.style.paddingBottom = "26px"
    }
    try {
      var r = await api("/api/group-trips")
      var trips = (r && r.trips) || []
      if (!trips.length) {
        collapse()
        return
      }
      if (row) row.style.display = "block"
      if (banner) banner.style.paddingBottom = "70px"
      box.innerHTML = trips.map(tripCard).join("")
    } catch (e) {
      collapse()
    }
  }

  function mainPlace(t) {
    var txt = t.itinerary_text || ""
    var m = /Places:\s*([^\n,]+)/i.exec(txt)
    if (m) return m[1].trim()
    if (txt.trim()) return txt.trim().split(/[\n,]/)[0].slice(0, 40)
    return t.title || "Custom trip"
  }

  function tripCard(t) {
    var pct = pctOf(t)
    var joined = t.members_count || 0
    var min = t.min_people || 0
    var left = Math.max(0, min - joined)
    var pp = t.current_per_person != null ? money(t.current_per_person) : null
    return (
      '<div class="gt-cardwrap">' +
      '<div class="gt-tile" onclick="GT.openTrip(' +
      t.id +
      ')">' +
      '<div class="gt-tile-top">' +
      (pp ? '<span class="gt-price">' + pp + "</span>" : "") +
      "</div>" +
      '<div class="gt-tile-mid"><span class="gt-count">' +
      joined +
      "/" +
      (min || "?") +
      '</span><span class="gt-countlbl">joined</span></div>' +
      '<div class="gt-tile-bar"><div style="width:' +
      pct +
      '%"></div></div>' +
      '<div class="gt-tile-left">' +
      (left > 0 ? left + " spots left" : "Confirmed \u2713") +
      "</div>" +
      "</div>" +
      '<div class="gt-place-lbl" title="' +
      esc(mainPlace(t)) +
      '">\ud83d\udccd ' +
      esc(mainPlace(t)) +
      "</div>" +
      "</div>"
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
    v0("gtq-from", "")
    v0("gtq-to", "")
    SEL_PLACES = {}
    openModal("gt-req-modal")
    loadPlaces()
  }

  async function submitRequest() {
    var picked = Object.keys(SEL_PLACES)
    var plan = (document.getElementById("gtq-plan").value || "").trim()
    if (!picked.length && !plan) {
      toast("Pick at least one place or describe your trip")
      return
    }
    var full =
      (picked.length ? "Places: " + picked.join(", ") : "") +
      (picked.length && plan ? "\n\n" : "") +
      plan
    var df = v("gtq-from"),
      dt = v("gtq-to")
    if (df && dt && df > dt) {
      toast("End date must be after start date")
      return
    }
    try {
      await api("/api/group-trips/request", {
        method: "POST",
        body: {
          title: v("gtq-title"),
          itinerary_text: full,
          date_from: df || null,
          date_to: dt || null,
        },
      })
      closeModal("gt-req-modal")
      toast("Request sent! We\u2019ll price it and get back to you.")
    } catch (e) {
      toast(e.message)
    }
  }

  var SEL_PLACES = {}
  var PLACES = null
  async function loadPlaces() {
    var box = document.getElementById("gtq-places")
    if (!box) return
    box.innerHTML = '<span class="muted" style="font-size:12px">Loading places…</span>'
    var landmarks = ["Giza Pyramids", "The Egyptian Museum", "Khan el-Khalili", "Cairo", "Luxor", "Karnak Temple", "Valley of the Kings", "Aswan", "Abu Simbel", "Philae Temple", "Hurghada", "Sharm El-Sheikh", "Dahab", "Marsa Alam", "Alexandria", "Siwa Oasis", "White Desert", "Wadi El-Rayan", "Saint Catherine Monastery", "Nile Cruise"]
    var extra = []
    try {
      var r = await api("/api/services")
      var svs = Array.isArray(r) ? r : (r && r.services) || []
      svs.forEach(function (s) {
        if (s.location) extra.push(String(s.location).trim())
        if (s.title) extra.push(String(s.title).trim())
      })
    } catch (e) {}
    var seen = {},
      list = []
    landmarks.concat(extra).forEach(function (n) {
      var k = (n || "").toLowerCase()
      if (n && !seen[k]) {
        seen[k] = 1
        list.push(n)
      }
    })
    PLACES = list
    renderPlaces()
  }
  function renderPlaces() {
    var box = document.getElementById("gtq-places")
    if (!box || !PLACES) return
    box.innerHTML = PLACES.map(function (n) {
      var on = SEL_PLACES[n] ? " gt-on" : ""
      return (
        '<span class="gt-place' +
        on +
        '" data-n="' +
        esc(n) +
        '" onclick="GT.togglePlace(this)">' +
        esc(n) +
        "</span>"
      )
    }).join("")
  }
  function togglePlace(el) {
    var name = el.getAttribute("data-n")
    if (SEL_PLACES[name]) {
      delete SEL_PLACES[name]
      el.className = "gt-place"
    } else {
      SEL_PLACES[name] = 1
      el.className = "gt-place gt-on"
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
      var cands = r.candidate_days || []
      var voteBlock = ""
      if (t.status === "voting") {
        var mine = null
        try {
          var me = await api("/api/group-trips/" + id + "/me")
          mine = me.member
        } catch (e) {}
        voteBlock = buildVoteBlock(t, cands, mine)
      }
      var finalBlock = t.final_date
        ? '<div class="box" style="margin-top:12px;border:1px solid var(--green)"><b>✅ Final date:</b> ' +
          fmtDay(t.final_date) +
          "</div>"
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
        voteBlock +
        finalBlock +
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

  async function openJoin(id) {
    if (!loggedIn()) {
      toast("Please log in to join")
      if (window.openLogin) openLogin()
      return
    }
    ensureModals()
    document.getElementById("gtj-id").value = id
    document.getElementById("gtj-seats").value = 1
    document.getElementById("gtj-name").value = (USER && USER.name) || ""
    document.getElementById("gtj-phone").value = (USER && USER.phone) || ""
    JDAYS = {}
    var box = document.getElementById("gtj-days")
    box.innerHTML =
      '<span class="muted" style="font-size:12px">Loading dates…</span>'
    try {
      var r = await api("/api/group-trips/" + id)
      var t = (r && r.trip) || {}
      var days = daysBetween(t.date_from, t.date_to)
      box.innerHTML = days.length
        ? days
            .map(function (d) {
              return (
                '<span class="gt-day" data-d="' +
                d +
                '" onclick="GT.toggleDay(this)">' +
                fmtDay(d) +
                "</span>"
              )
            })
            .join("")
        : '<span class="muted" style="font-size:12px">No specific dates set — you can just join.</span>'
    } catch (e) {
      box.innerHTML =
        '<span class="muted" style="font-size:12px">Could not load dates.</span>'
    }
    openModal("gt-join-modal")
  }

  async function submitJoin() {
    var id = v("gtj-id")
    var days = Object.keys(JDAYS)
    var hasDayOptions =
      document.querySelectorAll("#gtj-days .gt-day").length > 0
    if (hasDayOptions && !days.length) {
      toast("Pick the days that work for you")
      return
    }
    try {
      await api("/api/group-trips/" + id + "/join", {
        method: "POST",
        body: {
          seats: Number(v("gtj-seats")) || 1,
          name: v("gtj-name") || null,
          phone: v("gtj-phone") || null,
          available_days: days,
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
      await api("/api/group-trips/" + id + "/accept", {
        method: "POST",
        body: { phone: (USER && USER.phone) || null },
      })
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
    var el = document.getElementById("gt-open-row")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }
  function scrollStrip(dir) {
    var s = document.getElementById("gt-open")
    if (s) s.scrollBy({ left: dir * 250, behavior: "smooth" })
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
      '<div class="row"><div class="field"><label>Available from</label><input id="gtq-from" type="date"></div><div class="field"><label>Available to</label><input id="gtq-to" type="date"></div></div>' +
      '<div class="field"><label>Pick places to visit</label><div id="gtq-places" class="gt-places"></div></div>' +
      '<div class="field"><label>Or add your own places / notes</label><textarea id="gtq-plan" rows="5" placeholder="Add any place not listed above, or describe the kind of trip you want…"></textarea></div>' +
      '<div class="muted" style="font-size:13px;margin-bottom:12px">We\u2019ll review your plan, set the price (private car / bus), then publish it so other travellers can join your group.</div>' +
      '<div class="row"><button class="btn" onclick="GT.submitRequest()">Send request</button><button class="btn ghost" onclick="closeModal(\'gt-req-modal\')">Cancel</button></div>' +
      "</div></div>" +
      '<div class="overlay" id="gt-join-modal"><div class="modal">' +
      "<h3>Join this trip</h3><input type=\"hidden\" id=\"gtj-id\">" +
      '<div class="field"><label>Your name</label><input id="gtj-name"></div>' +
      '<div class="field"><label>WhatsApp number</label><input id="gtj-phone" placeholder="+20 1x xxxx xxxx"></div>' +
      '<div class="field"><label>Seats</label><input id="gtj-seats" type="number" min="1" value="1"></div>' +
      '<div class="field"><label>Which days work for you?</label><div id="gtj-days" class="gt-places"></div></div>' +
      '<div class="muted" style="font-size:13px;margin-bottom:12px">Pick the days you\u2019re available from the range. When the group fills up we\u2019ll vote on the final date, then arrange payment. We\u2019ll notify you on WhatsApp.</div>' +
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
        '<div class="field"><label>Voting window (hours)</label><input id="gts-vote" type="number" value="' +
        (s.vote_hours != null ? s.vote_hours : 48) +
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
      var tr = await api("/api/group-trips/" + id).catch(function () {
        return null
      })
      var trip = tr && tr.trip
      var cands = (tr && tr.candidate_days) || []
      MEM_LIST = ms
      MEM_TRIPOBJ = trip
      var head = trip
        ? '<div class="muted" style="font-size:13px;margin-bottom:8px">Status: ' +
          esc(trip.status) +
          (trip.final_date ? " · Final date: " + fmtDay(trip.final_date) : "") +
          (trip.vote_deadline && trip.status === "voting"
            ? " · Voting closes in " + esc(countdown(trip.vote_deadline))
            : "") +
          "</div>"
        : ""
      var candBlock = cands.length
        ? '<div class="box" style="margin-bottom:10px"><b>Day votes</b>' +
          cands
            .map(function (c) {
              return (
                '<div class="gt-vote-row"><span>' +
                fmtDay(c.date) +
                '</span><span class="muted" style="font-size:12px">' +
                c.available_count +
                " available · " +
                c.votes +
                " votes</span></div>"
              )
            })
            .join("") +
          "</div>"
        : ""
      var notifyBtn = ms.some(function (m) {
        return m.phone
      })
        ? '<button class="btn sm" style="margin-bottom:10px" onclick="GT.notifyAll()">📲 Notify all on WhatsApp</button>'
        : ""
      document.getElementById("gt-mem-body").innerHTML =
        head +
        candBlock +
        notifyBtn +
        (ms.length
          ? tbl(
              ["Name", "Phone", "Seats", "Amount", "Status", "Action"],
              ms.map(function (mm) {
                var wa = mm.phone
                  ? '<a class="btn sm ghost" target="_blank" href="' +
                    waLink(mm.phone, waMsg(trip, mm)) +
                    '">WhatsApp</a> '
                  : ""
                return [
                  esc(mm.name || "—"),
                  mm.phone ? esc(mm.phone) : "—",
                  mm.seats,
                  money(mm.amount),
                  statusTag(mm.status),
                  wa +
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
          : '<div class="muted">No travellers have joined yet.</div>')
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
      vote_hours: Number(v("gts-vote")),
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

  function injectStyle() {
    if (document.getElementById("gt-style")) return
    var st = document.createElement("style")
    st.id = "gt-style"
    st.textContent =
      ".gt-open-row{position:relative;margin-top:-60px;padding:0 34px;z-index:2}" +
      ".gt-strip{display:flex;gap:14px;overflow-x:auto;scroll-behavior:smooth;padding:0 4px 10px;scroll-snap-type:x mandatory}" +
      ".gt-strip::-webkit-scrollbar{height:6px}" +
      ".gt-strip::-webkit-scrollbar-thumb{background:rgba(0,0,0,.2);border-radius:3px}" +
      ".gt-cardwrap{flex:0 0 150px;scroll-snap-align:start}" +
      ".gt-tile{position:relative;height:120px;border-radius:14px;background:linear-gradient(150deg,#1B5163,#0E2E3B);box-shadow:0 10px 24px rgba(0,0,0,.22);cursor:pointer;color:#fff;padding:12px;display:flex;flex-direction:column;justify-content:space-between;border:2px solid rgba(255,255,255,.65);transition:.15s}" +
      ".gt-tile:hover{transform:translateY(-3px)}" +
      ".gt-tile-top{display:flex;justify-content:flex-end;min-height:18px}" +
      ".gt-price{background:#E8850F;color:#fff;font-weight:700;font-size:11px;padding:2px 8px;border-radius:999px}" +
      ".gt-tile-mid{text-align:center}" +
      ".gt-count{font-size:26px;font-weight:800;line-height:1;display:block}" +
      ".gt-countlbl{font-size:10px;opacity:.8;text-transform:uppercase;letter-spacing:.06em}" +
      ".gt-tile-bar{background:rgba(255,255,255,.25);border-radius:999px;height:5px;overflow:hidden;margin:4px 0 2px}" +
      ".gt-tile-bar>div{height:100%;background:#E8850F}" +
      ".gt-tile-left{font-size:11px;font-weight:600;color:#FFD9A8;text-align:center}" +
      ".gt-place-lbl{margin-top:8px;text-align:center;font-size:12px;font-weight:600;color:#123B4C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px}" +
      ".gt-arrow{position:absolute;top:44px;z-index:4;width:32px;height:32px;border-radius:50%;border:none;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.2);cursor:pointer;font-size:18px;line-height:1;color:#123B4C}" +
      ".gt-places{display:flex;flex-wrap:wrap;gap:8px;max-height:170px;overflow-y:auto;padding:4px 2px}" +
      ".gt-place{border:1px solid var(--soft2,#e5e7eb);border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;user-select:none;transition:.15s}" +
      ".gt-place.gt-on{background:#123B4C;color:#fff;border-color:#123B4C}" +
      ".gt-day{border:1px solid var(--soft2,#e5e7eb);border-radius:10px;padding:6px 10px;font-size:12px;cursor:pointer;user-select:none}" +
      ".gt-day.gt-on{background:#E8850F;color:#fff;border-color:#E8850F}" +
      ".gt-vote-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--soft2,#eee)}"
    document.head.appendChild(st)
  }

  function init() {
    injectStyle()
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
    scrollStrip: scrollStrip,
    togglePlace: togglePlace,
    toggleDay: toggleDay,
    vote: vote,
    notifyAll: notifyAll,
    loadOpen: loadOpen,
    openQuote: openQuote,
    submitQuote: submitQuote,
    setStatus: setStatus,
    members: members,
    pay: pay,
    saveSettings: saveSettings,
  }
})()
