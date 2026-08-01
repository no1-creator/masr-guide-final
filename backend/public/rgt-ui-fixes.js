/* RaGo - UI fixes (additive, safe).
 * 1) Every homepage category card shows a real photo (never empty). Categories
 *    with a dedicated /img/cat-<key>.jpg keep it; the remaining 9 use a clean
 *    themed web photo with a local Egypt-photo fallback if the web image fails.
 * 2) Global anti-autofill guard for search boxes.
 */
(function () {
  'use strict'

  var HAS_IMG = { airport: 1, transfers: 1, hotels: 1, 'internal-trips': 1, tours: 1, 'nile-cruise': 1, diving: 1, safari: 1, pharmacy: 1, spa: 1 }
  var EXT = {
    visa: 'https://loremflickr.com/480/320/passport,egypt/all?lock=11',
    carrental: 'https://loremflickr.com/480/320/car,rental/all?lock=12',
    guide: 'https://loremflickr.com/480/320/egypt,tour,guide/all?lock=13',
    sim: 'https://loremflickr.com/480/320/sim,card,smartphone/all?lock=14',
    dining: 'https://loremflickr.com/480/320/egyptian,food,restaurant/all?lock=15',
    shopping: 'https://loremflickr.com/480/320/egypt,bazaar,market/all?lock=16',
    events: 'https://loremflickr.com/480/320/egypt,concert,festival/all?lock=17',
    insurance: 'https://loremflickr.com/480/320/travel,insurance/all?lock=18',
    departure: 'https://loremflickr.com/480/320/airport,departure/all?lock=19'
  }
  var FALLBACK = { visa: 'giza', carrental: 'desert', guide: 'karnak', sim: 'redsea', dining: 'nile', shopping: 'giza', events: 'karnak', insurance: 'nile', departure: 'redsea' }
  function cardBg(key) {
    if (EXT[key]) return `background-image:url('${EXT[key]}'),url('img/${FALLBACK[key] || 'giza'}.png')`
    if (HAS_IMG[key]) return `background-image:url('img/cat-${key}.jpg')`
    if (FALLBACK[key]) return `background-image:url('img/${FALLBACK[key]}.png')`
    return 'background:linear-gradient(135deg,#6B7B85,#123B4C)'
  }

  window.loadCats = async function () {
    try { CATS = await api('/api/categories') } catch (e) { CATS = [] }
    var el = document.getElementById('cats')
    if (!el) return
    var html = `<div class="pcard ${CUR_CAT === '' ? 'on' : ''}" style="background:linear-gradient(135deg,#1C4E63,#0C2A36)" onclick="pickCat('')"><div class="ov"></div><span>All Services</span></div>`
    html += CATS.map(function (c) {
      return `<div class="pcard ${CUR_CAT === c.key ? 'on' : ''}" style="${cardBg(c.key)}" onclick="pickCat('${c.key}')"><div class="ov"></div><span>${esc((c.labels && c.labels.en) || c.key)}</span></div>`
    }).join('')
    el.innerHTML = html
  }
  function rerenderCats() { try { if (document.getElementById('cats')) window.loadCats() } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rerenderCats)
  else rerenderCats()

  function isProtectedField(el) {
    var id = el.id || ''
    if (/li-email|li-pass|ph-number|ph-name|mk-email|mk-pass|eg-f-|sf-|bn-|vp-|set-|po-|aff-link/.test(id)) return true
    var t = (el.type || '').toLowerCase()
    if (t === 'email' || t === 'password' || t === 'tel') return true
    return false
  }
  function isSearchField(el) {
    if (!el || el.tagName !== 'INPUT') return false
    if (isProtectedField(el)) return false
    var t = (el.type || '').toLowerCase()
    if (t === 'search') return true
    var ph = (el.getAttribute('placeholder') || '').toLowerCase()
    var nm = (el.getAttribute('name') || '').toLowerCase()
    var idv = (el.id || '').toLowerCase()
    return /search/.test(ph) || /search/.test(nm) || idv === 'q' || /(^|-)q$/.test(idv)
  }
  function harden(el) {
    if (el.__rgtHardened) return
    el.__rgtHardened = 1
    try {
      el.setAttribute('autocomplete', 'off')
      el.setAttribute('autocorrect', 'off')
      el.setAttribute('autocapitalize', 'off')
      el.setAttribute('spellcheck', 'false')
      if (!el.getAttribute('name')) el.setAttribute('name', 'rago-search-' + Math.random().toString(36).slice(2, 8))
    } catch (e) {}
  }
  function clearIfEmail(el) {
    if (el && document.activeElement !== el && /@/.test(el.value)) el.value = ''
  }
  function scan() {
    var ins = document.getElementsByTagName('input')
    for (var i = 0; i < ins.length; i++) {
      if (isSearchField(ins[i])) { harden(ins[i]); clearIfEmail(ins[i]) }
    }
  }
  document.addEventListener('focusout', function (e) {
    if (isSearchField(e.target)) setTimeout(function () { clearIfEmail(e.target) }, 0)
  })
  var _t = null
  try {
    new MutationObserver(function () {
      clearTimeout(_t); _t = setTimeout(scan, 60)
    }).observe(document.documentElement, { childList: true, subtree: true })
  } catch (e) {}
  var n = 0, iv = setInterval(function () { scan(); if (++n > 12) clearInterval(iv) }, 350)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan)
  else scan()
})()

/* RaGo - Detail page premium polish (additive, isolated).
 * After the frozen category engine renders a service detail page, this adds:
 *   1) a trust strip under the title,
 *   2) a review rating breakdown (average + 5..1 star bars) in the Reviews section,
 *   3) a mobile sticky "from $X - Book now" bar.
 * It never edits the engine; it only observes #detail-body and augments the DOM. */
(function () {
  'use strict'

  function money(n) { return '$' + (Math.round((Number(n) || 0) * 100) / 100) }

  function injectStyle() {
    if (document.getElementById('rgtd-style')) return
    var css = [
      '.rgtd-trust{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 2px}',
      '.rgtd-trust span{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;padding:6px 12px;border-radius:999px}',
      '.rgtd-trust .g{background:#E4F1EE;color:#2E8B7B}',
      '.rgtd-trust .o{background:#FFF4E6;color:#8a5a1e}',
      '.rgtd-trust .b{background:#E6EEF1;color:#123B4C}',
      '.rgtd-break{display:flex;gap:22px;align-items:center;background:#f6fafb;border:1px solid #eef3f5;border-radius:15px;padding:18px;margin:0 0 16px;flex-wrap:wrap}',
      '.rgtd-avg{text-align:center;flex:none}',
      '.rgtd-avg b{display:block;font-size:38px;font-weight:800;color:#123B4C;line-height:1}',
      '.rgtd-avg .st{color:#E8850F;display:inline-flex;gap:1px;margin:4px 0 2px}',
      '.rgtd-avg small{display:block;color:#6b7b85;font-size:12.5px;font-weight:700}',
      '.rgtd-bars{flex:1;min-width:210px;display:grid;gap:6px}',
      '.rgtd-row{display:flex;align-items:center;gap:9px;font-size:12.5px;color:#6b7b85;font-weight:700}',
      '.rgtd-row .lb{width:30px;flex:none}',
      '.rgtd-track{flex:1;height:8px;border-radius:999px;background:#e6eef1;overflow:hidden}',
      '.rgtd-fill{display:block;height:100%;background:#E8850F;border-radius:999px}',
      '.rgtd-row .pc{width:38px;text-align:right;flex:none}',
      '.rgtd-bar{position:fixed;left:0;right:0;bottom:0;z-index:9990;display:none;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-top:1px solid #e6eef1;box-shadow:0 -6px 20px rgba(18,59,76,.12);padding:11px 16px}',
      '.rgtd-bar .pr b{font-size:20px;font-weight:800;color:#123B4C}',
      '.rgtd-bar .pr small{display:block;font-size:11.5px;color:#6b7b85;font-weight:700}',
      '.rgtd-bar button{border:none;border-radius:12px;padding:13px 26px;background:#E8850F;color:#fff;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer;box-shadow:0 8px 18px rgba(232,133,15,.28)}',
      '.rgtd-bar button:active{transform:translateY(1px)}',
      '@media(max-width:900px){.rgtd-bar.on{display:flex}}'
    ].join('')
    var st = document.createElement('style')
    st.id = 'rgtd-style'
    st.textContent = css
    ;(document.head || document.documentElement).appendChild(st)
  }

  function starSvg(on) {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.4" style="vertical-align:middle"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6Z"/></svg>'
  }
  function starsHtml(r) {
    var n = Math.round(Number(r) || 0), o = '', i
    for (i = 1; i <= 5; i++) o += starSvg(i <= n)
    return o
  }

  function addTrust(root) {
    if (root.querySelector('.rgtd-trust')) return
    var sub = root.querySelector('.eg-sub')
    if (!sub) return
    var html = '<div class="rgtd-trust">' +
      '<span class="g">Instant confirmation</span>' +
      '<span class="o">Free cancellation</span>' +
      '<span class="b">Verified provider</span>' +
      '<span class="b">Secure payment</span>' +
      '</div>'
    sub.insertAdjacentHTML('afterend', html)
  }

  function reviewsHeader(root) {
    var hs = root.querySelectorAll('.eg-sec h3')
    for (var i = 0; i < hs.length; i++) {
      var t = (hs[i].textContent || '').replace(/^\s+/, '')
      if (t.indexOf('Reviews') === 0) return hs[i]
    }
    return null
  }

  function addBreakdown(root) {
    var h3 = reviewsHeader(root)
    if (!h3) return
    var sec = h3.parentNode
    if (!sec || sec.getAttribute('data-rgtd-brk')) return
    sec.setAttribute('data-rgtd-brk', '1')
    var svc = window.CUR_SVC
    if (!svc || !svc.id || typeof api !== 'function') { sec.removeAttribute('data-rgtd-brk'); return }
    api('/api/reviews?service_id=' + svc.id).then(function (rv) {
      rv = rv || []
      if (!rv.length) return
      var counts = [0, 0, 0, 0, 0], sum = 0, i
      for (i = 0; i < rv.length; i++) {
        var n = Math.round(Number(rv[i].rating) || 0)
        if (n < 1) n = 1
        if (n > 5) n = 5
        counts[n - 1]++; sum += n
      }
      var total = rv.length
      var avg = Math.round((sum / total) * 10) / 10
      var bars = ''
      for (var s = 5; s >= 1; s--) {
        var pc = Math.round((counts[s - 1] / total) * 100)
        bars += '<div class="rgtd-row"><span class="lb">' + s + '\u2605</span>' +
          '<span class="rgtd-track"><span class="rgtd-fill" style="width:' + pc + '%"></span></span>' +
          '<span class="pc">' + pc + '%</span></div>'
      }
      var html = '<div class="rgtd-break">' +
        '<div class="rgtd-avg"><b>' + avg + '</b><span class="st">' + starsHtml(avg) + '</span>' +
        '<small>' + total + ' verified review' + (total === 1 ? '' : 's') + '</small></div>' +
        '<div class="rgtd-bars">' + bars + '</div></div>'
      h3.insertAdjacentHTML('afterend', html)
    }).catch(function () { sec.removeAttribute('data-rgtd-brk') })
  }

  function ensureBar() {
    var bar = document.getElementById('rgtd-bar')
    if (bar) return bar
    bar = document.createElement('div')
    bar.id = 'rgtd-bar'
    bar.className = 'rgtd-bar'
    bar.innerHTML = '<div class="pr"><b id="rgtd-bar-p"></b><small id="rgtd-bar-u"></small></div>' +
      '<button type="button" id="rgtd-bar-b">Book now</button>'
    document.body.appendChild(bar)
    bar.querySelector('#rgtd-bar-b').addEventListener('click', function () {
      var box = document.querySelector('#eg-cat .eg-book')
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return bar
  }

  function clearPad() { try { document.body.style.paddingBottom = '' } catch (e) {} }

  function updateBar(root) {
    var bar = ensureBar()
    var svc = window.CUR_SVC
    var box = root.querySelector('.eg-book')
    if (!box || !svc) { bar.classList.remove('on'); clearPad(); return }
    var p = document.getElementById('rgtd-bar-p')
    var u = document.getElementById('rgtd-bar-u')
    if (p) p.textContent = Number(svc.price) ? ('from ' + money(svc.price)) : 'Best price'
    if (u) u.textContent = Number(svc.price) ? 'Reserve now, pay online' : 'On request'
    bar.classList.add('on')
    try { document.body.style.paddingBottom = (window.matchMedia && window.matchMedia('(max-width:900px)').matches) ? '84px' : '' } catch (e) {}
  }

  function enhance() {
    var root = document.getElementById('eg-cat')
    var bar = document.getElementById('rgtd-bar')
    if (!root || !root.querySelector('.eg-book')) {
      if (bar) bar.classList.remove('on')
      clearPad()
      return
    }
    injectStyle()
    addTrust(root)
    addBreakdown(root)
    updateBar(root)
  }

  function start() {
    var target = document.getElementById('detail-body') || document.body
    try {
      new MutationObserver(function () { enhance() }).observe(target, { childList: true, subtree: true })
    } catch (e) {}
    enhance()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()

/* RaGo - load global world-class theme polish (additive, isolated CSS). */
(function () {
  'use strict'
  if (document.getElementById('rgt-theme-link')) return
  var l = document.createElement('link')
  l.id = 'rgt-theme-link'
  l.rel = 'stylesheet'
  l.href = '/rgt-theme.css?v=1'
  ;(document.head || document.documentElement).appendChild(l)
})()

/* RaGo - Provider (vendor) dashboard upgrades (additive, isolated).
 * Overrides only the vendor:* dashboard panels to be richer and more
 * professional, and lets a provider hand each marketer a personal referral
 * link + QR code. Admin and affiliate panels are untouched. */
(function () {
  'use strict'
  if (typeof SEC === 'undefined') return

  function stat(n, l) { return '<div class="stat"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>' }
  function num(x) { return Number(x) || 0 }

  SEC['vendor:overview'] = async function (m) {
    await ensureCats()
    var b = await api('/api/bookings')
    var w = await api('/api/wallets/me').catch(function () { return { balance: 0 } })
    var me = await api('/api/vendors/me').catch(function () { return null })
    var all = await api('/api/services').catch(function () { return [] })
    var mine = me ? all.filter(function (s) { return s.vendor_id === me.id }) : all
    var gross = b.reduce(function (s, x) { return s + num(x.amount) }, 0)
    var pending = b.filter(function (x) { return x.status === 'pending' }).length
    var done = b.filter(function (x) { return x.status === 'confirmed' || x.status === 'completed' }).length
    var rated = mine.filter(function (s) { return num(s.rating) > 0 })
    var avg = rated.length ? Math.round((rated.reduce(function (s, x) { return s + num(x.rating) }, 0) / rated.length) * 10) / 10 : 0
    m.innerHTML = '<div class="stats">'
      + stat(mine.length, 'My services')
      + stat(b.length, 'Bookings')
      + stat(pending, 'Pending')
      + stat(done, 'Confirmed / done')
      + stat(money(gross), 'Gross sales')
      + stat(money(w.balance), 'Wallet balance')
      + stat(avg ? ('\u2605 ' + avg) : '\u2014', 'Avg rating')
      + '</div>'
      + '<h3 style="margin:6px 0 8px">Recent bookings</h3>'
      + bookingsTable(b.slice(0, 8))
  }

  SEC['vendor:services'] = async function (m) {
    await ensureCats()
    var all = await api('/api/services')
    var me = await api('/api/vendors/me').catch(function () { return null })
    var mine = me ? all.filter(function (s) { return s.vendor_id === me.id }) : all
    m.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap"><h3 style="margin:0">My services (' + mine.length + ')</h3><button class="btn sm" onclick="openService()">+ New service</button></div>'
      + tbl(['Title', 'Category', 'Price', 'Rating', 'Images', 'Featured', 'Action'], mine.map(function (s) {
        return [
          esc(s.title),
          catName(s.category_id),
          money(s.price),
          '\u2605 ' + (s.rating || 0) + ' <span class="muted">(' + (s.reviews_count || 0) + ')</span>',
          (s.images ? s.images.length : 0),
          s.featured ? '<span class="tag confirmed">Featured</span>' : '\u2014',
          '<button class="btn sm ghost" onclick="openService(' + s.id + ')">Edit</button> <button class="btn sm danger" onclick="delService(' + s.id + ')">Delete</button>'
        ]
      }))
  }

  SEC['vendor:marketers'] = async function (m) {
    var a = await api('/api/affiliates')
    m.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:10px;flex-wrap:wrap"><h3 style="margin:0">My marketers (' + a.length + ')</h3><button class="btn sm" onclick="openModal(\'mkt-modal\')">+ New marketer</button></div>'
      + '<p class="muted" style="margin:0 0 12px">Give each marketer a personal link or QR code. Every booking made through it earns them commission automatically.</p>'
      + tbl(['Name', 'Code', 'Rate', 'Clicks', 'Link / QR', 'Action'], a.map(function (x) {
        return [
          esc(x.name),
          '<code>' + esc(x.code) + '</code>',
          (num(x.commission_rate) * 100) + '%',
          x.clicks,
          '<button class="btn sm ghost" onclick="rgtMkLink(' + x.id + ')">Get link &amp; QR</button>',
          '<button class="btn sm danger" onclick="delAff(' + x.id + ')">Remove</button>'
        ]
      }))
  }

  window.rgtMkLink = async function (id) {
    try {
      var list = await api('/api/affiliates')
      var a = null
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) { a = list[i]; break } }
      if (!a) { toast('Marketer not found'); return }
      var link = a.link || (location.origin + '/?ref=' + encodeURIComponent(a.code))
      window.rgtShowLinkModal(a.name, a.code, link)
    } catch (e) { toast(e.message) }
  }

  window.rgtShowLinkModal = function (name, code, link) {
    var ov = document.getElementById('rgt-mk-ov')
    if (!ov) {
      ov = document.createElement('div')
      ov.id = 'rgt-mk-ov'
      ov.className = 'overlay'
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('on') })
      document.body.appendChild(ov)
    }
    var qr = (typeof qrSvg === 'function') ? qrSvg(link) : ''
    ov.innerHTML = '<div class="modal" style="max-width:420px;width:100%;text-align:center">'
      + '<h3 style="margin:0 0 4px">' + esc(name) + '</h3>'
      + '<p class="muted" style="margin:0 0 14px">Referral code: <code>' + esc(code) + '</code></p>'
      + '<div style="display:flex;justify-content:center;margin-bottom:14px">' + qr + '</div>'
      + '<div class="linkbox"><input id="rgt-mk-in" value="' + esc(link) + '" readonly><button class="btn" onclick="rgtCopyMk()">Copy</button></div>'
      + '<button class="btn ghost" style="margin-top:14px;width:100%" onclick="document.getElementById(\'rgt-mk-ov\').classList.remove(\'on\')">Close</button>'
      + '</div>'
    ov.classList.add('on')
  }

  window.rgtCopyMk = function () {
    var el = document.getElementById('rgt-mk-in')
    if (!el) return
    el.select()
    try { navigator.clipboard.writeText(el.value) } catch (e) {}
    toast('Link copied')
  }
})()
