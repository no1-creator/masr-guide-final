/* RaGo — Open Trips strip (frontend-only demo)
 * Simple & reliable: a horizontal strip of trip cards that MOVES left/right
 * (continuous auto-scroll + always-visible desktop arrows). English UI, USD.
 * Also hides the OLD group-trips.js Arabic row (its banner stays untouched).
 * No layout hacks — sits cleanly just under the "Create your journey" banner.
 */
(function () {
  'use strict';

  var CONTAINER_ID = 'rago-open-trips';
  var MODAL_ID = 'rago-trip-modal';

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

  var INCLUDES = [
    'Private air-conditioned transport',
    'Licensed English-speaking guide',
    'All entry tickets',
    'Daily breakfast'
  ];

  var VOTE_DATES = [
    { label: 'Oct 12 – Oct 20', votes: 4 },
    { label: 'Oct 19 – Oct 27', votes: 7 },
    { label: 'Nov 02 – Nov 10', votes: 2 }
  ];

  function usd(n) { return '$' + Number(n).toLocaleString('en-US'); }

  // ---- Banner detection -------------------------------------------------
  function isDark(bg) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg || '');
    if (!m) return false;
    var a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a < 0.3) return false;
    return (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) < 110;
  }
  function bannerish(el) {
    var cs = getComputedStyle(el);
    return isDark(cs.backgroundColor) || /gradient/i.test(cs.backgroundImage || '');
  }
  function findBanner() {
    var nodes = document.querySelectorAll('h1,h2,h3,h4,p,span,button,a');
    var start = null;
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (!t || t.length > 120) continue;
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
    el = start;
    for (var u2 = 0; u2 < 8 && el && el.parentElement; u2++) {
      el = el.parentElement;
      var r2 = el.getBoundingClientRect();
      if (r2.height > 90 && r2.width > 300) return el;
    }
    return start.parentElement;
  }

  // ---- Hide the OLD group-trips.js Arabic row (its banner stays) --------
  function hideOld() {
    var sel = ['.gt-open-row', '#gt-open-row', '.gt-strip'];
    for (var i = 0; i < sel.length; i++) {
      var els = document.querySelectorAll(sel[i]);
      for (var j = 0; j < els.length; j++) { els[j].style.display = 'none'; }
    }
  }

  // ---- Details modal ----------------------------------------------------
  function closeModal() {
    var m = document.getElementById(MODAL_ID);
    if (m) m.parentNode.removeChild(m);
    document.removeEventListener('keydown', onEsc);
  }
  function onEsc(e) { if (e.key === 'Escape') closeModal(); }

  function primaryButton(text, bg) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText = [
      'width:100%', 'border:0', 'border-radius:10px', 'padding:11px 0',
      'font-size:14px', 'font-weight:800', 'cursor:pointer', 'color:#fff', 'background:' + bg
    ].join(';');
    return b;
  }
  function showDone(actions, msg) {
    actions.innerHTML = '';
    var d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = [
      'background:#EAF6EE', 'border:1px solid #B7E4C7', 'color:#2D6A4F',
      'border-radius:10px', 'padding:12px', 'font-size:13px', 'font-weight:600'
    ].join(';');
    actions.appendChild(d);
  }

  function openModal(t) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'background:rgba(9,25,33,.6)', 'z-index:99999',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:16px', 'font-family:inherit'
    ].join(';');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    var dialog = document.createElement('div');
    dialog.style.cssText = [
      'background:#fff', 'width:100%', 'max-width:440px', 'border-radius:18px', 'overflow:hidden',
      'box-shadow:0 24px 60px rgba(0,0,0,.35)', 'max-height:90vh', 'display:flex', 'flex-direction:column'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = [
      'position:relative', 'height:120px', 'flex:0 0 auto',
      'background:linear-gradient(135deg,' + t.g[0] + ',' + t.g[1] + ')',
      'display:flex', 'align-items:flex-end', 'padding:14px 16px'
    ].join(';');
    var hName = document.createElement('div');
    hName.textContent = t.name;
    hName.style.cssText = 'color:#fff;font-size:20px;font-weight:800;text-shadow:0 1px 6px rgba(0,0,0,.3)';
    header.appendChild(hName);
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';
    close.style.cssText = [
      'position:absolute', 'top:10px', 'right:10px', 'width:32px', 'height:32px', 'border:0',
      'border-radius:999px', 'background:rgba(255,255,255,.9)', 'color:#123B4C', 'font-size:20px',
      'line-height:1', 'cursor:pointer'
    ].join(';');
    close.onclick = closeModal;
    header.appendChild(close);
    dialog.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'padding:16px;overflow-y:auto';

    var price = document.createElement('div');
    price.innerHTML = '<span style="font-size:12px;color:#6B7B85">from</span> ' +
      '<span style="font-size:22px;font-weight:800;color:#E8850F">' + usd(t.usd) + '</span>' +
      '<span style="font-size:12px;color:#6B7B85"> / person</span>';
    body.appendChild(price);

    var meta = document.createElement('div');
    meta.textContent = t.days + ' days · ' + t.joined + ' travellers joined';
    meta.style.cssText = 'font-size:12px;color:#6B7B85;margin-top:4px';
    body.appendChild(meta);

    var desc = document.createElement('p');
    desc.textContent = 'Discover ' + t.name + ' with a small group of fellow travellers. ' +
      'The more people join, the lower the price per person.';
    desc.style.cssText = 'font-size:13px;color:#33454E;line-height:1.5;margin:12px 0 6px';
    body.appendChild(desc);

    var incTitle = document.createElement('div');
    incTitle.textContent = "What's included";
    incTitle.style.cssText = 'font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#6B7B85;margin:8px 0 6px';
    body.appendChild(incTitle);
    var ul = document.createElement('ul');
    ul.style.cssText = 'margin:0 0 8px;padding-left:18px;color:#33454E;font-size:13px;line-height:1.7';
    INCLUDES.forEach(function (it) { var li = document.createElement('li'); li.textContent = it; ul.appendChild(li); });
    body.appendChild(ul);

    var actions = document.createElement('div');
    actions.style.cssText = 'margin-top:12px';
    if (t.vote) {
      var vTitle = document.createElement('div');
      vTitle.textContent = 'Choose your preferred dates';
      vTitle.style.cssText = 'font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#6B7B85;margin-bottom:8px';
      actions.appendChild(vTitle);
      var chosen = { i: 0 };
      VOTE_DATES.forEach(function (d, idx) {
        var row = document.createElement('label');
        row.style.cssText = [
          'display:flex', 'align-items:center', 'justify-content:space-between', 'gap:10px',
          'border:1px solid #E7EDF0', 'border-radius:10px', 'padding:9px 12px', 'margin-bottom:8px',
          'cursor:pointer', 'font-size:13px', 'color:#123B4C'
        ].join(';');
        var left = document.createElement('span');
        left.style.cssText = 'display:flex;align-items:center;gap:8px';
        var radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'rago-vote';
        if (idx === 0) radio.checked = true;
        radio.onchange = function () { chosen.i = idx; };
        left.appendChild(radio);
        var lbl = document.createElement('span'); lbl.textContent = d.label; left.appendChild(lbl);
        row.appendChild(left);
        var cnt = document.createElement('span'); cnt.textContent = d.votes + ' votes';
        cnt.style.cssText = 'font-size:11px;color:#6B7B85'; row.appendChild(cnt);
        actions.appendChild(row);
      });
      var voteBtn = primaryButton('Submit vote', '#123B4C');
      voteBtn.onclick = function () { showDone(actions, 'Thanks! Your vote for ' + VOTE_DATES[chosen.i].label + ' was recorded. (demo)'); };
      actions.appendChild(voteBtn);
    } else {
      var joinBtn = primaryButton('Confirm join', '#E8850F');
      joinBtn.onclick = function () { showDone(actions, "You're in! We'll email your full itinerary shortly. (demo)"); };
      actions.appendChild(joinBtn);
    }
    body.appendChild(actions);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEsc);
  }

  // ---- Card -------------------------------------------------------------
  function buildCard(t) {
    var card = document.createElement('div');
    card.style.cssText = [
      'flex:0 0 auto', 'width:168px',
      'background:#ffffff', 'border:1px solid #E7EDF0', 'border-radius:14px', 'overflow:hidden',
      'box-shadow:0 10px 24px rgba(9,25,33,.16)', 'font-family:inherit', 'cursor:pointer',
      'transition:transform .15s ease, box-shadow .15s ease'
    ].join(';');
    card.onmouseenter = function () { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 14px 30px rgba(9,25,33,.24)'; };
    card.onmouseleave = function () { card.style.transform = 'none'; card.style.boxShadow = '0 10px 24px rgba(9,25,33,.16)'; };
    card.onclick = function () { openModal(t); };

    var media = document.createElement('div');
    media.style.cssText = ['position:relative', 'height:92px', 'background:linear-gradient(135deg,' + t.g[0] + ',' + t.g[1] + ')'].join(';');
    if (t.vote) {
      var pill = document.createElement('span');
      pill.textContent = 'Vote open';
      pill.style.cssText = ['position:absolute', 'top:8px', 'left:8px', 'background:#FFD9A8', 'color:#7a3d00', 'font-size:10px', 'font-weight:700', 'padding:3px 8px', 'border-radius:999px'].join(';');
      media.appendChild(pill);
    }
    card.appendChild(media);

    var b = document.createElement('div');
    b.style.cssText = 'padding:10px 12px 12px';
    var name = document.createElement('div');
    name.textContent = t.name;
    name.style.cssText = 'font-size:14px;font-weight:700;color:#123B4C;line-height:1.25';
    b.appendChild(name);
    var meta = document.createElement('div');
    meta.textContent = t.days + ' days · ' + t.joined + ' joined';
    meta.style.cssText = 'font-size:11px;color:#6B7B85;margin-top:3px';
    b.appendChild(meta);
    var price = document.createElement('div');
    price.innerHTML = '<span style="font-size:11px;color:#6B7B85">from</span> ' +
      '<span style="font-size:14px;font-weight:800;color:#E8850F">' + usd(t.usd) + '</span>' +
      '<span style="font-size:11px;color:#6B7B85"> / person</span>';
    price.style.cssText = 'margin-top:6px';
    b.appendChild(price);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t.vote ? 'Vote now' : 'Join trip';
    btn.style.cssText = [
      'width:100%', 'margin-top:9px', 'border:0', 'border-radius:9px', 'padding:8px 0',
      'font-size:13px', 'font-weight:800', 'cursor:pointer', 'color:#fff',
      'background:' + (t.vote ? '#123B4C' : '#E8850F')
    ].join(';');
    btn.onclick = function (e) { e.stopPropagation(); openModal(t); };
    b.appendChild(btn);
    card.appendChild(b);
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
    wrap.style.position = 'relative';
    wrap.style.zIndex = '5';
    wrap.style.marginLeft = cs.marginLeft;
    wrap.style.marginRight = cs.marginRight;
    wrap.style.marginTop = '-18px'; // tuck slightly toward the banner (safe, no overlap)
    if (cs.maxWidth && cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;
    wrap.style.paddingLeft = cs.paddingLeft;
    wrap.style.paddingRight = cs.paddingRight;

    var head = document.createElement('div');
    head.textContent = 'OPEN TRIPS';
    head.style.cssText = 'font-size:12px;font-weight:800;letter-spacing:.08em;color:#123B4C;margin:0 0 8px';
    wrap.appendChild(head);

    var viewport = document.createElement('div');
    viewport.style.cssText = 'position:relative;overflow:hidden';

    var track = document.createElement('div');
    track.className = 'rago-track';
    track.style.cssText = [
      'display:flex', 'gap:14px', 'overflow-x:auto', 'padding:6px 2px 14px', '-webkit-overflow-scrolling:touch'
    ].join(';');
    track.style.setProperty('scrollbar-width', 'none');
    var st = document.createElement('style');
    st.textContent = '#' + CONTAINER_ID + ' .rago-track::-webkit-scrollbar{display:none}';
    wrap.appendChild(st);

    TRIPS.concat(TRIPS).forEach(function (t) { track.appendChild(buildCard(t)); }); // doubled for seamless loop
    viewport.appendChild(track);

    var paused = { v: false };
    function arrow(dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', dir < 0 ? 'Previous trips' : 'Next trips');
      b.innerHTML = dir < 0 ? '&#8249;' : '&#8250;';
      b.style.cssText = [
        'position:absolute', 'top:calc(50% + 4px)', 'transform:translateY(-50%)',
        (dir < 0 ? 'left:2px' : 'right:2px'), 'z-index:6',
        'width:40px', 'height:40px', 'border-radius:999px', 'border:0',
        'background:#123B4C', 'color:#fff', 'font-size:24px', 'line-height:1', 'cursor:pointer',
        'display:flex', 'align-items:center', 'justify-content:center',
        'box-shadow:0 4px 14px rgba(0,0,0,.35)', 'opacity:.95', 'transition:opacity .15s ease'
      ].join(';');
      b.onmouseenter = function () { b.style.opacity = '1'; };
      b.onmouseleave = function () { b.style.opacity = '.95'; };
      b.onclick = function () {
        paused.v = true;
        var hw = track.scrollWidth / 2;
        if (dir < 0 && track.scrollLeft < 340) track.scrollLeft += hw;
        track.scrollBy({ left: dir * 340, behavior: 'smooth' });
        setTimeout(function () { paused.v = false; }, 1200);
      };
      return b;
    }
    viewport.appendChild(arrow(-1));
    viewport.appendChild(arrow(1));
    viewport.addEventListener('mouseenter', function () { paused.v = true; });
    viewport.addEventListener('mouseleave', function () { paused.v = false; });

    wrap.appendChild(viewport);
    parent.insertBefore(wrap, banner.nextSibling);

    // Continuous auto-scroll with seamless wrap.
    function tick() {
      if (!document.getElementById(CONTAINER_ID)) return;
      var hw = track.scrollWidth / 2;
      if (!paused.v && hw > 0) {
        track.scrollLeft += 0.5;
        if (track.scrollLeft >= hw) track.scrollLeft -= hw;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Init -------------------------------------------------------------
  function init() {
    hideOld();
    var banner = findBanner();
    if (banner) { mount(banner); hideOld(); return true; }
    return false;
  }
  function boot() {
    var ht = 0;
    var hv = setInterval(function () { hideOld(); if (++ht > 40) clearInterval(hv); }, 300);
    if (init()) return;
    var tries = 0;
    var iv = setInterval(function () { tries++; if (init() || tries > 60) clearInterval(iv); }, 250);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (document.getElementById(CONTAINER_ID)) { mo.disconnect(); return; }
        if (init()) mo.disconnect();
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 20000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
