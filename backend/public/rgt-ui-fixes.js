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
