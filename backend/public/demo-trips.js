/* =========================================================================
 * RaGo — Group Trips DEMO showcase (100% front-end, no backend needed).
 *
 * WHY: lets us display ready-made sample group trips so visitors understand
 * the feature, WITHOUT any server route, database seed, or console command.
 * It is completely self-contained (its own styles + its own modal) and never
 * calls the API, so it is immune to the /api/group-trips 404.
 *
 * HOW TO USE: put this file at  backend/public/demo-trips.js  and add this
 * line just before </body> in app.html:
 *     <script src="demo-trips.js"></script>
 *
 * TO REMOVE AT GO-LIVE: just delete that one <script> line (or this file).
 * ========================================================================= */
(function () {
  "use strict"
  var MOUNTED = false

  // --- Brand palette (RaGo) ---
  var C = {
    navy: "#123B4C",
    orange: "#E8850F",
    cream: "#FFF7E8",
    slate: "#6B7B85",
    tileA: "#1B5163",
    tileB: "#0E2E3B",
    hi: "#FFD9A8",
  }

  // --- Demo data (Egypt domestic trips) ---
  // days = how many days from today the trip window starts; window is 6 days.
  var TRIPS = [
    { id: "demo-1", emoji: "\uD83D\uDD3A", title: "Giza Pyramids & Sphinx Day Tour", places: ["Giza Pyramids", "Egyptian Museum", "Cairo"], plan: "Full-day guided tour of the Pyramids, the Sphinx and the Grand Egyptian Museum, with lunch by the plateau.", priceSmall: 2400, priceGroup: 9000, joined: 6, days: 9 },
    { id: "demo-2", emoji: "\uD83C\uDFDB\uFE0F", title: "Luxor: Valley of the Kings & Karnak", places: ["Luxor", "Karnak Temple", "Valley of the Kings"], plan: "Two days exploring the East & West Banks of Luxor \u2014 Karnak, Hatshepsut Temple and the royal tombs.", priceSmall: 3200, priceGroup: 12000, joined: 4, days: 12 },
    { id: "demo-3", emoji: "\uD83D\uDDFF", title: "Aswan & Abu Simbel Escape", places: ["Aswan", "Abu Simbel", "Philae Temple"], plan: "Nubian culture, the High Dam, Philae Temple and an early trip to the great temples of Abu Simbel.", priceSmall: 3600, priceGroup: 13500, joined: 11, days: 15, voting: true },
    { id: "demo-4", emoji: "\uD83C\uDFD6\uFE0F", title: "Hurghada Red Sea Getaway", places: ["Hurghada", "Red Sea"], plan: "Three relaxed days on the Red Sea \u2014 a snorkeling boat trip, Orange Bay island and free beach time.", priceSmall: 3000, priceGroup: 11000, joined: 5, days: 10 },
    { id: "demo-5", emoji: "\uD83E\uDD3F", title: "Sharm El-Sheikh & Ras Mohamed", places: ["Sharm El-Sheikh", "Ras Mohamed"], plan: "Diving and snorkeling in Ras Mohamed National Park plus a desert quad-bike sunset.", priceSmall: 3400, priceGroup: 12500, joined: 3, days: 18 },
    { id: "demo-6", emoji: "\uD83C\uDFDC\uFE0F", title: "White Desert & Bahariya Camping", places: ["White Desert", "Bahariya Oasis"], plan: "Overnight desert safari \u2014 the White Desert chalk formations, the Black Desert and a Bedouin dinner under the stars.", priceSmall: 2800, priceGroup: 10500, joined: 12, days: 7, voting: true },
    { id: "demo-7", emoji: "\uD83C\uDFDC\uFE0F", title: "Siwa Oasis Adventure", places: ["Siwa Oasis"], plan: "Salt lakes, Cleopatra's spring, the Oracle Temple and dune surfing in the Great Sand Sea.", priceSmall: 3800, priceGroup: 14000, joined: 4, days: 20 },
    { id: "demo-8", emoji: "\uD83C\uDF0A", title: "Alexandria Mediterranean Day Trip", places: ["Alexandria"], plan: "The Bibliotheca, Qaitbay Citadel, the Catacombs and a seafood lunch on the Corniche.", priceSmall: 2200, priceGroup: 8500, joined: 6, days: 6 },
    { id: "demo-9", emoji: "\uD83E\uDEB8", title: "Dahab & the Blue Hole", places: ["Dahab", "Blue Hole"], plan: "Laid-back Dahab \u2014 snorkeling the Blue Hole, the Colored Canyon and a Bedouin camp evening.", priceSmall: 3100, priceGroup: 11500, joined: 5, days: 14 },
    { id: "demo-10", emoji: "\u26F5", title: "Nile Cruise Luxor to Aswan", places: ["Nile Cruise", "Luxor", "Aswan"], plan: "Four-night Nile cruise visiting Edfu and Kom Ombo temples between Luxor and Aswan.", priceSmall: 5200, priceGroup: 19000, joined: 7, days: 22 },
  ]
  var MIN = 10 // people needed to confirm a trip

  // --- Small helpers ---
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>\"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    })
  }
  function money(n) {
    try {
      return Number(n).toLocaleString("en-US") + " EGP"
    } catch (e) {
      return n + " EGP"
    }
  }
  function pad(n) {
    return n < 10 ? "0" + n : "" + n
  }
  function ymd(dt) {
    return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate())
  }
  function fmt(dt) {
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return dt.getDate() + " " + m[dt.getMonth()]
  }
  function addDays(n) {
    var d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + n)
    return d
  }
  function rangeOf(t) {
    var from = addDays(t.days)
    var to = addDays(t.days + 6)
    var list = []
    var d = new Date(from)
    while (d <= to) {
      list.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return { from: from, to: to, list: list }
  }
  function perPerson(t) {
    return Math.round(t.priceGroup / MIN)
  }

  // --- Styles (namespaced .rgd-*) ---
  function injectStyle() {
    if (document.getElementById("rgd-style")) return
    var css =
      ".rgd-wrap{margin:14px 16px 8px;font-family:inherit}" +
      ".rgd-head{display:flex;align-items:center;gap:10px;margin:0 2px 10px}" +
      ".rgd-head h3{margin:0;font-size:18px;color:" + C.navy + ";font-weight:800}" +
      ".rgd-badge{background:" + C.orange + ";color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.5px}" +
      ".rgd-sub{color:" + C.slate + ";font-size:13px;margin:-4px 2px 12px}" +
      ".rgd-strip{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 14px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch}" +
      ".rgd-strip::-webkit-scrollbar{height:8px}.rgd-strip::-webkit-scrollbar-thumb{background:#cdd6da;border-radius:8px}" +
      ".rgd-tile{flex:0 0 260px;width:260px;border-radius:16px;overflow:hidden;cursor:pointer;background:#fff;box-shadow:0 6px 18px rgba(18,59,76,.12);transition:transform .15s,box-shadow .15s;border:1px solid #e7edf0}" +
      ".rgd-tile:hover{transform:translateY(-4px);box-shadow:0 12px 26px rgba(18,59,76,.20)}" +
      ".rgd-top{height:120px;background:linear-gradient(135deg," + C.tileA + "," + C.tileB + ");display:flex;align-items:center;justify-content:center;position:relative}" +
      ".rgd-emoji{font-size:52px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))}" +
      ".rgd-vote-tag{position:absolute;top:10px;right:10px;background:" + C.hi + ";color:" + C.navy + ";font-size:11px;font-weight:800;padding:3px 9px;border-radius:20px}" +
      ".rgd-demo-tag{position:absolute;top:10px;left:10px;background:rgba(255,255,255,.9);color:" + C.navy + ";font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px}" +
      ".rgd-body{padding:12px 14px 14px}" +
      ".rgd-title{font-size:15px;font-weight:800;color:" + C.navy + ";line-height:1.3;min-height:40px}" +
      ".rgd-place{color:" + C.slate + ";font-size:12.5px;margin:6px 0 10px}" +
      ".rgd-row{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".rgd-price{color:" + C.orange + ";font-weight:800;font-size:15px}" +
      ".rgd-price small{color:" + C.slate + ";font-weight:600;font-size:11px}" +
      ".rgd-count{background:" + C.cream + ";color:" + C.navy + ";font-size:12px;font-weight:700;padding:4px 9px;border-radius:20px;white-space:nowrap}" +
      ".rgd-bar{height:6px;border-radius:6px;background:#eef2f4;margin-top:10px;overflow:hidden}" +
      ".rgd-fill{height:100%;background:" + C.orange + "}" +
      // modal
      ".rgd-ov{position:fixed;inset:0;background:rgba(10,25,32,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}" +
      ".rgd-modal{background:#fff;border-radius:18px;max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.35)}" +
      ".rgd-m-top{height:130px;background:linear-gradient(135deg," + C.tileA + "," + C.tileB + ");display:flex;align-items:center;justify-content:center;position:relative}" +
      ".rgd-m-top .rgd-emoji{font-size:66px}" +
      ".rgd-x{position:absolute;top:12px;right:14px;background:rgba(255,255,255,.9);border:none;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;color:" + C.navy + "}" +
      ".rgd-m-body{padding:18px 20px 22px}" +
      ".rgd-m-body h2{margin:0 0 6px;color:" + C.navy + ";font-size:20px}" +
      ".rgd-m-place{color:" + C.slate + ";font-size:13px;margin-bottom:12px}" +
      ".rgd-m-plan{color:#26424e;font-size:14px;line-height:1.6;margin-bottom:14px}" +
      ".rgd-info{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}" +
      ".rgd-chip{background:" + C.cream + ";color:" + C.navy + ";font-size:12.5px;font-weight:600;padding:6px 11px;border-radius:20px}" +
      ".rgd-tiers{display:flex;gap:10px;margin-bottom:16px}" +
      ".rgd-tier{flex:1;border:1px solid #e7edf0;border-radius:12px;padding:10px 12px;text-align:center}" +
      ".rgd-tier b{display:block;color:" + C.orange + ";font-size:16px}" +
      ".rgd-tier span{color:" + C.slate + ";font-size:11.5px}" +
      ".rgd-sec-h{font-weight:800;color:" + C.navy + ";font-size:14px;margin:6px 0 10px;display:flex;align-items:center;gap:8px}" +
      ".rgd-days{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}" +
      ".rgd-day{border:1px solid #dbe3e7;border-radius:10px;padding:8px 10px;text-align:center;min-width:64px}" +
      ".rgd-day .d{font-weight:700;color:" + C.navy + ";font-size:13px}" +
      ".rgd-day .v{font-size:11px;color:" + C.slate + ";margin-top:2px}" +
      ".rgd-day.win{border-color:" + C.orange + ";background:" + C.cream + "}" +
      ".rgd-day.win .v{color:" + C.orange + ";font-weight:700}" +
      ".rgd-note{font-size:12px;color:" + C.slate + ";margin-top:6px}" +
      ".rgd-cta{display:block;width:100%;background:" + C.orange + ";color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:800;cursor:pointer;margin-top:8px}" +
      ".rgd-cta:hover{filter:brightness(.95)}" +
      ".rgd-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:" + C.navy + ";color:#fff;padding:12px 20px;border-radius:30px;font-size:14px;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.3)}"
    var st = document.createElement("style")
    st.id = "rgd-style"
    st.textContent = css
    document.head.appendChild(st)
  }

  function toast(msg) {
    if (window.toast) {
      try {
        window.toast(msg)
        return
      } catch (e) {}
    }
    var t = document.createElement("div")
    t.className = "rgd-toast"
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(function () {
      t.remove()
    }, 2600)
  }

  // --- Tile markup ---
  function tileHtml(t) {
    var r = rangeOf(t)
    var pct = Math.min(100, Math.round((t.joined / MIN) * 100))
    var voteTag = t.voting ? '<span class="rgd-vote-tag">\uD83D\uDDF3\uFE0F \u062A\u0635\u0648\u064A\u062A \u062C\u0627\u0631\u064D</span>' : ""
    return (
      '<div class="rgd-tile" data-id="' + t.id + '">' +
      '<div class="rgd-top"><span class="rgd-emoji">' + t.emoji + "</span>" +
      '<span class="rgd-demo-tag">DEMO</span>' + voteTag + "</div>" +
      '<div class="rgd-body">' +
      '<div class="rgd-title">' + esc(t.title) + "</div>" +
      '<div class="rgd-place">\uD83D\uDCCD ' + esc(t.places.join(" \u2022 ")) + "</div>" +
      '<div class="rgd-place">\uD83D\uDCC5 ' + fmt(r.from) + " \u2192 " + fmt(r.to) + "</div>" +
      '<div class="rgd-row">' +
      '<div class="rgd-price">' + money(perPerson(t)) + '<small>/\u0641\u0631\u062F</small></div>' +
      '<div class="rgd-count">' + t.joined + "/" + MIN + " \u0645\u0633\u0627\u0641\u0631</div>" +
      "</div>" +
      '<div class="rgd-bar"><div class="rgd-fill" style="width:' + pct + '%"></div></div>' +
      "</div></div>"
    )
  }

  // --- Voting block for the modal (demo numbers) ---
  function voteHtml(t) {
    var r = rangeOf(t)
    // Build fake but sensible vote distribution over the first 5 days.
    var votes = [2, 5, 1, 3, 0, 0, 0]
    var max = Math.max.apply(null, votes)
    var days = r.list
      .map(function (d, i) {
        var v = votes[i] || 0
        var win = v === max && v > 0
        return (
          '<div class="rgd-day' + (win ? " win" : "") + '">' +
          '<div class="d">' + fmt(d) + "</div>" +
          '<div class="v">' + v + " \u0635\u0648\u062A" + (win ? " \uD83C\uDFC6" : "") + "</div>" +
          "</div>"
        )
      })
      .join("")
    return (
      '<div class="rgd-sec-h">\uD83D\uDDF3\uFE0F \u0627\u0644\u062A\u0635\u0648\u064A\u062A \u0639\u0644\u0649 \u064A\u0648\u0645 \u0627\u0644\u0631\u062D\u0644\u0629</div>' +
      '<div class="rgd-days">' + days + "</div>" +
      '<div class="rgd-note">\u0648\u0635\u0644 \u0627\u0644\u0639\u062F\u062F \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u2705 \u2014 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0628\u064A\u0635\u0648\u062A\u0648\u0627 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0639\u062F \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u060C \u0648\u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0623\u0639\u0644\u0649 \u0623\u0635\u0648\u0627\u062A\u064B\u0627 \u0647\u064A\u0641\u0648\u0632.</div>'
    )
  }

  // --- Modal ---
  function openTrip(id) {
    var t = null
    for (var i = 0; i < TRIPS.length; i++) if (TRIPS[i].id === id) t = TRIPS[i]
    if (!t) return
    var r = rangeOf(t)
    var ov = document.createElement("div")
    ov.className = "rgd-ov"
    ov.innerHTML =
      '<div class="rgd-modal">' +
      '<div class="rgd-m-top"><span class="rgd-emoji">' + t.emoji + "</span>" +
      '<button class="rgd-x" data-close="1">\u00D7</button></div>' +
      '<div class="rgd-m-body">' +
      "<h2>" + esc(t.title) + "</h2>" +
      '<div class="rgd-m-place">\uD83D\uDCCD ' + esc(t.places.join(" \u2022 ")) + "</div>" +
      '<div class="rgd-m-plan">' + esc(t.plan) + "</div>" +
      '<div class="rgd-info">' +
      '<span class="rgd-chip">\uD83D\uDCC5 ' + fmt(r.from) + " \u2192 " + fmt(r.to) + "</span>" +
      '<span class="rgd-chip">\uD83D\uDC65 ' + t.joined + "/" + MIN + " \u0645\u0633\u0627\u0641\u0631</span>" +
      '<span class="rgd-chip">\uD83D\uDE90 \u0645\u0644\u0627\u0643\u064A / \u0628\u0627\u0635</span>' +
      "</div>" +
      '<div class="rgd-tiers">' +
      '<div class="rgd-tier"><b>' + money(Math.round(t.priceSmall / 2)) + '</b><span>\u0641\u0631\u062F \u0641\u064A \u0627\u0644\u0645\u0644\u0627\u0643\u064A (2-3)</span></div>' +
      '<div class="rgd-tier"><b>' + money(perPerson(t)) + '</b><span>\u0641\u0631\u062F \u0641\u064A \u0627\u0644\u0628\u0627\u0635 (10)</span></div>' +
      "</div>" +
      (t.voting ? voteHtml(t) : "") +
      '<button class="rgd-cta" data-join="1">' + (t.voting ? "\u0635\u0648\u0651\u062A \u0648\u0627\u062D\u062C\u0632 \u0645\u0643\u0627\u0646\u0643" : "\u0627\u0646\u0636\u0645 \u0644\u0644\u0631\u062D\u0644\u0629") + "</button>" +
      '<div class="rgd-note" style="text-align:center;margin-top:10px">\u0647\u0630\u0627 \u0639\u0631\u0636 \u062A\u062C\u0631\u064A\u0628\u064A (Demo) \u0644\u0644\u0634\u0643\u0644 \u0627\u0644\u0646\u0647\u0627\u0626\u064A</div>' +
      "</div></div>"
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.getAttribute("data-close")) ov.remove()
      if (e.target.getAttribute("data-join")) {
        toast("\u062F\u0647 \u0639\u0631\u0636 \u062A\u062C\u0631\u064A\u0628\u064A \u2014 \u0627\u0644\u062D\u062C\u0632 \u0647\u064A\u0634\u062A\u063A\u0644 \u0628\u0639\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644")
      }
    })
    document.body.appendChild(ov)
  }

  // --- Build the showcase section ---
  function build() {
    if (MOUNTED) return
    injectStyle()
    var wrap = document.createElement("div")
    wrap.className = "rgd-wrap"
    wrap.id = "rgd-wrap"
    var tiles = TRIPS.map(tileHtml).join("")
    wrap.innerHTML =
      '<div class="rgd-head"><h3>\uD83D\uDE8C \u0631\u062D\u0644\u0627\u062A \u062C\u0645\u0627\u0639\u064A\u0629 \u0645\u0641\u062A\u0648\u062D\u0629</h3><span class="rgd-badge">DEMO</span></div>' +
      '<div class="rgd-sub">\u0627\u0646\u0636\u0645 \u0644\u0631\u062D\u0644\u0629 \u0645\u0639 \u0645\u0633\u0627\u0641\u0631\u064A\u0646 \u062A\u0627\u0646\u064A\u064A\u0646 \u2014 \u0643\u0644\u0645\u0627 \u0632\u0627\u062F \u0627\u0644\u0639\u062F\u062F \u0642\u0644\u0651 \u0627\u0644\u0633\u0639\u0631 \u0644\u0644\u0641\u0631\u062F.</div>' +
      '<div class="rgd-strip" id="rgd-strip">' + tiles + "</div>"
    wrap.addEventListener("click", function (e) {
      var tile = e.target.closest ? e.target.closest(".rgd-tile") : null
      if (tile) openTrip(tile.getAttribute("data-id"))
    })

    // Preferred mount point: right after the "Create your journey" banner.
    var anchor =
      document.getElementById("gt-entry") ||
      document.getElementById("gt-banner-wrap") ||
      document.querySelector("header")
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling)
    } else {
      document.body.insertBefore(wrap, document.body.firstChild)
    }
    MOUNTED = true

    // Best-effort: hide the real (empty) open-trips strip to avoid confusion.
    try {
      var real = document.getElementById("gt-open-row")
      if (real) real.style.display = "none"
      if (window.GT) window.GT.scrollToOpen = function () {
        wrap.scrollIntoView({ behavior: "smooth" })
      }
    } catch (e) {}
  }

  // The host app injects #gt-entry asynchronously; wait for it, then mount.
  function boot() {
    build()
    var tries = 0
    var iv = setInterval(function () {
      tries++
      // If the app re-rendered and dropped our section, re-insert it.
      if (!document.getElementById("rgd-wrap")) {
        MOUNTED = false
        build()
      }
      if (tries > 20) clearInterval(iv)
    }, 500)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot)
  } else {
    boot()
  }
})()
