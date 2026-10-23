/* REV Hybrid — home energy/trip card (v8). Defensive: any failure = no card, no breakage. */
(function () {
  try {
    if (document.querySelector('#hybHomeCard')) return;
    var hero = document.querySelector('main .hero-card') || document.querySelector('.hero-card');
    if (!hero || !hero.parentNode) return;
    var prof = null;
    try { prof = JSON.parse(localStorage.getItem('rev_driver_vehicle_profile') || 'null'); } catch (e) {}
    var soc = prof && prof.soc != null ? +prof.soc : 80;
    var batt = prof && prof.battery ? +prof.battery : 72;
    var cons = prof && prof.cons ? +prof.cons : 18;
    if (!isFinite(soc) || soc < 0 || soc > 100) soc = 80;
    var range = Math.max(0, Math.round(batt / cons * 100 * soc / 100));
    var plans = [];
    try { plans = JSON.parse(localStorage.getItem('rev_saved_trip_plans_v1') || '[]'); } catch (e) {}
    var plan = plans && plans.length ? plans[0] : null;
    var from = plan && (plan.fromName || plan.originName || plan.from) || '';
    var to = plan && (plan.toName || plan.destName || plan.destination) || '';
    var deg = Math.round(soc * 3.6);
    var tripHtml;
    if (from && to) {
      tripHtml = '<div class="hyb-trip"><b>سفر بعدی‌ات</b><span class="hyb-eta">برنامه ذخیره‌شده</span></div>'
        + '<div class="hyb-route"><b>' + from + '</b><div class="hyb-line"></div><b>' + to + '</b></div>'
        + '<div class="hyb-meta"><span>از بخش سفر ادامه‌اش بده</span></div>';
    } else {
      tripHtml = '<div class="hyb-trip"><b>سفر بعدی‌ات را بچین</b><span class="hyb-eta">برنامه‌ریز سفر</span></div>'
        + '<div class="hyb-meta"><span>مبدأ و مقصد را بزن؛ مسیر را با توقف‌های شارژ تحویل بگیر</span></div>';
    }
    var card = document.createElement('section');
    card.id = 'hybHomeCard';
    card.innerHTML = '<div class="hyb-energy">'
      + '<span class="hyb-ring" style="background:conic-gradient(#0E8BD0 ' + deg + 'deg,#E7EEF3 0)"><i>' + soc + '٪</i></span>'
      + '<div><b>خودروی تو آماده‌ست 🚙</b><span>شارژ فعلی و بردت را این‌جا می‌بینی</span></div>'
      + '<div class="hyb-car"><b>برد فعلی</b><br><span>' + range + ' km</span></div></div>'
      + tripHtml
      + '<button class="hyb-go" type="button">شروع مسیریابی 🚀</button>';
    card.querySelector('.hyb-go').addEventListener('click', function () { location.href = 'trips.html'; });
    hero.parentNode.insertBefore(card, hero.nextSibling);
  } catch (e) { /* silent */ }
})();
