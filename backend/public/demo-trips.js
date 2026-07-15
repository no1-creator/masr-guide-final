/* RaGo — Open Trips showcase (frontend-only demo)
 * A compact, horizontally-scrollable strip of demo trips attached directly
 * under the existing "Create your journey" banner and matching its width.
 * English UI, prices in USD (site is for international tourists). No backend.
 */
(function () {
  'use strict';

  var CONTAINER_ID = 'rago-open-trips';

  // ---- Demo data (frontend only) ----------------------------------------
  var TRIPS = [
    { name: 'Giza Pyramids',   g: ['#E8850F', '#B45F00'], usd: 50,  days: 9,  joined: 6, vote: false },
    { name: 'Luxor',           g: ['#123B4C', '#0E2E3B'], usd: 65,  days: 12, joined: 4, vote: false },
    { name: 'Aswan',           g: ['#1B5163', '#0E2E3B'], usd: 75,  days: 15, joined: 7, vote: true  },
    { name: 'Hurghada',        g: ['#0E7C86', '#0B5057'], usd: 60,  days: 10, joined: 5, vote: false },
    { name: 'Sharm El-Sheikh', g: ['#1CA6B5', '#0E6D78'], usd: 70,  days: 18, joined: 3, vote: false },
    { name: 'White Desert',    g: ['#C99A4A', '#8D5524'], usd: 58,  days: 7,  joined: 8, vote: true  },
    { name: 'Siwa Oasis',      g: ['#6A994E', '#3F6130'], usd: 80,  days: 20, joined: 4, vote: false },
    { name: 'Alexandria',      g: ['#245E7A', '#123B4C'], usd: 45,  days: 6,  joined: 6, vote: false },
    { name: 'Dahab',           g: ['#0E9AA7', '#0A6B74'], usd: 64,  days: 14, joined: 5, vote: false },
    { name: 'Nile Cruise',     g: ['#E8850F', '#123B4C'], usd: 110, days: 22, joined: 7, vote: false }
  ];

  function usd(n) { return '$' + Number(n).toLocaleString('en-US'); }

  // ---- Helpers ----------------------------------------------------------
  function isDark(bg) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg || '');
    if (!m) return false;
    var a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a < 0.3) return false;
    var lum = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
    return lum < 110;
  }

  // A banner-like element has a dark solid bg OR a CSS gradient background.
  function bannerish(el) {
    var cs = getComputedStyle(el);
    return isDark(cs.backgroundColor) || /gradient/i.test(cs.backgroundImage || '');
  }

  // Find the "Create your journey" banner container. We pick the SMALLEST
  // element that carries the banner text (a heading/button), never a big
  // page wrapper, then climb up to the banner box (its bg is a gradient).
  function findBanner() {
    var nodes = document.querySelectorAll('h1,h2,h3,h4,p,span,button,a');
    var start = null;
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (!t || t.length > 120) continue; // skip large wrapper containers
      if (/design your own trip/i.test(t) || /create your journey/i.test(t)) {
        if (!start || t.length < (start.textContent || '').trim().length) start = nodes[i];
      }
    }
    if (!start) return null;
    var el = start;
    for (var up = 0; up < 8 && el && el.parentElement; up++) {
      el = el.parentElement;
      var r = el.getBoundingClientRect();
      if (bannerish(el) && r.height > 90 && r.width > 300) return el;
    }
    // Fallback: nearest block-level ancestor with banner-like size.
    el = start;
    for (var u2 = 0; u2 < 8 && el && el.parentElement; u2++) {
      el = el.parentElement;
      var r2 = el.getBoundingClientRect();
      if (r2.height > 90 && r2.width > 300) return el;
    }
    return start.parentElement;
  }

  // ---- Card -------------------------------------------------------------
  function buildCard(t) {
    var card = document.createElement('div');
    card.style.cssText = [
      'flex:0 0 auto', 'width:168px', 'scroll-snap-align:start',
      'background:#ffffff', 'border:1px solid #E7EDF0', 'border-radius:14px',
      'overflow:hidden', 'box-shadow:0 4px 14px rgba(18,59,76,.08)',
      'font-family:inherit', 'cursor:pointer', 'transition:transform .15s ease, box-shadow .15s ease'
    ].join(';');
    card.onmouseenter = function () {
      card.style.transform = 'translateY(-3px)';
      card.style.boxShadow = '0 8px 22px rgba(18,59,76,.16)';
    };
    card.onmouseleave = function () {
      card.style.transform = 'none';
      card.style.boxShadow = '0 4px 14px rgba(18,59,76,.08)';
    };

    var media = document.createElement('div');
    media.style.cssText = [
      'position:relative', 'height:96px',
      'background:linear-gradient(135deg,' + t.g[0] + ',' + t.g[1] + ')'
    ].join(';');
    if (t.vote) {
      var pill = document.createElement('span');
      pill.textContent = 'Vote open';
      pill.style.cssText = [
        'position:absolute', 'top:8px', 'left:8px', 'background:#FFD9A8',
        'color:#7a3d00', 'font-size:10px', 'font-weight:700', 'letter-spacing:.3px',
        'padding:3px 8px', 'border-radius:999px'
      ].join(';');
      media.appendChild(pill);
    }
    card.appendChild(media);

    var body = document.createElement('div');
    body.style.cssText = 'padding:10px 11px 12px';

    var name = document.createElement('div');
    name.textContent = t.name;
    name.style.cssText = 'font-size:14px;font-weight:700;color:#123B4C;line-height:1.2';
    body.appendChild(name);

    var meta = document.createElement('div');
    meta.textContent = t.days + ' days · ' + t.joined + ' joined';
    meta.style.cssText = 'font-size:11px;color:#6B7B85;margin-top:3px';
    body.appendChild(meta);

    var price = document.createElement('div');
    price.innerHTML = '<span style="font-size:11px;color:#6B7B85">from</span> ' +
      '<span style="font-size:15px;font-weight:800;color:#E8850F">' + usd(t.usd) + '</span>' +
      '<span style="font-size:11px;color:#6B7B85"> / person</span>';
    price.style.cssText = 'margin-top:8px';
    body.appendChild(price);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t.vote ? 'Vote now' : 'Join trip';
    btn.style.cssText = [
      'margin-top:10px', 'width:100%', 'border:0', 'border-radius:9px',
      'padding:7px 0', 'font-size:12px', 'font-weight:700', 'cursor:pointer',
      'color:#fff', 'background:' + (t.vote ? '#123B4C' : '#E8850F')
    ].join(';');
    body.appendChild(btn);

    card.appendChild(body);
    return card;
  }

  // ---- Mount ------------------------------------------------------------
  function mount(banner) {
    var old = document.getElementById(CONTAINER_ID);
    if (old) old.parentNode.removeChild(old);

    var parent = banner.parentElement;
    if (!parent) return;
    var cs = getComputedStyle(banner);

    var wrap = document.createElement('div');
    wrap.id = CONTAINER_ID;
    wrap.style.boxSizing = 'border-box';
    wrap.style.display = 'block';
    wrap.style.position = 'relative';
    wrap.style.marginTop = '14px';
    wrap.style.marginLeft = cs.marginLeft;
    wrap.style.marginRight = cs.marginRight;
    if (cs.maxWidth && cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;
    wrap.style.width = 'auto';

    var head = document.createElement('div');
    head.textContent = 'Open trips';
    head.style.cssText = 'font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#6B7B85;margin:0 4px 8px';
    wrap.appendChild(head);

    var track = document.createElement('div');
    track.className = 'rago-track';
    track.style.cssText = [
      'display:flex', 'gap:12px', 'overflow-x:auto', 'scroll-behavior:smooth',
      'scroll-snap-type:x mandatory', 'padding:6px 4px 8px', 'margin:0 -4px',
      '-webkit-overflow-scrolling:touch'
    ].join(';');
    track.style.setProperty('scrollbar-width', 'none');

    var styleTag = document.createElement('style');
    styleTag.textContent = '#' + CONTAINER_ID + ' .rago-track::-webkit-scrollbar{display:none}';
    wrap.appendChild(styleTag);

    TRIPS.forEach(function (t) { track.appendChild(buildCard(t)); });
    wrap.appendChild(track);

    parent.insertBefore(wrap, banner.nextSibling);
  }

  // ---- Init (wait for the SPA to render the banner) ---------------------
  function init() {
    var banner = findBanner();
    if (banner) { mount(banner); return true; }
    return false;
  }

  function boot() {
    if (init()) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (init() || tries > 60) clearInterval(iv);
    }, 250);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (document.getElementById(CONTAINER_ID)) { mo.disconnect(); return; }
        if (init()) mo.disconnect();
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 20000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
