/* =====================================================================
 * RaGo - Premium provider "My services" screen (frontend-only, additive)
 * Replaces the flat services table with a professional layout: services
 * grouped by service type, each in an elegant card grid, plus search,
 * type filter, and a "choose a service type" picker so a provider can
 * offer many services - each with its own tailored form.
 *
 * SAFE & ADDITIVE: re-wraps window.loadSec AFTER dashboard-pro.js so it
 * takes priority only for the vendor "services" section; everything else
 * falls through to the previous renderer. Reuses window.api / esc /
 * openService / delService / closeModal / ensureCats / catName.
 * ===================================================================== */
(function(){
  'use strict';
  if(window.__ragoSvcList) return;

  var LIST={mine:[],cats:[],q:'',cat:''};

  function api(p,o){ return window.api(p,o); }
  function esc(s){ return (typeof window.esc==='function')?window.esc(s):String(s==null?'':s); }
  function el(id){ return document.getElementById(id); }
  var SYM={USD:'$',EUR:'€',GBP:'£',EGP:'E£',SAR:'SAR ',AED:'AED '};
  function money(n,cur){ return (SYM[cur||'USD']||'')+Number(n||0).toLocaleString(); }
  function plusIcon(){ return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'; }
  function catLabel(c){ return (c&&c.labels&&(c.labels.en||c.labels))||(c&&c.key)||''; }
  function catInitial(c){ return esc(String(catLabel(c)||'?').slice(0,1).toUpperCase()); }

  var CSS=[
    '.rgpsl-bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}',
    '.rgpsl-search{flex:1;min-width:200px;padding:10px 14px;border:1px solid var(--border);border-radius:11px;font-size:14px;font-family:inherit}',
    '.rgpsl-catf{padding:10px 14px;border:1px solid var(--border);border-radius:11px;font-size:14px;font-family:inherit;background:#fff;min-width:180px}',
    '.rgpsl-group{margin-bottom:26px}',
    '.rgpsl-gh{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}',
    '.rgpsl-gt{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:9px}',
    '.rgpsl-gc{background:var(--blue-soft);color:var(--blue-h);font-size:12px;font-weight:800;padding:2px 10px;border-radius:999px}',
    '.rgpsl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}',
    '.rgpsl-card{background:#fff;border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}',
    '.rgpsl-card:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(18,59,76,.10)}',
    '.rgpsl-cimg{height:140px;background-size:cover;background-position:center;background-color:var(--soft2);position:relative}',
    '.rgpsl-ph{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#123B4C,#0E2E3B)}',
    '.rgpsl-phi{color:#fff;font-size:38px;font-weight:800;opacity:.85}',
    '.rgpsl-feat{position:absolute;top:10px;left:10px;background:var(--gold);color:#fff;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px}',
    '.rgpsl-cb{padding:13px 14px 14px;display:flex;flex-direction:column;gap:9px;flex:1}',
    '.rgpsl-ct{font-weight:700;font-size:14.5px;color:var(--text);line-height:1.25}',
    '.rgpsl-cm{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto}',
    '.rgpsl-price{font-weight:800;color:var(--blue)}',
    '.rgpsl-imgs{font-size:12px;color:var(--text2)}',
    '.rgpsl-actions{display:flex;gap:8px}',
    '.rgpsl-actions .rgp-pbtn{flex:1;justify-content:center}',
    '.rgp-pbtn.sm{padding:7px 12px;font-size:12.5px}',
    '.rgpsl-del{flex:1;border:none;border-radius:11px;padding:7px 12px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer;background:#f7dedb;color:var(--red)}',
    '.rgpsl-del:hover{background:#f2cbc6}',
    '.rgpsl-phd{display:flex;align-items:center;justify-content:space-between}',
    '.rgpsl-x{border:none;background:var(--soft2);width:32px;height:32px;border-radius:9px;font-size:20px;line-height:1;cursor:pointer;color:var(--text2)}',
    '.rgpsl-pickgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}',
    '.rgpsl-pcat{display:flex;flex-direction:column;align-items:center;gap:9px;background:#fff;border:1.5px solid var(--border);border-radius:14px;padding:15px 8px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--text);text-align:center;transition:.15s}',
    '.rgpsl-pcat:hover{border-color:var(--blue);background:var(--blue-soft);transform:translateY(-2px)}',
    '.rgpsl-pci{width:46px;height:46px;border-radius:13px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}',
    '#rgpsl-pick .modal{max-width:640px}'
  ].join('');
  function injectCss(){
    if(el('rgpsl-styles')) return;
    var s=document.createElement('style'); s.id='rgpsl-styles'; s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }

  function secWrap(title,sub,actions,body){
    return '<div class="rgp"><div class="rgp-shead"><div><div class="rgp-stitle">'+esc(title)+'</div>'+(sub?'<div class="rgp-ssub">'+esc(sub)+'</div>':'')+'</div><div class="rgp-sacts">'+(actions||'')+'</div></div>'+body+'</div>';
  }

  function cardHtml(s){
    var cover=s.cover||(s.images&&s.images[0])||'';
    var img = cover
      ? '<div class="rgpsl-cimg" style="background-image:url('+"'"+cover+"'"+')">'+(s.featured?'<span class="rgpsl-feat">Featured</span>':'')+'</div>'
      : '<div class="rgpsl-cimg rgpsl-ph">'+(s.featured?'<span class="rgpsl-feat">Featured</span>':'')+'<span class="rgpsl-phi">'+esc(String(s.title||'?').slice(0,1).toUpperCase())+'</span></div>';
    return '<div class="rgpsl-card">'+img
      +'<div class="rgpsl-cb">'
      +'<div class="rgpsl-ct">'+esc(s.title||'Untitled')+'</div>'
      +'<div class="rgpsl-cm"><span class="rgpsl-price">'+money(s.price,s.currency)+'</span><span class="rgpsl-imgs">'+((s.images&&s.images.length)||0)+' photos</span></div>'
      +'<div class="rgpsl-actions"><button class="rgp-pbtn ghost sm" onclick="rgpslEdit('+s.id+')">Edit</button><button class="rgpsl-del" onclick="rgpslDel('+s.id+')">Delete</button></div>'
      +'</div></div>';
  }

  function renderBody(){
    var c=el('rgpsl-body'); if(!c) return;
    var q=String(LIST.q||'').toLowerCase();
    var filtered=LIST.mine.filter(function(s){
      if(LIST.cat && String(s.category_id)!==String(LIST.cat)) return false;
      if(q && String(s.title||'').toLowerCase().indexOf(q)<0 && String(s.location||'').toLowerCase().indexOf(q)<0) return false;
      return true;
    });
    if(!filtered.length){ c.innerHTML='<div class="rgp-panel"><p class="muted" style="margin:8px 0">No services match your search. Try another term or add a new one.</p></div>'; return; }
    var groups=[];
    LIST.cats.forEach(function(cat){
      var items=filtered.filter(function(s){ return s.category_id===cat.id; });
      if(items.length) groups.push({cat:cat, items:items});
    });
    var uncat=filtered.filter(function(s){ return !LIST.cats.some(function(c){ return c.id===s.category_id; }); });
    if(uncat.length) groups.push({cat:null, items:uncat});
    c.innerHTML=groups.map(function(g){
      var name=g.cat?catLabel(g.cat):'Other';
      var key=g.cat?g.cat.key:'';
      return '<div class="rgpsl-group">'
        +'<div class="rgpsl-gh"><div class="rgpsl-gt">'+esc(name)+' <span class="rgpsl-gc">'+g.items.length+'</span></div>'
        +(key?'<button class="rgp-pbtn ghost sm" onclick="rgpslNew('+"'"+esc(key)+"'"+')">'+plusIcon()+'Add</button>':'')+'</div>'
        +'<div class="rgpsl-grid">'+g.items.map(cardHtml).join('')+'</div></div>';
    }).join('');
  }

  function rgpslSearch(v){ LIST.q=v||''; renderBody(); }
  function rgpslFilter(v){ LIST.cat=v||''; renderBody(); }
  function rgpslEdit(id){ if(typeof window.openService==='function') window.openService(id); }
  function rgpslDel(id){ if(typeof window.delService==='function') window.delService(id); }

  function ensurePick(){
    if(el('rgpsl-pick')) return;
    var ov=document.createElement('div'); ov.className='overlay'; ov.id='rgpsl-pick';
    ov.innerHTML='<div class="modal"><div class="rgpsl-phd"><h3 style="margin:0">Choose a service type</h3><button type="button" class="rgpsl-x" onclick="closeModal('+"'rgpsl-pick'"+')">&times;</button></div><p class="muted" style="margin:6px 0 14px;font-size:13px">Pick the type of service you provide. Each type has its own tailored form.</p><div class="rgpsl-pickgrid" id="rgpsl-pickgrid"></div></div>';
    document.body.appendChild(ov);
  }
  function rgpslPick(){
    ensurePick();
    var g=el('rgpsl-pickgrid');
    if(g) g.innerHTML=LIST.cats.map(function(c){
      return '<button type="button" class="rgpsl-pcat" onclick="rgpslNew('+"'"+esc(c.key)+"'"+')"><span class="rgpsl-pci">'+catInitial(c)+'</span><span>'+esc(catLabel(c))+'</span></button>';
    }).join('');
    el('rgpsl-pick').classList.add('on');
  }
  async function rgpslNew(key){
    if(typeof window.closeModal==='function') window.closeModal('rgpsl-pick');
    if(typeof window.openService!=='function') return;
    try{ await window.openService(); }catch(e){}
    var sel=el('rgpsv-cat');
    if(sel && key){ sel.value=key; if(typeof window.rgpSvcCatChange==='function') window.rgpSvcCatChange(); }
  }

  async function renderList(m){
    if(typeof window.ensureCats==='function'){ try{ await window.ensureCats(); }catch(e){} }
    var res=await Promise.all([
      api('/api/services').catch(function(){ return []; }),
      api('/api/vendors/me').catch(function(){ return null; })
    ]);
    var all=res[0]||[], me=res[1];
    LIST.mine=(me&&me.id)?all.filter(function(s){ return s.vendor_id===me.id; }):all;
    try{ LIST.cats=await api('/api/categories'); }catch(e){ LIST.cats=LIST.cats||[]; }
    var offered={}; LIST.mine.forEach(function(s){ offered[s.category_id]=(offered[s.category_id]||0)+1; });
    var offeredCount=Object.keys(offered).length;
    var catOpts='<option value="">All service types ('+LIST.mine.length+')</option>'
      +LIST.cats.filter(function(c){ return offered[c.id]; }).map(function(c){ return '<option value="'+c.id+'"'+(String(LIST.cat)===String(c.id)?' selected':'')+'>'+esc(catLabel(c))+' ('+offered[c.id]+')</option>'; }).join('');
    var head='<div class="rgpsl-bar">'
      +'<input id="rgpsl-q" class="rgpsl-search" type="search" placeholder="Search your services..." oninput="rgpslSearch(this.value)" value="'+esc(LIST.q)+'">'
      +'<select id="rgpsl-catf" class="rgpsl-catf" onchange="rgpslFilter(this.value)">'+catOpts+'</select></div>';
    var actions='<button class="rgp-pbtn gold" onclick="rgpslPick()">'+plusIcon()+'New service</button>';
    var sub='You offer '+offeredCount+' service type'+(offeredCount===1?'':'s')+' · '+LIST.mine.length+' listing'+(LIST.mine.length===1?'':'s')+' total.';
    m.innerHTML=secWrap('My services', sub, actions, head+'<div id="rgpsl-body"></div>');
    renderBody();
  }

  function currentRole(){
    var t=(el('dash-title')||{}).textContent||'';
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

  function wrap(){
    if(window.__ragoSvcList) return true;
    if(typeof window.loadSec!=='function') return false;
    injectCss();
    var _prev=window.loadSec;
    window.loadSec=async function(){
      var role=currentRole(), sec=currentSection();
      var m=el('dmain');
      if(m && role==='vendor' && sec==='services'){
        try{ m.innerHTML='<p class="muted">Loading...</p>'; await renderList(m); return; }catch(e){}
      }
      return _prev.apply(this, arguments);
    };
    window.__ragoSvcList=true;
    return true;
  }

  window.rgpslPick=rgpslPick;
  window.rgpslNew=rgpslNew;
  window.rgpslEdit=rgpslEdit;
  window.rgpslDel=rgpslDel;
  window.rgpslSearch=rgpslSearch;
  window.rgpslFilter=rgpslFilter;

  var t=0;
  var iv=setInterval(function(){
    t++;
    if(typeof window.loadSec==='function' && (window.__ragoDpInstalled || t>40)){ wrap(); clearInterval(iv); }
    else if(t>200){ clearInterval(iv); }
  },100);
})();
