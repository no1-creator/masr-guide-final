/* RaGo - Home Pro (additive & safe). Upgrades the PUBLIC homepage without
 * touching any source file: richer service cards, a trust/benefits strip, a
 * professional footer, and a back-to-top button. It wraps loadServices() so
 * the original runs first; any error keeps the original grid. Reuses api,
 * money, esc, iconSvg, ensureCats, openDetail, pickCat, openLogin. */
(function () {
  'use strict';
  if (window.__ragoHomeInstalled) return;

  var CSS = [
    '.hp-card .img{height:182px}',
    '.hp-cat{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.93);color:var(--blue-h);font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px}',
    '.hp-view{position:absolute;left:0;right:0;bottom:0;padding:26px 12px 10px;background:linear-gradient(transparent,rgba(8,26,33,.82));color:#fff;font-weight:700;font-size:13px;opacity:0;transform:translateY(6px);transition:.18s}',
    '.hp-card:hover .hp-view{opacity:1;transform:none}',
    '.hp-card .t{font-size:15.5px;line-height:1.3}',
    '.hp-card .loc{font-size:12.5px}',
    '.hp-card .price small{font-weight:600;color:var(--text2);font-size:11px;text-transform:uppercase;letter-spacing:.03em}',
    '.hp-trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:20px 0}',
    '.hp-item{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 15px}',
    '.hp-item svg{width:24px;height:24px;color:var(--blue);flex:0 0 auto}',
    '.hp-item b{display:block;font-size:14px;font-weight:800;color:var(--text)}',
    '.hp-item em{font-style:normal;font-size:12px;color:var(--text2)}',
    '.hp-foot{margin:30px 0 0;padding:34px 0 0;border-top:1px solid var(--border)}',
    '.hp-fin{display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:26px}',
    '@media(max-width:760px){.hp-fin{grid-template-columns:1fr 1fr}}',
    '.hp-fcol h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin:0 0 12px}',
    '.hp-fcol a{display:block;color:var(--text);font-size:14px;padding:5px 0;cursor:pointer}',
    '.hp-fcol a:hover{color:var(--blue)}',
    '.hp-fbrand p{color:var(--text2);font-size:13.5px;line-height:1.7;margin:10px 0 12px;max-width:330px}',
    '.hp-flogo{font-size:24px;font-weight:900;letter-spacing:-.5px}',
    '.hp-social svg{width:20px;height:20px;color:var(--blue);margin-right:12px}',
    '.hp-fmut{display:block;color:var(--text2);font-size:13px;padding:5px 0}',
    '.hp-fbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:26px;padding:16px 0;border-top:1px solid var(--border);color:var(--text2);font-size:13px}',
    '.hp-pay{display:inline-flex;align-items:center;gap:6px}',
    '.hp-pay svg{width:18px;height:18px;color:var(--green)}',
    '.hp-top{position:fixed;right:20px;bottom:22px;width:46px;height:46px;border-radius:50%;border:none;background:var(--blue);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 8px 22px rgba(18,59,76,.28);opacity:0;pointer-events:none;transform:translateY(10px);transition:.2s;z-index:80}',
    '.hp-top.on{opacity:1;pointer-events:auto;transform:none}',
    '.hp-top:hover{background:var(--blue-h)}'
  ].join('');

  function inject(){
    if (document.getElementById('hp-styles')) return;
    var st = document.createElement('style');
    st.id = 'hp-styles'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function esc2(s){ return (typeof window.esc === 'function') ? window.esc(s) : String(s==null?'':s); }
  function money2(n){ return (typeof window.money === 'function') ? window.money(n) : ('$' + Number(n||0).toLocaleString()); }
  function icon2(n){ return (typeof window.iconSvg === 'function') ? window.iconSvg(n) : ''; }
  async function cats(){ try { if (typeof window.ensureCats === 'function') return (await window.ensureCats()) || []; } catch(e){} return []; }

  async function renderGrid(){
    var grid = document.getElementById('grid');
    if (!grid) return;
    var q = (document.getElementById('q') || {}).value || '';
    var sort = (document.getElementById('sort') || {}).value || '';
    var params = new URLSearchParams();
    var cc = ''; try { if (typeof CUR_CAT !== 'undefined' && CUR_CAT) cc = CUR_CAT; } catch(e){}
    if (cc) params.set('cat', cc);
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    var list = [];
    try { list = await window.api('/api/services?' + params.toString()); } catch(e){ return; }
    if (!Array.isArray(list) || !list.length) return;
    var cs = await cats(); var byId = {};
    cs.forEach(function(c){ byId[c.id] = (c.labels && c.labels.en) || c.key; });
    grid.innerHTML = list.map(function(s){
      var cover = s.cover || (s.images && s.images[0]) || '';
      var cat = byId[s.category_id] || '';
      return '<div class="card hp-card" onclick="openDetail(' + s.id + ')">'
        + '<div class="img" style="background-image:url(' + cover + ')">'
        + (s.featured ? '<span class="feat">&#9733; Featured</span>' : '')
        + (cat ? '<span class="hp-cat">' + esc2(cat) + '</span>' : '')
        + '<span class="hp-view">View details &rarr;</span>'
        + '</div>'
        + '<div class="body">'
        + '<div class="t">' + esc2(s.title) + '</div>'
        + '<div class="loc">&#128205; ' + esc2(s.location || '') + (s.duration ? (' &middot; &#9201; ' + esc2(s.duration)) : '') + '</div>'
        + '<div class="meta"><span class="star">&#9733; ' + (s.rating != null ? s.rating : 0) + ' <span class="muted">(' + (s.reviews_count || 0) + ')</span></span>'
        + '<span class="price"><small>from</small> ' + money2(s.price) + '</span></div>'
        + '</div></div>';
    }).join('');
  }

  function injectTrust(pv){
    if (document.getElementById('hp-trust')) return;
    var items = [
      ['shield','Verified providers','Every partner is vetted'],
      ['ticket','Instant confirmation','Book in seconds'],
      ['wallet','Best price','Fair, transparent pricing'],
      ['sparkles','Handpicked','Curated experiences'],
      ['phone','24/7 support','We are always here']
    ];
    var t = document.createElement('section');
    t.id = 'hp-trust'; t.className = 'hp-trust';
    t.innerHTML = items.map(function(x){
      return '<div class="hp-item">' + icon2(x[0]) + '<div><b>' + x[1] + '</b><em>' + x[2] + '</em></div></div>';
    }).join('');
    if (pv.children.length > 1) pv.insertBefore(t, pv.children[1]); else pv.appendChild(t);
  }

  async function injectFooter(pv){
    if (document.getElementById('hp-foot')) return;
    var cs = await cats();
    var links = cs.slice(0, 8).map(function(c){
      var lb = (c.labels && c.labels.en) || c.key;
      return '<a onclick="try{pickCat(\'' + c.key + '\')}catch(e){};var g=document.getElementById(\'grid\');if(g)g.scrollIntoView({behavior:\'smooth\'})">' + esc2(lb) + '</a>';
    }).join('');
    var f = document.createElement('footer');
    f.id = 'hp-foot'; f.className = 'hp-foot';
    var yr = new Date().getFullYear();
    f.innerHTML =
      '<div class="hp-fin">'
      + '<div class="hp-fcol hp-fbrand"><div class="hp-flogo"><span style="color:var(--blue)">Ra</span><span style="color:var(--orange)">Go</span></div>'
      + '<p>Egypt\'s all-in-one travel marketplace — trips, tours, transfers, stays, deals and services from trusted local providers.</p>'
      + '<div class="hp-social">' + icon2('compass') + icon2('users') + icon2('sparkles') + '</div></div>'
      + '<div class="hp-fcol"><h4>Explore</h4>' + links + '</div>'
      + '<div class="hp-fcol"><h4>Company</h4>'
      + '<a onclick="window.scrollTo({top:0,behavior:\'smooth\'})">Home</a>'
      + '<a onclick="var e=document.getElementById(\'hp-trust\');if(e)e.scrollIntoView({behavior:\'smooth\'})">Why RaGo</a>'
      + '<a onclick="try{openLogin()}catch(e){}">Become a provider</a></div>'
      + '<div class="hp-fcol"><h4>Support</h4>'
      + '<a onclick="var g=document.getElementById(\'grid\');if(g)g.scrollIntoView({behavior:\'smooth\'})">Browse services</a>'
      + '<span class="hp-fmut">Prices shown in USD ($)</span>'
      + '<span class="hp-fmut">Secure booking and payment</span></div>'
      + '</div>'
      + '<div class="hp-fbar"><span>&copy; ' + yr + ' RaGo. All rights reserved.</span>'
      + '<span class="hp-pay">' + icon2('shield') + icon2('wallet') + icon2('ticket') + ' Secure payments</span></div>';
    pv.appendChild(f);
  }

  function addTop(){
    if (document.getElementById('hp-top')) return;
    var b = document.createElement('button');
    b.id = 'hp-top'; b.className = 'hp-top';
    b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '&#8593;';
    b.onclick = function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.body.appendChild(b);
    window.addEventListener('scroll', function(){ b.classList.toggle('on', window.scrollY > 500); });
  }

  function wrapGrid(){
    if (typeof window.loadServices !== 'function') return false;
    var _ls = window.loadServices;
    window.loadServices = async function(){
      await _ls.apply(this, arguments);
      try { await renderGrid(); } catch(e){}
    };
    return true;
  }

  function install(){
    if (window.__ragoHomeInstalled) return true;
    inject();
    var pv = document.getElementById('public-view');
    if (pv) { injectTrust(pv); injectFooter(pv); }
    addTop();
    var ok = wrapGrid();
    try { renderGrid(); } catch(e){}
    if (ok && pv) { window.__ragoHomeInstalled = true; return true; }
    return false;
  }
  if (!install()) {
    var n = 0;
    var iv = setInterval(function(){ if (install() || ++n > 80) clearInterval(iv); }, 120);
  }
})();
