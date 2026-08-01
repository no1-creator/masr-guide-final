/* RaGo — Internal Trips category page (v2)
 * World-class, self-contained & additive. Dedicated professional page for the
 * "internal-trips" category + a professional detail page for each trip.
 * Modern typography (Plus Jakarta Sans) + professional inline SVG icon set
 * (no emojis). Hooks pickCat() and openDetail() WITHOUT touching any core file. */
(function(){
  'use strict';
  var CAT_KEY='internal-trips';
  var RGT={dest:'',q:'',sort:'featured'};
  var _all=[];

  function _esc(s){try{return (typeof esc==='function')?esc(s):String(s==null?'':s);}catch(e){return String(s==null?'':s);}}
  function _money(n){try{return (typeof money==='function')?money(n):('$'+Number(n||0).toLocaleString());}catch(e){return '$'+Number(n||0).toLocaleString();}}
  function _api(p,o){return api(p,o);}
  function setBody(html){var el=document.getElementById('detail-body');if(el)el.innerHTML=html;if(typeof show==='function')show('detail-view');window.scrollTo(0,0);}

  /* ---------- professional SVG icon set (Lucide-style, stroke) ---------- */
  var ICONS_={
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m8.5 12 2.5 2.5L16 9.5"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>',
    refresh:'<path d="M3 3v5h5"/><path d="M3.5 13a8.5 8.5 0 1 0 2.2-8.2L3 8"/>',
    headset:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H17v-6h.5A2.5 2.5 0 0 1 20 14.5Z"/><path d="M4 15.5A2.5 2.5 0 0 0 6.5 18H7v-6h-.5A2.5 2.5 0 0 0 4 14.5Z"/><path d="M20 16v1a4 4 0 0 1-4 4h-3"/>',
    badge:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/>',
    tag:'<path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9Z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/>',
    arrow:'<path d="M5 12h13"/><path d="m12 5 7 7-7 7"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>',
    calendar:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 9.5h18"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    award:'<circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
  };
  function ic(name,opt){opt=opt||{};var s=opt.size||18,sw=opt.sw||2,fill=opt.fill?'currentColor':'none',cls=opt.cls?(' '+opt.cls):'';return '<svg class="rgt-ic'+cls+'" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+fill+'" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round">'+(ICONS_[name]||'')+'</svg>';}
  function starRow(rating,size){size=size||15;var r=Math.round(Number(rating)||0),out='<span class="rgt-stars">';for(var i=1;i<=5;i++){out+='<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+(i<=r?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.4" style="vertical-align:middle"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6Z"/></svg>';}return out+'</span>';}

  var CSS=`
  #rago-cat{max-width:1180px;margin:0 auto;padding:0 4px 64px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  #rago-cat *{box-sizing:border-box}
  #rago-cat .rgt-ic{vertical-align:middle;flex:none}
  .rgt-crumb{font-size:13px;color:#6b7b85;margin:18px 0 16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .rgt-crumb a{color:#123B4C;text-decoration:none;font-weight:700;cursor:pointer}
  .rgt-crumb a:hover{color:#E8850F}
  .rgt-crumb .sep{color:#c3ced3;display:flex}
  .rgt-hero{position:relative;border-radius:26px;overflow:hidden;margin-bottom:26px;background:linear-gradient(135deg,#0C2A36,#1C4E63);color:#fff;padding:54px 40px 48px}
  .rgt-hero:before{content:'';position:absolute;inset:0;background:url('/img/redsea.png') center/cover;opacity:.34}
  .rgt-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(12,42,54,.92),rgba(18,59,76,.60))}
  .rgt-hero>*{position:relative;z-index:2}
  .rgt-hbadge{display:inline-flex;align-items:center;gap:7px;background:rgba(232,133,15,.18);border:1px solid rgba(232,133,15,.45);color:#FFCE93;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:7px 13px;border-radius:999px;margin-bottom:16px}
  .rgt-hero h1{margin:0 0 12px;font-size:38px;font-weight:800;letter-spacing:-1px;line-height:1.08}
  .rgt-hero p{margin:0;font-size:16.5px;opacity:.92;max-width:680px;line-height:1.6}
  .rgt-hsearch{margin-top:26px;display:flex;gap:11px;max-width:600px}
  .rgt-hsi{flex:1;display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:0 16px}
  .rgt-hsi .rgt-ic{color:#8a97a0}
  .rgt-hsi input{flex:1;border:none;padding:16px 0;font-size:15px;outline:none;font-family:inherit;background:transparent;color:#1B2A30}
  .rgt-hsb{border:none;border-radius:14px;padding:0 24px;background:#E8850F;color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;transition:.15s}
  .rgt-hsb:hover{background:#cf7409}
  .rgt-hstats{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px}
  .rgt-hstats span{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;opacity:.95}
  .rgt-hstats .rgt-ic{color:#7FD1BE}
  .rgt-filter{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
  .rgt-chips{display:flex;gap:9px;overflow-x:auto;padding-bottom:6px;flex:1;scrollbar-width:thin}
  .rgt-chip{white-space:nowrap;border:1.5px solid #e0e8eb;background:#fff;color:#123B4C;padding:10px 16px;border-radius:999px;font-size:13.5px;font-weight:700;cursor:pointer;transition:.15s}
  .rgt-chip:hover{border-color:#123B4C;transform:translateY(-1px)}
  .rgt-chip.on{background:#123B4C;color:#fff;border-color:#123B4C}
  .rgt-sort{border:1.5px solid #e0e8eb;border-radius:12px;padding:11px 14px;font-size:14px;background:#fff;color:#123B4C;font-weight:700;cursor:pointer;font-family:inherit}
  .rgt-count{font-size:14px;color:#6b7b85;margin:14px 0 16px;font-weight:700}
  .rgt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .rgt-card{background:#fff;border:1px solid #edf1f3;border-radius:20px;overflow:hidden;cursor:pointer;box-shadow:0 2px 12px rgba(18,59,76,.05);transition:transform .2s,box-shadow .2s}
  .rgt-card:hover{transform:translateY(-5px);box-shadow:0 20px 40px rgba(18,59,76,.15)}
  .rgt-img{height:196px;background:#e6eef1 center/cover;position:relative}
  .rgt-img:after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(12,42,54,.28),transparent 42%)}
  .rgt-badge{position:absolute;top:13px;left:13px;z-index:1;display:inline-flex;align-items:center;gap:5px;background:#E8850F;color:#fff;font-size:12px;font-weight:800;padding:6px 11px;border-radius:999px;box-shadow:0 4px 12px rgba(232,133,15,.4)}
  .rgt-dur{position:absolute;bottom:13px;right:13px;z-index:1;display:inline-flex;align-items:center;gap:5px;background:rgba(12,42,54,.85);color:#fff;font-size:12px;font-weight:700;padding:6px 11px;border-radius:9px;backdrop-filter:blur(4px)}
  .rgt-cb{padding:16px 17px 18px}
  .rgt-loc{display:flex;align-items:center;gap:5px;font-size:12.5px;color:#6b7b85;font-weight:700}
  .rgt-loc .rgt-ic{color:#E8850F}
  .rgt-title{font-size:17.5px;font-weight:800;color:#123B4C;margin:7px 0 9px;line-height:1.32}
  .rgt-rate{display:flex;align-items:center;gap:7px;font-size:13px;color:#123B4C;font-weight:700}
  .rgt-stars{color:#E8850F;display:inline-flex;gap:1px}
  .rgt-mut{color:#8a97a0;font-weight:500}
  .rgt-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid #f0f3f5}
  .rgt-price{color:#123B4C;font-size:19px;font-weight:800}
  .rgt-view{display:inline-flex;align-items:center;gap:4px;color:#E8850F;font-weight:800;font-size:13px}
  .rgt-card:hover .rgt-view .rgt-ic{transform:translateX(3px)}
  .rgt-view .rgt-ic{transition:.15s}
  .rgt-load{padding:80px 20px;text-align:center;color:#6b7b85;font-weight:700}
  .rgt-empty{grid-column:1/-1;padding:48px;text-align:center;color:#8a97a0}
  .rgt-why{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:48px}
  .rgt-wc{background:#f6fafb;border:1px solid #eef3f5;border-radius:18px;padding:24px 18px;text-align:center}
  .rgt-wc .ico{width:50px;height:50px;border-radius:15px;background:#E6EEF1;color:#123B4C;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
  .rgt-wc b{display:block;color:#123B4C;font-size:15px;margin-bottom:5px}
  .rgt-wc span{font-size:12.5px;color:#6b7b85;line-height:1.55}
  /* ---- detail ---- */
  .rgt-two{display:grid;grid-template-columns:1fr 372px;gap:36px;align-items:start;margin-top:8px}
  .rgt-dhero{height:410px;border-radius:22px;background:#e6eef1 center/cover;box-shadow:0 12px 34px rgba(18,59,76,.12)}
  .rgt-gal{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
  .rgt-gth{width:96px;height:68px;border-radius:11px;background:#e6eef1 center/cover;cursor:pointer;opacity:.6;border:2px solid transparent;transition:.15s}
  .rgt-gth.on,.rgt-gth:hover{opacity:1;border-color:#E8850F}
  .rgt-eye{display:inline-flex;align-items:center;gap:6px;color:#E8850F;font-weight:800;font-size:12.5px;text-transform:uppercase;letter-spacing:.6px;margin-top:18px}
  .rgt-h2{font-size:30px;font-weight:800;color:#123B4C;margin:6px 0 10px;line-height:1.18;letter-spacing:-.5px}
  .rgt-sub{display:flex;align-items:center;gap:14px;flex-wrap:wrap;color:#6b7b85;font-size:14px;margin:0}
  .rgt-sub .it{display:inline-flex;align-items:center;gap:6px}
  .rgt-sub .it .rgt-ic{color:#E8850F}
  .rgt-sec{margin-top:32px}
  .rgt-sec h3{font-size:20px;font-weight:800;color:#123B4C;margin:0 0 14px}
  .rgt-lead{color:#3a4a52;line-height:1.8;font-size:15px;margin:0}
  .rgt-ul{list-style:none;padding:0;margin:0;display:grid;gap:12px}
  .rgt-ul li{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;color:#3a4a52;line-height:1.5}
  .rgt-ul li .ic{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px}
  .rgt-yes .ic{background:#E4F1EE;color:#2E8B7B}.rgt-no .ic{background:#FBE7E4;color:#E05544}
  .rgt-cols{display:grid;grid-template-columns:1fr 1fr;gap:26px}
  .rgt-steps{display:grid;gap:16px}
  .rgt-step{display:flex;gap:15px;align-items:flex-start}
  .rgt-num{flex:none;width:32px;height:32px;border-radius:50%;background:#123B4C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
  .rgt-step b{color:#123B4C;font-size:15px}.rgt-step span{display:block;color:#6b7b85;font-size:13.5px;margin-top:3px;line-height:1.5}
  .rgt-dates{display:flex;gap:9px;flex-wrap:wrap}
  .rgt-dchip{display:inline-flex;align-items:center;gap:6px;background:#E6EEF1;color:#123B4C;padding:9px 13px;border-radius:9px;font-size:13px;font-weight:700}
  .rgt-dchip .rgt-ic{color:#123B4C;opacity:.7}
  .rgt-prov{display:flex;gap:15px;align-items:center;background:#f6fafb;border:1px solid #eef3f5;border-radius:16px;padding:18px}
  .rgt-av{flex:none;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1C4E63,#0C2A36);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
  .rgt-badge2{display:inline-flex;align-items:center;gap:5px;background:#E4F1EE;color:#2E8B7B;font-size:12px;font-weight:800;padding:6px 11px;border-radius:999px}
  .rgt-rev{border:1px solid #edf1f3;border-radius:14px;padding:16px;margin-bottom:11px}
  .rgt-rev .top{display:flex;justify-content:space-between;align-items:center;font-size:13.5px}
  .rgt-rev .who{font-weight:800;color:#123B4C}
  .rgt-faq{border:1px solid #edf1f3;border-radius:14px;padding:0 16px;margin-bottom:10px}
  .rgt-faq summary{padding:16px 0;font-weight:700;color:#123B4C;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px}
  .rgt-faq summary::-webkit-details-marker{display:none}
  .rgt-faq summary .rgt-ic{color:#8a97a0;transition:.2s;flex:none}
  .rgt-faq[open] summary{color:#E8850F}
  .rgt-faq[open] summary .rgt-ic{transform:rotate(90deg);color:#E8850F}
  .rgt-faq .ans{padding:0 0 16px;color:#3a4a52;font-size:14px;line-height:1.7}
  .rgt-book{position:sticky;top:16px;background:#fff;border:1px solid #edf1f3;border-radius:20px;padding:24px;box-shadow:0 16px 40px rgba(18,59,76,.12)}
  .rgt-book .p{font-size:33px;font-weight:800;color:#123B4C;line-height:1}
  .rgt-book .pm{color:#6b7b85;font-size:13px;margin-bottom:4px;font-weight:600}
  .rgt-field{margin:14px 0}
  .rgt-field label{display:block;font-size:11.5px;font-weight:800;color:#6b7b85;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
  .rgt-field input,.rgt-field select{width:100%;border:1.5px solid #e0e8eb;border-radius:11px;padding:13px;font-size:14px;font-family:inherit;color:#1B2A30;background:#fff}
  .rgt-field input:focus,.rgt-field select:focus{outline:none;border-color:#123B4C}
  .rgt-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:#E8850F;color:#fff;border:none;border-radius:13px;padding:16px;font-size:16px;font-weight:800;cursor:pointer;margin-top:6px;font-family:inherit;transition:.15s}
  .rgt-btn:hover{background:#cf7409;transform:translateY(-1px)}
  .rgt-trust{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:11px}
  .rgt-trust li{font-size:13px;color:#3a4a52;font-weight:600;display:flex;gap:10px;align-items:center}
  .rgt-trust .rgt-ic{color:#2E8B7B}
  .rgt-ref{display:flex;align-items:center;gap:8px;margin-top:16px;background:#FFF4E6;color:#8a5a1e;border-radius:11px;padding:11px 13px;font-size:12.5px;font-weight:700}
  .rgt-sim{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  @media(max-width:900px){.rgt-grid{grid-template-columns:repeat(2,1fr)}.rgt-why{grid-template-columns:repeat(2,1fr)}.rgt-two{grid-template-columns:1fr}.rgt-dhero{height:280px}.rgt-book{position:static}.rgt-cols{grid-template-columns:1fr}.rgt-sim{grid-template-columns:1fr}.rgt-hero{padding:40px 24px}.rgt-hero h1{font-size:30px}}
  @media(max-width:600px){.rgt-grid{grid-template-columns:1fr}.rgt-hero h1{font-size:25px}.rgt-hsearch{flex-direction:column}}
  `;
  function injectCSS(){
    if(!document.getElementById('rgt-font')){var l=document.createElement('link');l.id='rgt-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';(document.head||document.documentElement).appendChild(l);}
    if(document.getElementById('rgt-css'))return;var st=document.createElement('style');st.id='rgt-css';st.textContent=CSS;(document.head||document.documentElement).appendChild(st);
  }

  /* ===================== Category landing ===================== */
  async function openCategory(){
    injectCSS();RGT={dest:'',q:'',sort:'featured'};
    setBody('<div class="rgt-load">Loading trips…</div>');
    try{_all=await _api('/api/services?cat='+encodeURIComponent(CAT_KEY));}catch(e){_all=[];}
    _all=_all||[];
    renderCategory();
  }
  function destinations(){var seen={},out=[];_all.forEach(function(s){var l=(s.location||'').trim();if(l&&!seen[l]){seen[l]=1;out.push(l);}});return out;}
  function applyFilters(){
    var q=(RGT.q||'').toLowerCase(),d=RGT.dest||'';
    var out=_all.filter(function(s){
      if(d&&(s.location||'')!==d)return false;
      if(q){var hay=((s.title||'')+' '+(s.location||'')+' '+(s.description||'')).toLowerCase();if(hay.indexOf(q)<0)return false;}
      return true;
    });
    var sort=RGT.sort||'featured';
    out.sort(function(a,b){
      if(sort==='price_asc')return (a.price||0)-(b.price||0);
      if(sort==='price_desc')return (b.price||0)-(a.price||0);
      if(sort==='rating')return (b.rating||0)-(a.rating||0);
      return ((b.featured?1:0)-(a.featured?1:0))||((b.rating||0)-(a.rating||0));
    });
    return out;
  }
  function cardHtml(s){
    var img=s.cover||(s.images&&s.images[0])||'';
    return '<div class="rgt-card" onclick="rgtOpen('+s.id+')">'
      +'<div class="rgt-img" style="background-image:url(\''+img+'\')">'
        +(s.featured?'<span class="rgt-badge">'+ic('award',{size:13})+' Featured</span>':'')
        +(s.duration?'<span class="rgt-dur">'+ic('clock',{size:13})+' '+_esc(s.duration)+'</span>':'')
      +'</div>'
      +'<div class="rgt-cb">'
        +'<div class="rgt-loc">'+ic('pin',{size:14})+' '+_esc(s.location||'Egypt')+'</div>'
        +'<div class="rgt-title">'+_esc(s.title)+'</div>'
        +'<div class="rgt-rate">'+starRow(s.rating,14)+' <span>'+(s.rating||0)+'</span> <span class="rgt-mut">('+(s.reviews_count||0)+')</span></div>'
        +'<div class="rgt-foot"><div><span class="rgt-mut">from</span> <b class="rgt-price">'+_money(s.price)+'</b> <span class="rgt-mut">/ person</span></div><span class="rgt-view">View '+ic('arrow',{size:15})+'</span></div>'
      +'</div>'
    +'</div>';
  }
  function renderGrid(){
    var list=applyFilters();
    var g=document.getElementById('rgt-grid');if(g)g.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="rgt-empty">No trips match your filters.</div>';
    var c=document.getElementById('rgt-count');if(c)c.textContent=list.length+' trip'+(list.length===1?'':'s')+' available';
  }
  function syncChips(){var els=document.querySelectorAll('#rago-cat .rgt-chip');for(var i=0;i<els.length;i++){els[i].classList.toggle('on',els[i].getAttribute('data-d')===(RGT.dest||''));}}
  function renderCategory(){
    var dests=destinations();
    var chips='<div class="rgt-chip on" data-d="" onclick="rgtDest(\'\')">All destinations</div>'
      +dests.map(function(d){return '<div class="rgt-chip" data-d="'+_esc(d)+'" onclick="rgtDest(\''+d.replace(/'/g,"\\'")+'\')">'+_esc(d)+'</div>';}).join('');
    var html='<div id="rago-cat">'
      +'<div class="rgt-crumb"><a onclick="goHome()">Home</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <b>Internal Trips</b></div>'
      +'<div class="rgt-hero">'
        +'<span class="rgt-hbadge">'+ic('sun',{size:14})+' Explore Egypt</span>'
        +'<h1>Internal Trips across Egypt</h1>'
        +'<p>Day trips, excursions and unforgettable experiences — from Red Sea snorkeling and desert safaris to Luxor and the Pyramids. Handpicked, guided, and bookable in seconds.</p>'
        +'<div class="rgt-hsearch"><div class="rgt-hsi">'+ic('search',{size:19})+'<input id="rgt-q" placeholder="Search trips, e.g. Luxor, diving, safari…" oninput="rgtSearchInput(this.value)"></div><button class="rgt-hsb" onclick="rgtScrollGrid()">Search</button></div>'
        +'<div class="rgt-hstats"><span>'+ic('shield',{size:17})+' Verified local guides</span><span>'+ic('refresh',{size:17})+' Free cancellation</span><span>'+ic('card',{size:17})+' Secure payment</span></div>'
      +'</div>'
      +'<div class="rgt-filter"><div class="rgt-chips">'+chips+'</div>'
        +'<select class="rgt-sort" onchange="rgtSort(this.value)">'
          +'<option value="featured">Recommended</option>'
          +'<option value="rating">Top rated</option>'
          +'<option value="price_asc">Price: low to high</option>'
          +'<option value="price_desc">Price: high to low</option>'
        +'</select>'
      +'</div>'
      +'<div class="rgt-count" id="rgt-count"></div>'
      +'<div class="rgt-grid" id="rgt-grid"></div>'
      +'<div class="rgt-why">'
        +'<div class="rgt-wc"><div class="ico">'+ic('shield',{size:24})+'</div><b>Handpicked trips</b><span>Verified providers &amp; real traveller reviews.</span></div>'
        +'<div class="rgt-wc"><div class="ico">'+ic('card',{size:24})+'</div><b>Secure booking</b><span>Instant confirmation &amp; safe payment.</span></div>'
        +'<div class="rgt-wc"><div class="ico">'+ic('refresh',{size:24})+'</div><b>Free cancellation</b><span>Cancel up to 24h before most trips.</span></div>'
        +'<div class="rgt-wc"><div class="ico">'+ic('headset',{size:24})+'</div><b>24/7 support</b><span>We’re here before, during &amp; after.</span></div>'
      +'</div>'
    +'</div>';
    setBody(html);renderGrid();
  }

  /* ===================== Trip detail ===================== */
  var INCLUDED=['Professional local guide / driver','Hotel pickup &amp; drop-off','All taxes &amp; service fees','Bottled water on board'];
  var NOT_INCLUDED=['Personal expenses &amp; gratuities','Optional add-on activities','Travel insurance'];
  var STEPS=[['Pickup from your hotel','Your guide meets you at the lobby at the scheduled time.'],['Enjoy the experience','Follow the planned itinerary with your expert local guide.'],['Free time &amp; photos','Relax, explore and capture the highlights at your own pace.'],['Comfortable drop-off','We bring you safely back to your hotel.']];
  var FAQ=[['Is hotel pickup included?','Yes — most internal trips include pickup and drop-off from hotels within the trip’s city. Add your hotel name at checkout.'],['Can I cancel or reschedule?','Free cancellation up to 24 hours before the start time, unless the trip states otherwise.'],['What should I bring?','Comfortable clothing, sunscreen, a hat and your booking reference. Special gear (e.g. snorkeling) is provided when relevant.'],['Are trips family friendly?','Most internal trips welcome families. Check the trip details or contact the provider for age recommendations.']];

  async function openTripDetail(id,preS){
    injectCSS();
    setBody('<div class="rgt-load">Loading…</div>');
    var s=preS;if(!s){try{s=await _api('/api/services/'+id);}catch(e){s=null;}}
    if(!s||!s.id){setBody('<div class="rgt-load">Sorry, this trip could not be loaded.</div>');return;}
    try{CUR_SVC=s;}catch(e){}try{window.CUR_SVC=s;}catch(e){}
    var reviews=[];try{reviews=await _api('/api/reviews?service_id='+id);}catch(e){}
    var similar=[];try{similar=(await _api('/api/services?cat='+encodeURIComponent(CAT_KEY))).filter(function(x){return x.id!==s.id;}).slice(0,3);}catch(e){}
    renderDetail(s,reviews||[],similar||[]);
  }
  function liList(items,cls,icon){return '<ul class="rgt-ul '+cls+'">'+items.map(function(t){return '<li><span class="ic">'+ic(icon,{size:14})+'</span><span>'+t+'</span></li>';}).join('')+'</ul>';}
  function renderDetail(s,reviews,similar){
    var imgs=(s.images&&s.images.length)?s.images:[s.cover].filter(Boolean);if(!imgs.length)imgs=[''];
    window.__rgtImgs=imgs;
    var loc=s.location||'Egypt',dur=s.duration||'Flexible',rating=Number(s.rating||0),rc=Number(s.reviews_count||reviews.length||0);
    var vname=(s.vendor&&s.vendor.name)?s.vendor.name:'RaGo verified provider';
    var av=(s.availability||[]).map(function(a){return a.date;}).filter(Boolean);
    var cancel=(s.cancel_policy&&String(s.cancel_policy).trim())?_esc(s.cancel_policy):'Free cancellation up to 24 hours before the start time.';
    var refCode=(typeof REF!=='undefined'&&REF)?REF:'';
    var gallery='<div class="rgt-dhero" id="rgt-dhero" style="background-image:url(\''+(imgs[0]||'')+'\')"></div>'
      +'<div class="rgt-gal">'+imgs.map(function(u,i){return '<div class="rgt-gth '+(i===0?'on':'')+'" style="background-image:url(\''+u+'\')" onclick="rgtHero('+i+')"></div>';}).join('')+'</div>';
    var facts='<p class="rgt-sub"><span class="it">'+starRow(rating,16)+' <b style="color:#123B4C">'+rating+'</b> <span class="rgt-mut">('+rc+' reviews)</span></span><span class="it">'+ic('pin',{size:15})+' '+_esc(loc)+'</span><span class="it">'+ic('clock',{size:15})+' '+_esc(dur)+'</span></p>';
    var datesBlock=av.length?('<div class="rgt-sec"><h3>Availability</h3><div class="rgt-dates">'+av.slice(0,12).map(function(d){return '<span class="rgt-dchip">'+ic('calendar',{size:13})+' '+_esc(d)+'</span>';}).join('')+'</div></div>'):'';
    var revList=reviews.length?reviews.map(function(r){return '<div class="rgt-rev"><div class="top"><span class="who">'+_esc(r.name||'Guest')+'</span><span class="rgt-stars">'+starRow(r.rating,13)+'</span></div><div style="color:#3a4a52;font-size:14px;line-height:1.6;margin-top:6px">'+_esc(r.comment||'')+'</div></div>';}).join(''):'<p class="rgt-lead">No reviews yet — be the first to travel and review this trip.</p>';
    var simBlock=similar.length?('<div class="rgt-sec"><h3>You might also like</h3><div class="rgt-sim">'+similar.map(cardHtml).join('')+'</div></div>'):'';
    var dateOpts='<option value="">Choose a date</option>'+av.slice(0,30).map(function(d){return '<option value="'+_esc(d)+'">'+_esc(d)+'</option>';}).join('');
    var L='<div class="rgt-crumb"><a onclick="goHome()">Home</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <a onclick="pickCat(\'internal-trips\')">Internal Trips</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <b>'+_esc(s.title)+'</b></div>'
      +'<div class="rgt-two"><div>'
      +gallery
      +'<div class="rgt-eye">'+ic('badge',{size:14})+' '+_esc(vname)+'</div>'
      +'<h1 class="rgt-h2">'+_esc(s.title)+'</h1>'+facts
      +'<div class="rgt-sec"><h3>Overview</h3><p class="rgt-lead">'+(_esc((s.description||'').trim())||('Discover '+_esc(s.title)+(loc?(' in '+_esc(loc)):'')+'.'))+'</p></div>'
      +'<div class="rgt-sec"><h3>What’s included</h3><div class="rgt-cols"><div>'+liList(INCLUDED,'rgt-yes','check')+'</div><div>'+liList(NOT_INCLUDED,'rgt-no','x')+'</div></div></div>'
      +'<div class="rgt-sec"><h3>What to expect</h3><div class="rgt-steps">'+STEPS.map(function(st,i){return '<div class="rgt-step"><div class="rgt-num">'+(i+1)+'</div><div><b>'+st[0]+'</b><span>'+st[1]+'</span></div></div>';}).join('')+'</div></div>'
      +datesBlock
      +'<div class="rgt-sec"><h3>Cancellation policy</h3><p class="rgt-lead">'+cancel+'</p></div>'
      +'<div class="rgt-sec"><h3>Your provider</h3><div class="rgt-prov"><div class="rgt-av">'+_esc((vname||'R').charAt(0).toUpperCase())+'</div><div style="flex:1"><div style="font-weight:800;color:#123B4C">'+_esc(vname)+'</div><div class="rgt-mut" style="font-size:13px">'+_esc(loc)+' · ★ '+rating+'</div></div><span class="rgt-badge2">'+ic('badge',{size:13})+' Verified</span></div></div>'
      +'<div class="rgt-sec"><h3>Frequently asked questions</h3>'+FAQ.map(function(f){return '<details class="rgt-faq"><summary>'+f[0]+ic('chevron',{size:16})+'</summary><div class="ans">'+f[1]+'</div></details>';}).join('')+'</div>'
      +'<div class="rgt-sec"><h3>Reviews ('+rc+')</h3>'+revList+'</div>'
      +simBlock
      +'</div>'
      +'<div><div class="rgt-book">'
        +(s.featured?'<span class="rgt-badge2" style="margin-bottom:12px">'+ic('award',{size:13})+' Featured trip</span><br>':'')
        +'<div class="pm">from</div><div class="p">'+_money(s.price)+' <span style="font-size:14px;color:#6b7b85;font-weight:600">/ person</span></div>'
        +'<div class="rgt-field"><label>Date</label><select id="rgt-date">'+dateOpts+'</select></div>'
        +'<div class="rgt-field"><label>Travellers</label><input id="rgt-pax" type="number" min="1" value="2"></div>'
        +'<button class="rgt-btn" onclick="rgtBook()">Book now '+ic('arrow',{size:17})+'</button>'
        +'<ul class="rgt-trust"><li>'+ic('check',{size:16})+' Instant confirmation</li><li>'+ic('check',{size:16})+' Free cancellation (24h)</li><li>'+ic('check',{size:16})+' Secure payment</li><li>'+ic('check',{size:16})+' 24/7 customer support</li></ul>'
        +(refCode?'<div class="rgt-ref">'+ic('tag',{size:14})+' Referral applied: '+_esc(refCode)+'</div>':'')
      +'</div></div></div>';
    setBody('<div id="rago-cat">'+L+'</div>');
  }

  /* ===================== global handlers ===================== */
  window.rgtOpen=function(id){openTripDetail(id).catch(function(){});};
  window.rgtDest=function(d){RGT.dest=(RGT.dest===d?'':d);syncChips();renderGrid();};
  window.rgtSort=function(v){RGT.sort=v;renderGrid();};
  window.rgtSearchInput=function(v){RGT.q=v;renderGrid();};
  window.rgtScrollGrid=function(){var g=document.getElementById('rgt-grid');if(g)g.scrollIntoView({behavior:'smooth',block:'start'});};
  window.rgtHero=function(i){var h=document.getElementById('rgt-dhero');if(h&&window.__rgtImgs)h.style.backgroundImage="url('"+window.__rgtImgs[i]+"')";var els=document.querySelectorAll('#rago-cat .rgt-gth');for(var x=0;x<els.length;x++)els[x].classList.toggle('on',x===i);};
  window.rgtBook=function(){
    if(typeof USER!=='undefined'&&!USER){if(typeof toast==='function')toast('Please log in to book');if(typeof openLogin==='function')openLogin();return;}
    var d=document.getElementById('rgt-date'),p=document.getElementById('rgt-pax');
    var bd=document.getElementById('bk-date'),bp=document.getElementById('bk-pax');
    if(bd)bd.value=d?d.value:'';if(bp)bp.value=(p&&p.value)?p.value:1;
    if(typeof submitBooking==='function')submitBooking();else if(typeof openBooking==='function')openBooking();
  };
  window.openCategory=openCategory;
  window.openTripDetail=openTripDetail;

  /* ===================== hooks (additive) ===================== */
  var _pickCat=window.pickCat;
  window.pickCat=function(k){
    if(k===CAT_KEY){try{CUR_CAT=k;}catch(e){}openCategory().catch(function(){});return;}
    return (typeof _pickCat==='function')?_pickCat.apply(this,arguments):undefined;
  };
  var _openDetail=window.openDetail;
  window.openDetail=function(id){
    var args=arguments,self=this;
    return (async function(){
      try{
        var s=await _api('/api/services/'+id);
        var cats=(typeof ensureCats==='function')?await ensureCats():await _api('/api/categories');
        var cat=(cats||[]).find(function(c){return c.id===s.category_id;});
        if(cat&&cat.key===CAT_KEY){return openTripDetail(id,s);}
      }catch(e){}
      return (typeof _openDetail==='function')?_openDetail.apply(self,args):undefined;
    })();
  };
})();
