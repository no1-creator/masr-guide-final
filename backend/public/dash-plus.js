/* =====================================================================
 * RaGo — Dashboard Plus: Provider & Marketer controls (additive & safe)
 * Enhances the Provider (vendor) and Marketer (affiliate) dashboards:
 *   • Provider → Services : KPIs + feature toggle + quick price + edit/delete
 *   • Provider → Bookings : KPIs + status filters + confirm/complete/cancel
 *   • Marketer → Bookings : KPIs + status filters (read-only referred bookings)
 *
 * SAFE & ADDITIVE: chains AFTER the global loadSec() (after dashboard-pro.js
 * and admin-pro.js). Only the listed role+section combos are enhanced; every
 * other case falls through to the previous renderer untouched. On any error it
 * silently falls back, so nothing that works can break. All actions use the
 * SAME existing API endpoints and global helpers already used by the app.
 * ===================================================================== */
(function () {
  'use strict';

  var CSS = [
    '.ap-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}',
    '.ap-mc{background:#fff;border:1px solid var(--border);border-radius:14px;padding:13px 15px;transition:box-shadow .15s ease}',
    '.ap-mc:hover{box-shadow:0 8px 20px rgba(18,59,76,.07)}',
    '.ap-mc .n{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-.4px;line-height:1.1}',
    '.ap-mc .l{color:var(--text2);font-size:12.5px;font-weight:600;margin-top:3px}',
    '.ap-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 15px}',
    '.ap-bar h3{margin:0;flex:1;font-size:18px;font-weight:800;color:var(--text)}',
    '.ap-chips{display:flex;gap:7px;flex-wrap:wrap}',
    '.ap-chip{border:1px solid var(--border);background:#fff;color:var(--text2);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:6px}',
    '.ap-chip:hover{border-color:var(--blue);color:var(--blue)}',
    '.ap-chip.on{background:var(--blue);border-color:var(--blue);color:#fff}',
    '.ap-chip .c{background:rgba(0,0,0,.08);border-radius:999px;padding:0 7px;font-size:11px;font-weight:800}',
    '.ap-chip.on .c{background:rgba(255,255,255,.25)}',
    '.ap-acts{display:flex;gap:6px;flex-wrap:wrap}',
    '.ap-b{border:1px solid var(--border);background:#fff;color:var(--text);border-radius:8px;padding:6px 11px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.15s;white-space:nowrap}',
    '.ap-b:hover{box-shadow:0 3px 9px rgba(18,59,76,.14);transform:translateY(-1px)}',
    '.ap-green{background:var(--green);border-color:var(--green);color:#fff}',
    '.ap-red{background:var(--red);border-color:var(--red);color:#fff}',
    '.ap-gold{background:var(--orange);border-color:var(--orange);color:#fff}',
    '.ap-blue{background:var(--blue);border-color:var(--blue);color:#fff}',
    '.ap-ghost{background:var(--soft2);border-color:transparent;color:var(--text)}',
    '.ap-feat{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;color:var(--orange)}'
  ].join('\n');
  function injectStyles(){
    if (document.getElementById('ap-styles') || document.getElementById('dpx-styles')) return;
    var st = document.createElement('style');
    st.id = 'dpx-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function api2(p, o){ return window.api(p, o); }
  function money2(n){ return (typeof window.money === 'function') ? window.money(n) : ('$' + Number(n||0).toLocaleString()); }
  function esc2(s){ return (typeof window.esc === 'function') ? window.esc(s) : String(s==null?'':s); }
  function tbl2(h,r){ return (typeof window.tbl === 'function') ? window.tbl(h,r) : ''; }
  function tag2(s){ return (typeof window.statusTag === 'function') ? window.statusTag(s) : String(s==null?'':s); }
  function catName2(id){ return (typeof window.catName === 'function') ? window.catName(id) : '—'; }
  function toast2(m){ if (typeof window.toast === 'function') window.toast(m); }
  function safeArr(p){ return window.api(p).then(function(x){ return x || []; }).catch(function(){ return []; }); }
  function reload(){ if (typeof window.loadSec === 'function') window.loadSec(); }

  function miniKpis(items){
    return '<div class="ap-mini">' + items.map(function(it){
      return '<div class="ap-mc"><div class="n">' + it.n + '</div><div class="l">' + it.l + '</div></div>';
    }).join('') + '</div>';
  }
  function chips(list, active, fn){
    return '<div class="ap-chips">' + list.map(function(o){
      return '<button class="ap-chip' + (o.key===active?' on':'') + '" onclick="' + fn + '(\'' + o.key + '\')">' + o.label + ' <span class="c">' + o.count + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------- Provider → Services ---------- */
  window.dpxFeature = async function(id, val){
    try { await api2('/api/services/' + id, {method:'PUT', body:{featured: !!val}}); toast2(val ? 'Featured' : 'Unfeatured'); reload(); }
    catch(e){ toast2(e.message); }
  };
  window.dpxPrice = async function(id, cur){
    var p = prompt('New price (USD):', cur);
    if (p === null) return;
    var n = Number(p);
    if (isNaN(n) || n < 0) { toast2('Invalid price'); return; }
    try { await api2('/api/services/' + id, {method:'PUT', body:{price: n}}); toast2('Price updated'); reload(); }
    catch(e){ toast2(e.message); }
  };
  async function renderVendorServices(m){
    if (typeof window.ensureCats === 'function') { try { await window.ensureCats(); } catch(e){} }
    var all = await safeArr('/api/services');
    var me = await window.api('/api/vendors/me').catch(function(){ return null; });
    var mine = me ? all.filter(function(s){ return s.vendor_id === me.id; }) : all;
    var feat = mine.filter(function(x){ return x.featured; }).length;
    var avg = mine.length ? (mine.reduce(function(a,x){ return a + Number(x.price||0); }, 0) / mine.length) : 0;
    m.innerHTML =
      miniKpis([
        {n:mine.length, l:'My services'},
        {n:feat, l:'Featured'},
        {n:money2(Math.round(avg)), l:'Avg price'}
      ])
      + '<div class="ap-bar"><h3>My services</h3><button class="ap-b ap-blue" onclick="openService()">+ New service</button></div>'
      + tbl2(['Title','Category','Location','Price','Featured','Actions'], mine.map(function(x){
          return [
            esc2(x.title),
            catName2(x.category_id),
            esc2(x.location||'—'),
            money2(x.price),
            x.featured ? '<span class="ap-feat">\u2605 Featured</span>' : '<span class="muted">—</span>',
            vsActs(x)
          ];
        }));
  }
  function vsActs(x){
    var b = [];
    b.push('<button class="ap-b ' + (x.featured?'ap-ghost':'ap-gold') + '" onclick="dpxFeature(' + x.id + ',' + (x.featured?0:1) + ')">' + (x.featured?'Unfeature':'Feature') + '</button>');
    b.push('<button class="ap-b ap-ghost" onclick="dpxPrice(' + x.id + ',' + Number(x.price||0) + ')">Price</button>');
    b.push('<button class="ap-b ap-blue" onclick="openService(' + x.id + ')">Edit</button>');
    b.push('<button class="ap-b ap-red" onclick="delService(' + x.id + ')">Delete</button>');
    return '<div class="ap-acts">' + b.join('') + '</div>';
  }

  /* ---------- Provider → Bookings ---------- */
  var vbF = 'all';
  window.dpxVbFilter = function(k){ vbF = k; reload(); };
  async function renderVendorBookings(m){
    var bk = await safeArr('/api/bookings');
    var by = function(s){ return bk.filter(function(x){ return x.status===s; }).length; };
    var revenue = bk.filter(function(x){ return x.status==='confirmed' || x.status==='completed'; }).reduce(function(a,x){ return a + Number(x.amount||0); }, 0);
    var cl = [
      {key:'all', label:'All', count:bk.length},
      {key:'pending', label:'Pending', count:by('pending')},
      {key:'confirmed', label:'Confirmed', count:by('confirmed')},
      {key:'completed', label:'Completed', count:by('completed')},
      {key:'cancelled', label:'Cancelled', count:by('cancelled')}
    ];
    var rows = (vbF==='all') ? bk : bk.filter(function(x){ return x.status===vbF; });
    m.innerHTML =
      miniKpis([
        {n:bk.length, l:'Total bookings'},
        {n:by('pending'), l:'Needs action'},
        {n:by('completed'), l:'Completed'},
        {n:money2(revenue), l:'Confirmed revenue'}
      ])
      + '<div class="ap-bar"><h3>Bookings</h3>' + chips(cl, vbF, 'dpxVbFilter') + '</div>'
      + tbl2(['Ref','Trip','Date','Pax','Amount','Status','Actions'], rows.map(function(x){
          return [
            '<code>' + esc2(x.ref) + '</code>',
            esc2(x.service_title||'—'),
            x.date||'—',
            x.pax,
            money2(x.amount),
            tag2(x.status),
            vbActs(x)
          ];
        }));
  }
  function vbActs(x){
    var b = [];
    if (x.status !== 'confirmed' && x.status !== 'completed' && x.status !== 'cancelled') b.push('<button class="ap-b ap-blue" onclick="setBooking(' + x.id + ',\'confirmed\')">Confirm</button>');
    if (x.status !== 'completed' && x.status !== 'cancelled') b.push('<button class="ap-b ap-green" onclick="setBooking(' + x.id + ',\'completed\')">Complete</button>');
    if (x.status !== 'cancelled') b.push('<button class="ap-b ap-red" onclick="setBooking(' + x.id + ',\'cancelled\')">Cancel</button>');
    return '<div class="ap-acts">' + b.join('') + '</div>';
  }

  /* ---------- Marketer → Bookings (read-only) ---------- */
  var abF = 'all';
  window.dpxAbFilter = function(k){ abF = k; reload(); };
  async function renderAffiliateBookings(m){
    var bk = await safeArr('/api/bookings');
    var by = function(s){ return bk.filter(function(x){ return x.status===s; }).length; };
    var value = bk.filter(function(x){ return x.status==='confirmed' || x.status==='completed'; }).reduce(function(a,x){ return a + Number(x.amount||0); }, 0);
    var cl = [
      {key:'all', label:'All', count:bk.length},
      {key:'pending', label:'Pending', count:by('pending')},
      {key:'confirmed', label:'Confirmed', count:by('confirmed')},
      {key:'completed', label:'Completed', count:by('completed')},
      {key:'cancelled', label:'Cancelled', count:by('cancelled')}
    ];
    var rows = (abF==='all') ? bk : bk.filter(function(x){ return x.status===abF; });
    m.innerHTML =
      miniKpis([
        {n:bk.length, l:'Referred bookings'},
        {n:by('confirmed'), l:'Confirmed'},
        {n:by('completed'), l:'Completed'},
        {n:money2(value), l:'Booking value'}
      ])
      + '<div class="ap-bar"><h3>Referred bookings</h3>' + chips(cl, abF, 'dpxAbFilter') + '</div>'
      + tbl2(['Ref','Trip','Date','Pax','Amount','Status'], rows.map(function(x){
          return [
            '<code>' + esc2(x.ref) + '</code>',
            esc2(x.service_title||'—'),
            x.date||'—',
            x.pax,
            money2(x.amount),
            tag2(x.status)
          ];
        }));
  }

  /* ---------- Context ---------- */
  function role(){
    var t = (document.getElementById('dash-title') || {}).textContent || '';
    if (/Admin/i.test(t)) return 'admin';
    if (/Provider/i.test(t)) return 'vendor';
    if (/Marketer/i.test(t)) return 'affiliate';
    return '';
  }
  function section(){
    var b = document.querySelector('#dnav button.on');
    if (!b) return '';
    var s = b.querySelector('span');
    return (s ? s.textContent : (b.textContent || '')).trim().toLowerCase();
  }

  /* ---------- Chain after loadSec ---------- */
  function install(){
    if (window.__ragoDpxInstalled) return true;
    if (typeof window.loadSec !== 'function') return false;
    injectStyles();
    var _prev = window.loadSec;
    window.loadSec = async function(){
      var r = role(), sec = section(), m = document.getElementById('dmain');
      if (m) {
        try {
          if (r === 'vendor' && sec === 'services') { m.innerHTML = '<p class="muted">Loading...</p>'; await renderVendorServices(m); return; }
          if (r === 'vendor' && sec === 'bookings') { m.innerHTML = '<p class="muted">Loading...</p>'; await renderVendorBookings(m); return; }
          if (r === 'affiliate' && sec === 'bookings') { m.innerHTML = '<p class="muted">Loading...</p>'; await renderAffiliateBookings(m); return; }
        } catch (e) { /* fall back to previous renderer */ }
      }
      return _prev.apply(this, arguments);
    };
    window.__ragoDpxInstalled = true;
    return true;
  }
  if (!install()) {
    var tries = 0;
    var iv = setInterval(function(){ if (install() || ++tries > 80) clearInterval(iv); }, 120);
  }
})();
