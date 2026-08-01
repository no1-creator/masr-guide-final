/* RaGo Category Engine - shared, config-driven pro category pages (.eg-* namespace).
 * Additive & isolated: reads window.RGTCATS, hooks pickCat()/openDetail(), never edits core. */
(function(){
'use strict';
window.RGTCATS=window.RGTCATS||{};
var CUR=null,_all=[],DESTS=[],ST={dest:'',q:'',sort:'featured'},PENDING=null,IMGS=[];
function cfg(k){return window.RGTCATS[k]||null;}
function _esc(s){try{return (typeof esc==='function')?esc(s):String(s==null?'':s);}catch(e){return String(s==null?'':s);}}
function _money(n){try{return (typeof money==='function')?money(n):('$'+Number(n||0).toLocaleString());}catch(e){return '$'+Number(n||0).toLocaleString();}}
function isGuest(){try{return (typeof USER==='undefined')||!USER;}catch(e){return true;}}
function setBody(h){var el=document.getElementById('detail-body');if(el)el.innerHTML=h;if(typeof show==='function')show('detail-view');window.scrollTo(0,0);}
var IC={
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
award:'<circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
landmark:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
ship:'<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/>',
waves:'<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/>'
};
function ic(n,o){o=o||{};var s=o.size||18,sw=o.sw||1.9,f=o.fill?'currentColor':'none';return '<svg class="eg-ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="'+f+'" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round">'+(IC[n]||'')+'</svg>';}
function stars(r,sz){sz=sz||15;var n=Math.round(Number(r)||0),o='<span class="eg-stars">',i;for(i=1;i<=5;i++){o+='<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="'+(i<=n?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.4" style="vertical-align:middle"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6Z"/></svg>';}return o+'</span>';}
var CSS='@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");\n'+
'#eg-cat{max-width:1180px;margin:0 auto;padding:0 4px 64px;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}\n'+
'#eg-cat *{box-sizing:border-box}\n'+
'#eg-cat .eg-ic{vertical-align:middle;flex:none}\n'+
'.eg-crumb{font-size:13px;color:#6b7b85;margin:18px 0 16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n'+
'.eg-crumb a{color:#123B4C;font-weight:700;cursor:pointer}.eg-crumb a:hover{color:#E8850F}.eg-crumb .sep{color:#c3ced3;display:flex}\n'+
'.eg-hero{position:relative;border-radius:24px;overflow:hidden;margin-bottom:24px;background:#0C2A36;color:#fff;padding:46px 36px 42px}\n'+
'.eg-herobg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.34}\n'+
'.eg-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(12,42,54,.92),rgba(18,59,76,.60))}\n'+
'.eg-hero>*{position:relative;z-index:2}\n'+
'.eg-hbadge{display:inline-flex;align-items:center;gap:7px;background:rgba(232,133,15,.18);border:1px solid rgba(232,133,15,.45);color:#FFCE93;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:7px 13px;border-radius:999px;margin-bottom:15px}\n'+
'.eg-hero h1{margin:0 0 11px;font-size:33px;font-weight:800;letter-spacing:-.6px;line-height:1.12}\n'+
'.eg-hero p{margin:0;font-size:16px;opacity:.92;max-width:680px;line-height:1.6}\n'+
'.eg-hsearch{margin-top:24px;display:flex;gap:10px;max-width:580px}\n'+
'.eg-hsi{flex:1;display:flex;align-items:center;gap:10px;background:#fff;border-radius:13px;padding:0 15px}\n'+
'.eg-hsi .eg-ic{color:#8a97a0}.eg-hsi input{flex:1;border:none;padding:14px 0;font-size:15px;outline:none;font-family:inherit;background:transparent;color:#1B2A30}\n'+
'.eg-hsb{border:none;border-radius:13px;padding:0 24px;background:#E8850F;color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;font-family:inherit;transition:.15s;box-shadow:0 8px 18px rgba(232,133,15,.24)}\n'+
'.eg-hsb:hover{background:#cf7409}\n'+
'.eg-hstats{display:flex;gap:20px;flex-wrap:wrap;margin-top:20px}\n'+
'.eg-hstats span{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;opacity:.95}.eg-hstats .eg-ic{color:#7FD1BE}\n'+
'.eg-filter{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px}\n'+
'.eg-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;flex:1}\n'+
'.eg-chip{white-space:nowrap;border:1.5px solid #e0e8eb;background:#fff;color:#123B4C;padding:9px 15px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;transition:.15s}\n'+
'.eg-chip:hover{border-color:#123B4C}.eg-chip.on{background:#123B4C;color:#fff;border-color:#123B4C}\n'+
'.eg-sort{border:1.5px solid #e0e8eb;border-radius:11px;padding:11px 14px;font-size:14px;background:#fff;color:#123B4C;font-weight:700;cursor:pointer;font-family:inherit}\n'+
'.eg-count{font-size:14px;color:#6b7b85;margin:14px 0 16px;font-weight:700}\n'+
'.eg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}\n'+
'.eg-card{background:#fff;border:1px solid #edf1f3;border-radius:18px;overflow:hidden;cursor:pointer;box-shadow:0 2px 12px rgba(18,59,76,.05);transition:transform .2s,box-shadow .2s}\n'+
'.eg-card:hover{transform:translateY(-4px);box-shadow:0 18px 36px rgba(18,59,76,.14)}\n'+
'.eg-img{height:186px;background:#e6eef1 center/cover;position:relative}\n'+
'.eg-img:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(12,42,54,.26),transparent 42%)}\n'+
'.eg-badge{position:absolute;top:12px;left:12px;z-index:1;display:inline-flex;align-items:center;gap:5px;background:#E8850F;color:#fff;font-size:11.5px;font-weight:800;padding:5px 10px;border-radius:999px;box-shadow:0 4px 12px rgba(232,133,15,.4)}\n'+
'.eg-dur{position:absolute;bottom:12px;right:12px;z-index:1;display:inline-flex;align-items:center;gap:5px;background:rgba(12,42,54,.85);color:#fff;font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:8px}\n'+
'.eg-cb{padding:15px 16px 17px}\n'+
'.eg-loc{display:flex;align-items:center;gap:5px;font-size:12.5px;color:#6b7b85;font-weight:700}.eg-loc .eg-ic{color:#E8850F}\n'+
'.eg-title{font-size:17px;font-weight:800;color:#123B4C;margin:7px 0 8px;line-height:1.3}\n'+
'.eg-rate{display:flex;align-items:center;gap:6px;font-size:13px;color:#123B4C;font-weight:700}\n'+
'.eg-stars{color:#E8850F;display:inline-flex;gap:1px}.eg-mut{color:#8a97a0;font-weight:500}\n'+
'.eg-foot{display:flex;justify-content:space-between;align-items:center;margin-top:13px;padding-top:13px;border-top:1px solid #f0f3f5}\n'+
'.eg-price{color:#123B4C;font-size:18px;font-weight:800}\n'+
'.eg-view{display:inline-flex;align-items:center;gap:4px;color:#E8850F;font-weight:800;font-size:13px}.eg-view .eg-ic{transition:.15s}.eg-card:hover .eg-view .eg-ic{transform:translateX(3px)}\n'+
'.eg-load{padding:70px 20px;text-align:center;color:#6b7b85;font-weight:700}\n'+
'.eg-empty{grid-column:1/-1;padding:44px;text-align:center;color:#8a97a0}\n'+
'.eg-why{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:44px}\n'+
'.eg-wc{background:#f6fafb;border:1px solid #eef3f5;border-radius:16px;padding:22px 16px;text-align:center}\n'+
'.eg-wc .ico{width:52px;height:52px;border-radius:15px;background:#E6EEF1;color:#123B4C;display:flex;align-items:center;justify-content:center;margin:0 auto 11px}\n'+
'.eg-wc b{display:block;color:#123B4C;font-size:14.5px;margin-bottom:4px}.eg-wc span{font-size:12.5px;color:#6b7b85;line-height:1.55}\n'+
'.eg-two{display:grid;grid-template-columns:1fr 360px;gap:34px;align-items:start;margin-top:8px}\n'+
'.eg-dhero{height:400px;border-radius:20px;background:#e6eef1 center/cover;box-shadow:0 12px 32px rgba(18,59,76,.12)}\n'+
'.eg-gal{display:flex;gap:9px;margin-top:11px;flex-wrap:wrap}\n'+
'.eg-gth{width:92px;height:64px;border-radius:10px;background:#e6eef1 center/cover;cursor:pointer;opacity:.6;border:2px solid transparent;transition:.15s}.eg-gth.on,.eg-gth:hover{opacity:1;border-color:#E8850F}\n'+
'.eg-eye{display:inline-flex;align-items:center;gap:6px;color:#E8850F;font-weight:800;font-size:12.5px;text-transform:uppercase;letter-spacing:.5px;margin-top:16px}\n'+
'.eg-h2{font-size:27px;font-weight:800;color:#123B4C;margin:6px 0 10px;line-height:1.2;letter-spacing:-.4px}\n'+
'.eg-sub{display:flex;align-items:center;gap:13px;flex-wrap:wrap;color:#6b7b85;font-size:14px;margin:0}\n'+
'.eg-sub .it{display:inline-flex;align-items:center;gap:6px}.eg-sub .it .eg-ic{color:#E8850F}\n'+
'.eg-sec{margin-top:30px}.eg-sec h3{font-size:19px;font-weight:800;color:#123B4C;margin:0 0 13px}\n'+
'.eg-lead{color:#3a4a52;line-height:1.8;font-size:15px;margin:0}\n'+
'.eg-ul{list-style:none;padding:0;margin:0;display:grid;gap:11px}\n'+
'.eg-ul li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:#3a4a52;line-height:1.5}\n'+
'.eg-ul li .ic{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px}\n'+
'.eg-yes .ic{background:#E4F1EE;color:#2E8B7B}.eg-no .ic{background:#FBE7E4;color:#E05544}\n'+
'.eg-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}\n'+
'.eg-steps{display:grid;gap:15px}.eg-step{display:flex;gap:14px;align-items:flex-start}\n'+
'.eg-num{flex:none;width:31px;height:31px;border-radius:50%;background:#123B4C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}\n'+
'.eg-step b{color:#123B4C;font-size:15px}.eg-step span{display:block;color:#6b7b85;font-size:13.5px;margin-top:3px;line-height:1.5}\n'+
'.eg-dates{display:flex;gap:8px;flex-wrap:wrap}\n'+
'.eg-dchip{display:inline-flex;align-items:center;gap:6px;background:#E6EEF1;color:#123B4C;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:700}.eg-dchip .eg-ic{opacity:.7}\n'+
'.eg-prov{display:flex;gap:14px;align-items:center;background:#f6fafb;border:1px solid #eef3f5;border-radius:15px;padding:17px}\n'+
'.eg-av{flex:none;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#1C4E63,#0C2A36);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px}\n'+
'.eg-badge2{display:inline-flex;align-items:center;gap:5px;background:#E4F1EE;color:#2E8B7B;font-size:12px;font-weight:800;padding:5px 10px;border-radius:999px}\n'+
'.eg-rev{border:1px solid #edf1f3;border-radius:13px;padding:15px;margin-bottom:10px}.eg-rev .top{display:flex;justify-content:space-between;align-items:center;font-size:13.5px}.eg-rev .who{font-weight:800;color:#123B4C}\n'+
'.eg-faq{border:1px solid #edf1f3;border-radius:13px;padding:0 15px;margin-bottom:9px}\n'+
'.eg-faq summary{padding:15px 0;font-weight:700;color:#123B4C;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px}\n'+
'.eg-faq summary::-webkit-details-marker{display:none}.eg-faq summary .eg-ic{color:#8a97a0;transition:.2s}\n'+
'.eg-faq[open] summary{color:#E8850F}.eg-faq[open] summary .eg-ic{transform:rotate(90deg);color:#E8850F}\n'+
'.eg-faq .ans{padding:0 0 15px;color:#3a4a52;font-size:14px;line-height:1.7}\n'+
'.eg-book{position:sticky;top:16px;background:#fff;border:1px solid #edf1f3;border-radius:18px;padding:22px;box-shadow:0 16px 38px rgba(18,59,76,.12)}\n'+
'.eg-book .p{font-size:31px;font-weight:800;color:#123B4C;line-height:1}.eg-book .pm{color:#6b7b85;font-size:13px;margin-bottom:4px;font-weight:600}\n'+
'.eg-field{margin:13px 0}.eg-field label{display:block;font-size:11.5px;font-weight:800;color:#6b7b85;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}\n'+
'.eg-field input,.eg-field select{width:100%;border:1.5px solid #e0e8eb;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;color:#1B2A30;background:#fff}\n'+
'.eg-field input:focus,.eg-field select:focus{outline:none;border-color:#123B4C}\n'+
'.eg-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:#E8850F;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-top:6px;font-family:inherit;transition:.15s;box-shadow:0 8px 20px rgba(232,133,15,.26)}\n'+
'.eg-btn:hover{background:#cf7409;transform:translateY(-1px)}\n'+
'.eg-trust{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}.eg-trust li{font-size:13px;color:#3a4a52;font-weight:600;display:flex;gap:10px;align-items:center}.eg-trust .eg-ic{color:#2E8B7B}\n'+
'.eg-ref{display:flex;align-items:center;gap:8px;margin-top:15px;background:#FFF4E6;color:#8a5a1e;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:700}\n'+
'.eg-sim{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}\n'+
'@media(max-width:900px){.eg-grid{grid-template-columns:repeat(2,1fr)}.eg-why{grid-template-columns:repeat(2,1fr)}.eg-two{grid-template-columns:1fr}.eg-dhero{height:280px}.eg-book{position:static}.eg-cols{grid-template-columns:1fr}.eg-sim{grid-template-columns:1fr}.eg-hero{padding:36px 22px}.eg-hero h1{font-size:27px}}\n'+
'@media(max-width:600px){.eg-grid{grid-template-columns:1fr}.eg-hero h1{font-size:23px}.eg-hsearch{flex-direction:column}}';
function injectCSS(){if(document.getElementById('eg-css'))return;var st=document.createElement('style');st.id='eg-css';st.textContent=CSS;(document.head||document.documentElement).appendChild(st);}
var D={
included:['Professional local guide or staff','Hotel pickup and drop-off','All taxes and service fees','Bottled water'],
notIncluded:['Personal expenses and gratuities','Optional add-on activities','Travel insurance'],
steps:[['Booking confirmed','You receive an instant confirmation with all the details.'],['Meet your provider','Your verified provider welcomes you at the agreed time and place.'],['Enjoy the experience','Everything is organised so you can relax and enjoy.'],['We stay in touch','24/7 support before, during and after your booking.']],
faq:[['Can I cancel or reschedule?','Free cancellation up to 24 hours before the start time, unless stated otherwise.'],['How do I pay?','You pay securely online and your booking is confirmed instantly.'],['Who is my provider?','Every provider on RaGo is verified. Full details are shown on each listing.']],
trust:['Instant confirmation','Free cancellation (24h)','Secure online payment','24/7 customer support'],
why:[['shield','Verified providers','Every provider is checked and rated by real travellers.'],['card','Secure booking','Instant confirmation and safe online payment.'],['refresh','Flexible cancellation','Cancel up to 24h before most bookings.'],['headset','24/7 support','We are here before, during and after.']],
hstats:[['shield','Verified providers'],['refresh','Free cancellation'],['card','Secure payment']]
};
function destinations(){var seen={},out=[];_all.forEach(function(s){var l=(s.location||'').trim();if(l&&!seen[l]){seen[l]=1;out.push(l);}});return out;}
function applyFilters(){var q=(ST.q||'').toLowerCase(),d=ST.dest||'';var out=_all.filter(function(s){if(d&&(s.location||'')!==d)return false;if(q){var hay=((s.title||'')+' '+(s.location||'')+' '+(s.description||'')).toLowerCase();if(hay.indexOf(q)<0)return false;}return true;});var so=ST.sort||'featured';out.sort(function(a,b){if(so==='price_asc')return (a.price||0)-(b.price||0);if(so==='price_desc')return (b.price||0)-(a.price||0);if(so==='rating')return (b.rating||0)-(a.rating||0);return ((b.featured?1:0)-(a.featured?1:0))||((b.rating||0)-(a.rating||0));});return out;}
function cardHtml(s){var img=s.cover||(s.images&&s.images[0])||'';var unit=(CUR&&CUR.booking&&CUR.booking.unit)||'/ person';return '<div class="eg-card" onclick="egOpen('+s.id+')"><div class="eg-img" style="background-image:url(\''+img+'\')">'+(s.featured?'<span class="eg-badge">'+ic('award',{size:13})+' Featured</span>':'')+(s.duration?'<span class="eg-dur">'+ic('clock',{size:13})+' '+_esc(s.duration)+'</span>':'')+'</div><div class="eg-cb"><div class="eg-loc">'+ic('pin',{size:14})+' '+_esc(s.location||'Egypt')+'</div><div class="eg-title">'+_esc(s.title)+'</div><div class="eg-rate">'+stars(s.rating,14)+' <span>'+(s.rating||0)+'</span> <span class="eg-mut">('+(s.reviews_count||0)+')</span></div><div class="eg-foot"><div><span class="eg-mut">from</span> <b class="eg-price">'+_money(s.price)+'</b> <span class="eg-mut">'+_esc(unit)+'</span></div><span class="eg-view">View '+ic('arrow',{size:15})+'</span></div></div></div>';}
function renderGrid(){var list=applyFilters();var g=document.getElementById('eg-grid');if(g)g.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="eg-empty">No results match your filters.</div>';var c=document.getElementById('eg-count');if(c){var noun=(CUR&&CUR.noun)||'result';c.textContent=list.length+' '+noun+(list.length===1?'':'s')+' available';}}
function syncChips(){var els=document.querySelectorAll('#eg-cat .eg-chip');for(var i=0;i<els.length;i++){var idx=parseInt(els[i].getAttribute('data-i'),10);var d=(idx<0?'':DESTS[idx]);els[i].classList.toggle('on',d===(ST.dest||''));}}
function renderCategory(){var c=CUR;DESTS=destinations();var chips='<div class="eg-chip on" data-i="-1" onclick="egDest(-1)">All destinations</div>'+DESTS.map(function(d,i){return '<div class="eg-chip" data-i="'+i+'" onclick="egDest('+i+')">'+_esc(d)+'</div>';}).join('');var hstats=(c.hstats||D.hstats).map(function(t){return '<span>'+ic(t[0],{size:17})+' '+_esc(t[1])+'</span>';}).join('');var why=(c.why||D.why).map(function(w){return '<div class="eg-wc"><div class="ico">'+ic(w[0],{size:24})+'</div><b>'+_esc(w[1])+'</b><span>'+_esc(w[2])+'</span></div>';}).join('');var html='<div id="eg-cat"><div class="eg-crumb"><a onclick="goHome()">Home</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <b>'+_esc(c.label)+'</b></div><div class="eg-hero"><div class="eg-herobg" style="background-image:url(\''+_esc(c.heroImg||'')+'\')"></div><span class="eg-hbadge">'+ic(c.heroIcon||'sun',{size:14})+' '+_esc(c.heroBadge||'Explore Egypt')+'</span><h1>'+_esc(c.heroTitle||c.label)+'</h1><p>'+_esc(c.heroSub||'')+'</p><div class="eg-hsearch"><div class="eg-hsi">'+ic('search',{size:18})+'<input id="eg-q" placeholder="'+_esc(c.searchPh||'Search...')+'" oninput="egSearch(this.value)"></div><button class="eg-hsb" onclick="egScroll()">Search</button></div><div class="eg-hstats">'+hstats+'</div></div><div class="eg-filter"><div class="eg-chips">'+chips+'</div><select class="eg-sort" onchange="egSort(this.value)"><option value="featured">Recommended</option><option value="rating">Top rated</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></div><div class="eg-count" id="eg-count"></div><div class="eg-grid" id="eg-grid"></div><div class="eg-why">'+why+'</div></div>';setBody(html);renderGrid();}
async function openEgCategory(c){CUR=c;injectCSS();ST={dest:'',q:'',sort:'featured'};setBody('<div class="eg-load">Loading...</div>');try{_all=await api('/api/services?cat='+encodeURIComponent(c.key));}catch(e){_all=[];}_all=_all||[];renderCategory();}
function liList(items,cls,icon){return '<ul class="eg-ul '+cls+'">'+items.map(function(t){return '<li><span class="ic">'+ic(icon,{size:14})+'</span><span>'+_esc(t)+'</span></li>';}).join('')+'</ul>';}
function renderDetail(s,reviews,similar){var c=CUR,b=c.booking||{};var imgs=(s.images&&s.images.length)?s.images:[s.cover].filter(Boolean);if(!imgs.length)imgs=[''];IMGS=imgs;var loc=s.location||'Egypt',dur=s.duration||'Flexible',rating=Number(s.rating||0),rc=Number(s.reviews_count||(reviews?reviews.length:0)||0);var vname=(s.vendor&&s.vendor.name)?s.vendor.name:'RaGo verified provider';var av=(s.availability||[]).map(function(a){return a.date;}).filter(Boolean);var cancel=(s.cancel_policy&&String(s.cancel_policy).trim())?_esc(s.cancel_policy):'Free cancellation up to 24 hours before the start time.';var refCode=(typeof REF!=='undefined'&&REF)?REF:'';var included=c.included||D.included,notIncluded=c.notIncluded||D.notIncluded,steps=c.steps||D.steps,faq=c.faq||D.faq,trust=b.trust||D.trust;var incLabel=c.includedLabel||"What's included";var gallery='<div class="eg-dhero" id="eg-dhero" style="background-image:url(\''+(imgs[0]||'')+'\')"></div><div class="eg-gal">'+imgs.map(function(u,i){return '<div class="eg-gth '+(i===0?'on':'')+'" style="background-image:url(\''+u+'\')" onclick="egHero('+i+')"></div>';}).join('')+'</div>';var facts='<p class="eg-sub"><span class="it">'+stars(rating,16)+' <b style="color:#123B4C">'+rating+'</b> <span class="eg-mut">('+rc+' reviews)</span></span><span class="it">'+ic('pin',{size:15})+' '+_esc(loc)+'</span><span class="it">'+ic('clock',{size:15})+' '+_esc(dur)+'</span></p>';var datesBlock=av.length?('<div class="eg-sec"><h3>Availability</h3><div class="eg-dates">'+av.slice(0,12).map(function(d){return '<span class="eg-dchip">'+ic('calendar',{size:13})+' '+_esc(d)+'</span>';}).join('')+'</div></div>'):'';var revList=(reviews&&reviews.length)?reviews.map(function(r){return '<div class="eg-rev"><div class="top"><span class="who">'+_esc(r.name||'Guest')+'</span><span class="eg-stars">'+stars(r.rating,13)+'</span></div><div style="color:#3a4a52;font-size:14px;line-height:1.6;margin-top:6px">'+_esc(r.comment||'')+'</div></div>';}).join(''):'<p class="eg-lead">No reviews yet - be the first to review.</p>';var simBlock=(similar&&similar.length)?('<div class="eg-sec"><h3>You might also like</h3><div class="eg-sim">'+similar.map(cardHtml).join('')+'</div></div>'):'';var dateField=av.length?('<div class="eg-field"><label>'+_esc(b.dateLabel||'Date')+'</label><select id="eg-date"><option value="">'+_esc(b.datePlaceholder||'Choose a date')+'</option>'+av.slice(0,30).map(function(d){return '<option value="'+_esc(d)+'">'+_esc(d)+'</option>';}).join('')+'</select></div>'):('<div class="eg-field"><label>'+_esc(b.dateLabel||'Date')+'</label><input id="eg-date" type="date"></div>');var qtyField='<div class="eg-field"><label>'+_esc(b.qtyLabel||'Travellers')+'</label><input id="eg-pax" type="number" min="1" value="'+(b.qtyDefault||2)+'"></div>';var L='<div class="eg-crumb"><a onclick="goHome()">Home</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <a onclick="pickCat(\''+c.key+'\')">'+_esc(c.label)+'</a> <span class="sep">'+ic('chevron',{size:14})+'</span> <b>'+_esc(s.title)+'</b></div><div class="eg-two"><div>'+gallery+'<div class="eg-eye">'+ic('badge',{size:14})+' '+_esc(vname)+'</div><h1 class="eg-h2">'+_esc(s.title)+'</h1>'+facts+'<div class="eg-sec"><h3>Overview</h3><p class="eg-lead">'+(_esc((s.description||'').trim())||('Discover '+_esc(s.title)+(loc?(' in '+_esc(loc)):'')+'.'))+'</p></div><div class="eg-sec"><h3>'+_esc(incLabel)+'</h3><div class="eg-cols"><div>'+liList(included,'eg-yes','check')+'</div><div>'+liList(notIncluded,'eg-no','x')+'</div></div></div><div class="eg-sec"><h3>'+_esc(c.stepsLabel||'How it works')+'</h3><div class="eg-steps">'+steps.map(function(st,i){return '<div class="eg-step"><div class="eg-num">'+(i+1)+'</div><div><b>'+_esc(st[0])+'</b><span>'+_esc(st[1])+'</span></div></div>';}).join('')+'</div></div>'+datesBlock+'<div class="eg-sec"><h3>Cancellation policy</h3><p class="eg-lead">'+cancel+'</p></div><div class="eg-sec"><h3>Your provider</h3><div class="eg-prov"><div class="eg-av">'+_esc((vname||'R').charAt(0).toUpperCase())+'</div><div style="flex:1"><div style="font-weight:800;color:#123B4C">'+_esc(vname)+'</div><div class="eg-mut" style="font-size:13px">'+_esc(loc)+' - star '+rating+'</div></div><span class="eg-badge2">'+ic('badge',{size:13})+' Verified</span></div></div><div class="eg-sec"><h3>Frequently asked questions</h3>'+faq.map(function(f){return '<details class="eg-faq"><summary>'+_esc(f[0])+ic('chevron',{size:16})+'</summary><div class="ans">'+_esc(f[1])+'</div></details>';}).join('')+'</div><div class="eg-sec"><h3>Reviews ('+rc+')</h3>'+revList+'</div>'+simBlock+'</div><div><div class="eg-book">'+(s.featured?'<span class="eg-badge2" style="margin-bottom:12px">'+ic('award',{size:13})+' Featured</span><br>':'')+'<div class="pm">from</div><div class="p">'+_money(s.price)+' <span style="font-size:14px;color:#6b7b85;font-weight:600">'+_esc(b.unit||'/ person')+'</span></div>'+dateField+qtyField+'<button class="eg-btn" onclick="egBook()">'+_esc(b.submitLabel||'Book now')+' '+ic('arrow',{size:16})+'</button><ul class="eg-trust">'+trust.map(function(t){return '<li>'+ic('check',{size:16})+' '+_esc(t)+'</li>';}).join('')+'</ul>'+(refCode?'<div class="eg-ref">'+ic('tag',{size:14})+' Referral applied: '+_esc(refCode)+'</div>':'')+'</div></div></div>';setBody('<div id="eg-cat">'+L+'</div>');}
async function openEgDetail(id,preS){injectCSS();setBody('<div class="eg-load">Loading...</div>');var s=preS;if(!s){try{s=await api('/api/services/'+id);}catch(e){s=null;}}if(!s||!s.id){setBody('<div class="eg-load">Sorry, this could not be loaded.</div>');return;}try{CUR_SVC=s;}catch(e){}try{window.CUR_SVC=s;}catch(e){}var reviews=[];try{reviews=await api('/api/reviews?service_id='+id);}catch(e){}var similar=[];try{similar=(await api('/api/services?cat='+encodeURIComponent(CUR.key))).filter(function(x){return x.id!==s.id;}).slice(0,3);}catch(e){}renderDetail(s,reviews||[],similar||[]);}
function egSubmit(){var d=document.getElementById('eg-date'),p=document.getElementById('eg-pax');var svc=window.CUR_SVC||null,sid=svc&&svc.id;if(!sid){if(typeof toast==='function')toast('Please select again');return;}api('/api/bookings',{method:'POST',body:{service_id:sid,date:(d&&d.value)||null,pax:Number(p&&p.value)||1,referral_code:(typeof REF!=='undefined'&&REF)||null}}).then(function(bk){if(typeof toast==='function')toast('Booked! Ref '+(bk&&bk.ref||''));}).catch(function(e){if(typeof toast==='function')toast((e&&e.message)||'Booking failed');});}
function resume(){var p=PENDING;PENDING=null;if(!p||!p.id||isGuest())return;var role;try{role=USER&&USER.role;}catch(e){}if(role&&role!=='customer')return;setTimeout(function(){try{var c=cfg(p.key);if(!c)return;CUR=c;openEgDetail(p.id).then(function(){var d=document.getElementById('eg-date');if(d&&p.date)d.value=p.date;var px=document.getElementById('eg-pax');if(px&&p.pax)px.value=p.pax;var box=document.querySelector('#eg-cat .eg-book');if(box)box.scrollIntoView({behavior:'smooth',block:'center'});if(typeof toast==='function')toast('Signed in - completing your booking...');egSubmit();}).catch(function(){});}catch(e){}},140);}
window.egOpen=function(id){openEgDetail(id).catch(function(){});};
window.egDest=function(i){var d=(i<0?'':DESTS[i]);ST.dest=(ST.dest===d?'':d);syncChips();renderGrid();};
window.egSort=function(v){ST.sort=v;renderGrid();};
window.egSearch=function(v){ST.q=v;renderGrid();};
window.egScroll=function(){var g=document.getElementById('eg-grid');if(g)g.scrollIntoView({behavior:'smooth',block:'start'});};
window.egHero=function(i){var h=document.getElementById('eg-dhero');if(h&&IMGS[i])h.style.backgroundImage="url('"+IMGS[i]+"')";var els=document.querySelectorAll('#eg-cat .eg-gth');for(var x=0;x<els.length;x++)els[x].classList.toggle('on',x===i);};
window.egBook=function(){if(isGuest()){var d=document.getElementById('eg-date'),p=document.getElementById('eg-pax');PENDING={key:CUR&&CUR.key,id:(window.CUR_SVC&&window.CUR_SVC.id),date:d?d.value:'',pax:(p&&p.value)?p.value:''};if(typeof toast==='function')toast('Please sign in to complete your booking');if(typeof openLogin==='function')openLogin();return;}egSubmit();};
var _finishAuth=window.finishAuth;window.finishAuth=function(r){var had=!!PENDING;var ret=(typeof _finishAuth==='function')?_finishAuth.apply(this,arguments):undefined;if(had)resume();return ret;};
var _pickCat=window.pickCat;window.pickCat=function(k){var c=cfg(k);if(c){try{CUR_CAT=k;}catch(e){}openEgCategory(c).catch(function(){});return;}return (typeof _pickCat==='function')?_pickCat.apply(this,arguments):undefined;};
var _openDetail=window.openDetail;window.openDetail=function(id){var args=arguments,self=this;return (async function(){try{var s=await api('/api/services/'+id);var cats=(typeof ensureCats==='function')?await ensureCats():await api('/api/categories');var cat=(cats||[]).filter(function(x){return x.id===s.category_id;})[0];if(cat){var c=cfg(cat.key);if(c){CUR=c;return openEgDetail(id,s);}}}catch(e){}return (typeof _openDetail==='function')?_openDetail.apply(self,args):undefined;})();};
})();
