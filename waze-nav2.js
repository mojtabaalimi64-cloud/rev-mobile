// === حالت ناوبری به سبک ویز (نسخه ساده) ===
var wazeMode = { active:true, is3d:false };
// همیشه نمایش بده برای تست
function wazeSetNav(on){
  wazeMode.active = true; // همیشه فعال برای تست
  var c=document.getElementById('wazeCompass'), b=document.getElementById('btn3dToggle');
  if(c) c.style.display = 'flex';
  if(b) b.style.display = 'block';
}
(function(){
  function init(){
    wazeSetNav(true); // مستقیم روشن کن
    var cBtn=document.getElementById('btn3dToggle');
    var comp=document.getElementById('wazeCompass');
    if(cBtn) cBtn.onclick=function(){
      wazeMode.is3d=!wazeMode.is3d;
      var mc=document.querySelector('.leaflet-container');
      if(wazeMode.is3d){ if(mc)mc.classList.add('waze3d'); this.textContent='🗺️'; }
      else { if(mc)mc.classList.remove('waze3d'); this.textContent='🏔️'; }
    };
    if(comp) comp.onclick=function(){ if(typeof resetBearing==='function')resetBearing(); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
function wazeUpdateCompass(bearing){
  var n=document.getElementById('compassNeedle');
  if(n) n.style.transform='rotate('+(-bearing)+'deg)';
}
function wazeDynamicZoom(speedKmh){
  if(!window.map) return;
  var z=speedKmh<20?17:speedKmh<50?16:speedKmh<90?15:14;
  try{ if(Math.abs(map.getZoom()-z)>=1) map.setZoom(z,{animate:true}); }catch(e){}
}

var centerPinMode=null;
function showCenterPin(mode){centerPinMode=mode;var p=document.getElementById('centerPin');if(p){p.style.display='block';p.style.pointerEvents='auto';}var rp=document.getElementById('routePanel');if(rp)rp.setAttribute('hidden','');}
function hideCenterPin(){var p=document.getElementById('centerPin');if(p)p.style.display='none';centerPinMode=null;var rp=document.getElementById('routePanel');if(rp)rp.removeAttribute('hidden');}
document.addEventListener('DOMContentLoaded',function(){
  var ps=document.getElementById('routePickStart'),pe=document.getElementById('routePickEnd');
  if(ps)ps.addEventListener('click',function(){showCenterPin('start');});
  if(pe)pe.addEventListener('click',function(){showCenterPin('end');});
  var cp=document.getElementById('centerPin');
  if(cp)cp.addEventListener('click',function(){
    if(!centerPinMode||!window.map)return;
    var c=map.getCenter();
    var input=document.getElementById(centerPinMode==='start'?'routeStart':'routeEnd');
    if(input)input.value=c.lat.toFixed(5)+','+c.lng.toFixed(5);
    hideCenterPin();
  });
});

// چرخش نقشه با دو انگشت
(function(){
  var mapEl = document.getElementById('map');
  if(!mapEl) return;
  var startAngle = 0, startRot = 0, rotating = false;
  var touches = {};
  function getAngle(t1, t2){
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;
  }
  function getRot(){
    var mc = document.querySelector('.leaflet-container');
    if(!mc) return 0;
    var m = mc.style.getPropertyValue('--rev-rot') || getComputedStyle(mc).getPropertyValue('--rev-rot');
    return parseFloat(m) || 0;
  }
  function setRot(deg){
    var mc = document.querySelector('.leaflet-container');
    if(mc) mc.style.setProperty('--rev-rot', deg + 'deg');
    wazeUpdateCompass(deg);
  }
  mapEl.addEventListener('touchstart', function(e){
    for(var i=0; i<e.touches.length; i++){
      var t = e.touches[i];
      touches[t.identifier] = {x:t.clientX, y:t.clientY};
    }
    var ids = Object.keys(touches);
    if(ids.length === 2){
      rotating = true;
      var t1 = touches[ids[0]], t2 = touches[ids[1]];
      startAngle = getAngle(t1, t2);
      startRot = getRot();
    }
  }, {passive:true});
  mapEl.addEventListener('touchmove', function(e){
    if(!rotating) return;
    for(var i=0; i<e.touches.length; i++){
      var t = e.touches[i];
      if(touches[t.identifier]) touches[t.identifier] = {x:t.clientX, y:t.clientY};
    }
    var ids = Object.keys(touches);
    if(ids.length === 2){
      var t1 = touches[ids[0]], t2 = touches[ids[1]];
      var ang = getAngle(t1, t2);
      var delta = ang - startAngle;
      setRot(startRot + delta);
    }
  }, {passive:true});
  function endTouch(e){
    for(var i=0; i<e.changedTouches.length; i++){
      delete touches[e.changedTouches[i].identifier];
    }
    if(Object.keys(touches).length < 2) rotating = false;
  }
  mapEl.addEventListener('touchend', endTouch, {passive:true});
  mapEl.addEventListener('touchcancel', endTouch, {passive:true});
})();
