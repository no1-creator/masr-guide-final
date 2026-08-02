/* =====================================================================
 * RaGo - World-class dashboards (frontend-only, v3, rewritten from scratch)
 * Premium, cohesive Overview screens for Admin / Provider / Marketer:
 *   - welcome banner with quick-action buttons
 *   - refined KPI cards with sparklines + tasteful trend badges
 *   - revenue bar chart, booking-status breakdown, recent-activity panels
 * Consistent RaGo palette, spacing, radius and iconography throughout.
 *
 * SAFE & ADDITIVE: wraps the global loadSec(); only the Overview screen of
 * admin/vendor/affiliate is taken over - every other section/role falls
 * through to the original renderer, and any error falls back silently.
 * Uses only global helpers (money, iconSvg, esc, tbl, statusTag,
 * bookingsTable, api, navTo, openService).
 * ===================================================================== */
(function () {
  'use strict';

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
    '@media(max-width:760px){.rgp-panels{grid-template-columns:1fr}.rgp-hero{padding:18px}}'
  ].join('');

  function injectStyles(){
    if (document.getElementById('rgp-styles')) return;
    var st = document.createElement('style');
    st.id = 'rgp-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function money2(n){ return (typeof window.money==='function') ? window.money(n) : ('$'+Number(n||0).toLocaleString()); }
  function icon(n){ return (typeof window.iconSvg==='function') ? window.iconSvg(n) : ''; }
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
    return '