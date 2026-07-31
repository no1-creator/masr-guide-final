/* =====================================================================
 * RaGo — Admin control center (frontend-only, additive & safe)
 * Adds professional management controls to the Admin dashboard:
 *   • Providers  — approve / suspend / reject / reset + status filters + KPIs
 *   • Services   — feature toggle + quick price edit + edit/delete + KPIs
 *   • Bookings   — confirm / complete / cancel + status filters + KPIs
 *
 * SAFE & ADDITIVE: it CHAINS after the global loadSec() renderer. Only the
 * Admin "vendors" / "services" / "bookings" sections are enhanced; every other
 * role/section falls through to the previous renderer untouched. On any error
 * it silently falls back, so nothing that works can break. All actions use
 * existing, unchanged API endpoints and global helpers.
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
    if (document.getElementById('ap-styles')) return;
    var st = document.createElement('style');
    st.id = 'ap-styles';
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

  /* ---------- Providers ---------- */
  var vF = 'all';
  window.apVFilter = function(k){ vF = k; reload(); };
  async function renderVendors(m){
    var vs = await safeArr('/api/vendors');
    var by = function(s){ return vs.filter(function(x){ return x.status===s; }).length; };
    var cl = [
      {key:'all', label:'All', count:vs.length},
      {key:'pending', label:'Pending', count:by('pending')},
      {key:'approved', label:'Approved', count:by('approved')},
      {key:'suspended', label:'Suspended', count:by('suspended')},
      {key:'rejected', label:'Rejected', count:by('rejected')}
    ];
    var rows = (vF==='all') ? vs : vs.filter(function(x){ return x.status===vF; });
    m.innerHTML =
      miniKpis([
        {n:vs.length, l:'Total providers'},
        {n:by('pending'), l:'Awaiting review'},
        {n:by('approved'), l:'Active'},
        {n:by('suspended')+by('rejected'), l:'Blocked'}
      ])
      + '<div class="ap-bar"><h3>Service providers</h3>' + chips(cl, vF, 'apVFilter') + '</div>'
      + tbl2(['Name','City','Email','Status','Actions'], rows.map(function(x){
          return [esc2(x.name), esc2(x.city||'—'), esc2(x.email||'—'), tag2(x.status), vActs(x)];
        }));
  }
  function vActs(x){
    var b = [];
    if (x.status !== 'approved') b.push('<button class="ap-b ap-green" onclick="setVendor(' + x.id + ',\'approved\')">Approve</button>');
    if (x.status !== 'suspended') b.push('<button class="ap-b ap-ghost" onclick="setVendor(' + x.id + ',\'suspended\')">Suspend</button>');
    if (x.status !== 'rejected') b.push('<button class="ap-b ap-red" onclick="setVendor(' + x.id + ',\'rejected\')">Reject</button>');
    if (x.status !== 'pending') b.push('<button class="ap-b ap-ghost" onclick="setVendor(' + x.id + ',\'pending\')">Reset</button>');
    return '<div class="ap-acts">' + b.join('') + '</div>';
  }

  /* ---------- Services ---------- */
  window.apFeature = async function(id, val){
    try { await api2('/api/services/' + id, {method:'PUT', body:{featured: !!val}}); toast2(val ? 'Featured' : 'Unfeatured'); reload(); }
    catch(e){ toast2(e.message); }
  };
  window.apPrice = async function(id, cur){
    var p = prompt('New price (USD):', cur);
    if (p === null) return;
    var n = Number(p);
    if (isNaN(n) || n < 0) { toast2('Invalid price'); return; }
    try { await api2('/api/services/' + id, {method:'PUT', body:{price: n}}); toast2('Price updated'); reload(); }
    catch(e){ toast2(e.message); }
  };
  async function renderServices(m){
    if (typeof window.ensureCats === 'function') { try { await window.ensureCats(); } catch(e){} }
    var s = await safeArr('/api/services');
    var feat = s.filter(function(x){ return x.featured; }).length;
    var avg = s.length ? (s.reduce(function(a,x){ return a + Number(x.price||0); }, 0) / s.length) : 0;
    m.innerHTML =
      miniKpis([
        {n:s.length, l:'Live services'},
        {n:feat, l:'Featured'},
        {n:money2(Math.round(avg)), l:'Avg price'}
      ])
      + '<div class="ap-bar"><h3>All services (' + s.length + ')</h3><button class="ap-b ap-blue" onclick="openService()">+ New service</button></div>'
      + tbl2(['Title','Category','Location','Price','Rating','Featured','Actions'], s.map(function(x){
          return [
            esc2(x.title),
            catName2(x.category_id),
            esc2(x.location||'—'),
            money2(x.price),
            '\u2605 ' + (x.rating!=null?x.rating:0),
            x.featured ? '<span class="ap-feat">\u2605 Featured</span>' : '<span class="muted">—</span>',
            sActs(x)
          ];
        }));
  }
  function sActs(x){
    var b = [];
    b.push('<button class="ap-b ' + (x.featured?'ap-ghost':'ap-gold') + '" onclick="apFeature(' + x.id + ',' + (x.featured?0:1) + ')">' + (x.featured?'Unfeature':'Feature') + '</button>');
    b.push('<button class="ap-b ap-ghost" onclick="apPrice(' + x.id + ',' + Number(x.price||0) + ')">Price</button>');
    b.push('<button class="ap-b ap-blue" onclick="openService(' + x.id + ')">Edit</button>');
    b.push('<button class="ap-b ap-red" onclick="delService(' + x.id + ')">Delete</button>');
    return '<div class="ap-acts">' + b.join('') + '</div>';
  }

  /* ---------- Bookings ---------- */
  var bF = 'all';
  window.apBFilter = function(k){ bF = k; reload(); };
  async function renderBookings(m){
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
    var rows = (bF==='all') ? bk : bk.filter(function(x){ return x.status===bF; });
    m.innerHTML =
      miniKpis([
        {n:bk.length, l:'Total bookings'},
        {n:by('pending'), l:'Needs action'},
        {n:by('completed'), l:'Completed'},
        {n:money2(revenue), l:'Confirmed revenue'}
      ])
      + '<div class="ap-bar"><h3>All bookings</h3>' + chips(cl, bF, 'apBFilter') + '</div>'
      + tbl2(['Ref','Trip','Date','Pax','Amount','Status','Actions'], rows.map(function(x){
          return [
            '<code>' + esc2(x.ref) + '</code>',
            esc2(x.service_title||'—'),
            x.date||'—',
            x.pax,
            money2(x.amount),
            tag2(x.status),
            bActs(x)
          ];
        }));
  }
  function bActs(x){
    var b = [];
    if (x.status !== 'confirmed' && x.status !== 'completed' && x.status !== 'cancelled') b.push('<button class="ap-b ap-blue" onclick="setBooking(' + x.id + ',\'confirmed\')">Confirm</button>');
    if (x.status !== 'completed' && x.status !== 'cancelled') b.push('<button class="ap-b ap-green" onclick="setBooking(' + x.id + ',\'completed\')">Complete</button>');
    if (x.status !== 'cancelled') b.push('<button class="ap-b ap-red" onclick="setBooking(' + x.id + ',\'cancelled\')">Cancel / Refund</button>');
    if (x.status === 'cancelled' || x.status === 'completed') b.push('<button class="ap-b ap-ghost" onclick="setBooking(' + x.id + ',\'pending\')">Reopen</button>');
    return '<div class="ap-acts">' + b.join('') + '</div>';
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
    if (window.__ragoApInstalled) return true;
    if (typeof window.loadSec !== 'function') return false;
    injectStyles();
    var _prev = window.loadSec;
    window.loadSec = async function(){
      if (role() === 'admin') {
        var sec = section();
        var m = document.getElementById('dmain');
        if (m && (sec === 'vendors' || sec === 'services' || sec === 'bookings')) {
          try {
            m.innerHTML = '<p class="muted">Loading...</p>';
            if (sec === 'vendors') { await renderVendors(m); return; }
            if (sec === 'services') { await renderServices(m); return; }
            await renderBookings(m); return;
          } catch (e) { /* fall back to previous renderer */ }
        }
      }
      return _prev.apply(this, arguments);
    };
    window.__ragoApInstalled = true;
    return true;
  }
  if (!install()) {
    var tries = 0;
    var iv = setInterval(function(){ if (install() || ++tries > 80) clearInterval(iv); }, 120);
  }
})();
