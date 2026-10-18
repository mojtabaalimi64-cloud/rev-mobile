
// گرفتن مسیرها از پاسخ اصلی
(function(){
  if(window.__respHookDone) return;
  window.__respHookDone = true;
  var of = window.fetch;
  window.fetch = function(url, opts){
    var promise = of.apply(this, arguments);
    if(typeof url === 'string' && url.indexOf('router.project-osrm.org') !== -1 && url.indexOf('alternatives=3') !== -1){
      promise.then(function(resp){
        var clone = resp.clone();
        clone.json().then(function(data){
          if(data.routes && data.routes.length > 1){
            routeAlternatives = data.routes;
            setTimeout(function(){
              showRouteChoices();
              drawAllAlternatives();
            }, 500);
          }
        }).catch(function(){});
      }).catch(function(){});
    }
    return promise;
  };
})();
var lastRouteStart = null, lastRouteEnd = null;

// دکمه شناور مسیرهای جایگزین
(function(){
  var btn = document.createElement('button');
  btn.id = 'btnAltRoutes';
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 C4 14, 6 12, 10 12"/><path d="M10 12 L10 4"/><path d="M7 7 L10 4 L13 7"/><path d="M10 12 C14 12, 16 14, 18 18"/><path d="M15 16 L18 18 L16 21"/><path d="M10 12 L20 12"/><path d="M17 9 L20 12 L17 15"/></svg><span style="font-size:13px;font-weight:bold">مسیرها</span>';
  btn.title = 'مسیرهای جایگزین';
  btn.style.cssText = 'position:fixed;bottom:170px;right:12px;z-index:2000;height:52px;padding:0 14px;border:none;border-radius:26px;background:linear-gradient(135deg,#0d9488,#0a7a70);color:#fff;box-shadow:0 4px 12px rgba(13,148,136,.4);cursor:pointer;display:flex;align-items:center;gap:8px;font-family:Tahoma;';
  btn.onclick = function(){
    if(!window.map || typeof L === 'undefined') { alert('نقشه لود نشده'); return; }
    var s = null, e = null;
    // ۱. از interceptor
    if(lastRouteStart && lastRouteEnd){ s = lastRouteStart; e = lastRouteEnd; }
    // ۲. از اینپوت‌ها
    if(!s || !e){
      var rs = document.getElementById('routeStart'), re = document.getElementById('routeEnd');
      if(rs && rs.value && rs.value.includes(',')){
        var p = rs.value.split(','); s = [parseFloat(p[1]), parseFloat(p[0])];
      }
      if(re && re.value && re.value.includes(',')){
        var p2 = re.value.split(','); e = [parseFloat(p2[1]), parseFloat(p2[0])];
      }
    }
    // ۳. از پلی‌لاین‌های روی نقشه (مسیر رسم‌شده)
    if(!s || !e){
      map.eachLayer(function(layer){
        if(layer instanceof L.Polyline && !s){
          var latlngs = layer.getLatLngs();
          if(latlngs && latlngs.length > 1){
            var first = latlngs[0], last = latlngs[latlngs.length-1];
            // اگه آرایه تودرتو بود
            if(Array.isArray(first)) first = first[0];
            if(Array.isArray(last)) last = last[last.length-1];
            if(first && first.lng !== undefined){
              s = [first.lng, first.lat];
              e = [last.lng, last.lat];
            }
          }
        }
      });
    }
    if(!s || !e){
      alert('اول یه مسیریابی انجام بده، بعد این دکمه رو بزن');
      return;
    }
    fetchRouteAlternatives(s[0], s[1], e[0], e[1]);
  };
  document.body.appendChild(btn);
})();

// === انتخاب از چند مسیر ===
var routeAlternatives = [];
async function fetchRouteAlternatives(startLng, startLat, endLng, endLat){
  var loading = document.createElement('div');
  loading.id = 'altLoading';
  loading.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3000;background:rgba(0,0,0,.7);color:#fff;padding:16px 24px;border-radius:12px;font-family:Tahoma;';
  loading.textContent = '⏳ در حال یافتن مسیرها...';
  document.body.appendChild(loading);
  var url = 'https://router.project-osrm.org/route/v1/driving/'+startLng+','+startLat+';'+endLng+','+endLat+'?overview=full&geometries=geojson&steps=true&alternatives=3';
  try{
    var r = await fetch(url);
    var d = await r.json();
    routeAlternatives = d.routes || [];
    var l = document.getElementById('altLoading');
    if(l) l.remove();
    if(routeAlternatives.length === 0){ alert('مسیری پیدا نشد'); return []; }
    showRouteChoices();
    drawAllAlternatives();
    return routeAlternatives;
  }catch(e){
    var l2 = document.getElementById('altLoading');
    if(l2) l2.remove();
    alert('خطا: ' + e.message);
    return [];
  }
}
function showRouteChoices(){
  // حذف پنل قبلی
  var old = document.getElementById('routeChoices');
  if(old) old.remove();
  if(routeAlternatives.length < 2) return;
  var div = document.createElement('div');
  div.id = 'routeChoices';
  div.style.cssText = 'position:fixed;bottom:90px;right:12px;left:12px;z-index:2000;background:#fff;border-radius:16px;box-shadow:0 -4px 20px rgba(0,0,0,.25);padding:12px;max-height:40vh;overflow-y:auto;';
  var html = '<div style="font-weight:bold;margin-bottom:8px">🛣️ مسیر رو انتخاب کن:</div>';
  routeAlternatives.forEach(function(route, i){
    var km = (route.distance/1000).toFixed(1);
    var min = Math.round(route.duration/60);
    var label = i===0 ? ' (پیشنهادی)' : '';
    html += '<button onclick="selectRoute('+i+')" style="display:block;width:100%;text-align:right;padding:10px;margin:4px 0;border:1px solid #ddd;border-radius:10px;background:'+(i===0?'#e8f5f3':'#fff')+';font-family:Tahoma;cursor:pointer">'
      + 'مسیر '+(i+1)+label+' — '+km+' کیلومتر، '+min+' دقیقه</button>';
  });
  div.innerHTML = html;
  document.body.appendChild(div);
}
var altLayers = [];
function selectRoute(i){
  var route = routeAlternatives[i];
  if(!route || !window.map || typeof L === 'undefined') return;
  // پاک کردن مسیرهای قبلی
  altLayers.forEach(function(l){ try{ map.removeLayer(l); }catch(e){} });
  altLayers = [];
  // رسم مسیر انتخاب‌شده (پررنگ)
  var coords = route.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
  var main = L.polyline(coords, {color:'#0d9488', weight:6, opacity:1}).addTo(map);
  altLayers.push(main);
  map.fitBounds(main.getBounds(), {padding:[50,50]});
  var panel = document.getElementById('routeChoices');
  if(panel) panel.remove();
}
function drawAllAlternatives(){
  if(!window.map || typeof L === 'undefined' || routeAlternatives.length===0) return;
  altLayers.forEach(function(l){ try{ map.removeLayer(l); }catch(e){} });
  altLayers = [];
  var colors = ['#0d9488', '#ff9800', '#9e9e9e'];
  routeAlternatives.forEach(function(route, i){
    var coords = route.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
    var line = L.polyline(coords, {
      color: colors[i] || '#9e9e9e',
      weight: i===0 ? 6 : 4,
      opacity: i===0 ? 1 : 0.6
    }).addTo(map);
    line.on('click', function(){ selectRoute(i); });
    altLayers.push(line);
  });
  if(altLayers[0]) map.fitBounds(altLayers[0].getBounds(), {padding:[50,50]});
}

// حذف دکمه‌های زوم + جابه‌جایی قطب‌نما + مودال وسط
(function(){
  var s=document.createElement('style');
  s.textContent='#wazeCompass{top:560px!important;right:12px!important;left:auto!important}#btn3dToggle{top:624px!important;right:12px!important;left:auto!important;bottom:auto!important}.leaflet-control-zoom,.leaflet-control-zoom-in,.leaflet-control-zoom-out{display:none!important;visibility:hidden!important}#routePanel{position:fixed!important;top:50%!important;bottom:auto!important;right:50%!important;left:auto!important;transform:translate(50%,-50%)!important;width:90%!important;max-width:380px!important;max-height:70vh!important;border-radius:16px!important;}';
  document.head.appendChild(s);
  // حذف فیزیکی دکمه‌های زوم
  function removeZoom(){
    document.querySelectorAll('.leaflet-control-zoom').forEach(function(el){el.remove();});
  }
  removeZoom();
  setTimeout(removeZoom, 2000);
  setInterval(removeZoom, 5000);
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

// اتصال چندمسیر به دکمه مسیریابی
document.addEventListener('DOMContentLoaded', function(){
  var rb = document.getElementById('routeBuild');
  if(rb){
    rb.addEventListener('click', function(){
      setTimeout(function(){
        var rs = document.getElementById('routeStart');
        var re = document.getElementById('routeEnd');
        if(!rs || !re) return;
        // پارس مختصات (فرمت: lat,lng)
        function parseLL(v){
          var p = v.split(',');
          if(p.length===2) return [parseFloat(p[1]), parseFloat(p[0])];
          return null;
        }
        var s = parseLL(rs.value), e = parseLL(re.value);
        // اگه مختصات نبود، از مرکز نقشه و مکان کاربر استفاده کن
        if(!s && window.map) { var c = map.getCenter(); s = [c.lng, c.lat]; }
        if(s && e){
          fetchRouteAlternatives(s[0], s[1], e[0], e[1]);
        } else if(s && window.userMarker){
          var u = userMarker.getLatLng();
          fetchRouteAlternatives(s[0], s[1], u.lng, u.lat);
        }
      }, 800);
    });
  }
});

// بازنویسی interceptor برای دریافت خودکار
(function(){
  if(window.__altInterceptorDone) return;
  window.__altInterceptorDone = true;
  var origFetch2 = window.fetch;
  var busy = false;
  window.fetch = function(url, opts){
    var p = origFetch2.apply(this, arguments);
    if(typeof url === 'string' && url.indexOf('router.project-osrm.org') !== -1 && url.indexOf('/route/v1/driving/') !== -1 && url.indexOf('alternatives=') === -1 && !busy){
      var m = url.match(/driving\/([-\d.]+),([-\d.]+);([-\d.]+),([-\d.]+)/);
      if(m){
        busy = true;
        var slng=m[1], slat=m[2], elng=m[3], elat=m[4];
        lastRouteStart = [parseFloat(slng), parseFloat(slat)];
        lastRouteEnd = [parseFloat(elng), parseFloat(elat)];
        setTimeout(function(){
          try{
            fetchRouteAlternatives(slng, slat, elng, elat).then(function(){ busy = false; }).catch(function(){ busy = false; });
          }catch(e){ busy = false; }
        }, 2000);
      }
    }
    return p;
  };
})();
