/* RaGo — Open Trips strip (frontend-only demo)
 * Goal: reliable placement + horizontal scrolling (desktop arrows + auto-scroll).
 * Strategy: the site's own group-trips.js already renders a correctly-positioned
 * row (#gt-open-row, right under the "Create your journey" banner). We insert OUR
 * strip in that EXACT spot and hide the old row, so it can never drift to the
 * bottom of the page. English UI, USD.
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

  // ---- Locate the site's own open-trips row (perfectly positioned) -------
  function findAnchor() {
    return document.querySelector('#gt-open-row') || document.querySelector('.gt-open-row');
  }

  // ---- Hide the banner blurb line that gets covered by the cards ---------
  // Uses visibility:hidden (NOT display:none) so the banner keeps the exact
  // same size and the trips strip stays in the exact same place.
  function hideBannerBlurb() {
    var phrase = 'pick the places you want to visit';
    var nodes = document.querySelectorAll('p, span, div, small');
    var best = null, bestLen = 100000;
    for (var i = 0; i < nodes.length; i++) {
      var tx = (nodes[i].textContent || '').trim();
      if (!tx || tx.length > 400) continue;
      if (tx.toLowerCase().indexOf(phrase) !== -1 && tx.length < bestLen) {
        best = nodes[i]; bestLen = tx.length;
      }
    }
    if (best) best.style.visibility = 'hidden';
  }

  // ---- Widen the banner + trips to match the site's normal container ----
  // Pulls #gt-entry outward with negative margins ONLY as much as needed to
  // line up with a normal .container section on the page (never wider). Works
  // for both desktop and mobile because it measures the live layout.
  function widenBanner() {
    var entry = document.getElementById('gt-entry');
    if (!entry) return;
    // Re-baseline to centered before measuring (keeps it stable on resize).
    entry.style.marginLeft = 'auto';
    entry.style.marginRight = 'auto';
    var ref = null;
    var conts = document.querySelectorAll('.container');
    for (var i = 0; i < conts.length; i++) {
      var c = conts[i];
      if (c === entry || c.contains(entry) || entry.contains(c)) continue;
      if (c.getBoundingClientRect().width > 200) { ref = c; break; }
    }
    if (!ref) return;
    var er = entry.getBoundingClientRect();
    var rr = ref.getBoundingClientRect();
    var leftDiff = er.left - rr.left;
    var rightDiff = rr.right - er.right;
    if (leftDiff > 2) entry.style.marginLeft = (-leftDiff) + 'px';
    if (rightDiff > 2) entry.style.marginRight = (-rightDiff) + 'px';
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
      'box-shadow:0 10px 24px rgba(9,25,33,.18)', 'font-family:inherit', 'cursor:pointer',
      'transition:transform .15s ease, box-shadow .15s ease'
    ].join(';');
    card.onmouseenter = function () { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 14px 30px rgba(9,25,33,.26)'; };
    card.onmouseleave = function () { card.style.transform = 'none'; card.style.boxShadow = '0 10px 24px rgba(9,25,33,.18)'; };
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

  // ---- Mount at the site's own row position ------------------------------
  function mount() {
    if (document.getElementById(CONTAINER_ID)) return true;
    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;

    var cs = getComputedStyle(anchor);

    var wrap = document.createElement('div');
    wrap.id = CONTAINER_ID;
    wrap.style.boxSizing = 'border-box';
    wrap.style.position = 'relative';
    wrap.style.zIndex = '3';
    // Inherit the exact horizontal + vertical placement of the site's own row.
    wrap.style.marginTop = cs.marginTop;
    wrap.style.marginLeft = cs.marginLeft;
    wrap.style.marginRight = cs.marginRight;
    wrap.style.paddingLeft = cs.paddingLeft;
    wrap.style.paddingRight = cs.paddingRight;
    if (cs.maxWidth && cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;

    var viewport = document.createElement('div');
    viewport.style.cssText = 'position:relative;overflow:hidden';

    var track = document.createElement('div');
    track.className = 'rago-track';
    track.style.cssText = [
      'display:flex', 'gap:14px', 'overflow-x:auto', 'padding:10px 2px 14px', '-webkit-overflow-scrolling:touch'
    ].join(';');
    track.style.setProperty('scrollbar-width', 'none');
    var st = document.createElement('style');
    var idSel = '#' + CONTAINER_ID;
    st.textContent =
      idSel + ' .rago-track::-webkit-scrollbar{display:none}' +
      // Mobile-only tweaks. Uses !important so it overrides the desktop inline
      // styles ONLY on small screens; desktop stays exactly as-is.
      '@media (max-width:640px){' +
        idSel + '{margin-top:-24px !important;padding-left:14px !important;padding-right:14px !important;}' +
        idSel + ' .rago-track{gap:10px !important;padding:8px 2px 12px !important;}' +
        idSel + ' .rago-track>div{width:44vw !important;min-width:150px !important;max-width:220px !important;}' +
        idSel + ' > div > button{display:none !important;}' +
      '}';
    wrap.appendChild(st);

    TRIPS.concat(TRIPS).forEach(function (t) { track.appendChild(buildCard(t)); }); // doubled -> seamless loop
    viewport.appendChild(track);

    var paused = { v: false };
    function arrow(dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', dir < 0 ? 'Previous trips' : 'Next trips');
      b.innerHTML = dir < 0 ? '&#8249;' : '&#8250;';
      b.style.cssText = [
        'position:absolute', 'top:50%', 'transform:translateY(-50%)',
        (dir < 0 ? 'left:0' : 'right:0'), 'z-index:6',
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
        setTimeout(function () { paused.v = false; }, 1400);
      };
      return b;
    }
    viewport.appendChild(arrow(-1));
    viewport.appendChild(arrow(1));
    viewport.addEventListener('mouseenter', function () { paused.v = true; });
    viewport.addEventListener('mouseleave', function () { paused.v = false; });

    wrap.appendChild(viewport);

    // Drop OUR strip exactly where the site's row sits, then hide the old one.
    anchor.parentNode.insertBefore(wrap, anchor);
    anchor.style.display = 'none';
    hideBannerBlurb();
    widenBanner();
    var bt = 0;
    var bv = setInterval(function () { hideBannerBlurb(); widenBanner(); if (++bt > 10) clearInterval(bv); }, 300);
    if (!window.__ragoResizeBound) {
      window.__ragoResizeBound = true;
      window.addEventListener('resize', function () { widenBanner(); });
    }

    // Continuous auto-scroll with a seamless wrap.
    function tick() {
      if (!document.getElementById(CONTAINER_ID)) return;
      var hw = track.scrollWidth / 2;
      if (!paused.v && hw > 0) {
        track.scrollLeft += 0.6;
        if (track.scrollLeft >= hw) track.scrollLeft -= hw;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return true;
  }

  // ---- Boot -------------------------------------------------------------
  function boot() {
    if (mount()) return;
    var tries = 0;
    var iv = setInterval(function () { tries++; if (mount() || tries > 80) clearInterval(iv); }, 250);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { if (mount()) mo.disconnect(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 25000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
