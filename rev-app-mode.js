/* REV app-mode bridge: keeps app navigation and presentation consistent without changing normal website visits. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var isAppHome = /\/(?:mobile-app\/)?index\.html$/.test(location.pathname) || /\/rev-mobile\/?$/.test(location.pathname);
  var appMode = params.get('app') === '1' || isAppHome;
  if (!appMode) return;
  document.documentElement.setAttribute('data-rev-app', '1');
  var style = document.createElement('style');
  style.id = 'rev-app-mode-style';
  style.textContent = `
    html[data-rev-app="1"],html[data-rev-app="1"] body{background:#fff!important;color:#17253b!important;color-scheme:light!important}
    html[data-rev-app="1"] body{font-family:Vazirmatn,Vazir,IRANSansX,Tahoma,sans-serif!important;padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
    html[data-rev-app="1"] body header,html[data-rev-app="1"] body .head,html[data-rev-app="1"] body .header,html[data-rev-app="1"] body .topbar{background:#fff!important;color:#17253b!important;border-color:#e2eaf4!important}
    html[data-rev-app="1"] body main,html[data-rev-app="1"] body .wrap,html[data-rev-app="1"] body section{color:#17253b}
    html[data-rev-app="1"] body h1,html[data-rev-app="1"] body h2,html[data-rev-app="1"] body h3,html[data-rev-app="1"] body p,html[data-rev-app="1"] body label,html[data-rev-app="1"] body small{color:inherit}
    html[data-rev-app="1"] body .panel,html[data-rev-app="1"] body .card,html[data-rev-app="1"] body .tile,html[data-rev-app="1"] body .box,html[data-rev-app="1"] body .trip-card,html[data-rev-app="1"] body .section-card{background:#fff!important;color:#17253b!important;border-color:#e2eaf4!important;box-shadow:0 4px 18px rgba(20,41,59,.055)!important}
    html[data-rev-app="1"] body button,html[data-rev-app="1"] body .btn.primary,html[data-rev-app="1"] body [type=submit],html[data-rev-app="1"] body .primary-btn{background:#0866ff!important;color:#fff!important;border-color:#0866ff!important}
    html[data-rev-app="1"] body input,html[data-rev-app="1"] body select,html[data-rev-app="1"] body textarea{background:#fff!important;color:#17253b!important;border-color:#d5e2ec!important}
    #rev-app-bottom-nav{position:fixed;z-index:99999;left:12px;right:12px;bottom:calc(8px + env(safe-area-inset-bottom));padding:7px 8px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;background:rgba(255,255,255,.96);border:1px solid rgba(221,230,242,.95);border-radius:22px;box-shadow:0 8px 30px rgba(23,42,75,.13);backdrop-filter:blur(18px)}
    #rev-app-bottom-nav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:5px 2px;border-radius:14px;color:#718096!important;font-size:0;text-decoration:none!important;transition:background .18s ease,color .18s ease,transform .18s ease}
    #rev-app-bottom-nav a span{font-size:19px;line-height:1.3}#rev-app-bottom-nav a:nth-child(3)>span:first-child{display:grid;place-items:center;width:31px;height:31px;border-radius:11px;background:#0866ff;color:#fff;font-size:25px;line-height:1}#rev-app-bottom-nav a:nth-child(3){color:#0866ff!important}
    #rev-app-bottom-nav a[aria-current="page"]{color:#0866ff!important;background:#eaf1ff!important;font-weight:800}
    #rev-app-bottom-nav a:focus-visible{outline:2px solid #0866ff;outline-offset:2px}
    @media(min-width:700px){html[data-rev-app="1"] body{padding-bottom:82px!important}#rev-app-bottom-nav{left:50%;right:auto;transform:translateX(-50%);width:min(470px,calc(100% - 24px));bottom:12px;border:1px solid rgba(221,230,242,.95);border-radius:22px}}
  `;
  document.head.appendChild(style);
  function addAppFlag(raw) {
    try {
      var u = new URL(raw, location.href);
      if (u.origin !== location.origin || u.pathname.indexOf('/api/') >= 0 || u.hash && u.pathname === location.pathname) return raw;
      u.searchParams.set('app', '1');
      return u.href;
    } catch (_) { return raw; }
  }
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^javascript:|^mailto:|^tel:/i.test(href)) return;
    a.setAttribute('href', addAppFlag(href));
  });
  var current = location.pathname;
  var items = [
    {href:'./index.html',label:'خانه',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7M5.5 9v11h13V9M9.5 20v-6h5v6"/></svg>',match:/\\/index\\.html$/},
    {href:'./nearby-map.html',label:'نقشه',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',match:/\\/nearby-map\\.html$/},
    {href:'./trips.html',label:'سفر',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 15l4-4 3 3 4-5M14 9h4v4"/></svg>',match:/\\/trips\\.html$/},
    {href:'./businesses.html',label:'خدمات',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></svg>',match:/\\/businesses\\.html$/}
  ];
  document.querySelectorAll('.bottom-nav').forEach(function(oldNav){ oldNav.remove(); });
  var nav = document.createElement('nav');
  nav.id = 'rev-app-bottom-nav';
  nav.setAttribute('aria-label','ناوبری اصلی اپ REV');
  items.forEach(function (item) {
    var a = document.createElement('a');
    a.href = item.href + (item.href.indexOf('?') >= 0 ? '&app=1' : '?app=1');
    a.innerHTML = item.icon + '<span>' + item.label + '</span>'; a.setAttribute('aria-label', item.label);
    if (item.match.test(current) && item.label !== 'ایجاد تجربه' && item.label !== 'اکسپلور') a.setAttribute('aria-current','page');
    if (item.label === 'اکسپلور' && /\/experiences\.html$/.test(current) && new URLSearchParams(location.search).get('create') !== '1') a.setAttribute('aria-current','page');
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
})();