/* RaGo — Internal Trips: guest booking flow + professional sizing polish.
 * Additive & self-contained. MUST load AFTER category-internal-trips.js and
 * the core auth script (app-core1.js). It never edits those files.
 *  1) Guests can browse and see the booking box normally. When a guest clicks
 *     "Book now", we remember their date/travellers, send them to sign in
 *     (email / phone OTP / Google / Apple), then bring them straight back to
 *     the same booking box and finish the booking automatically.
 *  2) Refines button & icon proportions for a clean, world-class look. */
(function(){
  'use strict';

  /* ---- professional sizing polish (injected last, so it wins) ---- */
  function injectFix(){
    if(document.getElementById('rgt-pro-fix'))return;
    var css=[
      "#rago-cat .rgt-btn{padding:16px 22px;font-size:15.5px;font-weight:800;letter-spacing:.2px;border-radius:14px;box-shadow:0 10px 24px rgba(232,133,15,.30)}",
      "#rago-cat .rgt-btn:hover{box-shadow:0 14px 30px rgba(232,133,15,.38)}",
      "#rago-cat .rgt-hsb{padding:0 28px;font-size:15px;border-radius:14px;box-shadow:0 8px 18px rgba(232,133,15,.26)}",
      "#rago-cat .rgt-chip{padding:10px 18px;font-size:13.5px}",
      "#rago-cat .rgt-sort{padding:12px 16px}",
      "#rago-cat .rgt-wc .ico{width:58px;height:58px;border-radius:17px}",
      "#rago-cat .rgt-wc .ico .rgt-ic{width:27px;height:27px}",
      "#rago-cat .rgt-hstats .rgt-ic{width:19px;height:19px}",
      "#rago-cat .rgt-view .rgt-ic{width:16px;height:16px}",
      "#rago-cat .rgt-btn .rgt-ic{width:18px;height:18px}",
      "#rago-cat .rgt-badge2 .rgt-ic,#rago-cat .rgt-eye .rgt-ic{width:15px;height:15px}",
      "#rago-cat .rgt-ic{stroke-width:1.85}"
    ].join('');
    var st=document.createElement('style');st.id='rgt-pro-fix';st.textContent=css;
    (document.head||document.documentElement).appendChild(st);
  }
  injectFix();

  /* ---- guest booking -> sign in -> return & complete ---- */
  var PENDING=null;
  function curId(){
    try{if(window.CUR_SVC&&window.CUR_SVC.id)return window.CUR_SVC.id;}catch(e){}
    try{if(typeof CUR_SVC!=='undefined'&&CUR_SVC&&CUR_SVC.id)return CUR_SVC.id;}catch(e){}
    return null;
  }
  function isGuest(){try{return (typeof USER==='undefined')||!USER;}catch(e){return true;}}

  var _rgtBook=window.rgtBook;
  window.rgtBook=function(){
    if(isGuest()){
      var d=document.getElementById('rgt-date'),p=document.getElementById('rgt-pax');
      PENDING={id:curId(),date:d?d.value:'',pax:(p&&p.value)?p.value:2};
      if(typeof toast==='function')toast('Please sign in to complete your booking');
      if(typeof openLogin==='function')openLogin();
      return;
    }
    return (typeof _rgtBook==='function')?_rgtBook.apply(this,arguments):undefined;
  };

  function resume(){
    var p=PENDING;PENDING=null;
    if(!p||!p.id||isGuest())return;
    var role;try{role=USER&&USER.role;}catch(e){}
    if(role&&role!=='customer')return;
    setTimeout(function(){
      try{
        var open=window.openTripDetail;
        if(typeof open!=='function'){if(typeof _rgtBook==='function')_rgtBook();return;}
        open(p.id).then(function(){
          var d=document.getElementById('rgt-date');if(d&&p.date)d.value=p.date;
          var px=document.getElementById('rgt-pax');if(px&&p.pax)px.value=p.pax;
          var box=document.querySelector('#rago-cat .rgt-book');if(box)box.scrollIntoView({behavior:'smooth',block:'center'});
          if(typeof toast==='function')toast('Signed in - completing your booking...');
          if(typeof window.rgtBook==='function')window.rgtBook();
        }).catch(function(){});
      }catch(e){}
    },140);
  }

  var _finishAuth=window.finishAuth;
  window.finishAuth=function(r){
    var had=!!PENDING;
    var ret=(typeof _finishAuth==='function')?_finishAuth.apply(this,arguments):undefined;
    if(had)resume();
    return ret;
  };
})();
