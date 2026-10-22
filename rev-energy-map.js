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
function resumeNavigation(){
 var params=new URLSearchParams(location.search);
 if(params.get('resumeNav')!=='1')return;
 try{var route=JSON.parse(sessionStorage.getItem('rev_energy_resume_route_v1')||'null');
  if(!route||!Array.isArray(route.coords)||route.coords.length<2)return;
  var start=function(){if(window.REVNav&&typeof window.REVNav.start==='function'){window.REVNav.start(route);var u=new URL(location.href);u.searchParams.delete('resumeNav');history.replaceState(null,'',u.pathname+u.search+u.hash);return true;}return false;};
  if(!start()){var attempts=0;var timer=setInterval(function(){attempts++;if(start()||attempts>=30)clearInterval(timer);},200);}
 }catch(e){}
}
function init(){
 addEnergyEntry();
 var dash=document.getElementById('navDash');
 if(dash){new MutationObserver(addEnergyEntry).observe(dash,{attributes:true,attributeFilter:['hidden']});}
 resumeNavigation();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


/* Live energy safety assistant: estimates reserve against verified REV chargers while navigation is active. */
(function(){
'use strict';
var API='https://rev-api.mojtaba-alimi64.workers.dev/api/stations';
var state={lat:null,lon:null,progress:0,lastPaint:0,lastFetch:0,stations:[],layer:null,banner:null,active:false,routeKey:'rev_energy_resume_route_v1'};
function num(v){var n=Number(v);return Number.isFinite(n)?n:NaN;}
function dist(a,b){var rad=Math.PI/180,R=6371000,dl=(b[0]-a[0])*rad,dn=(b[1]-a[1])*rad,x=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));}
function vehicle(){try{return JSON.parse(localStorage.getItem('rev_driver_vehicle_profile')||'null')||{};}catch(e){return {};}}
function activeRoute(){try{return JSON.parse(sessionStorage.getItem(state.routeKey)||'null');}catch(e){return null;}}
function verified(s){
 var a=String(s.approval_status||s.approvalStatus||'').toLowerCase();
 var st=String(s.status||s.status_name||'').toLowerCase();
 if(a)return /^(approved|verified|active|published|تاییدشده|تأییدشده|فعال)$/.test(a);
 return /^(approved|verified|active|published|تاییدشده|تأییدشده|فعال)$/.test(st);
}
function normPortName(x){
 var k=String(x||'').toUpperCase().replace(/[\"\'\[\]{}]/g,'').replace(/[\s_\-]+/g,' ').trim();
 if(!k)return null;
 if(k.indexOf('CHADEMO')>-1)return 'CHAdeMO';
 if(k.indexOf('GB')>-1&&k.indexOf('T')>-1){if(k.indexOf('AC')>-1&&k.indexOf('DC')===-1)return 'GB/T AC';return 'GB/T DC';}
 if(k.indexOf('CCS')>-1||k.indexOf('COMBO')>-1)return 'CCS2';
 if(k.indexOf('TYPE 2')>-1||k.indexOf('MENNEKES')>-1||k==='TYPE2')return 'Type 2';
 if(k.indexOf('TYPE 1')>-1||k.indexOf('J1772')>-1||k==='TYPE1')return 'Type 1';
 return null;
}
function parsePorts(v,out){
 out=out||{};
 if(v==null)return out;
 if(Array.isArray(v)){for(var i=0;i<v.length;i++)parsePorts(v[i],out);return out;}
 if(typeof v==='object'){Object.keys(v).forEach(function(k){if(v[k]){var n=normPortName(k);if(n)out[n]=1;}});return out;}
 var s=String(v).trim();if(!s)return out;
 if(s.charAt(0)==='['||s.charAt(0)==='{'){try{return parsePorts(JSON.parse(s),out);}catch(e){}}
 s.split(/[,;|]+/).forEach(function(part){var n=normPortName(part);if(n)out[n]=1;});
 return out;
}
window.__revNormPorts=parsePorts;
window.__revPortCompat=function(st){
 try{
  var p=JSON.parse(localStorage.getItem('rev_driver_vehicle_profile')||'null');
  var my=p&&p.port;if(!my)return '';
  var ports=parsePorts(st&&(st.connectors||st.connector||st.plugs));
  if(!Object.keys(ports).length)return '';
  return ports[my]?'ok':'no';
 }catch(e){return '';}
};
function myPortOf(){try{var p=JSON.parse(localStorage.getItem('rev_driver_vehicle_profile')||'null');return (p&&p.port)||'';}catch(e){return '';}}
function normalize(raw){

 var list=Array.isArray(raw)?raw:(raw&&[raw.stations,raw.data,raw.data&&raw.data.stations,raw.result&&raw.result.stations,raw.result&&raw.result.data].find(Array.isArray))||[];
 return list.map(function(s){
  var lat=num(s.latitude??s.lat??s.Latitude),lon=num(s.longitude??s.lng??s.lon??s.Longitude);
  return {raw:s,lat:lat,lon:lon,name:String(s.name||s.title||s.station_name||'جایگاه شارژ REV'),power:num(s.power_kw??s.power??s.powerKw),ports:parsePorts(s.connectors||s.connector||s.plugs),address:String(s.address||s.location||s.city||''),status:String(s.status||s.status_name||''),approval_status:String(s.approval_status||s.approvalStatus||'')};
 }).filter(function(s){return Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&Math.abs(s.lat)<=90&&Math.abs(s.lon)<=180&&verified(s.raw);});
}
function ensureBanner(){
 if(state.banner)return;
 var el=document.createElement('div');el.id='rev-live-energy-advice';el.setAttribute('role','status');el.style.cssText='position:fixed;z-index:1250;top:calc(10px + env(safe-area-inset-top));left:12px;right:12px;max-width:460px;margin:auto;background:#fff;border:1px solid #d6e7ef;border-radius:15px;box-shadow:0 6px 24px #102a3d22;padding:10px 13px;direction:rtl;color:#17253b;font:12px/1.65 Tahoma,Vazirmatn,sans-serif;display:none;pointer-events:auto';
 document.body.appendChild(el);state.banner=el;
}
function hideBanner(){
 if(state.banner)state.banner.style.display='none';
 if(window.revMap&&state.layer){try{window.revMap.removeLayer(state.layer)}catch(e){}state.layer=null;}
}
var posTimer=null;
function positionBanner(){
 if(!state.banner)return;
 var placed=false;
 try{
  var nb=document.getElementById('navBanner');
  if(document.body.classList.contains('rev-navigating')&&nb){
   var r=nb.getBoundingClientRect(),st=window.getComputedStyle(nb);
   if(r.height>0&&st.display!=='none'&&st.visibility!=='hidden'){state.banner.style.top=Math.round(r.bottom+8)+'px';placed=true;}
  }
 }catch(e){}
 if(!placed)state.banner.style.top='calc(10px + env(safe-area-inset-top))';
}
function startPosWatch(){
 if(posTimer)return;
 posTimer=setInterval(function(){
  if(!state.banner||state.banner.style.display==='none'){clearInterval(posTimer);posTimer=null;return;}
  positionBanner();
 },700);
}
function showBanner(title,detail,kind){
 ensureBanner();var colors={good:'#187547',warn:'#9a650b',bad:'#b42318',info:'#087e9c'};
 state.banner.style.display='block';state.banner.style.borderRight='4px solid '+(colors[kind]||colors.info);
 state.banner.replaceChildren();
 var h=document.createElement('strong');h.textContent=title;h.style.cssText='display:block;font-size:13px;margin-bottom:2px';h.style.color=colors[kind]||colors.info;
 var p=document.createElement('div');p.textContent=detail;p.style.cssText='color:#536579';
 state.banner.appendChild(h);state.banner.appendChild(p);
 positionBanner();startPosWatch();
}
function routeDistanceAlong(route,lat,lon){
 var coords=route&&route.coords;if(!Array.isArray(coords)||coords.length<2)return null;
 var best=Infinity,idx=0;
 for(var i=0;i<coords.length;i++){var d=dist([lat,lon],[Number(coords[i][1]),Number(coords[i][0])]);if(d<best){best=d;idx=i;}}
 var remaining=0;
 for(var j=idx;j<coords.length-1;j++)remaining+=dist([Number(coords[j][1]),Number(coords[j][0])],[Number(coords[j+1][1]),Number(coords[j+1][0])]);
 return {offRoute:best,remaining:remaining,index:idx};
}
function candidates(profile,route){
 var myPort=String(profile&&profile.port||'');
 var cap=num(profile.battery_kwh),cons=num(profile.consumption),soc=num(profile.soc_pct),reserve=num(profile.reserve_soc);
 if(!Number.isFinite(reserve))reserve=15;
 if(!(cap>0&&cons>0&&soc>=0&&soc<=100))return [];
 var routePos=routeDistanceAlong(route,state.lat,state.lon);if(!routePos)return [];
 var energyAvailable=cap*Math.max(0,soc-reserve)/100;
 var out=[];
 state.stations.forEach(function(s){
  var from=dist([state.lat,state.lon],[s.lat,s.lon])/1000*1.35;
  if(from<0.15||from>350)return;
  var nearest=routeDistanceAlong(route,s.lat,s.lon);
  if(!nearest||nearest.offRoute>5000)return;
  var ahead=routePos.remaining-nearest.remaining;
  if(ahead < -1500)return;
  var energyNeed=from*cons/100*1.2;
  var arrival=soc-energyNeed/cap*100;
  var usableKm=Math.max(0,(soc-reserve)/100*cap/cons*100);
  if(from>usableKm*0.8)return;
  var __ports=s.ports||{};var compat=!myPort||!Object.keys(__ports).length||!!__ports[myPort];
  out.push({station:s,distanceKm:from,offRouteKm:nearest.offRoute/1000,arrivalSoc:arrival,routeKm:Math.max(0,ahead/1000),energyKwh:energyNeed,reachable:arrival>=reserve&&compat,compat:compat});
 });
 out.sort(function(a,b){return ((b.compat?1:0)-(a.compat?1:0))||(a.distanceKm-b.distanceKm);});
 return out.slice(0,3);
}
function drawPins(items,profile){
 var map=window.revMap,L=window.L;if(!map||!L)return;
 if(state.layer){try{map.removeLayer(state.layer)}catch(e){}}
 state.layer=L.layerGroup().addTo(map);
 items.forEach(function(item,index){
  var color=item.compat===false?'#9db2c1':(item.reachable?'#0b9b73':'#d94841');
  var html='<div style="width:32px;height:38px;position:relative;filter:drop-shadow(0 2px 3px #102a3d55)"><div style="width:30px;height:30px;border:2px solid #fff;border-radius:50% 50% 50% 5px;transform:rotate(-45deg);background:'+color+';display:grid;place-items:center;color:#fff;font:bold 13px Tahoma"><span style="transform:rotate(45deg)">'+(index+1)+'</span>'+(item.station.ports&&Object.keys(item.station.ports).length?'<span style="position:absolute;top:-9px;inset-inline-end:-15px;background:#fff;border:1px solid #b9cfdb;border-radius:99px;font-size:7.5px;font-weight:800;color:#3c5266;padding:0 4px;line-height:1.8;white-space:nowrap;box-shadow:0 1px 4px rgba(20,41,59,.25)">'+(myPortOf()&&item.station.ports[myPortOf()]?myPortOf()+' \u2713':Object.keys(item.station.ports)[0])+'</span>':'')+'</div></div>';
  var marker=L.marker([item.station.lat,item.station.lon],{icon:L.divIcon({className:'rev-energy-recommendation-pin',html:html,iconSize:[32,38],iconAnchor:[15,35]}),zIndexOffset:1800,title:'پیشنهاد شارژ: '+item.station.name}).addTo(state.layer);
  var box=document.createElement('div');box.style.cssText='font:12px/1.8 Tahoma,sans-serif;min-width:190px;direction:rtl';
  var title=document.createElement('strong');title.textContent=(index+1)+'. '+item.station.name;box.appendChild(title);
  var info=document.createElement('div');info.textContent='فاصله تخمینی جاده‌ای: '+item.distanceKm.toFixed(1)+' کیلومتر';box.appendChild(info);
  var soc=document.createElement('div');soc.textContent='شارژ تخمینی هنگام رسیدن: '+Math.round(item.arrivalSoc)+'٪';soc.style.color=item.reachable?'#187547':'#b42318';soc.style.fontWeight='bold';box.appendChild(soc);
  if(item.station.power>0){var power=document.createElement('div');power.textContent='توان ثبت‌شده: '+item.station.power+' kW';box.appendChild(power);}
  var __pk=Object.keys(item.station.ports||{});if(__pk.length){var portsRow=document.createElement('div');portsRow.textContent='\u067E\u0648\u0631\u062A\u200C\u0647\u0627: '+__pk.join('\u060C ')+(myPortOf()&&item.station.ports[myPortOf()]?' \u2014 \u2713 \u0633\u0627\u0632\u06AF\u0627\u0631 \u0628\u0627 \u062E\u0648\u062F\u0631\u0648\u06CC \u062A\u0648':(myPortOf()?' \u2014 \u067E\u0648\u0631\u062A \u062E\u0648\u062F\u0631\u0648\u06CC \u062A\u0648 \u0631\u0627 \u0646\u062F\u0627\u0631\u062F':''));portsRow.style.fontWeight='bold';portsRow.style.color=item.compat===false?'#8a6414':'#087b48';box.appendChild(portsRow);}
  if(item.station.address){var address=document.createElement('div');address.textContent=item.station.address;box.appendChild(address);}
  var note=document.createElement('small');note.textContent='برآورد تقریبی؛ قبل از انحراف از مسیر، وضعیت و دسترس‌پذیری جایگاه را بررسی کن.';note.style.color='#65758b';box.appendChild(note);
  marker.bindPopup(box,{maxWidth:280});
 });
}
async function loadStations(){
 var now=Date.now();if(state.stations.length&&now-state.lastFetch<5*60*1000)return state.stations;
 try{var r=await fetch(API,{cache:'no-store'});if(!r.ok)throw new Error('stations');var d=await r.json();state.stations=normalize(d);state.lastFetch=now;}catch(e){state.stations=[];}
 return state.stations;
}
async function update(lat,lon,progress){
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
 state.lat=lat;state.lon=lon;state.progress=num(progress)||0;state.active=!!document.body.classList.contains('rev-navigating');
 if(!state.active){hideBanner();return;}
 var now=Date.now();if(now-state.lastPaint<12000&&now-state.lastPaint>=0)return;state.lastPaint=now;
 var profile=vehicle(),route=activeRoute(),cap=num(profile.battery_kwh),cons=num(profile.consumption),soc=num(profile.soc_pct),reserve=num(profile.reserve_soc),live=null;try{live=JSON.parse(sessionStorage.getItem('rev_energy_live_state_v1')||'null')}catch(e){}
 if(!Number.isFinite(reserve))reserve=15;
 if(!(cap>0&&cons>0&&soc>=0&&soc<=100)){
  showBanner('⚡ دستیار انرژی زنده','برای پیشنهاد دقیق، یک‌بار در دستیار انرژی ظرفیت باتری، مصرف و درصد شارژ فعلی را ثبت کن. GPS و مسیریابی بدون تغییر ادامه دارند.','info');
  return;
 }
 var routePos=routeDistanceAlong(route,lat,lon);
 if(!routePos){showBanner('⚡ برآورد انرژی موقتاً در دسترس نیست','مسیر فعال برای محاسبه فاصله باقی‌مانده پیدا نشد؛ تا زمان بازیابی مسیر، به این برآورد برای تصمیم‌گیری درباره شارژ اتکا نکن.','info');return;}
 if(routePos.offRoute>1500){showBanner('⚠️ از مسیر ثبت‌شده فاصله گرفته‌ای','موقعیت فعلی بیش از ۱٫۵ کیلومتر با مسیر ثبت‌شده فاصله دارد؛ برآورد شارژ مقصد و پیشنهادهای شارژ تا به‌روزرسانی مسیر قابل اتکا نیستند.','warn');return;}
 var remainingKm=Math.max(0,routePos.remaining/1000),effective=cons*1.2;
 var coords=route&&Array.isArray(route.coords)?route.coords:[],signature=coords.length>1?[coords[0].join(','),coords[coords.length-1].join(',')].join('|'):'';
 var liveFresh=live&&Number.isFinite(num(live.updatedAt))&&Date.now()-num(live.updatedAt)<8*60*60*1000;
 var sameRoute=!!(liveFresh&&live.routeSignature===signature&&Number.isFinite(num(live.initialRemainingKm))&&Number.isFinite(num(live.initialSocPct)));
 var baselineSoc=sameRoute?num(live.initialSocPct):(liveFresh&&Number.isFinite(num(live.currentSocPct))?num(live.currentSocPct):soc);
 var baselineRemaining=sameRoute?num(live.initialRemainingKm):remainingKm;
 var estimatedUsedKm=Math.max(0,baselineRemaining-remainingKm);
 soc=Math.max(0,Math.min(100,baselineSoc-(estimatedUsedKm*effective/100)/cap*100));
 try{sessionStorage.setItem('rev_energy_live_state_v1',JSON.stringify({routeSignature:signature,initialRemainingKm:baselineRemaining,initialSocPct:baselineSoc,currentSocPct:soc,remainingKm:remainingKm,updatedAt:Date.now()}));}catch(e){}
 var arrivalSoc=soc-(remainingKm*effective/100)/cap*100;
 if(arrivalSoc<reserve){
  showBanner('⚠️ ذخیره امن مقصد در خطر است','برآورد شارژ مقصد '+Math.round(arrivalSoc)+'٪ است؛ ذخیره امن '+reserve+'٪ حفظ نمی‌شود. پین‌های سبز روی نقشه جایگاه‌های پیشنهادی قابل‌دسترسی را نشان می‌دهند.','bad');
 }else if(arrivalSoc<reserve+10){
  showBanner('🔋 شارژ مقصد نزدیک به حد امن است','شارژ تخمینی مقصد '+Math.round(arrivalSoc)+'٪؛ برای حاشیه امن بیشتر، پین‌های سبز شارژرهای بین راه را بررسی کن.','warn');
 }else{
  showBanner('⚡ پایش زنده انرژی فعال است','شارژ مقصد حدود '+Math.round(arrivalSoc)+'٪ برآورد می‌شود؛ این محاسبه تقریبی است و تغییر مصرف، دما، سرعت و شیب را کامل اندازه نمی‌گیرد.','good');
 }
 await loadStations();
 var items=candidates(Object.assign({},profile,{soc_pct:soc}),route);
 if(items.length)drawPins(items,profile);
 else if(window.revMap&&state.layer){try{window.revMap.removeLayer(state.layer)}catch(e){}state.layer=null;}
 if(arrivalSoc<reserve&&!items.some(function(x){return x.reachable;})){
  showBanner('🚨 شارژ مقصد کافی به نظر نمی‌رسد','در داده‌های تأییدشده REV شارژری که با ذخیره امن فعلی قابل‌دسترسی باشد پیدا نشد. با رانندگی ایمن، نزدیک‌ترین محل امن/شارژر را بررسی کن؛ پیشنهادها تضمین دسترسی یا موجودی نیستند.','bad');
 }
}
var navWatchStarted=false;
function watchNav(){
 if(navWatchStarted||!document.body)return;navWatchStarted=true;
 var was=document.body.classList.contains('rev-navigating');
 new MutationObserver(function(){
  var now=document.body.classList.contains('rev-navigating');
  if(was&&!now)hideBanner();
  was=now;
 }).observe(document.body,{attributes:true,attributeFilter:['class']});
}
function hook(){
 watchNav();
 if(typeof window.revUpdateNavEnvironment!=='function'){setTimeout(hook,250);return;}
 if(window.revUpdateNavEnvironment.__revLiveEnergyHook)return;
 var original=window.revUpdateNavEnvironment;
 var wrapped=function(lat,lon,progress,force){var result=original.apply(this,arguments);update(num(lat),num(lon),num(progress));return result;};
 wrapped.__revLiveEnergyHook=true;window.revUpdateNavEnvironment=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
