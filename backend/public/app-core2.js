const NAV={admin:['overview','vendors','services','bookings','customers','reviews','banners','marketers','payouts','settings'],vendor:['overview','services','marketers','bookings','wallet','profile'],affiliate:['overview','link','bookings','wallet']};
let DSEC='overview';
function openDash(){if(!USER||USER.role==='customer'){toast('No dashboard for this role');return;}DSEC='overview';document.getElementById('dash-title').textContent=({admin:'Admin',vendor:'Provider',affiliate:'Marketer'}[USER.role])+' Dashboard';renderNav();show('dash-view');loadSec();}
function renderNav(){document.getElementById('dnav').innerHTML=NAV[USER.role].map(s=>`<button class="${s===DSEC?'on':''}" onclick="navTo('${s}')">${iconSvg(NAVICON[s]||'compass')}<span>${s[0].toUpperCase()+s.slice(1)}</span></button>`).join('');}
function navTo(s){DSEC=s;renderNav();loadSec();}
function card(html){return `<div class="box">${html}</div>`;}
async function loadSec(){
  const m=document.getElementById('dmain');m.innerHTML=`<p class="muted">Loading...</p>`;
  try{await SEC[USER.role+':'+DSEC](m);}catch(e){m.innerHTML=`<p class="muted">${esc(e.message)}</p>`;}
}
const SEC={
  'admin:overview':async(m)=>{const o=await api('/api/admin/overview');m.innerHTML=`<div class="stats">
    <div class="stat"><div class="n">${o.vendors}</div><div class="l">Providers</div></div>
    <div class="stat"><div class="n">${o.services}</div><div class="l">Services</div></div>
    <div class="stat"><div class="n">${o.affiliates}</div><div class="l">Marketers</div></div>
    <div class="stat"><div class="n">${o.customers}</div><div class="l">Customers</div></div>
    <div class="stat"><div class="n">${o.bookings}</div><div class="l">Bookings</div></div>
    <div class="stat"><div class="n">${money(o.revenue)}</div><div class="l">Revenue</div></div>
    <div class="stat"><div class="n">${money(o.platform_commission)}</div><div class="l">Platform commission</div></div>
    <div class="stat"><div class="n">${o.pending_payouts}</div><div class="l">Pending payouts</div></div>
  </div>
  <h3 style="margin:6px 0 8px">Recent bookings</h3>${tbl(['Ref','Trip','Amount','Status'],o.recent_bookings.map(b=>[b.ref,esc(b.title),money(b.amount),statusTag(b.status)]))}
  <h3 style="margin:20px 0 8px">Top marketers</h3>${tbl(['Name','Code','Clicks','Bookings'],o.top_affiliates.map(a=>[esc(a.name),a.code,a.clicks,a.bookings]))}`;},
  'admin:vendors':async(m)=>{const v=await api('/api/vendors');m.innerHTML=`<h3 style="margin:0 0 12px">Service providers</h3>`+tbl(['Name','City','Email','Status','Action'],v.map(x=>[esc(x.name),esc(x.city||''),esc(x.email),statusTag(x.status),`<button class="btn sm" onclick="setVendor(${x.id},'approved')">Approve</button> <button class="btn sm ghost" onclick="setVendor(${x.id},'suspended')">Suspend</button>`]));},
  'admin:services':async(m)=>{await ensureCats();const s=await api('/api/services');m.innerHTML=`<h3 style="margin:0 0 12px">All services (${s.length})</h3>`+tbl(['Title','Category','Location','Price','Rating','Action'],s.map(x=>[esc(x.title),catName(x.category_id),esc(x.location),money(x.price),'★ '+x.rating,`<button class="btn sm danger" onclick="delService(${x.id})">Delete</button>`]));},
  'admin:bookings':async(m)=>{const b=await api('/api/bookings');m.innerHTML=`<h3 style="margin:0 0 12px">All bookings</h3>`+bookingsTable(b);},
  'admin:customers':async(m)=>{const c=await api('/api/admin/customers');m.innerHTML=`<h3 style="margin:0 0 12px">Customers (${c.length})</h3>`+tbl(['Name','Email','Lang','Bookings','Spent','Joined'],c.map(x=>[esc(x.name||'—'),esc(x.email||''),String(x.lang||'—').toUpperCase(),x.bookings,money(x.spent),String(x.created_at||'').slice(0,10)]));},
  'admin:reviews':async(m)=>{const r=await api('/api/admin/reviews');m.innerHTML=`<h3 style="margin:0 0 12px">Reviews (${r.length})</h3>`+tbl(['Service','Rating','Comment','By','Date','Action'],r.map(x=>[esc(x.service_title||'—'),'★ '+x.rating,esc(x.comment||''),esc(x.name||'Guest'),String(x.created_at||'').slice(0,10),`<button class="btn sm danger" onclick="delReview(${x.id})">Delete</button>`]));},
  'admin:banners':async(m)=>{const b=await api('/api/banners?all=1');m.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Ad banners</h3><button class="btn sm" onclick="openBanner()">+ New banner</button></div>`+tbl(['Title','Trip','Active','Action'],b.map(x=>[esc(x.title),x.service?esc(x.service.title):'—',x.active?'✅':'—',`<button class="btn sm ghost" onclick="openBanner(${x.id})">Edit</button> <button class="btn sm danger" onclick="delBanner(${x.id})">Delete</button>`]));},
  'admin:marketers':async(m)=>{const a=await api('/api/affiliates');m.innerHTML=`<h3 style="margin:0 0 12px">All marketers</h3>`+tbl(['Name','Code','Rate','Clicks'],a.map(x=>[esc(x.name),x.code,(x.commission_rate*100)+'%',x.clicks]));},
  'admin:payouts':async(m)=>{const p=await api('/api/payouts');m.innerHTML=`<h3 style="margin:0 0 12px">Payout requests</h3>`+tbl(['#','Owner','Amount','Status','Requested','Action'],p.map(x=>[x.id,`${esc(x.owner_type||'')} #${x.owner_id}`,money(x.amount),statusTag(x.status),String(x.requested_at||'').slice(0,10),payoutActions(x)]));},
  'admin:settings':async(m)=>{const list=await api('/api/admin/settings');const cur={};list.forEach(s=>cur[s.key]=s.value);const known=[['site_name','Site name'],['platform_commission_rate','Platform commission rate (e.g. 0.10)'],['affiliate_default_rate','Default marketer rate (e.g. 0.05)'],['currency','Currency code'],['support_email','Support email'],['whatsapp','WhatsApp number']];const keys=[...new Set([...known.map(k=>k[0]),...Object.keys(cur)])];const labelOf=k=>{const f=known.find(x=>x[0]===k);return f?f[1]:k.replace(/_/g,' ');};m.innerHTML=card(`<h3 style="margin:0 0 12px">Platform settings</h3>`+keys.map(k=>`<div class="field"><label>${esc(labelOf(k))}</label><input id="set-${k}" value="${esc(cur[k]==null?'':cur[k])}"></div>`).join('')+`<button class="btn" style="margin-top:6px" onclick='saveSettings(${JSON.stringify(keys)})'>Save settings</button>`);},
  'vendor:overview':async(m)=>{const b=await api('/api/bookings');const w=await api('/api/wallets/me').catch(()=>({balance:0}));const rev=b.reduce((s,x)=>s+x.amount,0);m.innerHTML=`<div class="stats"><div class="stat"><div class="n">${b.length}</div><div class="l">Bookings</div></div><div class="stat"><div class="n">${money(rev)}</div><div class="l">Gross sales</div></div><div class="stat"><div class="n">${money(w.balance)}</div><div class="l">Wallet balance</div></div></div><h3 style="margin:6px 0 8px">Recent bookings</h3>`+bookingsTable(b.slice(0,8));},
  'vendor:services':async(m)=>{await ensureCats();const all=await api('/api/services');const me=await api('/api/vendors/me').catch(()=>null);const mine=me?all.filter(s=>s.vendor_id===me.id):all;m.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">My services</h3><button class="btn sm" onclick="openService()">+ New service</button></div>`+tbl(['Title','Category','Price','Images','Action'],mine.map(s=>[esc(s.title),catName(s.category_id),money(s.price),(s.images?s.images.length:0),`<button class="btn sm ghost" onclick="openService(${s.id})">Edit</button> <button class="btn sm danger" onclick="delService(${s.id})">Delete</button>`]));},
  'vendor:marketers':async(m)=>{const a=await api('/api/affiliates');m.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">My marketers</h3><button class="btn sm" onclick="openModal('mkt-modal')">+ New marketer</button></div>`+tbl(['Name','Code','Rate','Clicks','Action'],a.map(x=>[esc(x.name),x.code,(x.commission_rate*100)+'%',x.clicks,`<button class="btn sm danger" onclick="delAff(${x.id})">Remove</button>`]));},
  'vendor:bookings':async(m)=>{const b=await api('/api/bookings');m.innerHTML=`<h3 style="margin:0 0 12px">Bookings</h3>`+bookingsTable(b,true);},
  'vendor:wallet':async(m)=>{await walletView(m);},
  'vendor:profile':async(m)=>{const v=await api('/api/vendors/me');m.innerHTML=card(`<h3 style="margin:0 0 12px">Business profile</h3><div class="field"><label>Name</label><input id="vp-name" value="${esc(v.name||'')}"></div><div class="field"><label>City</label><input id="vp-city" value="${esc(v.city||'')}"></div><div class="field"><label>Languages</label><input id="vp-langs" value="${esc(v.languages||'')}"></div><div class="field"><label>Description</label><textarea id="vp-desc" rows="3">${esc(v.description||'')}</textarea></div><button class="btn" onclick="saveProfile()">Save profile</button>`);},
  'affiliate:overview':async(m)=>{const a=await api('/api/affiliates/me');const b=await api('/api/bookings');const w=await api('/api/wallets/me').catch(()=>({balance:0}));m.innerHTML=`<div class="stats"><div class="stat"><div class="n">${a.clicks}</div><div class="l">Clicks</div></div><div class="stat"><div class="n">${b.length}</div><div class="l">Bookings</div></div><div class="stat"><div class="n">${money(w.balance)}</div><div class="l">Earnings</div></div></div>`;},
  'affiliate:link':async(m)=>{const a=await api('/api/affiliates/me');const link=a.link;m.innerHTML=card(`<h3 style="margin:0 0 8px">Your referral link</h3><div class="linkbox"><input id="aff-link" value="${esc(link)}" readonly><button class="btn" onclick="copyLink()">Copy</button></div><div style="margin-top:14px">${qrSvg(link)}</div><p class="muted" style="margin-top:10px">Share this link or QR. Any booking made through it earns you ${(a.commission_rate*100)}% commission.</p>`);},
  'affiliate:bookings':async(m)=>{const b=await api('/api/bookings');m.innerHTML=`<h3 style="margin:0 0 12px">Bookings</h3>`+bookingsTable(b);},
  'affiliate:wallet':async(m)=>{await walletView(m);},
};
async function walletView(m){const w=await api('/api/wallets/me');m.innerHTML=card(`<h3 style="margin:0 0 4px">Wallet</h3><div class="n" style="font-size:26px;font-weight:800;color:var(--blue)">${money(w.balance)}</div><div class="muted">Available balance</div><div class="row" style="margin-top:14px"><input id="po-amt" type="number" placeholder="Amount to withdraw"><button class="btn" onclick="requestPayout()">Request payout</button></div>`)+`<h3 style="margin:20px 0 8px">Transactions</h3>`+tbl(['Date','Type','Amount','Ref'],w.transactions.map(t=>[String(t.created_at||'').slice(0,10),t.type,money(t.amount),t.ref||'']));}
function tbl(head,rows){return `<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${head.length}" class="muted">No data</td></tr>`}</tbody></table>`;}
function statusTag(s){return `<span class="tag ${s}">${s}</span>`;}
function bookingsTable(b,actions){return tbl(['Ref','Trip','Date','Pax','Amount','Status'].concat(actions?['Action']:[]),b.map(x=>[`<code>${x.ref}</code>`,esc(x.service_title||''),x.date||'—',x.pax,money(x.amount),statusTag(x.status)].concat(actions?[`<button class="btn sm" onclick="setBooking(${x.id},'confirmed')">Confirm</button> <button class="btn sm ghost" onclick="setBooking(${x.id},'completed')">Complete</button>`]:[])));}
function payoutActions(x){if(x.status==='requested')return `<button class="btn sm" onclick="setPayout(${x.id},'approved')">Approve</button> <button class="btn sm danger" onclick="setPayout(${x.id},'rejected')">Reject</button>`;if(x.status==='approved')return `<button class="btn sm" onclick="setPayout(${x.id},'paid')">Mark paid</button>`;return '—';}
let CATCACHE=null;async function ensureCats(){if(!CATCACHE)CATCACHE=await api('/api/categories');return CATCACHE;}
function catName(id){const c=(CATCACHE||[]).find(x=>x.id===id);return c?esc((c.labels&&c.labels.en)||c.key):'—';}

async function setVendor(id,st){try{await api('/api/vendors/'+id+'/status',{method:'PUT',body:{status:st}});toast('Updated');loadSec();}catch(e){toast(e.message);}}
async function setBooking(id,st){try{await api('/api/bookings/'+id+'/status',{method:'PUT',body:{status:st}});toast('Booking '+st);loadSec();}catch(e){toast(e.message);}}
async function setPayout(id,st){try{await api('/api/payouts/'+id,{method:'PUT',body:{status:st}});toast('Payout '+st);loadSec();}catch(e){toast(e.message);}}
async function delService(id){if(!confirm('Delete this service?'))return;try{await api('/api/services/'+id,{method:'DELETE'});toast('Deleted');loadSec();}catch(e){toast(e.message);}}
async function delAff(id){if(!confirm('Remove marketer?'))return;try{await api('/api/affiliates/'+id,{method:'DELETE'});toast('Removed');loadSec();}catch(e){toast(e.message);}}
async function delBanner(id){if(!confirm('Delete banner?'))return;try{await api('/api/banners/'+id,{method:'DELETE'});toast('Deleted');loadSec();}catch(e){toast(e.message);}}
async function delReview(id){if(!confirm('Delete this review?'))return;try{await api('/api/admin/reviews/'+id,{method:'DELETE'});toast('Deleted');loadSec();}catch(e){toast(e.message);}}
async function saveSettings(keys){const body={};keys.forEach(k=>{body[k]=document.getElementById('set-'+k).value;});try{await api('/api/admin/settings',{method:'PUT',body});toast('Settings saved');loadSec();}catch(e){toast(e.message);}}
async function saveProfile(){try{await api('/api/vendors/me',{method:'PUT',body:{name:v('vp-name'),city:v('vp-city'),languages:v('vp-langs'),description:v('vp-desc')}});toast('Profile saved');}catch(e){toast(e.message);}}
async function requestPayout(){try{await api('/api/payouts',{method:'POST',body:{amount:Number(v('po-amt'))}});toast('Payout requested');loadSec();}catch(e){toast(e.message);}}

async function openService(id){await ensureCats();SF_IMGS=[];document.getElementById('sf-cat').innerHTML=CATCACHE.map(c=>`<option value="${c.key}">${esc((c.labels&&c.labels.en)||c.key)}</option>`).join('');
  if(id){const s=await api('/api/services/'+id);document.getElementById('svc-title').textContent='Edit service';document.getElementById('sf-id').value=s.id;document.getElementById('sf-title').value=s.title;document.getElementById('sf-loc').value=s.location||'';document.getElementById('sf-price').value=s.price;document.getElementById('sf-dur').value=s.duration||'';document.getElementById('sf-desc').value=s.description||'';document.getElementById('sf-feat').checked=!!s.featured;SF_IMGS=(s.images||[]).slice();const c=CATCACHE.find(x=>x.id===s.category_id);if(c)document.getElementById('sf-cat').value=c.key;}
  else{document.getElementById('svc-title').textContent='New service';['sf-id','sf-title','sf-loc','sf-price','sf-dur','sf-desc'].forEach(x=>document.getElementById(x).value='');document.getElementById('sf-feat').checked=false;}
  renderSfImgs();openModal('svc-modal');}
function renderSfImgs(){document.getElementById('sf-imgs').innerHTML=SF_IMGS.map((u,i)=>`<div class="th" style="background-image:url('${u}')"><b onclick="SF_IMGS.splice(${i},1);renderSfImgs()">×</b></div>`).join('');}
function sfUpload(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=()=>{SF_IMGS.push(r.result);renderSfImgs();};r.readAsDataURL(f);});e.target.value='';}
async function saveService(){const id=document.getElementById('sf-id').value;const body={title:v('sf-title'),category_key:v('sf-cat'),location:v('sf-loc'),price:Number(v('sf-price'))||0,duration:v('sf-dur'),description:v('sf-desc'),featured:document.getElementById('sf-feat').checked,images:SF_IMGS};
  try{if(id)await api('/api/services/'+id,{method:'PUT',body});else await api('/api/services',{method:'POST',body});closeModal('svc-modal');toast('Saved');loadSec();}catch(e){toast(e.message);}}

async function saveMarketer(){try{await api('/api/affiliates',{method:'POST',body:{name:v('mk-name'),email:v('mk-email'),password:v('mk-pass')||undefined,commission_rate:(Number(v('mk-rate'))||5)/100,code:v('mk-code')||undefined}});closeModal('mkt-modal');['mk-name','mk-email','mk-pass','mk-code'].forEach(x=>document.getElementById(x).value='');toast('Marketer created');loadSec();}catch(e){toast(e.message);}}

async function openBanner(id){const svc=await api('/api/services');document.getElementById('bn-svc').innerHTML=`<option value="">— none —</option>`+svc.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('');
  if(id){const b=(await api('/api/banners?all=1')).find(x=>x.id===id);document.getElementById('ban-title').textContent='Edit banner';document.getElementById('bn-id').value=b.id;document.getElementById('bn-title').value=b.title||'';document.getElementById('bn-image').value=b.image||'';document.getElementById('bn-svc').value=b.service_id||'';document.getElementById('bn-active').checked=!!b.active;}
  else{document.getElementById('ban-title').textContent='New banner';['bn-id','bn-title','bn-image'].forEach(x=>document.getElementById(x).value='');document.getElementById('bn-active').checked=true;}
  openModal('ban-modal');}
async function saveBanner(){const id=document.getElementById('bn-id').value;const body={title:v('bn-title'),image:v('bn-image'),service_id:v('bn-svc')||null,active:document.getElementById('bn-active').checked};try{if(id)await api('/api/banners/'+id,{method:'PUT',body});else await api('/api/banners',{method:'POST',body});closeModal('ban-modal');toast('Saved');loadSec();}catch(e){toast(e.message);}}

function copyLink(){const el=document.getElementById('aff-link');el.select();navigator.clipboard.writeText(el.value).then(()=>toast('Copied'));}
function qrSvg(text){let h=0;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))>>>0;const n=21,cell=8;let rects='';for(let y=0;y<n;y++)for(let x=0;x<n;x++){const fin=(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7);const on=fin?((x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4))):(((h>>((x*3+y*5)%31))&1)&&((x+y)%2===0||((h>>(x%13))&1)));if(on)rects+=`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}"/>`;}return `<svg class="qr" width="${n*cell}" height="${n*cell}" viewBox="0 0 ${n*cell} ${n*cell}" fill="#111">${rects}</svg>`;}

  /* ===================== Group Trips — admin dashboard ===================== */
/* Adds a "Group Trips" section to the Admin dashboard. Self-contained: it only
   augments the existing NAV / NAVICON / SEC objects, so nothing else changes. */
(function(){
  // 1) Add the menu item (before "Settings") + its icon.
  if(NAV.admin.indexOf('grouptrips')<0){
    var at=NAV.admin.indexOf('settings'); if(at<0) at=NAV.admin.length;
    NAV.admin.splice(at,0,'grouptrips');
  }
  NAVICON.grouptrips='users';

  // 2) Show a friendly "Group Trips" label (renderNav auto-capitalises keys).
  var _renderNav=renderNav;
  renderNav=function(){
    _renderNav();
    document.querySelectorAll('#dnav button').forEach(function(b){
      if(b.textContent.trim()==='Grouptrips'){
        b.childNodes.forEach(function(n){
          if(n.nodeType===3 && n.textContent.indexOf('Grouptrips')>=0)
            n.textContent=n.textContent.replace('Grouptrips','Group Trips');
        });
      }
    });
  };

  // 3) The panel itself.
  SEC['admin:grouptrips']=async function(m){
    var d=await api('/api/admin/group-trips');
    var trips=d.trips||[];
    var cnt=function(k){return trips.filter(function(t){return t.status===k;}).length;};
    m.innerHTML=
      '<div class="stats">'
      +'<div class="stat"><div class="n">'+trips.length+'</div><div class="l">Total trips</div></div>'
      +'<div class="stat"><div class="n">'+cnt('pending')+'</div><div class="l">Awaiting quote</div></div>'
      +'<div class="stat"><div class="n">'+(cnt('open')+cnt('voting'))+'</div><div class="l">Live (open / voting)</div></div>'
      +'<div class="stat"><div class="n">'+cnt('confirmed')+'</div><div class="l">Confirmed</div></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">'
      +'<h3 style="margin:0;flex:1">Group trips ('+trips.length+')</h3>'
      +'<button class="btn sm" onclick="gtNew()">+ New trip</button>'
      +'<button class="btn ghost sm" onclick="gtSettingsModal()">Settings</button>'
      +'<button class="btn ghost sm" onclick="gtSeedDemo()">Seed demo</button>'
      +'<button class="btn danger sm" onclick="gtClearDemo()">Clear demo</button>'
      +'</div>'
      +tbl(['#','Title','Status','Dates','Members','Per person','Prices S / G','Actions'],
        trips.map(function(t){
          return [
            t.id,
            esc(t.title||'—')+(t.admin_note==='__DEMO__'?' <span class="tag">demo</span>':''),
            statusTag(t.status),
            (t.date_from||t.preferred_date||'—')+(t.date_to?(' → '+t.date_to):'')+(t.final_date?('<br><b>Final: '+t.final_date+'</b>'):''),
            (t.members_count||0)+(t.min_people?(' / '+t.min_people):''),
            t.current_per_person!=null?money(t.current_per_person):'—',
            (t.price_small!=null?money(t.price_small):'—')+' / '+(t.price_group!=null?money(t.price_group):'—'),
            gtActions(t)
          ];
        }));
  };
})();

function gtActions(t){
  var b=['<button class="btn ghost sm" onclick="gtMembers('+t.id+')">Members</button>'];
  if(t.status==='pending'||t.status==='quoted') b.push('<button class="btn sm" onclick="gtQuote('+t.id+')">Quote</button>');
  if(t.status==='open'||t.status==='voting') b.push('<button class="btn sm" onclick="gtFinalize('+t.id+')">Finalize</button>');
  b.push('<button class="btn ghost sm" onclick="gtStatus('+t.id+')">Status</button>');
  return b.join(' ');
}
async function gtNew(){
  var title=prompt('Trip title:'); if(title===null) return;
  var itn=prompt('Itinerary (places & plan):'); if(itn===null) return;
  var from=prompt('Available FROM (YYYY-MM-DD):')||null;
  var to=prompt('Available TO (YYYY-MM-DD):')||null;
  try{await api('/api/group-trips/request',{method:'POST',body:{title:title,itinerary_text:itn||title,date_from:from,date_to:to}});toast('Trip created — now set a quote');loadSec();}catch(e){toast(e.message);}
}
async function gtQuote(id){
  var ps=Number(prompt('Private-car (ملاكي) TOTAL price in $:')); if(!ps) return;
  var pg=Number(prompt('Bus/group (باص) TOTAL price in $:')); if(!pg) return;
  try{await api('/api/admin/group-trips/'+id+'/quote',{method:'POST',body:{price_small:ps,price_group:pg}});toast('Quoted');loadSec();}catch(e){toast(e.message);}
}
async function gtStatus(id){
  var st=prompt('New status: pending, quoted, open, voting, confirmed, completed, cancelled, expired'); if(!st) return;
  try{await api('/api/admin/group-trips/'+id+'/status',{method:'POST',body:{status:st.trim()}});toast('Status → '+st.trim());loadSec();}catch(e){toast(e.message);}
}
async function gtFinalize(id){
  var d=prompt('Final trip date (YYYY-MM-DD) — leave blank to auto-pick the top-voted day:'); if(d===null) return;
  try{var r=await api('/api/admin/group-trips/'+id+'/finalize',{method:'POST',body:{final_date:d||undefined}});toast('Confirmed for '+(r.final_date||''));loadSec();}catch(e){toast(e.message);}
}
var GT_MTRIP=null;
async function gtMembers(id){
  GT_MTRIP=id;
  try{
    var r=await api('/api/admin/group-trips/'+id+'/members');var list=r.members||[];
    var m=document.getElementById('dmain');
    m.innerHTML='<button class="btn ghost sm" onclick="navTo(\'grouptrips\')">← Back to trips</button>'
      +'<h3 style="margin:14px 0">Members of trip #'+id+' ('+list.length+')</h3>'
      +tbl(['#','Name','Phone','Seats','Amount','Status','Voted day','Action'],
        list.map(function(x){
          return [x.id,esc(x.name||'—'),esc(x.phone||'—'),x.seats,money(x.amount),statusTag(x.status),x.vote_date||'—',
            '<button class="btn sm" onclick="gtPay('+x.id+')">Mark paid</button> <button class="btn ghost sm" onclick="gtRefund('+x.id+')">Refund</button>'];
        }));
  }catch(e){toast(e.message);}
}
async function gtPay(id){try{await api('/api/admin/group-members/'+id+'/pay',{method:'POST',body:{status:'paid'}});toast('Marked paid');if(GT_MTRIP)gtMembers(GT_MTRIP);}catch(e){toast(e.message);}}
async function gtRefund(id){if(!confirm('Refund this member?'))return;try{await api('/api/admin/group-members/'+id+'/pay',{method:'POST',body:{status:'refunded'}});toast('Refunded');if(GT_MTRIP)gtMembers(GT_MTRIP);}catch(e){toast(e.message);}}
async function gtSeedDemo(){if(!confirm('Add 10 demo group trips? (safe — you can remove them anytime)'))return;try{var r=await api('/api/admin/group-trips/seed-demo',{method:'POST'});toast('Added '+r.created+' demo trips');loadSec();}catch(e){toast(e.message);}}
async function gtClearDemo(){if(!confirm('Remove ALL demo group trips?'))return;try{var r=await api('/api/admin/group-trips/clear-demo',{method:'POST'});toast('Removed '+r.removed+' demo trips');loadSec();}catch(e){toast(e.message);}}
async function gtSettingsModal(){
  try{
    var s=await api('/api/group-trips/settings');
    var min=prompt('Minimum people to confirm a trip:',s.min_people); if(min===null) return;
    var max=prompt('Maximum people:',s.max_people); if(max===null) return;
    var dl=prompt('Join deadline (days):',s.deadline_days); if(dl===null) return;
    var vh=prompt('Voting window (hours):',s.vote_hours); if(vh===null) return;
    var rh=prompt('Refund window (hours before trip):',s.refund_hours); if(rh===null) return;
    await api('/api/admin/group-trips/settings',{method:'POST',body:{min_people:Number(min),max_people:Number(max),deadline_days:Number(dl),vote_hours:Number(vh),refund_hours:Number(rh)}});
    toast('Group-trip settings saved');
  }catch(e){toast(e.message);}
}
/* =================== end Group Trips — admin dashboard =================== */
renderAuth();loadSlider();loadSlider2();loadCats();loadServices();
