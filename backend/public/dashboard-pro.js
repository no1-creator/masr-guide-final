/* =====================================================================
 * RaGo — World-class dashboards (frontend-only enhancement)
 * Upgrades the Admin / Vendor / Marketer dashboard OVERVIEW screens with
 * premium KPI cards, growth/decline trend indicators, sparklines and
 * report panels (revenue chart + booking-status breakdown).
 *
 * SAFE & ADDITIVE: only augments the existing global `SEC` overview
 * renderers and injects its own namespaced CSS (.dp-*). It does NOT touch
 * any working code, the backend, or any other dashboard section. Every
 * figure is computed live from the existing API — no fake data.
 * ===================================================================== */
(function () {
  'use strict';
  if (typeof SEC === 'undefined') return; // needs app.html globals

  /* ---------- 1) Namespaced styles (.dp-*) ---------- */
  var CSS = [
    '.dp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(212px,1fr));gap:14px;margin-bottom:18px}',
    '.dp-kpi{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 16px 15px;position:relative;overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}',
    '.dp-kpi:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(18,59,76,.09)}',
    '.dp-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:13px}',
    '.dp-ki{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.dp-ki .ci{width:20px;height:20px}',
    '.dp-ki-blue{background:var(--blue-soft);color:var(--blue)}',
    '.dp-ki-green{background:var(--green-soft);color:var(--green)}',
    '.dp-ki-gold{background:var(--orange-soft);color:var(--orange)}',
    '.dp-ki-red{background:#f7dedb;color:var(--red)}',
    '.dp-kv{font-size:27px;font-weight:800;color:var(--text);letter-spacing:-.5px;line-height:1.05}',
    '.dp-kl{color:var(--text2);font-size:13px;font-weight:600;margin-top:5px}',
    '.dp-trend{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;padding:5px 10px;border-radius:999px;white-space:nowrap}',
    '.dp-trend i{font-style:normal;font-weight:600;opacity:.7;font-size:10px}',
    '.dp-up{background:var(--green-soft);color:var(--green)}',
    '.dp-down{background:#f7dedb;color:var(--red)}',
    '.dp-flat{background:var(--soft2);color:var(--text2)}',
    '.dp-spark{width:100%;height:36px;margin-top:12px;display:block}',
    '.dp-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}',
    '.dp-panel{background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px}',
    '.dp-panel-h{margin-bottom:16px}',
    '.dp-panel-t{font-size:15px;font-weight:800;color:var(--text)}',
    '.dp-panel-s{font-size:12.5px;color:var(--text2);margin-top:2px}',
    '.dp-panel table{border:none;border-radius:0}',
    '.dp-panel thead th{background:transparent;padding:4px 12px 8px 0}',
    '.dp-panel td{padding:9px 12px 9px 0}',
    '.dp-panel tr:last-child td{border-bottom:none}',
    '.dp-bars{display:flex;align-items:flex-end;gap:12px;padding-top:6px}',
    '.dp-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}',
    '.dp-bar-v{font-size:11px;font-weight:700;color:var(--text2);height:15px;line-height:15px;white-space:nowrap}',
    '.dp-bar-track{width:100%;height:132px;display:flex;align-items:flex-end;justify-content:center}',
    '.dp-bar-fill{width:58%;min-height:4px;border-radius:7px 7px 0 0;transition:height .5s ease}',
    '.dp-bar-lbl{font-size:12px;color:var(--text2);font-weight:600}',
    '.dp-break{display:flex;flex-direction:column;gap:15px;padding-top:4px}',
    '.dp-break-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}',
    '.dp-break-head b{font-size:14px;color:var(--text)}',
    '.dp-break-track{height:9px;background:var(--soft2);border-radius:999px;overflow:hidden}',
    '.dp-break-fill{height:100%;border-radius:999px;transition:width .5s ease}',
    '.dp-bg-pending{background:var(--orange)}',
    '.dp-bg-confirmed{background:var(--blue)}',
    '.dp-bg-completed{background:var(--green)}',
    '.dp-bg-cancelled{background:var(--red)}',
    '@media(max-width:760px){.dp-panels{grid-template-columns:1fr}}'
  ].join('\n');
  if (!document.getElementById('dp-styles-inject')) {
    var st = document.createElement('style');
    st.id = 'dp-styles-inject';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- 2) Helpers ---------- */
  function money2(n){ return (typeof money === 'function') ? money(n) : ('$' + Number(n||0).toLocaleString()); }
  function icon(n){ return (typeof iconSvg === 'function') ? iconSvg(n) : ''; }
  function mkey(d){ var x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0'); }
  function lastMonths(n){
    var a = [], now = new Date();
    for (var i = n-1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      a.push({ key: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'), label: d.toLocaleString('en', {month:'short'}) });
    }
    return a;
  }
  function trendBadge(cur, prev){
    var pct, dir;
    if (prev === 0 && cur === 0) { pct = 0; dir = 'flat'; }
    else if (prev === 0) { pct = 100; dir = 'up'; }
    else { var d = Math.round(((cur - prev) / prev) * 100); pct = Math.abs(d); dir = d > 0 ? 'up' : (d < 0 ? 'down' : 'flat'); }
    var arrow = dir === 'up' ? '\u25B2' : (dir === 'down' ? '\u25BC' : '\u25AC');
    return '<span class="dp-trend dp-' + dir + '">' + arrow + ' ' + pct + '% <i>vs last mo.</i></span>';
  }
  function kpi(o){
    return '<div class="dp-kpi"><div class="dp-kpi-top"><span class="dp-ki dp-ki-' + (o.tone||'blue') + '">' + icon(o.icon) + '</span>' + (o.trend||'') + '</div>'
      + '<div class="dp-kv">' + o.value + '</div><div class="dp-kl">' + o.label + '</div>' + (o.spark||'') + '</div>';
  }
  function spark(vals, tone){
    if (!vals || !vals.length) return '';
    var w = 140, h = 36;
    var all = vals.concat([0]);
    var max = Math.max.apply(null, all), min = Math.min.apply(null, all);
    var rng = (max - min) || 1;
    var pts = vals.map(function(v,i){ var x = (vals.length>1 ? (i/(vals.length-1)) : 0) * w; var y = h - ((v-min)/rng) * h; return [x,y]; });
    var line = pts.map(function(p,i){ return (i?'L':'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L ' + w + ' ' + h + ' L 0 ' + h + ' Z';
    var col = {blue:'#123B4C',green:'#2E8B7B',gold:'#E8850F',red:'#E05544'}[tone||'blue'];
    var id = 'dpg' + Math.random().toString(36).slice(2,8);
    return '<svg class="dp-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">'
      + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".20"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>'
      + '<path d="' + area + '" fill="url(#' + id + ')"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function bars(series, tone){
    var max = Math.max.apply(null, series.map(function(s){return s.value;}).concat([1]));
    var col = {blue:'#123B4C',green:'#2E8B7B',gold:'#E8850F'}[tone||'blue'];
    return '<div class="dp-bars">' + series.map(function(s){
      var pct = Math.round((s.value / max) * 100);
      return '<div class="dp-bar"><div class="dp-bar-v">' + (s.value ? money2(s.value) : '') + '</div>'
        + '<div class="dp-bar-track"><div class="dp-bar-fill" style="height:' + Math.max(pct,3) + '%;background:' + col + '"></div></div>'
        + '<div class="dp-bar-lbl">' + s.label + '</div></div>';
    }).join('') + '</div>';
  }
  function breakdown(bookings){
    var order = ['pending','confirmed','completed','cancelled'];
    var counts = {}; order.forEach(function(s){ counts[s] = 0; });
    bookings.forEach(function(b){ if (counts[b.status] != null) counts[b.status]++; });
    var total = bookings.length || 1;
    return '<div class="dp-break">' + order.map(function(s){
      var c = counts[s], pct = Math.round((c/total) * 100);
      return '<div><div class="dp-break-head"><span class="tag ' + s + '">' + s + '</span><b>' + c + '</b></div>'
        + '<div class="dp-break-track"><div class="dp-break-fill dp-bg-' + s + '" style="width:' + pct + '%"></div></div></div>';
    }).join('') + '</div>';
  }
  function panel(title, sub, body){
    return '<div class="dp-panel"><div class="dp-panel-h"><div class="dp-panel-t">' + title + '</div>' + (sub ? '<div class="dp-panel-s">' + sub + '</div>' : '') + '</div>' + body + '</div>';
  }
  var PAID = function(b){ return b.status === 'confirmed' || b.status === 'completed'; };
  function safeArr(p){ return api(p).catch(function(){ return []; }); }
  function safeWallet(p){ return api(p).catch(function(){ return {balance:0, transactions:[]}; }); }

  /* ---------- 3) Overview renderers (override) ---------- */
  SEC['admin:overview'] = async function(m){
    var res = await Promise.all([ api('/api/admin/overview'), safeArr('/api/bookings') ]);
    var o = res[0], bk = res[1] || [];
    var months = lastMonths(6);
    var rev = months.map(function(mo){ return { label: mo.label, value: bk.filter(function(b){ return PAID(b) && mkey(b.created_at) === mo.key; }).reduce(function(s,b){ return s + Number(b.amount||0); }, 0) }; });
    var cnt = months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at) === mo.key; }).length; });
    var rc = rev[5].value, rp = rev[4].value, cc = cnt[5], cp = cnt[4];
    m.innerHTML =
      '<div class="dp-kpis">'
      + kpi({icon:'wallet', tone:'green', label:'Revenue', value:money2(o.revenue), trend:trendBadge(rc,rp), spark:spark(rev.map(function(r){return r.value;}),'green')})
      + kpi({icon:'ticket', tone:'blue', label:'Bookings', value:o.bookings, trend:trendBadge(cc,cp), spark:spark(cnt,'blue')})
      + kpi({icon:'sparkles', tone:'gold', label:'Platform commission', value:money2(o.platform_commission)})
      + kpi({icon:'wallet', tone:(o.pending_payouts>0?'gold':'blue'), label:'Pending payouts', value:o.pending_payouts})
      + kpi({icon:'store', tone:'blue', label:'Providers', value:o.vendors})
      + kpi({icon:'megaphone', tone:'blue', label:'Marketers', value:o.affiliates})
      + kpi({icon:'users', tone:'blue', label:'Customers', value:o.customers})
      + kpi({icon:'compass', tone:'blue', label:'Services', value:o.services})
      + '</div>'
      + '<div class="dp-panels">'
      + panel('Revenue', 'Last 6 months \u00b7 confirmed &amp; completed', bars(rev,'green'))
      + panel('Bookings by status', 'All-time distribution', breakdown(bk))
      + '</div>'
      + '<div class="dp-panels">'
      + panel('Recent bookings', 'Latest activity', tbl(['Ref','Trip','Amount','Status'], o.recent_bookings.map(function(b){ return [b.ref, esc(b.title), money2(b.amount), statusTag(b.status)]; })))
      + panel('Top marketers', 'By bookings &amp; clicks', tbl(['Name','Code','Clicks','Bookings'], o.top_affiliates.map(function(a){ return [esc(a.name), a.code, a.clicks, a.bookings]; })))
      + '</div>';
  };

  SEC['vendor:overview'] = async function(m){
    var res = await Promise.all([ safeArr('/api/bookings'), safeWallet('/api/wallets/me') ]);
    var bk = res[0] || [], w = res[1] || {balance:0};
    var months = lastMonths(6);
    var rev = months.map(function(mo){ return { label: mo.label, value: bk.filter(function(b){ return PAID(b) && mkey(b.created_at) === mo.key; }).reduce(function(s,b){ return s + Number(b.amount||0); }, 0) }; });
    var cnt = months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at) === mo.key; }).length; });
    var gross = bk.reduce(function(s,b){ return s + Number(b.amount||0); }, 0);
    var completed = bk.filter(function(b){ return b.status === 'completed'; }).length;
    var rate = bk.length ? Math.round((completed / bk.length) * 100) : 0;
    m.innerHTML =
      '<div class="dp-kpis">'
      + kpi({icon:'wallet', tone:'green', label:'Gross sales', value:money2(gross), trend:trendBadge(rev[5].value,rev[4].value), spark:spark(rev.map(function(r){return r.value;}),'green')})
      + kpi({icon:'ticket', tone:'blue', label:'Bookings', value:bk.length, trend:trendBadge(cnt[5],cnt[4]), spark:spark(cnt,'blue')})
      + kpi({icon:'wallet', tone:'gold', label:'Wallet balance', value:money2(w.balance)})
      + kpi({icon:'star', tone:'blue', label:'Completion rate', value:rate + '%'})
      + '</div>'
      + '<div class="dp-panels">'
      + panel('Revenue', 'Last 6 months', bars(rev,'green'))
      + panel('Bookings by status', 'All-time', breakdown(bk))
      + '</div>'
      + panel('Recent bookings', 'Latest activity', bookingsTable(bk.slice(0,8)));
  };

  SEC['affiliate:overview'] = async function(m){
    var res = await Promise.all([ api('/api/affiliates/me'), safeArr('/api/bookings'), safeWallet('/api/wallets/me') ]);
    var a = res[0] || {clicks:0}, bk = res[1] || [], w = res[2] || {balance:0, transactions:[]};
    var months = lastMonths(6);
    var earn = months.map(function(mo){ return { label: mo.label, value: (w.transactions||[]).filter(function(t){ return t.amount > 0 && mkey(t.created_at) === mo.key; }).reduce(function(s,t){ return s + Number(t.amount||0); }, 0) }; });
    var cnt = months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at) === mo.key; }).length; });
    var conv = a.clicks ? Math.round((bk.length / a.clicks) * 100) : 0;
    m.innerHTML =
      '<div class="dp-kpis">'
      + kpi({icon:'wallet', tone:'green', label:'Earnings', value:money2(w.balance), trend:trendBadge(earn[5].value,earn[4].value), spark:spark(earn.map(function(r){return r.value;}),'green')})
      + kpi({icon:'ticket', tone:'blue', label:'Bookings', value:bk.length, trend:trendBadge(cnt[5],cnt[4]), spark:spark(cnt,'blue')})
      + kpi({icon:'link', tone:'gold', label:'Clicks', value:a.clicks})
      + kpi({icon:'sparkles', tone:'blue', label:'Conversion', value:conv + '%'})
      + '</div>'
      + '<div class="dp-panels">'
      + panel('Earnings', 'Last 6 months', bars(earn,'green'))
      + panel('Bookings by status', 'All-time', breakdown(bk))
      + '</div>';
  };
})();
