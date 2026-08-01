/* RaGo — Internal Trips category page (v1)
 * Self-contained & additive. Renders a dedicated professional page for the
 * "internal-trips" category + a professional detail page for each trip.
 * Hooks pickCat() and openDetail() WITHOUT modifying any core file. */
(function(){
  'use strict';
  var CAT_KEY='internal-trips';
  var RGT={dest:'',q:'',sort:'featured'};
  var _all=[];

  function _esc(s){try{return (typeof esc==='function')?esc(s):String(s==null?'':s);}catch(e){return String(s==null?'':s);}}
  function _money(n){try{return (typeof money==='function')?money(n):('$'+Number(n||0).toLocaleString());}catch(e){return '$'+Number(n||0).toLocaleString();}}
  function _api(p,o){return api(p,o);}
  function stars(r){r=Math.round(Number(r)||0);var s='';for(var i=1;i<=5;i++)s+=(i<=r?'★':'☆');return s;}
  function setBody(html){var el=document.getElementById('detail-body');if(el)el.innerHTML=html;if(typeof show==='function')show('detail-view');window.scrollTo(0,0);}

  var CSS=`
  #rago-cat{max-width:1160px;margin:0 auto;padding:0 4px 60px}
  #rago-cat *{box-sizing:border-box}
  .rgt-crumb{font-size:13px;color:#6b7b85;margin:16px 0 14px}
  .rgt-crumb a{color:#123B4C;text-decoration:none;font-weight:700;cursor:pointer}
  .rgt-hero{position:relative;border-radius:22px;overflow:hidden;margin-bottom:22px;background:linear-gradient(135deg,#0C2A36,#1C4E63);color:#fff;padding:46px 32px}
  .rgt-hero:before{content:'';position:absolute;inset:0;background:url('/img/redsea.png') center/cover;opacity:.30}
  .rgt-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(12,42,54,.86),rgba(28,78,99,.62))}
  .rgt-hero>*{position:relative;z-index:2}
  .rgt-hero h1{margin:0 0 10px;font-size:33px;font-weight:900;letter-spacing:-.6px}
  .rgt-hero p{margin:0;font-size:16px;opacity:.94;max-width:660px;line-height:1.55}
  .rgt-hsearch{margin-top:22px;display:flex;gap:10px;max-width:540px}
  .rgt-hsearch input{flex:1;border:none;border-radius:12px;padding:15px 16px;font-size:15px;outline:none}
  .rgt-filter{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
  .rgt-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;flex:1}
  .rgt-chip{white-space:nowrap;border:1.5px solid #dfe7ea;background:#fff;color:#123B4C;padding:9px 15px;border-radius:999px;font-size:13.5px;font-weight:700;cursor:pointer;transition:.15s}
  .rgt-chip:hover{border-color:#123B4C}
  .rgt-chip.on{background:#123B4C;color:#fff;border-color:#123B4C}
  .rgt-sort{border:1.5px solid #dfe7ea;border-radius:12px;padding:11px 12px;font-size:14px;background:#fff;color:#123B4C;font-weight:700;cursor:pointer}
  .rgt-count{font-size:13.5px;color:#6b7b85;margin:0 0 14px;font-weight:600}
  .rgt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .rgt-card{background:#fff;border:1px solid #eef2f4;border-radius:18px;overflow:hidden;cursor:pointer;box-shadow:0 2px 10px rgba(18,59,76,.05);transition:transform .18s,box-shadow .18s}
  .rgt-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(18,59,76,.14)}
  .rgt-img{height:190px;background:#e6eef1 center/cover;position:relative}
  .rgt-badge{position:absolute;top:12px;left:12px;background:#E8850F;color:#fff;font-size:12px;font-weight:800;padding:5px 11px;border-radius:999px}
  .rgt-dur{position:absolute;bottom:12px;right:12px;background:rgba(12,42,54,.82);color:#fff;font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px}
  .rgt-cb{padding:15px 16px 17px}
  .rgt-loc{font-size:12.5px;color:#6b7b85;font-weight:700}
  .rgt-title{font-size:17px;font-weight:800;color:#123B4C;margin:5px 0 8px;line-height:1.32}
  .rgt-rate{font-size:13px;color:#123B4C;font-weight:700}
  .rgt-stars{color:#E8850F;letter-spacing:1px}
  .rgt-mut{color:#8a97a0;font-weight:500}
  .rgt-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #f0f3f5}
  .rgt-price{color:#123B4C;font-size:18px;font-weight:900}
  .rgt-view{color:#E8850F;font-weight:800;font-size:13px}
  .rgt-load{padding:70px 20px;text-align:center;color:#6b7b85;font-weight:700}
  .rgt-empty{grid-column:1/-1;padding:40px;text-align:center;color:#8a97a0}
  .rgt-why{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:40px}
  .rgt-wc{background:#f7fafb;border-radius:14px;padding:20px 16px;text-align:center}
  .rgt-wc .e{font-size:26px}
  .rgt-wc b{display:block;color:#123B4C;font-size:14.5px;margin:8px 0 4px}
  .rgt-wc span{font-size:12.5px;color:#6b7b85;line-height:1.5}
  /* ---- detail ---- */
  .rgt-two{display:grid;grid-template-columns:1fr 360px;gap:32px;align-items:start;margin-top:8px}
  .rgt-dhero{height:390px;border-radius:20px;background:#e6eef1 center/cover}
  .rgt-gal{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
  .rgt-gth{width:92px;height:66px;border-radius:10px;background:#e6eef1 center/cover;cursor:pointer;opacity:.65;border:2px solid transparent;transition:.15s}
  .rgt-gth.on,.rgt-gth:hover{opacity:1;border-color:#E8850F}
  .rgt-eye{color:#E8850F;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin-top:14px}
  .rgt-h2{font-size:28px;font-weight:900;color:#123B4C;margin:4px 0 8px;line-height:1.2}
  .rgt-sub{color:#6b7b85;font-size:14px;margin:0}
  .rgt-sub .rgt-stars{font-size:15px}
  .rgt-sec{margin-top:28px}
  .rgt-sec h3{font-size:19px;font-weight:800;color:#123B4C;margin:0 0 12px}
  .rgt-lead{color:#3a4a52;line-height:1.75;font-size:15px;margin:0}
  .rgt-ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
  .rgt-ul li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:#3a4a52;line-height:1.5}
  .rgt-ul li .ic{font-weight:900;flex:none;margin-top:1px}
  .rgt-yes .ic{color:#2E8B7B}.rgt-no .ic{color:#E05544}
  .rgt-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .rgt-steps{display:grid;gap:14px}
  .rgt-step{display:flex;gap:14px;align-items:flex-start}
  .rgt-num{flex:none;width:30px;height:30px;border-radius:50%;background:#123B4C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
  .rgt-step b{color:#123B4C;font-size:15px}.rgt-step span{display:block;color:#6b7b85;font-size:13.5px;margin-top:2px}
  .rgt-dates{display:flex;gap:8px;flex-wrap:wrap}
  .rgt-dchip{background:#E6EEF1;color:#123B4C;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:700}
  .rgt-prov{display:flex;gap:14px;align-items:center;background:#f7fafb;border-radius:14px;padding:16px}
  .rgt-av{flex:none;width:48px;height:48px;border-radius:50%;background:#123B4C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px}
  .rgt-badge2{background:#E6EEF1;color:#2E8B7B;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px}
  .rgt-rev{border:1px solid #eef2f4;border-radius:12px;padding:14px;margin-bottom:10px}
  .rgt-rev .top{display:flex;justify-content:space-between;font-size:13.5px}
  .rgt-rev .who{font-weight:800;color:#123B4C}
  .rgt-faq{border:1px solid #eef2f4;border-radius:12px;padding:0 15px;margin-bottom:9px}
  .rgt-faq summary{padding:14px 0;font-weight:700;color:#123B4C;cursor:pointer;list-style:none}
  .rgt-faq summary::-webkit-details-marker{display:none}
  .rgt-faq[open] summary{color:#E8850F}
  .rgt-faq div{padding:0 0 14px;color:#3a4a52;font-size:14px;line-height:1.65}
  .rgt-book{position:sticky;top:16px;background:#fff;border:1px solid #eef2f4;border-radius:18px;padding:22px;box-shadow:0 12px 32px rgba(18,59,76,.10)}
  .rgt-book .p{font-size:31px;font-weight:900;color:#123B4C;line-height:1}
  .rgt-book .pm{color:#6b7b85;font-size:13px;margin-bottom:4px}
  .rgt-field{margin:13px 0}
  .rgt-field label{display:block;font-size:12px;font-weight:800;color:#6b7b85;margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px}
  .rgt-field input,.rgt-field select{width:100%;border:1.5px solid #dfe7ea;border-radius:10px;padding:12px;font-size:14px}
  .rgt-btn{width:100%;background:#E8850F;color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:800;cursor:pointer;margin-top:4px;transition:.15s}
  .rgt-btn:hover{background:#cf7409}
  .rgt-trust{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:9px}
  .rgt-trust li{font-size:13px;color:#3a4a52;display:flex;gap:9px;align-items:center}
  .rgt-trust .ic{color:#2E8B7B;font-weight:900}
  .rgt-ref{margin-top:14px;background:#FFF4E6;color:#8a5a1e;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:700}
  .rgt-sim{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  @media(max-width:900px){.rgt-grid{grid-template-columns:repeat(2,1fr)}.rgt-why{grid-template-columns:repeat(2,1fr)}.rgt-two{grid-template-columns:1fr}.rgt-dhero{height:260px}.rgt-book{position:static}.rgt-cols{grid-template-columns:1fr}.rgt-sim{grid-template-columns:1fr}}
  @media(max-width:600px){.rgt-grid{grid-template-columns:1fr}.rgt-hero h1{font-size:26px}}
  `;
  function injectCSS(){if(document.getElementById('rgt-css'))return;var st=document.createElement('style');st.id='rgt-css';st.textContent=CSS;(document.head||document.documentElement).appendChild(st);}

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
        +(s.featured?'<span class="rgt-badge">★ Featured</span>':'')
        +(s.duration?'<span class="rgt-dur">⏱ '+_esc(s.duration)+'</span>':'')
      +'</div>'
      +'<div class="rgt-cb">'
        +'<div class="rgt-loc">📍 '+_esc(s.location||'Egypt')+'</div>'
        +'<div class="rgt-title">'+_esc(s.title)+'</div>'
        +'<div class="rgt-rate"><span class="rgt-stars">'+stars(s.rating)+'</span> '+(s.rating||0)+' <span class="rgt-mut">('+(s.reviews_count||0)+')</span></div>'
        +'<div class="rgt-foot"><div><span class="rgt-mut">from</span> <b class="rgt-price">'+_money(s.price)+'</b> <span class="rgt-mut">/ person</span></div><span class="rgt-view">View →</span></div>'
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
      +'<div class="rgt-crumb"><a onclick="goHome()">Home</a> › <b>Internal Trips</b></div>'
      +'<div class="rgt-hero"><h1>Internal Trips across Egypt</h1>'
        +'<p>Day trips, excursions and unforgettable experiences — from Red Sea snorkeling and desert safaris to Luxor and the Pyramids. Handpicked, guided, and bookable in seconds.</p>'
        +'<div class="rgt-hsearch"><input id="rgt-q" placeholder="Search trips, e.g. Luxor, diving, safari…" oninput="rgtSearchInput(this.value)"></div>'
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
        +'<div class="rgt-wc"><div class="e">✅</div><b>Handpicked trips</b><span>Verified providers &amp; real traveller reviews.</span></div>'
        +'<div class="rgt-wc"><div class="e">💳</div><b>Secure booking</b><span>Instant confirmation &amp; safe payment.</span></div>'
        +'<div class="rgt-wc"><div class="e">🔄</div><b>Free cancellation</b><span>Cancel up to 24h before most trips.</span></div>'
        +'<div class="rgt-wc"><div class="e">🌐</div><b>24/7 support</b><span>We’re here before, during &amp; after.</span></div>'
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
  function liList(items,cls,ic){return '<ul class="rgt-ul '+cls+'">'+items.map(function(t){return '<li><span class="ic">'+ic+'</span><span>'+t+'</span></li>';}).join('')+'</ul>';}
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
    var facts='<p class="rgt-sub"><span class="rgt-stars">'+stars(rating)+'</span> <b style="color:#123B4C">'+rating+'</b> ('+rc+' reviews) &nbsp;·&nbsp; 📍 '+_esc(loc)+' &nbsp;·&nbsp; ⏱ '+_esc(dur)+'</p>';
    var datesBlock=av.length?('<div class="rgt-sec"><h3>Availability</h3><div class="rgt-dates">'+av.slice(0,12).map(function(d){return '<span class="rgt-dchip">'+_esc(d)+'</span>';}).join('')+'</div></div>'):'';
    var revList=reviews.length?reviews.map(function(r){return '<div class="rgt-rev"><div class="top"><span class="who">'+_esc(r.name||'Guest')+'</span><span class="rgt-stars">★ '+(r.rating!=null?r.rating:'')+'</span></div><div style="color:#3a4a52;font-size:14px;line-height:1.6;margin-top:5px">'+_esc(r.comment||'')+'</div></div>';}).join(''):'<p class="rgt-lead">No reviews yet — be the first to travel and review this trip.</p>';
    var simBlock=similar.length?('<div class="rgt-sec"><h3>You might also like</h3><div class="rgt-sim">'+similar.map(cardHtml).join('')+'</div></div>'):'';
    var dateOpts='<option value="">Choose a date</option>'+av.slice(0,30).map(function(d){return '<option value="'+_esc(d)+'">'+_esc(d)+'</option>';}).join('');
    var L='<div class="rgt-crumb"><a onclick="goHome()">Home</a> › <a onclick="pickCat(\'internal-trips\')">Internal Trips</a> › <b>'+_esc(s.title)+'</b></div>'
      +'<div class="rgt-two"><div>'
      +gallery
      +'<div class="rgt-eye">'+_esc(vname)+'</div>'
      +'<h1 class="rgt-h2">'+_esc(s.title)+'</h1>'+facts
      +'<div class="rgt-sec"><h3>Overview</h3><p class="rgt-lead">'+(_esc((s.description||'').trim())||('Discover '+_esc(s.title)+(loc?(' in '+_esc(loc)):'')+'.'))+'</p></div>'
      +'<div class="rgt-sec"><h3>What’s included</h3><div class="rgt-cols"><div>'+liList(INCLUDED,'rgt-yes','✓')+'</div><div>'+liList(NOT_INCLUDED,'rgt-no','✕')+'</div></div></div>'
      +'<div class="rgt-sec"><h3>What to expect</h3><div class="rgt-steps">'+STEPS.map(function(st,i){return '<div class="rgt-step"><div class="rgt-num">'+(i+1)+'</div><div><b>'+st[0]+'</b><span>'+st[1]+'</span></div></div>';}).join('')+'</div></div>'
      +datesBlock
      +'<div class="rgt-sec"><h3>Cancellation policy</h3><p class="rgt-lead">'+cancel+'</p></div>'
      +'<div class="rgt-sec"><h3>Your provider</h3><div class="rgt-prov"><div class="rgt-av">'+_esc((vname||'R').charAt(0).toUpperCase())+'</div><div style="flex:1"><div style="font-weight:800;color:#123B4C">'+_esc(vname)+'</div><div class="rgt-mut" style="font-size:13px">'+_esc(loc)+' · ★ '+rating+'</div></div><span class="rgt-badge2">✓ Verified</span></div></div>'
      +'<div class="rgt-sec"><h3>Frequently asked questions</h3>'+FAQ.map(function(f){return '<details class="rgt-faq"><summary>'+f[0]+'</summary><div>'+f[1]+'</div></details>';}).join('')+'</div>'
      +'<div class="rgt-sec"><h3>Reviews ('+rc+')</h3>'+revList+'</div>'
      +simBlock
      +'</div>'
      +'<div><div class="rgt-book">'
        +(s.featured?'<span class="rgt-badge2" style="margin-bottom:10px;display:inline-block">★ Featured trip</span><br>':'')
        +'<div class="pm">from</div><div class="p">'+_money(s.price)+' <span style="font-size:14px;color:#6b7b85;font-weight:600">/ person</span></div>'
        +'<div class="rgt-field"><label>Date</label><select id="rgt-date">'+dateOpts+'</select></div>'
        +'<div class="rgt-field"><label>Travellers</label><input id="rgt-pax" type="number" min="1" value="2"></div>'
        +'<button class="rgt-btn" onclick="rgtBook()">Book now</button>'
        +'<ul class="rgt-trust"><li><span class="ic">✓</span> Instant confirmation</li><li><span class="ic">✓</span> Free cancellation (24h)</li><li><span class="ic">✓</span> Secure payment</li><li><span class="ic">✓</span> 24/7 customer support</li></ul>'
        +(refCode?'<div class="rgt-ref">🏷 Referral applied: '+_esc(refCode)+'</div>':'')
      +'</div></div></div>';
    setBody('<div id="rago-cat">'+L+'</div>');
  }

  /* ===================== global handlers ===================== */
  window.rgtOpen=function(id){openTripDetail(id).catch(function(){});};
  window.rgtDest=function(d){RGT.dest=(RGT.dest===d?'':d);syncChips();renderGrid();};
  window.rgtSort=function(v){RGT.sort=v;renderGrid();};
  window.rgtSearchInput=function(v){RGT.q=v;renderGrid();};
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
