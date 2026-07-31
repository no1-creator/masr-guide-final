/* RaGo - Transport Service Detail Renderer.
 * Professional pages for: airport, transfers, carrental, departure.
 * Each sub-type has its own UI, stats strip, meeting-point logic and
 * booking form. Registers into window.RAGO_RENDERERS (set up by pro.js).
 * Additive & safe - no existing code modified. */
(function(){
  'use strict';
  var CSS='.sdp-tr{padding:0 0 40px;font-family:inherit}'
    +'.sdp-tr-badge{display:inline-flex;align-items:center;gap:6px;background:var(--blue-soft,#E6EEF1);color:var(--blue,#123B4C);font-size:11.5px;font-weight:800;padding:4px 12px;border-radius:20px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.7px}'
    +'.sdp-tr-title{font-size:27px;font-weight:900;color:var(--text,#1B2A30);margin:4px 0 8px;line-height:1.2}'
    +'.sdp-tr-meta{font-size:14px;color:var(--text2,#6B7B85);margin-bottom:16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
    +'.sdp-tr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:var(--soft,#F7F9FA);border-radius:14px;padding:16px;margin:14px 0}'
    +'.sdp-tr-stat{text-align:center;padding:6px 2px}'
    +'.sdp-tr-stat svg{width:22px;height:22px;color:var(--blue,#123B4C);display:block;margin:0 auto 6px}'
    +'.sdp-tr-stat b{display:block;font-size:13px;font-weight:800;color:var(--text,#1B2A30);margin-bottom:2px}'
    +'.sdp-tr-stat em{font-style:normal;font-size:11.5px;color:var(--text2,#6B7B85)}'
    +'.sdp-tr-hero{width:100%;height:240px;border-radius:14px;overflow:hidden;margin:14px 0;background:var(--soft2,#EDF1F2) no-repeat center/cover;position:relative}'
    +'.sdp-tr-gallery{display:flex;gap:6px;padding:8px 10px;position:absolute;bottom:0;left:0;right:0;overflow-x:auto;background:linear-gradient(transparent,rgba(0,0,0,.35))}'
    +'.sdp-tr-th{min-width:56px;height:40px;border-radius:7px;border:2px solid rgba(255,255,255,.5);background-size:cover;background-position:center;cursor:pointer;flex:0 0 auto;transition:border-color .15s}'
    +'.sdp-tr-th.on{border-color:#fff}'
    +'.sdp-tr-sec{margin:22px 0}'
    +'.sdp-tr-sec>h3{font-size:16px;font-weight:800;color:var(--text,#1B2A30);margin:0 0 14px;padding-bottom:9px;border-bottom:2px solid var(--soft2,#EDF1F2)}'
    +'.sdp-tr-steps{display:flex;flex-direction:column;gap:10px}'
    +'.sdp-tr-step{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:var(--soft,#F7F9FA);border-radius:12px;border-left:3px solid var(--blue,#123B4C)}'
    +'.sdp-tr-step-n{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#123B4C),#0E2E3B);color:#fff;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 4px 10px rgba(18,59,76,.22)}'
    +'.sdp-tr-step b{display:block;font-size:14.5px;font-weight:800;color:var(--text,#1B2A30);margin-bottom:2px}'
    +'.sdp-tr-step span{font-size:13px;color:var(--text2,#6B7B85);line-height:1.55;display:block}'
    +'.sdp-tr-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0}'
    +'.sdp-tr-incl{background:#f0faf8;border:1.5px solid #b7e5d7;border-radius:13px;padding:14px}'
    +'.sdp-tr-excl{background:#fff5f5;border:1.5px solid #ffd0d0;border-radius:13px;padding:14px}'
    +'.sdp-tr-incl h4{color:#2E8B7B;font-size:13px;font-weight:800;margin:0 0 10px}'
    +'.sdp-tr-excl h4{color:#E05544;font-size:13px;font-weight:800;margin:0 0 10px}'
    +'.sdp-tr-ul{list-style:none;margin:0;padding:0}'
    +'.sdp-tr-ul li{display:flex;align-items:flex-start;gap:7px;font-size:13.5px;padding:4px 0;color:var(--text,#1B2A30);line-height:1.4}'
    +'.sdp-tr-ul li .tic{flex:0 0 auto;font-size:12px;margin-top:2px}'
    +'.sdp-tr-meet{background:linear-gradient(135deg,#eef5ff,#ddeaff);border:1.5px solid #b8d4ff;border-radius:14px;padding:18px;margin:16px 0}'
    +'.sdp-tr-meet h4{font-size:15px;font-weight:800;color:var(--blue,#123B4C);margin:0 0 8px}'
    +'.sdp-tr-meet p{font-size:14px;color:var(--text,#1B2A30);margin:0;line-height:1.75}'
    +'.sdp-tr-frow{margin-bottom:14px}'
    +'.sdp-tr-frow label{display:block;font-size:11px;font-weight:800;color:var(--text2,#6B7B85);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}'
    +'.sdp-tr-frow input,.sdp-tr-frow select{width:100%;padding:11px 14px;border:1.5px solid var(--border,#E4E7E9);border-radius:10px;font-size:14px;background:#fff;color:var(--text,#1B2A30);box-sizing:border-box;outline:none;transition:border-color .15s,box-shadow .15s}'
    +'.sdp-tr-frow input:focus,.sdp-tr-frow select:focus{border-color:var(--blue,#123B4C);box-shadow:0 0 0 3px rgba(18,59,76,.08)}'
    +'.sdp-tr-book-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--blue,#123B4C),#0E2E3B);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:.3px;box-shadow:0 8px 22px rgba(18,59,76,.28);transition:filter .15s,transform .15s;margin-top:4px}'
    +'.sdp-tr-book-btn:hover{filter:brightness(1.09);transform:translateY(-1px)}'
    +'.sdp-tr-gtk{display:flex;flex-direction:column;gap:8px}'
    +'.sdp-tr-gtki{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--text,#1B2A30);padding:10px 13px;background:var(--soft,#F7F9FA);border-radius:10px;line-height:1.55}'
    +'.sdp-tr-faq details{border:1.5px solid var(--border,#E4E7E9);border-radius:10px;margin-bottom:8px;overflow:hidden}'
    +'.sdp-tr-faq summary{padding:13px 16px;font-size:14px;font-weight:700;color:var(--text,#1B2A30);cursor:pointer;list-style:none;user-select:none}'
    +'.sdp-tr-faq summary::-webkit-details-marker{display:none}'
    +'.sdp-tr-faq details[open] summary{background:var(--soft,#F7F9FA);border-bottom:1px solid var(--border,#E4E7E9)}'
    +'.sdp-tr-faq details div{padding:13px 16px;font-size:13.5px;color:var(--text2,#6B7B85);line-height:1.7}'
    +'.sdp-tr-prov{display:flex;align-items:center;gap:14px;padding:16px;background:var(--soft,#F7F9FA);border-radius:14px}'
    +'.sdp-tr-prov-av{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#123B4C),#0E2E3B);color:#fff;font-size:19px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:0 0 auto}'
    +'.sdp-tr-vbadge{background:#eafff4;color:#2E8B7B;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid #b5e7d2;white-space:nowrap}'
    +'.sdp-tr-revsum{display:flex;align-items:center;gap:20px;padding:16px;background:var(--soft,#F7F9FA);border-radius:14px;margin-bottom:14px}'
    +'.sdp-tr-revnum .rn{font-size:44px;font-weight:900;color:var(--text,#1B2A30);line-height:1}'
    +'.sdp-tr-revnum .rs{font-size:18px;color:var(--gold,#E8850F)}'
    +'.sdp-tr-bars{flex:1}'
    +'.sdp-tr-bar{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:5px}'
    +'.sdp-tr-bar span{width:22px;text-align:right;color:var(--text2)}'
    +'.sdp-tr-bar i{flex:1;height:7px;background:var(--border,#E4E7E9);border-radius:4px;overflow:hidden;font-style:normal;display:block}'
    +'.sdp-tr-bar i b{display:block;height:100%;background:var(--gold,#E8850F);border-radius:4px}'
    +'.sdp-tr-bar em{width:24px;font-style:normal;color:var(--text2);text-align:right}'
    +'.sdp-tr-rev{padding:14px 0;border-bottom:1px solid var(--border,#E4E7E9)}'
    +'.sdp-tr-rev:last-child{border-bottom:none}'
    +'.sdp-tr-rev .rw{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}'
    +'.sdp-tr-rev .who{font-weight:700;color:var(--text,#1B2A30);font-size:14px}'
    +'.sdp-tr-rev .rn2{color:var(--gold,#E8850F);font-size:13.5px}'
    +'.sdp-tr-rev .cm{font-size:13.5px;color:var(--text2,#6B7B85);line-height:1.6}'
    +'.sdp-tr-sim{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}'
    +'.sdp-tr-simc{background:#fff;border:1.5px solid var(--border,#E4E7E9);border-radius:12px;overflow:hidden;cursor:pointer;transition:box-shadow .15s,transform .15s}'
    +'.sdp-tr-simc:hover{box-shadow:0 8px 24px rgba(18,59,76,.1);transform:translateY(-2px)}'
    +'.sdp-tr-simc .im{height:88px;background-size:cover;background-position:center;background-color:var(--soft)}'
    +'.sdp-tr-simc .bd{padding:10px}'
    +'.sdp-tr-simc .t{font-size:13px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:4px}'
    +'.sdp-tr-simc .sr{display:flex;justify-content:space-between;align-items:center;margin-top:6px}'
    +'.sdp-tr-trust{list-style:none;margin:14px 0 0;padding:0}'
    +'.sdp-tr-trust li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);padding:5px 0;border-bottom:1px solid var(--soft2,#EDF1F2)}'
    +'.sdp-tr-trust li:last-child{border-bottom:none}'
    +'.sdp-tr-trust .tic{color:var(--green,#2E8B7B);font-weight:800;font-size:14px}'
    +'@media(max-width:640px){.sdp-tr-stats{grid-template-columns:repeat(2,1fr)}.sdp-tr-cols{grid-template-columns:1fr}.sdp-tr-sim{grid-template-columns:1fr 1fr}}';

  function injectCSS(){
    if(document.getElementById('sdp-tr-css'))return;
    var s=document.createElement('style');s.id='sdp-tr-css';s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }
  function ee(s){return typeof window.esc==='function'?window.esc(s):String(s==null?'':s);}
  function mn(n){return typeof window.money==='function'?window.money(n):'$'+Number(n||0).toLocaleString();}
  function ic(n){return typeof window.iconSvg==='function'?window.iconSvg(n):''}
  function st(r){r=Math.round(Number(r)||0);var s='';for(var i=1;i<=5;i++)s+=(i<=r?'&#9733;':'&#9734;');return s;}

  function sub(k){
    if(k==='airport')return 'airport';
    if(k==='departure')return 'departure';
    if(k==='carrental')return 'carrental';
    return 'transfer';
  }
  function badge(sb){
    if(sb==='airport')return {em:'&#9992;&#65039;',lb:'Airport Services'};
    if(sb==='departure')return {em:'&#128747;&#65039;',lb:'Departure Assist'};
    if(sb==='carrental')return {em:'&#128663;',lb:'Car Rental'};
    return {em:'&#128652;',lb:'Transfer Services'};
  }

  function statsHtml(svc,sb){
    var dur=ee(svc.duration||'Flexible');
    var loc=ee(svc.location||'Egypt');
    var rows;
    if(sb==='airport'){
      rows=[
        {ic:'plane',b:'Flight tracked',em:'Auto-monitor'},
        {ic:'user',b:'Name sign',em:'Meet &amp; Greet'},
        {ic:'compass',b:dur,em:'Duration'},
        {ic:'shield',b:'24/7',em:'Available'}
      ];
    }else if(sb==='departure'){
      rows=[
        {ic:'luggage',b:'Hotel pickup',em:'Door-to-door'},
        {ic:'plane',b:'On-time',em:'Guaranteed'},
        {ic:'compass',b:dur,em:'Duration'},
        {ic:'shield',b:'24/7',em:'Available'}
      ];
    }else if(sb==='carrental'){
      rows=[
        {ic:'car',b:'Self-drive',em:'Your freedom'},
        {ic:'compass',b:loc,em:'Location'},
        {ic:'compass',b:dur,em:'Duration'},
        {ic:'shield',b:'Insured',em:'Licensed'}
      ];
    }else{
      rows=[
        {ic:'car',b:'Private vehicle',em:'Only yours'},
        {ic:'users',b:'Up to 6',em:'Passengers'},
        {ic:'compass',b:dur,em:'Duration'},
        {ic:'shield',b:'Licensed',em:'Insured driver'}
      ];
    }
    return '<div class="sdp-tr-stats">'+rows.map(function(r){
      return '<div class="sdp-tr-stat">'+ic(r.ic)+'<b>'+r.b+'</b><em>'+r.em+'</em></div>';
    }).join('')+'</div>';
  }

  function stepsHtml(steps){
    return '<div class="sdp-tr-steps">'+(steps||[]).map(function(s,i){
      var p=s.split('|');
      return '<div class="sdp-tr-step"><div class="sdp-tr-step-n">'+(i+1)+'</div>'
        +'<div><b>'+ee(p[0])+'</b>'+(p[1]?'<span>'+ee(p[1])+'</span>':'')+'</div></div>';
    }).join('')+'</div>';
  }

  function inclHtml(c){
    var yes=c.included||[];var no=c.notIncluded||[];
    return '<div class="sdp-tr-cols">'
      +'<div class="sdp-tr-incl"><h4>&#10003; What\'s included</h4><ul class="sdp-tr-ul">'
      +yes.map(function(t){return '<li><span class="tic">&#10003;</span><span>'+ee(t)+'</span></li>';}).join('')
      +'</ul></div>'
      +'<div class="sdp-tr-excl"><h4>&#10007; Not included</h4><ul class="sdp-tr-ul">'
      +no.map(function(t){return '<li><span class="tic">&#10007;</span><span>'+ee(t)+'</span></li>';}).join('')
      +'</ul></div></div>';
  }

  function meetHtml(sb,loc){
    var mp='';
    if(sb==='airport') mp='Your driver meets you at the <b>Arrivals Hall</b> holding a sign with your name. Flight delays are tracked automatically &mdash; no extra charge and no waiting, regardless of how late your flight lands.';
    else if(sb==='departure') mp='Your driver picks you up from your <b>hotel lobby</b> at the confirmed time and takes you directly to the departure terminal. We recommend departing at least 3 hours before international flights.';
    else if(sb==='carrental') mp='Collect your vehicle at our <b>branch or request hotel delivery</b> (if available). Bring your valid driving licence and booking confirmation. A deposit may be held at pickup.';
    else mp='Your private driver meets you at the <b>agreed pickup point</b>. Their name and contact details are sent to you before the transfer begins.';
    return '<div class="sdp-tr-meet"><h4>&#128205; Meeting point &amp; logistics</h4><p>'+mp+'</p></div>';
  }

  function formHtml(sb,svc){
    var price=mn(svc.price);
    var fields='';
    var unit=sb==='carrental'?'per day':'per transfer';
    if(sb==='airport'){
      fields='<div class="sdp-tr-frow"><label>Arrival date</label><input type="date" class="sdp-tf-date"></div>'
        +'<div class="sdp-tr-frow"><label>Flight arrival time</label><input type="time" class="sdp-tf-time"></div>'
        +'<div class="sdp-tr-frow"><label>Flight number</label><input type="text" class="sdp-tf-fn" placeholder="e.g. MS 777"></div>'
        +'<div class="sdp-tr-frow"><label>Passengers</label><select class="sdp-tf-pax"><option>1 passenger</option><option>2 passengers</option><option>3 passengers</option><option>4 passengers</option><option>5+ passengers</option></select></div>'
        +'<div class="sdp-tr-frow"><label>Hotel / drop-off address</label><input type="text" class="sdp-tf-drop" placeholder="Hotel name or full address"></div>';
    }else if(sb==='departure'){
      fields='<div class="sdp-tr-frow"><label>Travel date</label><input type="date" class="sdp-tf-date"></div>'
        +'<div class="sdp-tr-frow"><label>Flight departure time</label><input type="time" class="sdp-tf-time"></div>'
        +'<div class="sdp-tr-frow"><label>Flight number</label><input type="text" class="sdp-tf-fn" placeholder="e.g. MS 778"></div>'
        +'<div class="sdp-tr-frow"><label>Passengers</label><select class="sdp-tf-pax"><option>1 passenger</option><option>2 passengers</option><option>3 passengers</option><option>4 passengers</option><option>5+ passengers</option></select></div>'
        +'<div class="sdp-tr-frow"><label>Pickup hotel / address</label><input type="text" class="sdp-tf-pick" placeholder="Your hotel name or address"></div>';
    }else if(sb==='carrental'){
      fields='<div class="sdp-tr-frow"><label>Pickup date</label><input type="date" class="sdp-tf-date"></div>'
        +'<div class="sdp-tr-frow"><label>Return date</label><input type="date" class="sdp-tf-date2"></div>'
        +'<div class="sdp-tr-frow"><label>Pickup location</label><input type="text" class="sdp-tf-pick" placeholder="Hotel, airport or address"></div>'
        +'<div class="sdp-tr-frow"><label>Car preference</label><select class="sdp-tf-car"><option>Economy sedan (1-4 pax)</option><option>Mid-size sedan (1-4 pax)</option><option>SUV (1-6 pax)</option><option>Minivan (7+ pax)</option><option>No preference</option></select></div>';
    }else{
      fields='<div class="sdp-tr-frow"><label>Transfer date</label><input type="date" class="sdp-tf-date"></div>'
        +'<div class="sdp-tr-frow"><label>Pickup time</label><input type="time" class="sdp-tf-time"></div>'
        +'<div class="sdp-tr-frow"><label>From - pickup point</label><input type="text" class="sdp-tf-from" placeholder="Hotel name or address"></div>'
        +'<div class="sdp-tr-frow"><label>To - destination</label><input type="text" class="sdp-tf-to" placeholder="City, hotel or address"></div>'
        +'<div class="sdp-tr-frow"><label>Passengers</label><select class="sdp-tf-pax"><option>1 passenger</option><option>2 passengers</option><option>3 passengers</option><option>4 passengers</option><option>5+ passengers</option></select></div>';
    }
    return '<div style="margin-bottom:10px;font-size:15px;font-weight:800;color:var(--text)">Booking details</div>'
      +'<div style="font-size:26px;font-weight:900;color:var(--blue);margin-bottom:2px">'+price+'</div>'
      +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+unit+'</div>'
      +fields
      +'<button class="sdp-tr-book-btn" onclick="window.openBooking&&window.openBooking()">Confirm &amp; Book &rarr;</button>';
  }

  function gtkHtml(c){
    return '<div class="sdp-tr-gtk">'+(c.goodToKnow||[]).map(function(t){
      return '<div class="sdp-tr-gtki"><span>&#8505;</span><span>'+ee(t)+'</span></div>';
    }).join('')+'</div>';
  }

  function faqHtml(c){
    return '<div class="sdp-tr-faq">'+(c.faq||[]).map(function(f){
      return '<details><summary>'+ee(f.q)+'</summary><div>'+ee(f.a)+'</div></details>';
    }).join('')+'</div>';
  }

  function revBars(reviews){
    var cnt=[0,0,0,0,0];
    reviews.forEach(function(r){var k=Math.round(Number(r.rating)||0);if(k>=1&&k<=5)cnt[k-1]++;});
    var tot=reviews.length||1;var h='';
    for(var i=5;i>=1;i--){
      var pct=Math.round(cnt[i-1]/tot*100);
      h+='<div class="sdp-tr-bar"><span>'+i+'</span><i><b style="width:'+pct+'%"></b></i><em>'+cnt[i-1]+'</em></div>';
    }
    return h;
  }

  function render(svc,cat,reviews,similar,c){
    injectCSS();
    if(!c)c={};
    var key=cat?cat.key:'transfers';
    var sb=sub(key);
    var bg=badge(sb);
    var loc=svc.location||'Egypt';
    var rating=Number(svc.rating||0);
    var rc=Number(svc.reviews_count||reviews.length||0);
    var vname=(svc.vendor&&svc.vendor.name)||'Transport Provider';
    var cancelTxt=(svc.cancel_policy&&String(svc.cancel_policy).trim())?ee(svc.cancel_policy):'Free cancellation up to 24 hours before the scheduled pickup time. For no-shows or last-minute cancellations, a fee may apply.';
    var imgs=(svc.images&&svc.images.length)?svc.images:[svc.cover].filter(Boolean);
    if(!imgs.length)imgs=[''];
    window.__imgs=imgs;

    var heroStyle=imgs[0]?'background-image:url('+imgs[0]+')':
      'background:linear-gradient(135deg,var(--blue,#123B4C),#1a5068)';
    var thumbs=imgs.length>1?'<div class="sdp-tr-gallery">'
      +imgs.map(function(u,i){
        var isOn=i===0;
        return '<div class="sdp-tr-th'+(isOn?' on':'')+'" style="background-image:url('+u+')"'
          +' onclick="var h=document.getElementById(\'d-hero\');if(h)h.style.backgroundImage=\'url('+u+')\';""></div>';
      }).join('')+'</div>':'';

    var L='<div class="sdp-tr">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +'<span class="sdp-tr-badge">'+bg.em+' '+bg.lb+'</span>'
      +(svc.featured?'<span style="background:var(--gold,#E8850F);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px">&#9733; Featured</span>':'')+'</div>'
      +'<h1 class="sdp-tr-title">'+ee(svc.title)+'</h1>'
      +'<div class="sdp-tr-meta"><span style="color:var(--gold,#E8850F)">'+st(rating)+'</span>&nbsp;<b style="color:var(--text)">'+rating+'</b>&nbsp;<span>('+rc+' reviews)</span>&nbsp;<span>|</span>&nbsp;<span>&#128205; '+ee(loc)+'</span></div>'
      +statsHtml(svc,sb)
      +'<div class="sdp-tr-hero" id="d-hero" style="'+heroStyle+'">'+thumbs+'</div>'
      +'<div class="sdp-tr-sec"><h3>How it works</h3>'+stepsHtml(c.steps)+'</div>'
      +'<div class="sdp-tr-sec"><h3>What\'s included</h3>'+inclHtml(c)+'</div>'
      +meetHtml(sb,loc)
      +'<div class="sdp-tr-sec"><h3>Good to know</h3>'+gtkHtml(c)+'</div>'
      +'<div class="sdp-tr-sec"><h3>Cancellation policy</h3><p style="font-size:14px;color:var(--text2);line-height:1.75">'+cancelTxt+'</p></div>'
      +'<div class="sdp-tr-sec"><h3>Your provider</h3>'
      +'<div class="sdp-tr-prov">'
      +'<div class="sdp-tr-prov-av">'+ee((vname||'R').charAt(0).toUpperCase())+'</div>'
      +'<div style="flex:1"><div style="font-weight:800;color:var(--text);font-size:15px">'+ee(vname)+'</div>'
      +'<div style="font-size:13px;color:var(--text2);margin-top:3px">&#128205; '+ee(loc)+'&nbsp;&middot;&nbsp;<span style="color:var(--gold,#E8850F)">&#9733; '+rating+'</span></div></div>'
      +'<span class="sdp-tr-vbadge">&#10003; Verified</span></div></div>'
      +'<div class="sdp-tr-sec"><h3>Frequently asked questions</h3>'+faqHtml(c)+'</div>'
      +'<div class="sdp-tr-sec"><h3>Reviews ('+rc+')</h3>'
      +'<div class="sdp-tr-revsum">'
      +'<div class="sdp-tr-revnum"><div class="rn">'+rating+'</div><div class="rs">'+st(rating)+'</div><div style="font-size:12px;color:var(--text2);margin-top:5px">'+rc+' reviews</div></div>'
      +'<div class="sdp-tr-bars">'+revBars(reviews)+'</div></div>'
      +(reviews.length
        ?reviews.slice(0,8).map(function(r){
          return '<div class="sdp-tr-rev"><div class="rw"><span class="who">'+ee(r.name||'Guest')+'</span>'
            +'<span class="rn2">&#9733; '+ee(r.rating||'')+'</span></div>'
            +'<div class="cm">'+ee(r.comment||'')+'</div></div>';
        }).join('')
        :'<p style="font-size:14px;color:var(--text2);padding:8px 0">No reviews yet &mdash; be the first to book and share your experience.</p>')
      +'</div>'
      +(similar.length
        ?'<div class="sdp-tr-sec"><h3>Similar services</h3><div class="sdp-tr-sim">'
          +similar.map(function(x){
            var im=x.cover||(x.images&&x.images[0])||'';
            return '<div class="sdp-tr-simc" onclick="openDetail('+x.id+')">'
              +'<div class="im"'+(im?' style="background-image:url('+im+')"':'')+'>'
              +'</div><div class="bd"><div class="t">'+ee(x.title)+'</div>'
              +'<div style="font-size:12px;color:var(--text2)">'+ee(x.location||'')+'</div>'
              +'<div class="sr"><span style="color:var(--gold,#E8850F);font-size:12.5px">&#9733; '+ee(x.rating||0)+'</span>'
              +'<b style="color:var(--blue);font-size:13px">'+mn(x.price)+'</b></div></div></div>';
          }).join('')+'</div></div>':'')
      +'</div>';

    var trustItems=[
      'Instant confirmation',
      sb==='airport'?'Flight delay monitoring':(sb==='carrental'?'Insured vehicle':'Licensed, vetted driver'),
      'Free cancellation (24h)',
      '24/7 customer support'
    ];

    var R='<div class="box">'
      +formHtml(sb,svc)
      +'<ul class="sdp-tr-trust">'
      +trustItems.map(function(t){return '<li><span class="tic">&#10003;</span>'+t+'</li>';}).join('')
      +'</ul></div>';

    return '<div class="two"><div>'+L+'</div><div>'+R+'</div></div>';
  }

  window.RAGO_RENDERERS=window.RAGO_RENDERERS||{};
  ['airport','transfers','carrental','departure'].forEach(function(k){
    window.RAGO_RENDERERS[k]=render;
  });
})();
