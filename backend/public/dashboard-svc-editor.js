/* =====================================================================
 * RaGo - Premium service editor (frontend-only, v1)
 * A professional, multi-section editor for providers with real,
 * backend-persisted options: category, location, price + currency,
 * duration, rich description, photo gallery (cover + remove),
 * cancellation policy (presets or custom) and per-date availability
 * with slots.
 *
 * SAFE & ADDITIVE: builds its OWN modal and overrides window.openService
 * and window.saveService. Reuses window.api / toast / esc / loadSec.
 * ===================================================================== */
(function(){
  'use strict';
  if(window.__ragoSvcEditor) return;
  window.__ragoSvcEditor=true;

  var SVC={id:null,images:[],avail:[],cats:[]};
  function api(p,o){ return window.api(p,o); }
  function esc(s){ return (typeof window.esc==='function')?window.esc(s):String(s==null?'':s); }
  function toast(m){ if(typeof window.toast==='function') window.toast(m); }
  function el(id){ return document.getElementById(id); }

  var POLICIES=[
    {k:'Flexible',t:'Free cancellation up to 24 hours before the experience starts - full refund.'},
    {k:'Moderate',t:'Free cancellation up to 3 days before the start - 50% refund afterwards.'},
    {k:'Strict',t:'Free cancellation up to 7 days before the start - no refund afterwards.'},
    {k:'Non-refundable',t:'This booking is non-refundable once it is confirmed.'}
  ];
  var CURRENCIES=['USD','EUR','GBP','EGP','SAR','AED'];

  var CSS=[
    '#rgpsv-modal .modal{max-width:720px}',
    '.rgpsv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}',
    '.rgpsv-head h3{margin:0}',
    '.rgpsv-x{border:none;background:var(--soft2);width:32px;height:32px;border-radius:9px;font-size:20px;line-height:1;cursor:pointer;color:var(--text2)}',
    '.rgpsv-x:hover{background:var(--border);color:var(--text)}',
    '.rgpsv-sec{border-top:1px solid var(--border);padding:15px 0 4px;margin-top:8px}',
    '.rgpsv-lg{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--blue);margin-bottom:11px}',
    '.rgpsv-imgs{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}',
    '.rgpsv-th{position:relative;width:106px;height:76px;border-radius:10px;background-size:cover;background-position:center;background-color:#eee;border:1px solid var(--border);overflow:hidden}',
    '.rgpsv-th.cover{border:2px solid var(--gold)}',
    '.rgpsv-cv{position:absolute;left:6px;top:6px;background:var(--gold);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px}',
    '.rgpsv-mk{position:absolute;left:6px;bottom:6px;border:none;background:rgba(18,59,76,.82);color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:7px;cursor:pointer;opacity:0;transition:.15s}',
    '.rgpsv-th:hover .rgpsv-mk{opacity:1}',
    '.rgpsv-rm{position:absolute;right:5px;top:5px;border:none;background:var(--red);color:#fff;width:20px;height:20px;border-radius:50%;font-size:13px;line-height:20px;text-align:center;cursor:pointer;padding:0}',
    '.rgpsv-avail{display:flex;flex-direction:column;gap:7px;margin:2px 0 11px}',
    '.rgpsv-arow{display:flex;align-items:center;gap:10px;background:var(--soft);border:1px solid var(--border);border-radius:10px;padding:8px 12px}',
    '.rgpsv-adate{font-weight:700;font-size:14px}',
    '.rgpsv-aslots{color:var(--text2);font-size:13px;flex:1}',
    '.rgpsv-rm2{border:none;background:transparent;color:var(--red);font-weight:700;font-size:13px;cursor:pointer}',
    '.rgpsv-addrow{display:flex;gap:9px;flex-wrap:wrap;align-items:center}',
    '.rgpsv-addrow input{padding:9px 12px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:14px;font-family:inherit}',
    '.rgpsv-addrow input.d{flex:1;min-width:150px}',
    '.rgpsv-addrow input.s{width:120px}',
    '.rgpsv-feat{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:600;margin-top:16px;padding:12px 14px;background:var(--soft);border-radius:11px;cursor:pointer}',
    '.rgpsv-foot{display:flex;gap:10px;margin-top:18px}',
    '.rgpsv-hint{color:var(--text2);font-size:12.5px;margin:6px 0 0}'
  ].join('');

  function injectCss(){
    if(el('rgpsv-styles')) return;
    var s=document.createElement('style');
    s.id='rgpsv-styles';
    s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }

  function modalHtml(){
    return '<div class="modal rgpsv">'
      +'<div class="rgpsv-head"><h3 id="rgpsv-hd">New service</h3><button type="button" class="rgpsv-x" onclick="closeModal('+"'rgpsv-modal'"+')">&times;</button></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Basics</div>'
      +'<div class="field"><label>Title</label><input id="rgpsv-title" placeholder="e.g. Giza Pyramids &amp; Sphinx Half-Day Tour"></div>'
      +'<div class="row"><div class="field"><label>Category</label><select id="rgpsv-cat"></select></div><div class="field"><label>Location</label><input id="rgpsv-loc" placeholder="City / area"></div></div></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Pricing &amp; duration</div>'
      +'<div class="row"><div class="field"><label>Price</label><input id="rgpsv-price" type="number" min="0"></div><div class="field"><label>Currency</label><select id="rgpsv-cur"></select></div><div class="field"><label>Duration</label><input id="rgpsv-dur" placeholder="e.g. 8h / 3 days"></div></div></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Description</div>'
      +'<div class="field"><textarea id="rgpsv-desc" rows="4" placeholder="Describe the experience, what makes it special, and what guests will see and do..."></textarea></div></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Photos</div>'
      +'<input type="file" id="rgpsv-file" accept="image/*" multiple onchange="rgpSvcFiles(event)">'
      +'<div class="rgpsv-imgs" id="rgpsv-imgs"></div>'
      +'<p class="rgpsv-hint">The first photo is the cover. Hover a photo to make it the cover.</p></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Cancellation policy</div>'
      +'<div class="field"><select id="rgpsv-pol" onchange="rgpSvcPolicy()"></select></div>'
      +'<div class="field"><textarea id="rgpsv-poltext" rows="2"></textarea></div></div>'
      +'<div class="rgpsv-sec"><div class="rgpsv-lg">Availability</div>'
      +'<div class="rgpsv-avail" id="rgpsv-avail"></div>'
      +'<div class="rgpsv-addrow"><input class="d" id="rgpsv-adate-in" type="date"><input class="s" id="rgpsv-aslots-in" type="number" min="0" placeholder="Slots"><button type="button" class="rgp-pbtn ghost" onclick="rgpSvcAddAvail()">Add date</button></div></div>'
      +'<label class="rgpsv-feat"><input type="checkbox" id="rgpsv-feat"> <span>Feature this service on the homepage</span></label>'
      +'<div class="rgpsv-foot"><button type="button" class="rgp-pbtn gold" onclick="rgpSaveService()">Save service</button><button type="button" class="rgp-pbtn ghost" onclick="closeModal('+"'rgpsv-modal'"+')">Cancel</button></div>'
      +'</div>';
  }

  function ensureModal(){
    injectCss();
    if(el('rgpsv-modal')) return;
    var ov=document.createElement('div');
    ov.className='overlay';
    ov.id='rgpsv-modal';
    ov.innerHTML=modalHtml();
    document.body.appendChild(ov);
  }

  function rgpRenderThumbs(){
    var c=el('rgpsv-imgs'); if(!c) return;
    c.innerHTML=SVC.images.map(function(u,i){
      return '<div class="rgpsv-th'+(i===0?' cover':'')+'" style="background-image:url('+"'"+u+"'"+')">'
        +(i===0?'<span class="rgpsv-cv">Cover</span>':'<button type="button" class="rgpsv-mk" onclick="rgpSvcCover('+i+')">Set cover</button>')
        +'<button type="button" class="rgpsv-rm" onclick="rgpSvcRmImg('+i+')">&times;</button></div>';
    }).join('')||'<p class="rgpsv-hint">No photos yet - add a few bright, high-quality shots to attract guests.</p>';
  }
  function rgpRenderAvail(){
    var c=el('rgpsv-avail'); if(!c) return;
    c.innerHTML=SVC.avail.map(function(a,i){
      return '<div class="rgpsv-arow"><span class="rgpsv-adate">'+esc(a.date)+'</span><span class="rgpsv-aslots">'+(Number(a.slots)||0)+' slots</span><button type="button" class="rgpsv-rm2" onclick="rgpSvcRmAvail('+i+')">Remove</button></div>';
    }).join('')||'<p class="rgpsv-hint">No dates yet - add availability so guests can pick a day.</p>';
  }

  function rgpSvcFiles(e){
    var files=e.target.files; if(!files) return;
    Array.prototype.forEach.call(files,function(f){
      var r=new FileReader();
      r.onload=function(){ SVC.images.push(r.result); rgpRenderThumbs(); };
      r.readAsDataURL(f);
    });
    e.target.value='';
  }
  function rgpSvcRmImg(i){ SVC.images.splice(i,1); rgpRenderThumbs(); }
  function rgpSvcCover(i){ var u=SVC.images.splice(i,1)[0]; if(u!=null) SVC.images.unshift(u); rgpRenderThumbs(); }
  function rgpSvcAddAvail(){
    var d=el('rgpsv-adate-in').value;
    var s=Number(el('rgpsv-aslots-in').value)||0;
    if(!d){ toast('Pick a date first'); return; }
    var found=false;
    SVC.avail.forEach(function(a){ if(a.date===d){ a.slots=s; found=true; } });
    if(!found) SVC.avail.push({date:d,slots:s});
    SVC.avail.sort(function(a,b){ return a.date<b.date?-1:(a.date>b.date?1:0); });
    el('rgpsv-adate-in').value=''; el('rgpsv-aslots-in').value='';
    rgpRenderAvail();
  }
  function rgpSvcRmAvail(i){ SVC.avail.splice(i,1); rgpRenderAvail(); }
  function rgpSvcPolicy(){
    var k=el('rgpsv-pol').value;
    var p=POLICIES.filter(function(x){ return x.k===k; })[0];
    el('rgpsv-poltext').value = p ? p.t : '';
  }

  async function rgpOpenService(id){
    ensureModal();
    try{ SVC.cats=await api('/api/categories'); }catch(e){ SVC.cats=[]; }
    el('rgpsv-cat').innerHTML=SVC.cats.map(function(c){ return '<option value="'+esc(c.key)+'">'+esc((c.labels&&c.labels.en)||c.key)+'</option>'; }).join('');
    el('rgpsv-cur').innerHTML=CURRENCIES.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
    el('rgpsv-pol').innerHTML=POLICIES.map(function(p){ return '<option value="'+esc(p.k)+'">'+esc(p.k)+'</option>'; }).join('')+'<option value="Custom">Custom...</option>';
    SVC.id=null; SVC.images=[]; SVC.avail=[];
    if(id){
      var s=await api('/api/services/'+id);
      SVC.id=s.id;
      el('rgpsv-hd').textContent='Edit service';
      el('rgpsv-title').value=s.title||'';
      el('rgpsv-loc').value=s.location||'';
      el('rgpsv-price').value=(s.price!=null?s.price:'');
      el('rgpsv-cur').value=s.currency||'USD';
      el('rgpsv-dur').value=s.duration||'';
      el('rgpsv-desc').value=s.description||'';
      el('rgpsv-feat').checked=!!s.featured;
      var cat=SVC.cats.filter(function(c){ return c.id===s.category_id; })[0];
      if(cat) el('rgpsv-cat').value=cat.key;
      SVC.images=(s.images||[]).slice();
      SVC.avail=(s.availability||[]).map(function(a){ return {date:a.date,slots:Number(a.slots)||0}; });
      var pol=s.cancel_policy||'';
      var match=POLICIES.filter(function(p){ return p.t===pol||p.k===pol; })[0];
      if(match){ el('rgpsv-pol').value=match.k; el('rgpsv-poltext').value=match.t; }
      else if(pol){ el('rgpsv-pol').value='Custom'; el('rgpsv-poltext').value=pol; }
      else { el('rgpsv-pol').value='Flexible'; el('rgpsv-poltext').value=POLICIES[0].t; }
    } else {
      el('rgpsv-hd').textContent='New service';
      ['rgpsv-title','rgpsv-loc','rgpsv-price','rgpsv-dur','rgpsv-desc'].forEach(function(x){ el(x).value=''; });
      el('rgpsv-cur').value='USD';
      el('rgpsv-feat').checked=false;
      el('rgpsv-pol').value='Flexible';
      el('rgpsv-poltext').value=POLICIES[0].t;
    }
    rgpRenderThumbs(); rgpRenderAvail();
    el('rgpsv-modal').classList.add('on');
  }

  async function rgpSaveService(){
    var body={
      title:el('rgpsv-title').value,
      category_key:el('rgpsv-cat').value,
      location:el('rgpsv-loc').value,
      price:Number(el('rgpsv-price').value)||0,
      currency:el('rgpsv-cur').value||'USD',
      duration:el('rgpsv-dur').value,
      description:el('rgpsv-desc').value,
      cancel_policy:el('rgpsv-poltext').value,
      featured:el('rgpsv-feat').checked,
      images:SVC.images
    };
    if(!body.title){ toast('Please enter a title'); return; }
    try{
      var saved;
      if(SVC.id) saved=await api('/api/services/'+SVC.id,{method:'PUT',body:body});
      else saved=await api('/api/services',{method:'POST',body:body});
      var sid=(saved&&saved.id)||SVC.id;
      if(sid){
        for(var i=0;i<SVC.avail.length;i++){
          var a=SVC.avail[i];
          if(a.date){ try{ await api('/api/availability',{method:'POST',body:{service_id:sid,date:a.date,slots:Number(a.slots)||0}}); }catch(e){} }
        }
      }
      el('rgpsv-modal').classList.remove('on');
      toast('Saved');
      if(typeof window.loadSec==='function') window.loadSec();
    }catch(e){ toast((e&&e.message)||'Save failed'); }
  }

  window.openService=rgpOpenService;
  window.saveService=rgpSaveService;
  window.rgpSaveService=rgpSaveService;
  window.rgpSvcFiles=rgpSvcFiles;
  window.rgpSvcRmImg=rgpSvcRmImg;
  window.rgpSvcCover=rgpSvcCover;
  window.rgpSvcAddAvail=rgpSvcAddAvail;
  window.rgpSvcRmAvail=rgpSvcRmAvail;
  window.rgpSvcPolicy=rgpSvcPolicy;
})();
