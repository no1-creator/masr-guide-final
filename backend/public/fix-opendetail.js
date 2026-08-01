/* fix-opendetail.js — direct replacement for openDetail.
 * Does NOT wrap: fully replaces with a robust version that always shows something.
 * Runs after all other scripts. */
(function () {
  'use strict';

  function _show(id) {
    ['public-view', 'detail-view', 'dash-view'].forEach(function (x) {
      var el = document.getElementById(x);
      if (el) el.classList.toggle('hidden', x !== id);
    });
    window.scrollTo(0, 0);
  }

  function _setBody(html) {
    var el = document.getElementById('detail-body');
    if (el) el.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function _money(n) {
    return typeof window.money === 'function' ? window.money(n) : ('$' + Number(n || 0).toLocaleString());
  }

  function _esc(s) {
    return typeof window.esc === 'function' ? window.esc(s) : String(s == null ? '' : s);
  }

  function _basicRender(s, reviews) {
    var imgs = (s.images && s.images.length) ? s.images : [s.cover].filter(Boolean);
    if (!imgs.length) imgs = [''];
    var ref = '';
    try { if (typeof REF !== 'undefined' && REF) ref = '<p class="muted" style="font-size:13px;margin-top:8px">Referral: ' + _esc(REF) + '</p>'; } catch (e) {}
    window.__imgs = imgs;
    return '<div class="two"><div>'
      + '<div class="hero" id="d-hero" style="background-image:url(\'' + (imgs[0] || '') + '\')" ></div>'
      + '<div class="gallery">' + imgs.map(function (u, i) { return '<div class="gth ' + (i === 0 ? 'on' : '') + '" style="background-image:url(' + u + ')" onclick="heroPick(' + i + ')"></div>'; }).join('') + '</div>'
      + '<div class="eyebrow">' + _esc(s.vendor ? s.vendor.name : '') + '</div>'
      + '<h2>' + _esc(s.title) + '</h2>'
      + '<p class="muted">&#128205; ' + _esc(s.location) + ' &middot; &#9201; ' + _esc(s.duration || '') + ' &middot; <span class="star">&#9733; ' + s.rating + '</span> (' + s.reviews_count + ')</p>'
      + '<p>' + _esc(s.description) + '</p>'
      + '<h3>Reviews (' + reviews.length + ')</h3>'
      + (reviews.length ? reviews.map(function (r) { return '<div class="box" style="margin-bottom:8px"><span class="star">&#9733; ' + r.rating + '</span> ' + _esc(r.comment || '') + '<div class="muted" style="font-size:13px">&mdash; ' + _esc(r.name || 'Guest') + '</div></div>'; }).join('') : '<p class="muted">No reviews yet.</p>')
      + '</div><div><div class="box">'
      + '<div class="price" style="font-size:26px;font-weight:800;color:var(--blue)">' + _money(s.price) + '</div>'
      + '<div class="muted">per person</div>'
      + '<button class="btn" style="width:100%;margin-top:12px" onclick="openBooking()">Book now</button>'
      + ref
      + '</div></div></div>';
  }

  window.openDetail = async function (id) {
    if (!id) return;
    // Show detail-view immediately with a loading spinner so user sees feedback
    _setBody('<div style="padding:80px 20px;text-align:center"><div style="font-size:38px;margin-bottom:14px">&#9992;</div><div style="font-size:16px;font-weight:700;color:var(--blue)">Loading...</div></div>');
    _show('detail-view');

    try {
      var apiFn = window.api;
      if (typeof apiFn !== 'function') { _setBody('<p class="muted">API not ready. Please refresh.</p>'); return; }

      // Fetch service + reviews in parallel
      var s, reviews;
      try {
        s = await apiFn('/api/services/' + id);
      } catch (e) {
        _setBody('<p class="muted">Could not load service. Please try again.</p>');
        return;
      }
      if (!s || !s.id) { _setBody('<p class="muted">Service not found.</p>'); return; }
      window.CUR_SVC = s;

      try { reviews = await apiFn('/api/reviews?service_id=' + id); } catch (e) { reviews = []; }

      // Make sure ensureCats has run
      try { if (typeof window.ensureCats === 'function') await window.ensureCats(); } catch (e) {}

      // Try pro enhancement (sets detail-body internally)
      var enhanced = false;
      if (typeof window.__ragoEnhance === 'function') {
        try {
          await window.__ragoEnhance(id);
          enhanced = true;
        } catch (e) { enhanced = false; }
      }

      // If pro enhancement didn't render anything useful, fallback to basic
      if (!enhanced) {
        _setBody(_basicRender(s, reviews));
      }
    } catch (e) {
      _setBody('<p class="muted">An error occurred. Please refresh and try again.</p>');
    }
  };

})();
