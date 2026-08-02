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
 * openService / delService / closeModal / ensureCats / catName / iconSvg.
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

  var CATIMG={airport:1,transfers:1,hotels:1,'internal-trips':1,tours:1,'nile-cruise':1,diving:1,safari:1,pharmacy:1,spa:1};
  var CATICON={airport:'plane',visa:'file',transfers:'car',hotels:'bed','internal-trips':'compass',tours:'landmark','nile-cruise':'ship',diving:'waves',safari:'mountain',carrental:'car',guide:'user',sim:'phone',dining:'utensils',shopping:'bag',spa:'sparkles',events:'ticket',insurance:'shield',departure:'luggage',pharmacy:'pharmacy'};
  function catKeyOf(id){ var c=(LIST.cats||[]).filter(function(x){ return x.id===id; })[0]; return c?c.key:''; }
  function catIcon(key){ return (typeof window.iconSvg==='function')?window.iconSvg(CATICON[key]||'compass'):''; }

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
    '.rgpsl-phi{color:#fff;opacity:.9;display:flex;align-items:center;justify-content:center}',
    '.rgpsl-phi svg{width:44px;height:44px}',
    '.rgpsl-feat{position:absolute;top:10px;left:10px;background:var(--gold);color:#fff;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px}',
    '.rgpsl-status{position:absolute;top:10px;right:10px;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;text-transform:capitalize}',
    '.rgpsl-status.pending{background:var(--orange-soft);color:var(--orange)}',
    '.rgpsl-status.rejected{background:#f7dedb;color:var(--red)}',
    '.rgpsl-status.suspended{background:var(--soft2);color:var(--text2)}',
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
    '.rgpsl-pci{width:46px;height:46px;border-radius:13px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center}',
    '.rgpsl-pci svg{width:24px;height:24px}',
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
    var key=catKeyOf(s.category_id);
    var cover=s.cover||(s.images&&s.images[0])||'';
    var bg = cover || (CATIMG[key]?('img/cat-'+key+'.jpg'):'');
    var st=String(s.status||'active');
    var stBadge=(st&&st!=='active')?'<span class="rgpsl-status '+esc(st)+'">'+esc(st)+'</span>':'';
    var featBadge=s.featured?'<span class="rgpsl-feat">Featured</span>':'';
    var img = bg
      ? '<div class="rgpsl-cimg" style="background-image:url('+"'"+bg+"'"+')">'+featBadge+stBadge+'</div>'
      : '<div class="rgpsl-cimg rgpsl-ph">'+featBadge+stBadge+'<span class="rgpsl-phi">'+catIcon(key)+'</span></div>';
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

  function rgpslSearch(v){ v=v||''; if(/@/.test(v)){ var i=el('rgpsl-q'); if(i) i.value=''; return; } LIST.q=v; renderBody(); }
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
      return '<button type="button" class="rgpsl-pcat" onclick="rgpslNew('+"'"+esc(c.key)+"'"+')"><span class="rgpsl-pci">'+catIcon(c.key)+'</span><span>'+esc(catLabel(c))+'</span></button>';
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
    var mine=[];
    try{ mine=await api('/api/my-services'); }catch(e){ mine=[]; }
    LIST.mine=Array.isArray(mine)?mine:[];
    try{ LIST.cats=await api('/api/categories'); }catch(e){ LIST.cats=LIST.cats||[]; }
    var offered={}; LIST.mine.forEach(function(s){ offered[s.category_id]=(offered[s.category_id]||0)+1; });
    var offeredCount=Object.keys(offered).length;
    var pending=LIST.mine.filter(function(s){ return String(s.status||'active')==='pending'; }).length;
    var catOpts='<option value="">All service types ('+LIST.mine.length+')</option>'
      +LIST.cats.filter(function(c){ return offered[c.id]; }).map(function(c){ return '<option value="'+c.id+'"'+(String(LIST.cat)===String(c.id)?' selected':'')+'>'+esc(catLabel(c))+' ('+offered[c.id]+')</option>'; }).join('');
    var head='<div class="rgpsl-bar">'
      +'<input id="rgpsl-q" class="rgpsl-search" type="text" name="rago-svc-search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" readonly onfocus="this.removeAttribute('+"'readonly'"+')" placeholder="Search your services..." oninput="rgpslSearch(this.value)" value="'+esc(LIST.q)+'">'
      +'<select id="rgpsl-catf" class="rgpsl-catf" onchange="rgpslFilter(this.value)">'+catOpts+'</select></div>';
    var actions='<button class="rgp-pbtn gold" onclick="rgpslPick()">'+plusIcon()+'New service</button>';
    var sub='You offer '+offeredCount+' service type'+(offeredCount===1?'':'s')+' · '+LIST.mine.length+' listing'+(LIST.mine.length===1?'':'s')+' total'+(pending?(' · '+pending+' pending review'):'')+'.';
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

/* ===================== Admin - service approvals =====================
 * Adds an "Approvals" section to the Admin dashboard so pending services
 * submitted by providers can be approved (go live) or rejected. Safe &
 * additive: augments the shared NAV / NAVICON / SEC objects only.
 * =================================================================== */
(function(){
  'use strict';
  if(window.__ragoAdminApprovals) return;
  function ready(){ return (typeof NAV!=='undefined') && NAV && NAV.admin && (typeof SEC!=='undefined') && (typeof renderNav==='function') && (typeof tbl==='function') && (typeof api==='function'); }
  function install(){
    window.__ragoAdminApprovals=true;
    if(NAV.admin.indexOf('approvals')<0){
      var at=NAV.admin.indexOf('services');
      at=(at<0)?NAV.admin.length:at+1;
      NAV.admin.splice(at,0,'approvals');
    }
    if(typeof NAVICON!=='undefined' && !NAVICON.approvals) NAVICON.approvals='shield';
    SEC['admin:approvals']=async function(m){
      if(typeof ensureCats==='function'){ try{ await ensureCats(); }catch(e){} }
      var list=[];
      try{ list=await api('/api/admin/services?status=pending'); }catch(e){ list=[]; }
      list=list||[];
      var rows=list.map(function(s){
        return [
          esc(s.title||'-'),
          esc(s.vendor_name||'-'),
          (typeof catName==='function')?catName(s.category_id):'-',
          money(s.price),
          String(s.created_at||'').slice(0,10),
          '<button class="btn sm" onclick="apvApprove('+s.id+')">Approve</button> <button class="btn sm danger" onclick="apvReject('+s.id+')">Reject</button>'
        ];
      });
      m.innerHTML='<h3 style="margin:0 0 12px">Pending service approvals ('+rows.length+')</h3>'+tbl(['Service','Provider','Category','Price','Submitted','Action'],rows);
    };
    try{ if(typeof USER!=='undefined' && USER && USER.role==='admin' && typeof renderNav==='function') renderNav(); }catch(e){}
  }
  window.apvApprove=async function(id){
    try{ await api('/api/services/'+id,{method:'PUT',body:{status:'active'}}); if(typeof toast==='function') toast('Service approved'); if(typeof loadSec==='function') loadSec(); }catch(e){ if(typeof toast==='function') toast((e&&e.message)||'Failed'); }
  };
  window.apvReject=async function(id){
    if(!confirm('Reject this service? The provider can edit and resubmit it.')) return;
    try{ await api('/api/services/'+id,{method:'PUT',body:{status:'rejected'}}); if(typeof toast==='function') toast('Service rejected'); if(typeof loadSec==='function') loadSec(); }catch(e){ if(typeof toast==='function') toast((e&&e.message)||'Failed'); }
  };
  var t=0;
  var iv=setInterval(function(){ t++; if(ready()){ try{ install(); }catch(e){} clearInterval(iv); } else if(t>200){ clearInterval(iv); } },100);
})();
