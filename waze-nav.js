// === حالت ناوبری به سبک ویز ===
var wazeMode = { active:false, is3d:false };
function wazeSetNav(on){
  wazeMode.active = on;
  var c=document.getElementById('wazeCompass'), b=document.getElementById('btn3dToggle');
  if(c) c.style.display = on ? 'flex' : 'none';
  if(b) b.style.display = on ? 'block' : 'none';
  if(!on){
    var mc=document.querySelector('.leaflet-container');
    if(mc) mc.classList.remove('waze3d');
    wazeMode.is3d = false;
    if(b) b.textContent = '🏔️';
  }
}
// تشخیص خودکار حالت مسیریابی
(function(){
  function init(){
    var banner=document.getElementById('navBanner');
    var cBtn=document.getElementById('btn3dToggle');
    var comp=document.getElementById('wazeCompass');
    if(cBtn) cBtn.onclick=function(){
      wazeMode.is3d=!wazeMode.is3d;
      var mc=document.querySelector('.leaflet-container');
      if(wazeMode.is3d){ if(mc)mc.classList.add('waze3d'); this.textContent='🗺️'; }
      else { if(mc)mc.classList.remove('waze3d'); this.textContent='🏔️'; }
    };
    if(comp) comp.onclick=function(){ if(typeof resetBearing==='function')resetBearing(); };
    if(!banner) return;
    var obs=new MutationObserver(function(){
      var navOn=!banner.hidden && banner.offsetParent!==null;
      if(navOn) wazeSetNav(true);
      else if(wazeMode.active){ setTimeout(function(){ if(banner.hidden||banner.offsetParent===null) wazeSetNav(false); },500); }
    });
    obs.observe(banner,{attributes:true,attributeFilter:['hidden','style']});
    setTimeout(function(){ if(!banner.hidden&&banner.offsetParent!==null) wazeSetNav(true); },2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
// به‌روزرسانی قطب‌نما
function wazeUpdateCompass(bearing){
  var n=document.getElementById('compassNeedle');
  if(n) n.style.transform='rotate('+(-bearing)+'deg)';
}
// زوم داینامیک بر اساس سرعت
function wazeDynamicZoom(speedKmh){
  if(!wazeMode.active||!window.map) return;
  var z=speedKmh<20?17:speedKmh<50?16:speedKmh<90?15:14;
  try{ if(Math.abs(map.getZoom()-z)>=1) map.setZoom(z,{animate:true}); }catch(e){}
}
