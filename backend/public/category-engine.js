/* RaGo - Category Engine (shared, professional, config-driven).
 * Renders a dedicated world-class page for ANY category registered in
 * window.RGTCATS, using one consistent design (namespaced .eg-*), with
 * per-category content and its own booking system. Additive & isolated:
 * hooks pickCat() and openDetail(); never edits core files or internal-trips. */
(function(){
  'use strict';
  window.RGTCATS = window.RGTCATS || {};
  var CUR=null, _all=[], ST={dest:'',q:'',sort:'featured'}, PENDING=null;

  function cfg(k){return window.RGTCATS[k]||null;}
  function _esc(s){try{return (typeof esc==='function')?esc(s):String(s==null?'':s);}catch(e){return String(s==null?'':s);}}
  function _money(n){try{return (typeof money==='function')?money(n):('$'+Number(n||0).toLocaleString());}catch(e){return '$'+Number(n||0).toLocaleString();}}
  function _api(p,o){return api(p,o);}
  function isGuest(){try{return (typeof USER==='undefined')||!USER;}catch(e){return true;}}
  function setBody(html){var el=document.getElementById('detail-body');if(el)el.innerHTML=html;if(typeof show==='function')show('detail-view');window.scrollTo(0,0);}

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
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    award:'<circle cx="12" cy="8" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    landmark:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    ship:'<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/>',
    waves:'<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2"/>',
    star:'<path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6Z"/>'
  };
  function ic(n,opt){opt=opt||{};var s=opt.size||18,sw=opt.sw||1.9,fill=opt.fill?'currentColor':'none';return '<svg class="eg-ic" width="'+s+'" height