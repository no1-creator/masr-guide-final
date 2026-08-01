const API='';
let TOKEN=localStorage.getItem('mg_token')||'';
let USER=JSON.parse(localStorage.getItem('mg_user')||'null');
let REF=localStorage.getItem('mg_ref')||'';
let CATS=[],CUR_CAT='',CUR_SVC=null,SF_IMGS=[],LOGIN_MODE='login';

(()=>{const u=new URL(location.href);const r=u.searchParams.get('ref');if(r){REF=r;localStorage.setItem('mg_ref',r);api('/api/track/'+encodeURIComponent(r),{method:'POST'}).catch(()=>{});}})();

async function api(path,opts={}){
  const h={'Content-Type':'application/json'};
  if(TOKEN) h['Authorization']='Bearer '+TOKEN;
  const res=await fetch(API+path,{method:opts.method||'GET',headers:h,body:opts.body?JSON.stringify(opts.body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||('HTTP '+res.status));
  return data;
}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200);}
function closeModal(id){document.getElementById(id).classList.remove('on');}
function openModal(id){document.getElementById(id).classList.add('on');}
function money(n){return '$'+Number(n||0).toLocaleString();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function v(id){return document.getElementById(id).value;}

let AUTH_METHOD='email', OTP_PHONE='';

function renderAuth(){
  const chip=document.getElementById('user-chip'),lb=document.getElementById('login-btn'),db=document.getElementById('dash-btn');
  if(USER){chip.innerHTML=`<span class="chip">${esc(USER.name||USER.email)} · ${USER.role}</span>`;lb.textContent='Log out';lb.onclick=logout;db.classList.toggle('hidden',USER.role==='customer');}
  else{chip.innerHTML='';lb.textContent='Log in';lb.onclick=openLogin;db.classList.add('hidden');}
}

function openLogin(){
  setLoginMode('login');
  setAuthMethod('email');
  // reset phone state
  document.getElementById('ph-code-wrap').classList.add('hidden');
  document.getElementById('ph-verify').classList.add('hidden');
  document.getElementById('ph-send').classList.remove('hidden');
  document.getElementById('ph-hint').textContent='';
  const pn=document.getElementById('ph-number'),pc=document.getElementById('ph-code'),pnm=document.getElementById('ph-name');
  if(pn)pn.value='';if(pc)pc.value='';if(pnm)pnm.value='';
  openModal('login-modal');
}

// Switch between Email and Phone tabs
function setAuthMethod(m){
  AUTH_METHOD=m;
  document.getElementById('auth-email').classList.toggle('hidden',m!=='email');
  document.getElementById('auth-phone').classList.toggle('hidden',m!=='phone');
  const te=document.getElementById('tab-email'),tp=document.getElementById('tab-phone');
  te.style.background=(m==='email')?'var(--blue)':'var(--soft2)';te.style.color=(m==='email')?'#fff':'var(--text)';
  tp.style.background=(m==='phone')?'var(--blue)':'var(--soft2)';tp.style.color=(m==='phone')?'#fff':'var(--text)';
}

function setLoginMode(mode){LOGIN_MODE=mode;syncLogin();}
function syncLogin(){
  const reg=LOGIN_MODE==='register';
  document.getElementById('login-title').textContent=reg?'Create account':'Log in';
  document.getElementById('li-submit').textContent=reg?'Sign up':'Log in';
  document.getElementById('reg-extra').classList.toggle('hidden',!reg);
  document.getElementById('li-switch').innerHTML=reg?`Have an account? <a href="#" onclick="setLoginMode('login');return false">Log in</a>`:`New here? <a href="#" onclick="setLoginMode('register');return false">Create account</a>`;
}

// Shared: store session + close modal + refresh UI
function finishAuth(r){
  TOKEN=r.token;USER=r.user;
  localStorage.setItem('mg_token',TOKEN);localStorage.setItem('mg_user',JSON.stringify(USER));
  closeModal('login-modal');renderAuth();toast('Welcome, '+(USER.name||USER.email));
  if(USER.role!=='customer') openDash();
}

async function doAuth(){
  const email=document.getElementById('li-email').value.trim(),password=document.getElementById('li-pass').value;
  try{
    let r;
    if(LOGIN_MODE==='register'){r=await api('/api/auth/register',{method:'POST',body:{email,password,name:document.getElementById('li-name').value,role:document.getElementById('li-role').value}});}
    else{r=await api('/api/auth/login',{method:'POST',body:{email,password}});}
    finishAuth(r);
  }catch(e){toast(e.message);}
}

// Phone + OTP
async function sendOtp(){
  const phone=document.getElementById('ph-number').value.trim();
  if(!phone){toast('Enter your mobile number');return;}
  try{
    const r=await api('/api/auth/otp/request',{method:'POST',body:{phone}});
    OTP_PHONE=phone;
    document.getElementById('ph-code-wrap').classList.remove('hidden');
    document.getElementById('ph-send').classList.add('hidden');
    document.getElementById('ph-verify').classList.remove('hidden');
    document.getElementById('ph-hint').textContent=r.dev_code?('Test mode — your code is: '+r.dev_code):'We sent a verification code to your phone.';
  }catch(e){toast(e.message);}
}
async function verifyOtp(){
  const code=document.getElementById('ph-code').value.trim();
  const name=document.getElementById('ph-name').value.trim();
  if(!code){toast('Enter the code');return;}
  try{
    const r=await api('/api/auth/otp/verify',{method:'POST',body:{phone:OTP_PHONE,code,name:name||undefined}});
    finishAuth(r);
  }catch(e){toast(e.message);}
}

// Social sign-in (buttons show until Google/Apple credentials are added)
function socialSoon(p){toast(p+' sign-in will be enabled soon.');}

function logout(){TOKEN='';USER=null;localStorage.removeItem('mg_token');localStorage.removeItem('mg_user');renderAuth();goHome();}
function goHome(){show('public-view');}
function show(id){['public-view','detail-view','dash-view'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id));window.scrollTo(0,0);}

let SLIDES=[],slideI=0,slideTimer=null;
async function loadSlider(){
  try{SLIDES=await api('/api/banners');}catch{SLIDES=[];}
  const s=document.getElementById('slider');
  if(!SLIDES.length){s.style.display='none';return;}
  s.style.display='block';
  s.innerHTML=SLIDES.map((b,i)=>`<div class="slide ${i===0?'on':''}" style="background-image:url('${b.image||''}')" onclick="${b.service&&b.service.id?`openDetail(${b.service.id})`:''}"><div class="cap"><h3>${esc(b.title)}</h3>${b.service?`<span class="chip">Book now &rarr;</span>`:''}</div></div>`).join('')
    +`<button class="snav l" onclick="slideBy(-1)">&lsaquo;</button><button class="snav r" onclick="slideBy(1)">&rsaquo;</button>`
    +`<div class="dots">${SLIDES.map((b,i)=>`<i class="${i===0?'on':''}" onclick="slideTo(${i})"></i>`).join('')}</div>`;
  slideI=0;clearInterval(slideTimer);slideTimer=setInterval(()=>slideBy(1),5000);
}
function slideTo(i){slideI=(i+SLIDES.length)%SLIDES.length;document.querySelectorAll('#slider .slide').forEach((el,x)=>el.classList.toggle('on',x===slideI));document.querySelectorAll('#slider .dots i').forEach((el,x)=>el.classList.toggle('on',x===slideI));}
function slideBy(d){slideTo(slideI+d);}
let SLIDES2=[],slide2I=0,slide2Timer=null;
async function loadSlider2(){
  try{SLIDES2=(await api('/api/banners')).slice().reverse();}catch{SLIDES2=[];}
  const s=document.getElementById('slider2');if(!s)return;
  if(SLIDES2.length<1){s.style.display='none';return;}
  s.style.display='block';
  s.innerHTML=SLIDES2.map((b,i)=>`<div class="slide ${i===0?'on':''}" style="background-image:url('${b.image||''}')" onclick="${b.service&&b.service.id?`openDetail(${b.service.id})`:''}"><div class="cap"><h3>${esc(b.title)}</h3>${b.service?`<span class="chip">Book now &rarr;</span>`:''}</div></div>`).join('')
    +`<button class="snav l" onclick="slide2By(-1)">&lsaquo;</button><button class="snav r" onclick="slide2By(1)">&rsaquo;</button>`
    +`<div class="dots">${SLIDES2.map((b,i)=>`<i class="${i===0?'on':''}" onclick="slide2To(${i})"></i>`).join('')}</div>`;
  slide2I=0;clearInterval(slide2Timer);slide2Timer=setInterval(()=>slide2By(1),6000);
}
function slide2To(i){slide2I=(i+SLIDES2.length)%SLIDES2.length;document.querySelectorAll('#slider2 .slide').forEach((el,x)=>el.classList.toggle('on',x===slide2I));document.querySelectorAll('#slider2 .dots i').forEach((el,x)=>el.classList.toggle('on',x===slide2I));}
function slide2By(d){slide2To(slide2I+d);}

const ICONS={
  all:`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>`,
  plane:`<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`,
  file:`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>`,
  car:`<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>`,
  bed:`<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`,
  compass:`<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  landmark:`<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>`,
  ship:`<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/>`,
  waves:`<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/>`,
  mountain:`<path d="m3 20 6.5-13 4 8 2.5-4L21 20z"/>`,
  key:`<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>`,
  user:`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  phone:`<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>`,
  utensils:`<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
  bag:`<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  sparkles:`<path d="M9.94 14.06A2 2 0 0 0 8.5 12.63L3.4 11.3a.5.5 0 0 1 0-.96l5.1-1.33A2 2 0 0 0 9.94 7.6l1.32-5.1a.5.5 0 0 1 .96 0l1.33 5.1a2 2 0 0 0 1.44 1.44l5.1 1.32a.5.5 0 0 1 0 .96l-5.1 1.33a2 2 0 0 0-1.44 1.44l-1.32 5.1a.5.5 0 0 1-.96 0z"/>`,
  ticket:`<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>`,
  shield:`<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`,
  luggage:`<path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"/><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/><path d="M10 20h4"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>`,
  grid:`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>`,
  store:`<path d="M2 7l1.5-4h17L22 7"/><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><path d="M2 7h20"/><path d="M9 21v-6h6v6"/>`,
  image:`<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>`,
  megaphone:`<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>`,
  users:`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  star:`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  wallet:`<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1"/>`,
  settings:`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  link:`<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  pharmacy:`<rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="7.5" x2="12" y2="16.5"/><line x1="7.5" y1="12" x2="16.5" y2="12"/>`,
};
function iconSvg(n){return `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]||ICONS.compass}</svg>`;}
const NAVICON={overview:'grid',vendors:'store',services:'compass',banners:'image',marketers:'megaphone',bookings:'ticket',customers:'users',reviews:'star',payouts:'wallet',settings:'settings',wallet:'wallet',profile:'user',link:'link'};

async function loadCats(){
  try{CATS=await api('/api/categories');}catch{CATS=[];}
  const CATIMG={airport:1,transfers:1,hotels:1,'internal-trips':1,tours:1,'nile-cruise':1,diving:1,safari:1,pharmacy:1,spa:1};const CATGRAD={visa:'#5A6B9E,#2E3A63',carrental:'#6B7B85,#123B4C',guide:'#C98A3B,#8A5A1E',sim:'#2E9E9B,#0E5C5A',dining:'#C46B4A,#7A3B2A',shopping:'#C46B9A,#7A3B63',events:'#7A5AC4,#3E2E7A',insurance:'#3E7CB1,#123B4C',departure:'#8A6BC4,#4A3B7A'};document.getElementById('cats').innerHTML=`<div class="pcard ${CUR_CAT===''?'on':''}" style="background:linear-gradient(135deg,#1C4E63,#0C2A36)" onclick="pickCat('')"><div class="ov"></div><span>All Services</span></div>`+CATS.map(c=>{const _im=CATIMG[c.key];const _st=_im?`background-image:url('img/cat-${c.key}.jpg')`:`background:linear-gradient(135deg,${CATGRAD[c.key]||'#6B7B85,#123B4C'})`;return `<div class="pcard ${CUR_CAT===c.key?'on':''}" style="${_st}" onclick="pickCat('${c.key}')"><div class="ov"></div><span>${esc((c.labels&&c.labels.en)||c.key)}</span></div>`;}).join('');
}
function pickCat(k){CUR_CAT=k;loadCats();loadServices();}
let dbT=null;function debouncedLoad(){clearTimeout(dbT);dbT=setTimeout(loadServices,300);}
async function loadServices(){
  const q=document.getElementById('q').value,sort=document.getElementById('sort').value;
  const params=new URLSearchParams();if(CUR_CAT)params.set('cat',CUR_CAT);if(q)params.set('q',q);if(sort)params.set('sort',sort);
  let list=[];try{list=await api('/api/services?'+params.toString());}catch{list=[];}
  document.getElementById('grid').innerHTML=list.map(s=>`<div class="card" onclick="openDetail(${s.id})"><div class="img" style="background-image:url('${s.cover||(s.images&&s.images[0])||''}')">${s.featured?`<span class="feat">Featured</span>`:''}</div><div class="body"><div class="t">${esc(s.title)}</div><div class="loc">&#128205; ${esc(s.location)}</div><div class="meta"><span class="star">&#9733; ${s.rating} <span class="muted">(${s.reviews_count})</span></span><span class="price">${money(s.price)} <small>/ ${esc(s.duration||'')}</small></span></div></div></div>`).join('')||`<p class="muted">No trips found.</p>`;
}
async function openDetail(id){
  await ensureCats();const s=await api('/api/services/'+id);CUR_SVC=s;const _cat=(CATCACHE||[]).find(x=>x.id===s.category_id);const isShop=!!_cat&&['shopping','pharmacy','bazaar','bazaars'].includes(_cat.key);
  const imgs=s.images&&s.images.length?s.images:[s.cover].filter(Boolean);
  let reviews=[];try{reviews=await api('/api/reviews?service_id='+id);}catch{}
  document.getElementById('detail-body').innerHTML=`<div class="two"><div>
    <div class="hero" id="d-hero" style="background-image:url('${imgs[0]||''}')"></div>
    <div class="gallery">${imgs.map((u,i)=>`<div class="gth ${i===0?'on':''}" style="background-image:url('${u}')" onclick="heroPick(${i})"></div>`).join('')}</div>
    <div class="eyebrow">${esc(s.vendor?s.vendor.name:'')}</div>
    <h2>${esc(s.title)}</h2>
    <p class="muted">&#128205; ${esc(s.location)} &middot; &#9201; ${esc(s.duration||'')} &middot; <span class="star">&#9733; ${s.rating}</span> (${s.reviews_count})</p>
    <p>${esc(s.description)}</p>
    ${isShop?'':`<h3>Availability</h3><p class="muted">${(s.availability||[]).slice(0,8).map(a=>a.date).join(' &middot; ')||'Contact provider'}</p>`}
    <h3>Reviews (${reviews.length})</h3>${reviews.length?reviews.map(r=>`<div class="box" style="margin-bottom:8px"><span class="star">&#9733; ${r.rating}</span> ${esc(r.comment||'')}<div class="muted" style="font-size:13px">&mdash; ${esc(r.name||'Guest')}</div></div>`).join(''):`<p class="muted">No reviews yet.</p>`}
  </div>
  <div><div class="box">
    <div class="price" style="font-size:26px;font-weight:800;color:var(--blue)">${money(s.price)}</div>
    <div class="muted">${isShop?'Retail price':'per person'}</div>
    <button class="btn" style="width:100%;margin-top:12px" onclick="openBooking()">${isShop?'Order / Reserve':'Book now'}</button>
    ${REF?`<p class="muted" style="font-size:13px;margin-top:8px">Referral: ${esc(REF)}</p>`:''}
  </div></div></div>`;
  window.__imgs=imgs;show('detail-view');
}
function heroPick(i){document.getElementById('d-hero').style.backgroundImage="url('"+window.__imgs[i]+"')";document.querySelectorAll('#detail-view .gth').forEach((e,x)=>e.classList.toggle('on',x===i));}
function openBooking(){if(!USER){toast('Please log in to book');openLogin();return;}document.getElementById('bk-ref').textContent=REF?('Referral code applied: '+REF):'';openModal('book-modal');}
async function submitBooking(){
  try{const b=await api('/api/bookings',{method:'POST',body:{service_id:CUR_SVC.id,date:document.getElementById('bk-date').value||null,pax:Number(document.getElementById('bk-pax').value)||1,referral_code:REF||null}});
  closeModal('book-modal');toast('Booked! Ref '+b.ref);}catch(e){toast(e.message);}
}
