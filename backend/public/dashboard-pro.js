/* =====================================================================
 * RaGo - World-class dashboards (frontend-only, v4)
 * Premium, cohesive Overview screens for Admin / Provider / Marketer.
 * v4: modern line-icon set (Lucide-style) for KPI cards + hero actions,
 *     and a redesigned, cohesive sidebar menu (icons + active state).
 *
 * SAFE & ADDITIVE: wraps the global loadSec() and renderNav(); only the
 * Overview screen of admin/vendor/affiliate is taken over, and menu icons
 * are swapped after each render. Any error falls back silently.
 * ===================================================================== */
(function () {
  'use strict';

  var RGP_ICONS={
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    store:'<path d="M3 9l1.6-5h14.8L21 9"/><path d="M4 9v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M3 9h18"/><path d="M9 19v-5h6v5"/>',
    compass:'<circle cx="12" cy="12" r="9"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9"/>',
    ticket:'<path d="M4 7a2 2 0 0 0-2 2v1.5a1.5 1.5 0 0 1 0 3V15a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.5a1.5 1.5 0 0 1 0-3V9a2 2 0 0 0-2-2z"/><path d="M13 7v10"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    star:'<polygon points="12 2.5 14.9 8.4 21.5 9.3 16.7 13.9 17.9 20.5 12 17.4 6.1 20.5 7.3 13.9 2.5 9.3 9.1 8.4"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-4.5-4.5L5 21"/>',
    megaphone:'<path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1z"/><path d="M18 9a3 3 0 0 1 0 6"/>',
    wallet:'<path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v1"/><path d="M3 8v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/><path d="M21 11h-4a2 2 0 0 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.9 7.9 0 0 0 .1-2l1.9-1.5-2-3.4-2.3 1a8 8 0 0 0-1.7-1l-.4-2.4H10.9l-.4 2.4a8 8 0 0 0-1.7 1l-2.3-1-2 3.4L6.5 11a7.9 7.9 0 0 0 0 2l-1.9 1.5 2 3.4 2.3-1a8 8 0 0 0 1.7 1l.4 2.4h4.2l.4-2.4a8 8 0 0 0 1.7-1l2.3 1 2-3.4z"/>',
    user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    sparkles:'<path d="M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15.7l-1.8-4.9L5.3 9l4.9-1.1z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>'
  };
  var NAVMAP={overview:'grid',vendors:'store',services:'compass',bookings:'ticket',customers:'users',reviews:'star',banners:'image',marketers:'megaphone',payouts:'wallet',settings:'gear',grouptrips:'users',link:'link',wallet:'wallet',profile:'user'};
  function svgWrap(p){ return '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
  function svgEl(html){ var t=document.createElement('div'); t.innerHTML=html; return t.firstChild; }
  function modernizeNav(){
    var nav=document.getElementById('dnav'); if(!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('button'), function(btn){
      var oc=btn.getAttribute('onclick')||''; var key='';
      var a=oc.indexOf("navTo('"); if(a>=0){ var b=oc.indexOf("'", a+7); if(b>a) key=oc.slice(a+7,b); }
      var nm=NAVMAP[key]||'grid';
      var ns=svgEl(svgWrap(RGP_ICONS[nm]||RGP_ICONS.grid));
      var cur=btn.querySelector('svg');
      if(cur){ cur.parentNode.replaceChild(ns,cur); } else { btn.insertBefore(ns, btn.firstChild); }
    });
  }

  var CSS = [
    '.rgp{animation:rgpIn .3s ease}',
    '@keyframes rgpIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '.rgp-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(135deg,#123B4C,#0E2E3B);border-radius:18px;padding:22px 24px;margin-bottom:18px;position:relative;overflow:hidden}',
    '.rgp-hero:after{content:"";position:absolute;right:-40px;top:-45px;width:190px;height:190px;border-radius:50%;background:rgba(232,133,15,.16)}',
    '.rgp-hero-l{position:relative;z-index:1}',
    '.rgp-hi{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#E8850F;margin-bottom:6px}',
    '.rgp-hero h2{margin:0;color:#fff;font-size:23px;font-weight:800;letter-spacing:-.3px}',
    '.rgp-hero p{margin:5px 0 0;color:rgba(255,255,255,.72);font-size:13.5px}',
    '.rgp-acts{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}',
    '.rgp-act{border:none;border-radius:11px;padding:10px 15px;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff;display:inline-flex;align-items:center;gap:7px;transition:.15s}',
    '.rgp-act:hover{background:rgba(255,255,255,.26)}',
    '.rgp-act.gold{background:#E8850F}',
    '.rgp-act.gold:hover{background:#cf7409}',
    '.rgp-act .ci{width:16px;height:16px}',
    '.rgp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(216px,1fr));gap:14px;margin-bottom:18px}',
    '.rgp-kpi{background:#fff;border:1px solid var(--border);border-radius:16px;padding:17px 17px 15px;position:relative;overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}',
    '.rgp-kpi:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(18,59,76,.10)}',
    '.rgp-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}',
    '.rgp-ki{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.rgp-ki .ci{width:21px;height:21px}',
    '.rgp-ki.blue{background:var(--blue-soft);color:var(--blue)}',
    '.rgp-ki.green{background:var(--green-soft);color:var(--green)}',
    '.rgp-ki.gold{background:var(--orange-soft);color:var(--orange)}',
    '.rgp-ki.red{background:#f7dedb;color:var(--red)}',
    '.rgp-kv{font-size:27px;font-weight:800;color:var(--text);letter-spacing:-.6px;line-height:1.05}',
    '.rgp-kl{color:var(--text2);font-size:13px;font-weight:600;margin-top:5px}',
    '.rgp-trend{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;padding:5px 10px;border-radius:999px;white-space:nowrap}',
    '.rgp-trend i{font-style:normal;font-weight:600;opacity:.75;font-size:10px}',
    '.rgp-up{background:var(--green-soft);color:var(--green)}',
    '.rgp-down{background:#f7dedb;color:var(--red)}',
    '.rgp-new{background:var(--orange-soft);color:var(--orange)}',
    '.rgp-spark{width:100%;height:40px;margin-top:13px;display:block}',
    '.rgp-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}',
    '.rgp-panel{background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px 20px}',
    '.rgp-ph{margin-bottom:16px}',
    '.rgp-pt{font-size:15px;font-weight:800;color:var(--text)}',
    '.rgp-ps{font-size:12.5px;color:var(--text2);margin-top:2px}',
    '.rgp-panel table{border:none;border-radius:0}',
    '.rgp-panel th{background:transparent;padding:2px 12px 9px 0}',
    '.rgp-panel td{padding:10px 12px 10px 0}',
    '.rgp-panel tr:last-child td{border-bottom:none}',
    '.rgp-bars{display:flex;align-items:flex-end;gap:12px;padding-top:6px;border-bottom:1px solid var(--border)}',
    '.rgp-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}',
    '.rgp-bv{font-size:11px;font-weight:800;color:var(--text2);height:15px;line-height:15px;white-space:nowrap}',
    '.rgp-bt{width:100%;height:130px;display:flex;align-items:flex-end;justify-content:center}',
    '.rgp-bf{width:60%;min-height:4px;border-radius:8px 8px 0 0;transition:height .6s ease}',
    '.rgp-bl{font-size:12px;color:var(--text2);font-weight:700;padding:8px 0}',
    '.rgp-brk{display:flex;flex-direction:column;gap:15px;padding-top:2px}',
    '.rgp-brh{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}',
    '.rgp-brh b{font-size:14px;color:var(--text)}',
    '.rgp-brt{height:9px;background:var(--soft2);border-radius:999px;overflow:hidden}',
    '.rgp-brf{height:100%;border-radius:999px;transition:width .6s ease}',
    '@media(max-width:760px){.rgp-panels{grid-template-columns:1fr}.rgp-hero{padding:18px}}',
    '#dnav{display:flex;flex-direction:column;gap:4px}',
    '#dnav button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:none;background:transparent;color:var(--text2);font-family:inherit;font-weight:600;font-size:14px;padding:10px 13px;border-radius:11px;cursor:pointer;transition:background .15s,color .15s}',
    '#dnav button svg{width:18px;height:18px;flex:0 0 auto;opacity:.85}',
    '#dnav button:hover{background:var(--soft2);color:var(--text)}',
    '#dnav button.on{background:var(--blue);color:#fff}',
    '#dnav button.on svg{opacity:1}',
    '@media(max-width:760px){#dnav{flex-direction:row;flex-wrap:wrap}#dnav button{width:auto}}'
  ].join('');

  function injectStyles(){
    if (document.getElementById('rgp-styles')) return;
    var st = document.createElement('style');
    st.id = 'rgp-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function money2(n){ return (typeof window.money==='function') ? window.money(n) : ('$'+Number(n||0).toLocaleString()); }
  function icon(n){ var p=RGP_ICONS[n]; if(p) return svgWrap(p); return (typeof window.iconSvg==='function') ? window.iconSvg(n) : ''; }
  function esc2(s){ return (typeof window.esc==='function') ? window.esc(s) : String(s==null?'':s); }
  function tbl2(h,r){ return (typeof window.tbl==='function') ? window.tbl(h,r) : ''; }
  function bookingsTable2(b){ return (typeof window.bookingsTable==='function') ? window.bookingsTable(b) : ''; }
  function apiGet(p){ return window.api(p); }
  function safeArr(p){ return window.api(p).then(function(x){ return x||[]; }).catch(function(){ return []; }); }
  function safeObj(p,f){ return window.api(p).catch(function(){ return f||{}; }); }
  function num(x){ return Number(x)||0; }

  function mkey(d){ var x=new Date(d); if(isNaN(x.getTime())) return ''; return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); }
  function lastMonths(n){
    var a=[], now=new Date();
    for(var i=n-1;i>=0;i--){ var d=new Date(now.getFullYear(), now.getMonth()-i, 1); a.push({ key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), label:d.toLocaleString('en',{month:'short'}) }); }
    return a;
  }
  function trend(cur, prev){
    if(prev===0 && cur===0) return '';
    if(prev===0 && cur>0) return '<span class="rgp-trend rgp-new">✦ New <i>this month</i></span>';
    var d=Math.round(((cur-prev)/prev)*100);
    if(d===0) return '';
    var dir=d>0?'up':'down', arrow=d>0?'▲':'▼';
    return '<span class="rgp-trend rgp-'+dir+'">'+arrow+' '+Math.abs(d)+'% <i>vs last mo.</i></span>';
  }
  function kpi(o){
    return '<div class="rgp-kpi"><div class="rgp-kpi-top"><span class="rgp-ki '+(o.tone||'blue')+'">'+icon(o.icon)+'</span>'+(o.trend||'')+'</div>'
      +'<div class="rgp-kv">'+o.value+'</div><div class="rgp-kl">'+o.label+'</div>'+(o.spark||'')+'</div>';
  }
  function spark(vals, tone){
    if(!vals||!vals.length) return '';
    var w=150,h=40, all=vals.concat([0]);
    var max=Math.max.apply(null,all), min=Math.min.apply(null,all), rng=(max-min)||1;
    var pts=vals.map(function(v,i){ var x=(vals.length>1?(i/(vals.length-1)):0)*w; var y=h-2-((v-min)/rng)*(h-4); return [x,y]; });
    var line=pts.map(function(p,i){ return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); }).join(' ');
    var area=line+' L '+w+' '+h+' L 0 '+h+' Z';
    var col={blue:'#123B4C',green:'#2E8B7B',gold:'#E8850F',red:'#E05544'}[tone||'blue'];
    var id='rgpg'+Math.random().toString(36).slice(2,8);
    return '<svg class="rgp-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'
      +'<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".22"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'
      +'<path d="'+area+'" fill="url(#'+id+')"/><path d="'+line+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function barChart(series, tone){
    var max=Math.max.apply(null, series.map(function(s){ return s.value; }).concat([1]));
    var col={blue:'#123B4C',green:'#2E8B7B',gold:'#E8850F'}[tone||'green'];
    return '<div class="rgp-bars">'+series.map(function(s){
      var pct=Math.round((s.value/max)*100);
      return '<div class="rgp-bar"><div class="rgp-bv">'+(s.value?money2(s.value):'')+'</div>'
        +'<div class="rgp-bt"><div class="rgp-bf" style="height:'+Math.max(pct,3)+'%;background:'+col+'"></div></div></div>';
    }).join('')+'</div>'
      +'<div style="display:flex;gap:12px">'+series.map(function(s){ return '<div class="rgp-bl" style="flex:1;text-align:center">'+s.label+'</div>'; }).join('')+'</div>';
  }
  function breakdown(bookings){
    var order=['pending','confirmed','completed','cancelled'];
    var col={pending:'#E8850F',confirmed:'#123B4C',completed:'#2E8B7B',cancelled:'#E05544'};
    var counts={}; order.forEach(function(s){ counts[s]=0; });
    bookings.forEach(function(b){ if(counts[b.status]!=null) counts[b.status]++; });
    var total=bookings.length||1;
    return '<div class="rgp-brk">'+order.map(function(s){
      var c=counts[s], pct=Math.round((c/total)*100);
      return '<div><div class="rgp-brh"><span class="tag '+s+'">'+s+'</span><b>'+c+'</b></div>'
        +'<div class="rgp-brt"><div class="rgp-brf" style="width:'+pct+'%;background:'+col[s]+'"></div></div></div>';
    }).join('')+'</div>';
  }
  function panel(title, sub, body){
    return '<div class="rgp-panel"><div class="rgp-ph"><div class="rgp-pt">'+title+'</div>'+(sub?'<div class="rgp-ps">'+sub+'</div>':'')+'</div>'+body+'</div>';
  }
  function hero(role){
    var names={admin:'Platform admin',vendor:'Your business',affiliate:'Your marketing'};
    var chip=document.getElementById('user-chip');
    var who=(chip && chip.textContent) ? chip.textContent.trim() : '';
    var acts='';
    if(role==='admin') acts='<button class="rgp-act gold" onclick="navTo(&#39;vendors&#39;)">'+icon('store')+'Providers</button><button class="rgp-act" onclick="navTo(&#39;bookings&#39;)">'+icon('ticket')+'Bookings</button><button class="rgp-act" onclick="navTo(&#39;payouts&#39;)">'+icon('wallet')+'Payouts</button>';
    else if(role==='vendor') acts='<button class="rgp-act gold" onclick="openService()">'+icon('compass')+'New service</button><button class="rgp-act" onclick="navTo(&#39;bookings&#39;)">'+icon('ticket')+'Bookings</button><button class="rgp-act" onclick="navTo(&#39;wallet&#39;)">'+icon('wallet')+'Wallet</button>';
    else acts='<button class="rgp-act gold" onclick="navTo(&#39;link&#39;)">'+icon('link')+'My link</button><button class="rgp-act" onclick="navTo(&#39;bookings&#39;)">'+icon('ticket')+'Bookings</button>';
    return '<div class="rgp-hero"><div class="rgp-hero-l"><div class="rgp-hi">'+(names[role]||'Dashboard')+'</div><h2>Welcome back'+(who?(', '+esc2(who)):'')+'</h2><p>Here is how things are performing today.</p></div><div class="rgp-acts">'+acts+'</div></div>';
  }
  var PAID=function(b){ return b.status==='confirmed'||b.status==='completed'; };

  async function renderAdmin(m){
    var res=await Promise.all([ apiGet('/api/admin/overview'), safeArr('/api/bookings') ]);
    var o=res[0]||{}, bk=(res[1]||[]).slice().sort(function(a,c){ return num(c.id)-num(a.id); });
    var months=lastMonths(6);
    var rev=months.map(function(mo){ return { label:mo.label, value:bk.filter(function(b){ return PAID(b)&&mkey(b.created_at)===mo.key; }).reduce(function(s,b){ return s+num(b.amount); },0) }; });
    var cnt=months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at)===mo.key; }).length; });
    var done=bk.filter(PAID).length;
    var avg=done?num(o.revenue)/done:0;
    m.innerHTML='<div class="rgp">'+hero('admin')
      +'<div class="rgp-kpis">'
      +kpi({icon:'wallet',tone:'green',label:'Revenue',value:money2(o.revenue),trend:trend(rev[5].value,rev[4].value),spark:spark(rev.map(function(r){return r.value;}),'green')})
      +kpi({icon:'ticket',tone:'blue',label:'Bookings',value:(o.bookings!=null?o.bookings:bk.length),trend:trend(cnt[5],cnt[4]),spark:spark(cnt,'blue')})
      +kpi({icon:'sparkles',tone:'gold',label:'Avg booking value',value:money2(avg)})
      +kpi({icon:'sparkles',tone:'gold',label:'Platform commission',value:money2(o.platform_commission)})
      +kpi({icon:'wallet',tone:(num(o.pending_payouts)>0?'red':'blue'),label:'Pending payouts',value:num(o.pending_payouts)})
      +kpi({icon:'store',tone:'blue',label:'Providers',value:num(o.vendors)})
      +kpi({icon:'megaphone',tone:'blue',label:'Marketers',value:num(o.affiliates)})
      +kpi({icon:'users',tone:'blue',label:'Customers',value:num(o.customers)})
      +kpi({icon:'compass',tone:'blue',label:'Services',value:num(o.services)})
      +'</div>'
      +'<div class="rgp-panels">'
      +panel('Revenue','Last 6 months · confirmed &amp; completed',barChart(rev,'green'))
      +panel('Bookings by status','All-time distribution',breakdown(bk))
      +'</div>'
      +'<div class="rgp-panels">'
      +panel('Recent bookings','Latest activity',bookingsTable2(bk.slice(0,6)))
      +panel('Top marketers','By bookings &amp; clicks',tbl2(['Name','Code','Clicks','Bookings'],(o.top_affiliates||[]).map(function(a){ return [esc2(a.name),'<code>'+esc2(a.code)+'</code>',a.clicks,a.bookings]; })))
      +'</div></div>';
  }

  async function renderVendor(m){
    var res=await Promise.all([ safeArr('/api/bookings'), safeObj('/api/wallets/me',{balance:0}), safeArr('/api/services'), safeObj('/api/vendors/me',null) ]);
    var bk=(res[0]||[]).slice().sort(function(a,c){ return num(c.id)-num(a.id); });
    var w=res[1]||{balance:0}, all=res[2]||[], me=res[3];
    var mine=me?all.filter(function(s){ return s.vendor_id===me.id; }):all;
    var months=lastMonths(6);
    var rev=months.map(function(mo){ return { label:mo.label, value:bk.filter(function(b){ return PAID(b)&&mkey(b.created_at)===mo.key; }).reduce(function(s,b){ return s+num(b.amount); },0) }; });
    var cnt=months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at)===mo.key; }).length; });
    var gross=bk.reduce(function(s,b){ return s+num(b.amount); },0);
    var pending=bk.filter(function(b){ return b.status==='pending'; }).length;
    var completed=bk.filter(function(b){ return b.status==='completed'; }).length;
    var rate=bk.length?Math.round((completed/bk.length)*100):0;
    var rated=mine.filter(function(s){ return num(s.rating)>0; });
    var avgR=rated.length?Math.round((rated.reduce(function(s,x){ return s+num(x.rating); },0)/rated.length)*10)/10:0;
    m.innerHTML='<div class="rgp">'+hero('vendor')
      +'<div class="rgp-kpis">'
      +kpi({icon:'wallet',tone:'green',label:'Gross sales',value:money2(gross),trend:trend(rev[5].value,rev[4].value),spark:spark(rev.map(function(r){return r.value;}),'green')})
      +kpi({icon:'ticket',tone:'blue',label:'Bookings',value:bk.length,trend:trend(cnt[5],cnt[4]),spark:spark(cnt,'blue')})
      +kpi({icon:'wallet',tone:'gold',label:'Wallet balance',value:money2(w.balance)})
      +kpi({icon:'compass',tone:'blue',label:'My services',value:mine.length})
      +kpi({icon:'store',tone:(pending>0?'red':'blue'),label:'Pending',value:pending})
      +kpi({icon:'star',tone:'gold',label:'Avg rating',value:(avgR?('★ '+avgR):'—')})
      +'</div>'
      +'<div class="rgp-panels">'
      +panel('Revenue','Last 6 months',barChart(rev,'green'))
      +panel('Bookings by status','All-time · '+rate+'% completed',breakdown(bk))
      +'</div>'
      +panel('Recent bookings','Latest activity',bookingsTable2(bk.slice(0,8)))
      +'</div>';
  }

  async function renderAffiliate(m){
    var res=await Promise.all([ safeObj('/api/affiliates/me',{clicks:0}), safeArr('/api/bookings'), safeObj('/api/wallets/me',{balance:0,transactions:[]}) ]);
    var a=res[0]||{clicks:0}, bk=(res[1]||[]).slice().sort(function(x,y){ return num(y.id)-num(x.id); }), w=res[2]||{balance:0,transactions:[]};
    var months=lastMonths(6);
    var earn=months.map(function(mo){ return { label:mo.label, value:(w.transactions||[]).filter(function(t){ return num(t.amount)>0&&mkey(t.created_at)===mo.key; }).reduce(function(s,t){ return s+num(t.amount); },0) }; });
    var cnt=months.map(function(mo){ return bk.filter(function(b){ return mkey(b.created_at)===mo.key; }).length; });
    var conv=num(a.clicks)?Math.round((bk.length/num(a.clicks))*100):0;
    m.innerHTML='<div class="rgp">'+hero('affiliate')
      +'<div class="rgp-kpis">'
      +kpi({icon:'wallet',tone:'green',label:'Earnings',value:money2(w.balance),trend:trend(earn[5].value,earn[4].value),spark:spark(earn.map(function(r){return r.value;}),'green')})
      +kpi({icon:'ticket',tone:'blue',label:'Bookings',value:bk.length,trend:trend(cnt[5],cnt[4]),spark:spark(cnt,'blue')})
      +kpi({icon:'link',tone:'gold',label:'Clicks',value:num(a.clicks)})
      +kpi({icon:'sparkles',tone:'blue',label:'Conversion',value:conv+'%'})
      +'</div>'
      +'<div class="rgp-panels">'
      +panel('Earnings','Last 6 months',barChart(earn,'green'))
      +panel('Bookings by status','All-time',breakdown(bk))
      +'</div>'
      +panel('Recent bookings','Latest activity',bookingsTable2(bk.slice(0,8)))
      +'</div>';
  }

  function currentRole(){
    var t=(document.getElementById('dash-title')||{}).textContent||'';
    if(/Admin/i.test(t)) return 'admin';
    if(/Provider/i.test(t)) return 'vendor';
    if(/Marketer/i.test(t)) return 'affiliate';
    return '';
  }
  function currentSection(){
    var b=document.querySelector('#dnav button.on');
    if(!b) return '';
    var s=b.querySelector('span');
    return (s?s.textContent:(b.textContent||'')).trim().toLowerCase();
  }

  function install(){
    if(window.__ragoDpInstalled) return true;
    if(typeof window.loadSec!=='function') return false;
    injectStyles();
    try{
      var _rn=window.renderNav;
      if(typeof _rn==='function' && !_rn.__rgpWrapped){
        var wrapped=function(){ var r=_rn.apply(this, arguments); try{ modernizeNav(); }catch(e){} return r; };
        wrapped.__rgpWrapped=true;
        window.renderNav=wrapped;
      }
      modernizeNav();
    }catch(e){}
    var _orig=window.loadSec;
    window.loadSec=async function(){
      var role=currentRole(), sec=currentSection();
      if(sec==='overview' && (role==='admin'||role==='vendor'||role==='affiliate')){
        var m=document.getElementById('dmain');
        if(m){
          try{
            m.innerHTML='<p class="muted">Loading...</p>';
            if(role==='admin'){ await renderAdmin(m); return; }
            if(role==='vendor'){ await renderVendor(m); return; }
            await renderAffiliate(m); return;
          }catch(e){}
        }
      }
      return _orig.apply(this, arguments);
    };
    window.__ragoDpInstalled=true;
    return true;
  }
  if(!install()){
    var tries=0;
    var iv=setInterval(function(){ if(install()||++tries>100) clearInterval(iv); }, 120);
  }
})();
