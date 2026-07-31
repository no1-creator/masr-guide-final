/* RaGo - Service Detail Pro (logic, additive & safe). Wraps global
 * openDetail(id): the original runs first (sets CUR_SVC/__imgs, shows the
 * view), then we re-render #detail-body into a world-class layout using
 * window.RAGO_SDP (styles + content). ANY error keeps the original page, so
 * nothing that works can break. Reuses api, money, esc, iconSvg, heroPick,
 * openBooking, goHome, REF and the same API endpoints. */
(function () {
  'use strict';
  function _D(){ return window.RAGO_SDP || {}; }
  function _CSS(){ return _D().CSS || ''; }
  function _DESC(){ return _D().DESC || {}; }
  function _CONTENT(){ return _D().CONTENT || {}; }
  function _FACTS(){ return _D().FACTS || {}; }

  // Renderer registry — specialized per-category renderers register here.
  // Files like service-detail-transport.js call:
  //   window.RAGO_RENDERERS['airport'] = renderFn;
  window.RAGO_RENDERERS = window.RAGO_RENDERERS || {};

  // Map of category key -> renderer filename (lazy-loaded on first click)
  var _RENDERER_MAP = {
    'airport':'service-detail-transport.js','transfers':'service-detail-transport.js',
    'carrental':'service-detail-transport.js','departure':'service-detail-transport.js',
    'hotels':'service-detail-stay.js','nile-cruise':'service-detail-stay.js',
    'internal-trips':'service-detail-activity.js','tours':'service-detail-activity.js',
    'diving':'service-detail-activity.js','safari':'service-detail-activity.js','events':'service-detail-activity.js',
    'visa':'service-detail-svc.js','guide':'service-detail-svc.js','sim':'service-detail-svc.js',
    'spa':'service-detail-svc.js','dining':'service-detail-svc.js','insurance':'service-detail-svc.js',
    'shopping':'service-detail-shop.js','pharmacy':'service-detail-shop.js'
  };

  function injectStyles(){
    if (document.getElementById('sd-styles') || !_CSS()) return;
    var st = document.createElement('style');
    st.id = 'sd-styles';
    st.textContent = _CSS();
    (document.head || document.documentElement).appendChild(st);
  }
  function api2(p){ return window.api(p); }
  function money2(n){ return (typeof window.money === 'function') ? window.money(n) : ('$' + Number(n||0).toLocaleString()); }
  function esc2(s){ return (typeof window.esc === 'function') ? window.esc(s) : String(s==null?'':s); }
  function icon2(n){ return (typeof window.iconSvg === 'function') ? window.iconSvg(n) : ''; }
  function refCode(){ try { return (typeof REF !== 'undefined' && REF) ? REF : ''; } catch(e){ return ''; } }
  function stars(r){ r = Math.round(Number(r)||0); var s=''; for (var i=1;i<=5;i++) s += (i<=r ? '&#9733;' : '&#9734;'); return s; }
  function typeOf(k){
    if (['airport','transfers','carrental','departure'].indexOf(k) >= 0) return 'transport';
    if (['hotels'].indexOf(k) >= 0) return 'stay';
    if (['shopping','pharmacy','bazaar','bazaars'].indexOf(k) >= 0) return 'shop';
    if (['visa','sim','insurance','dining'].indexOf(k) >= 0) return 'service';
    return 'experience';
  }
  function liList(items, icon, cls){
    return '<ul class="sd-ul ' + (cls||'') + '">' + (items||[]).map(function(t){
      return '<li><span class="sd-ic">' + icon + '</span><span>' + esc2(t) + '</span></li>';
    }).join('') + '</ul>';
  }
  function section(title, body){ return '<div class="sd-sec"><h3 class="sd-h">' + title + '</h3>' + body + '</div>'; }
  function stepsHtml(steps){
    return '<div class="sd-steps">' + (steps||[]).map(function(s, i){
      var p = s.split('|'); var title = p[0]; var desc = p[1] || '';
      return '<div class="sd-step"><div class="sd-num">' + (i+1) + '</div><div><b>' + esc2(title) + '</b>' + (desc ? '<span>' + esc2(desc) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function faqHtml(faq){
    return (faq||[]).map(function(f){
      return '<details class="sd-faq"><summary>' + esc2(f.q) + '</summary><div>' + esc2(f.a) + '</div></details>';
    }).join('');
  }
  function ratingBars(reviews){
    var c = [0,0,0,0,0];
    reviews.forEach(function(r){ var k = Math.round(Number(r.rating)||0); if (k>=1 && k<=5) c[k-1]++; });
    var total = reviews.length || 1;
    var rows = '';
    for (var st=5; st>=1; st--){
      var pct = Math.round(c[st-1] / total * 100);
      rows += '<div class="sd-bar"><span>' + st + ' &#9733;</span><i><b style="width:' + pct + '%"></b></i><em>' + c[st-1] + '</em></div>';
    }
    return rows;
  }
  function overviewText(s, t, loc, key){
    var DESC = _DESC();
    var d = esc2((s.description || '').trim());
    if (d.length > 40) return d;
    return (d ? d + ' ' : '') + 'Discover ' + esc2(s.title) + (loc ? (' in ' + esc2(loc)) : '') + '. ' + (DESC[key] || DESC[t] || DESC.experience || '');
  }

  function showRendered(html){
    var host = document.getElementById('detail-body');
    if (host) host.innerHTML = html;
    try {
      var pv = document.getElementById('public-view'); if (pv) pv.classList.add('hidden');
      var dv = document.getElementById('detail-view'); if (dv) dv.classList.remove('hidden');
      window.scrollTo(0, 0);
      setTimeout(function(){ try { window.scrollTo(0, 0); } catch(e){} }, 30);
    } catch(e){}
  }

  async function enhance(id){
    var s = await api2('/api/services/' + id);
    if (!s || !s.id) return;
    var cats = (await api2('/api/categories').catch(function(){ return []; })) || [];
    var cat = cats.find(function(x){ return x.id === s.category_id; });
    var key = cat ? cat.key : '';
    var catLabel = cat ? ((cat.labels && cat.labels.en) || cat.key) : 'Experience';
    var t = typeOf(key);
    var CONTENT = _CONTENT();
    var c = CONTENT[key] || CONTENT[t] || CONTENT.experience;
    if (!c) return;
    var isShop = (t === 'shop');
    var imgs = (s.images && s.images.length) ? s.images : [s.cover].filter(Boolean);
    if (!imgs.length) imgs = [''];
    window.__imgs = imgs;
    var reviews = (await api2('/api/reviews?service_id=' + id).catch(function(){ return []; })) || [];
    var loc = s.location || '';
    var dur = s.duration || 'Flexible';
    var rating = (s.rating != null ? s.rating : 0);
    var rc = (s.reviews_count != null ? s.reviews_count : reviews.length);
    var vname = (s.vendor && s.vendor.name) ? s.vendor.name : (catLabel + ' provider');
    var similar = [];
    try { similar = ((await api2('/api/services?cat=' + encodeURIComponent(key))) || []).filter(function(x){ return x.id !== s.id; }).slice(0, 3); } catch(e){}

    // --- Specialized renderer check ---
    // If a professional renderer is already registered for this category, use it.
    if (typeof window.RAGO_RENDERERS[key] === 'function') {
      showRendered(window.RAGO_RENDERERS[key](s, cat, reviews, similar, c, key));
      return;
    }
    // Lazy-load the renderer file for this category on first click.
    var _rf = _RENDERER_MAP[key];
    if (_rf && !document.getElementById('rago-r-' + key)) {
      var _lhost = document.getElementById('detail-body');
      var _emoji = {transport:'✈',stay:'🏨',experience:'🧭',service:'📋',shop:'🛍'}[t] || '⏳';
      if (_lhost) _lhost.innerHTML = '<div style="padding:60px 20px;text-align:center">' +
        '<div style="font-size:40px;margin-bottom:14px">' + _emoji + '</div>' +
        '<div style="font-size:17px;font-weight:800;color:var(--blue)">Loading professional view...</div>' +
        '<div style="font-size:13px;color:var(--text2);margin-top:6px">One moment</div></div>';
      try {
        var pv0=document.getElementById('public-view'); if(pv0) pv0.classList.add('hidden');
        var dv0=document.getElementById('detail-view'); if(dv0) dv0.classList.remove('hidden');
        window.scrollTo(0,0);
      } catch(e){}
      var _sc = document.createElement('script');
      _sc.id = 'rago-r-' + key;
      _sc.src = '/' + _rf + '?' + Date.now();
      var _cid = id;
      _sc.onload = function(){
        try { window.openDetail(_cid); } catch(e){}
      };
      _sc.onerror = function(){
        // Renderer failed to load — fall through to generic render on next click
        var el=document.getElementById('rago-r-'+key); if(el) el.remove();
      };
      document.head.appendChild(_sc);
      return;
    }
    // --- End specialized renderer check ---

    var facts = (_FACTS()[key] || _FACTS()[t] || _FACTS().experience || []).map(function(f){
      var title = f.t; var desc = f.d;
      if (f.d === 'Duration') title = dur;
      if (f.d === 'Location') title = (loc || 'Prime area');
      return '<div class="sd-fact">' + icon2(f.ic) + '<div><b>' + esc2(title) + '</b><em>' + esc2(desc) + '</em></div></div>';
    }).join('');

    var gallery = '<div class="hero" id="d-hero" style="background-image:url(' + (imgs[0]||'') + ')"></div>'
      + '<div class="gallery">' + imgs.map(function(u, i){
          return '<div class="gth ' + (i===0?'on':'') + '" style="background-image:url(' + u + ')" onclick="heroPick(' + i + ')"></div>';
        }).join('') + '</div>';

    var availBlock = '';
    if (!isShop) {
      var av = (s.availability || []).slice(0, 12).map(function(a){ return a.date; }).filter(Boolean);
      var availHtml = av.length
        ? '<div class="sd-avail">' + av.map(function(d){ return '<span class="chip">' + esc2(d) + '</span>'; }).join('') + '</div>'
        : "<p class='sd-lead'>Flexible dates - simply choose your preferred date at checkout and we will confirm availability.</p>";
      availBlock = section('Availability', availHtml);
    }

    var cancelText = (s.cancel_policy && String(s.cancel_policy).trim())
      ? esc2(s.cancel_policy)
      : "Free cancellation up to 24 hours before the start time, where applicable. Plans changed? Contact our team and we will do our very best to help.";

    var initials = esc2((vname || 'R').trim().charAt(0).toUpperCase());
    var provider = '<div class="sd-prov"><div class="sd-av">' + initials + '</div>'
      + '<div style="flex:1"><div style="font-weight:800;color:var(--text)">' + esc2(vname) + '</div>'
      + '<div class="muted" style="font-size:13px">' + esc2(loc || 'Egypt') + ' &#183; <span class="star">&#9733; ' + rating + '</span></div></div>'
      + '<span class="sd-badge">&#10003; Verified</span></div>';

    var revSummary = '<div class="sd-revsum"><div class="sd-revbig"><div class="n">' + (rating || '&mdash;') + '</div>'
      + '<div class="s">' + stars(rating) + '</div>'
      + '<div class="muted" style="font-size:12px;margin-top:4px">' + rc + ' reviews</div></div>'
      + '<div class="sd-bars">' + ratingBars(reviews) + '</div></div>';
    var revList = reviews.length
      ? reviews.map(function(r){
          return '<div class="sd-rev"><div class="top"><span class="who">' + esc2(r.name || 'Guest') + '</span>'
            + '<span class="star">&#9733; ' + (r.rating != null ? r.rating : '') + '</span></div>'
            + '<div class="muted" style="font-size:14px;line-height:1.6">' + esc2(r.comment || '') + '</div></div>';
        }).join('')
      : "<p class='sd-lead'>No reviews yet - be the first to share your experience.</p>";

    var simBlock = '';
    if (similar.length) {
      simBlock = section('You might also like', '<div class="sd-sim">' + similar.map(function(x){
        var im = x.cover || (x.images && x.images[0]) || '';
        return '<div class="sd-simc" onclick="openDetail(' + x.id + ')"><div class="im" style="background-image:url(' + im + ')"></div>'
          + '<div class="bd"><div class="t">' + esc2(x.title) + '</div>'
          + '<div class="muted" style="font-size:12.5px">' + esc2(x.location || '') + '</div>'
          + '<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">'
          + '<span class="star" style="font-size:12.5px">&#9733; ' + (x.rating != null ? x.rating : 0) + '</span>'
          + '<span class="price" style="font-weight:800;color:var(--blue)">' + money2(x.price) + '</span></div></div></div>';
      }).join('') + '</div>');
    }

    var logi = '<ul class="sd-ul sd-note">'
      + '<li><span class="sd-ic">&#8226;</span><span><b style="font-weight:700;color:var(--text)">Location:</b> ' + esc2(loc || 'Egypt') + '</span></li>'
      + '<li><span class="sd-ic">&#8226;</span><span><b style="font-weight:700;color:var(--text)">Duration:</b> ' + esc2(dur) + '</span></li>'
      + '<li><span class="sd-ic">&#8226;</span><span>' + esc2(c.logi) + '</span></li>'
      + '</ul>';

    var incBlock = '<div class="sd-cols"><div><h4>Included</h4>' + liList(c.included, '&#10003;', 'sd-yes') + '</div>'
      + '<div><h4>Not included</h4>' + liList(c.notIncluded, '&#10007;', 'sd-no') + '</div></div>';

    var L = '';
    L += '<div class="sd-crumb"><a href="#" onclick="goHome();return false">Home</a> &rsaquo; ' + esc2(catLabel) + ' &rsaquo; ' + esc2(s.title) + '</div>';
    L += '<div class="eyebrow">' + esc2(s.vendor ? s.vendor.name : catLabel) + '</div>';
    L += '<h2 style="margin:2px 0 6px">' + esc2(s.title) + '</h2>';
    L += '<p class="muted" style="margin:0"><span class="star">' + stars(rating) + '</span> <b style="color:var(--text)">' + rating + '</b> (' + rc + ' reviews) &nbsp;&middot;&nbsp; ' + esc2(loc) + ' &nbsp;&middot;&nbsp; ' + esc2(dur) + '</p>';
    L += '<div class="sd-facts">' + facts + '</div>';
    L += gallery;
    L += section('Overview', '<p class="sd-lead">' + overviewText(s, t, loc, key) + '</p>');
    L += section('Highlights', liList(c.highlights, '&#10022;', 'sd-hl'));
    L += section("What's included", incBlock);
    L += section(isShop ? 'How it works' : 'What to expect', stepsHtml(c.steps));
    L += section('Where & how', logi);
    L += availBlock;
    L += section('Good to know', liList(c.goodToKnow, '&#8226;', 'sd-note'));
    L += section('Cancellation policy', '<p class="sd-lead">' + cancelText + '</p>');
    L += section('Your provider', provider);
    L += section('Frequently asked questions', faqHtml(c.faq));
    L += '<div class="sd-sec"><h3 class="sd-h">Reviews (' + rc + ')</h3>' + revSummary + revList + '</div>';
    L += simBlock;

    var R = '<div class="box sd-book">'
      + (s.featured ? '<div class="sd-badge" style="margin-bottom:10px">&#9733; Featured</div>' : '')
      + '<div class="price" style="font-size:30px;font-weight:900;color:var(--blue)">' + money2(s.price) + '</div>'
      + '<div class="muted">' + (isShop ? 'Retail price' : 'per person') + '</div>'
      + '<button class="btn" style="width:100%;margin-top:14px;padding:12px 16px" onclick="openBooking()">' + (c.cta || 'Book now') + '</button>'
      + '<ul class="sd-trust">'
      + '<li><span class="sd-ic">&#10003;</span> Instant confirmation</li>'
      + '<li><span class="sd-ic">&#10003;</span> ' + (isShop ? 'Secure ordering' : 'Free / flexible cancellation') + '</li>'
      + '<li><span class="sd-ic">&#10003;</span> Secure booking &amp; payment</li>'
      + '<li><span class="sd-ic">&#10003;</span> 24/7 customer support</li>'
      + '</ul>'
      + (refCode() ? '<div class="sd-save">Referral applied: ' + esc2(refCode()) + '</div>' : '')
      + '</div>';

    showRendered('<div class="two"><div>' + L + '</div><div>' + R + '</div></div>');
  }

  function install(){
    if (window.__ragoSdInstalled) return true;
    if (typeof window.openDetail !== 'function') return false;
    injectStyles();
    var _open = window.openDetail;
    window.openDetail = async function(id){
      await _open.apply(this, arguments);
      try { await enhance(id); } catch (e) { /* keep original page on any error */ }
    };
    window.__ragoSdInstalled = true;
    return true;
  }
  if (!install()) {
    var tries = 0;
    var iv = setInterval(function(){ if (install() || ++tries > 80) clearInterval(iv); }, 120);
  }
})();
