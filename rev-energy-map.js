(function(){
'use strict';
function parseDistance(value){
 var s=String(value||'').replace(/[۰-۹]/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c);}).replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c);});
 var m=s.match(/[0-9]+(?:[.,][0-9]+)?/);return m?Number(m[0].replace(',','.')):null;
}
function addEnergyEntry(){
 var dash=document.getElementById('navDash');
 if(!dash||document.getElementById('revEnergyLaunch'))return;
 var row=document.createElement('div');row.id='revEnergyLaunch';row.style.cssText='display:flex;justify-content:flex-start;margin:8px 0 2px';
 var btn=document.createElement('button');btn.type='button';btn.textContent='⚡ دستیار انرژی';btn.setAttribute('aria-label','باز کردن دستیار انرژی و پیش‌بینی شارژ مقصد');btn.style.cssText='border:1px solid #b9e1ec;border-radius:999px;background:#e5f3f8;color:#066d88;padding:7px 13px;font:800 12px Tahoma,Vazirmatn,sans-serif;min-height:36px;cursor:pointer';
 btn.addEventListener('click',function(){
  var q=new URLSearchParams();q.set('from','map');
  var dest=document.getElementById('navDestination');if(dest&&dest.textContent.trim())q.set('destination',dest.textContent.trim());
  var remain=document.getElementById('ndRemain');var distance=parseDistance(remain&&remain.textContent);if(distance!==null&&distance>=0)q.set('distance',String(distance));
  try{
   var p=JSON.parse(localStorage.getItem('rev_driver_vehicle_profile')||'null');
   if(p&&Number(p.battery_kwh)>0)q.set('capacity',String(p.battery_kwh));
   if(p&&Number(p.consumption)>0)q.set('consumption',String(p.consumption));
  }catch(e){}
  location.href='./energy-assistant.html?'+q.toString();
 });
 row.appendChild(btn);dash.appendChild(row);
}
function init(){
 addEnergyEntry();
 var dash=document.getElementById('navDash');
 if(dash){new MutationObserver(addEnergyEntry).observe(dash,{attributes:true,attributeFilter:['hidden']});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();