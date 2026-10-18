
(function(){
  var s=document.createElement('style');
  s.textContent='#wazeCompass{position:absolute !important;top:200px !important;right:12px !important;left:auto !important;} #btn3dToggle{position:absolute !important;top:264px !important;right:12px !important;left:auto !important;bottom:auto !important;} .leaflet-control-zoom{display:none !important;}';
  document.head.appendChild(s);
  // حذف کنترل زوم لیفلت
  setTimeout(function(){
    var zc=document.querySelector('.leaflet-control-zoom');
    if(zc) zc.style.display='none';
  },1000);
})();
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
