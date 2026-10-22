/* REV global authentication gate.
   Keep protected pages hidden only while checking the session; never leave a blank page on network failure. */
(function () {
  'use strict';
  var API = 'https://rev-auth-api.mojtaba-alimi64.workers.dev';
  var allowed = /^(index\.html|profile\.html|trips\.html|nearby-map\.html|nearby-map-ml\.html|businesses\.html|experiences\.html)$/;
  var path = (location.pathname.split('/').pop() || 'index.html');
  // The travel-experiences feed is public; write actions are authenticated by the API itself.
  // Tow drivers use their own driver token and must not be redirected by the consumer-account gate.
  if (path === 'index.html' || path === '' || path === 'experiences.html' || path === 'tow-driver.html' || path === 'energy-assistant.html') return;
  var next = path + location.search + location.hash;
  if (!allowed.test(path)) next = 'index.html';

  var root = document.documentElement;
  root.style.visibility = 'hidden';
  var settled = false;
  var timer = setTimeout(function () {
    if (settled) return;
    settled = true;
    showConnectionError('بررسی ورود بیش از حد طول کشید. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
  }, 10000);

  function showConnectionError(message) {
    root.style.visibility = '';
    var old = document.getElementById('rev-auth-connection-error');
    if (old) old.remove();
    var panel = document.createElement('section');
    panel.id = 'rev-auth-connection-error';
    panel.setAttribute('role', 'alert');
    panel.dir = 'rtl';
    panel.style.cssText = 'position:fixed;z-index:2147483647;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#fff;color:#17253b;font:16px/1.9 Tahoma,sans-serif;text-align:center';
    panel.innerHTML = '<div style="width:min(420px,100%);padding:24px;border:1px solid #dbe5ef;border-radius:18px;box-shadow:0 8px 30px #17253b12"><div style="font-size:28px;margin-bottom:8px">📡</div><h2 style="margin:0 0 8px;font-size:19px">ارتباط با حساب REV برقرار نشد</h2><p id="rev-auth-error-message" style="margin:0 0 18px"></p><button id="rev-auth-retry" type="button" style="border:0;border-radius:10px;background:#0866ff;color:#fff;padding:11px 20px;font:inherit;cursor:pointer">تلاش دوباره</button> <a href="./index.html" style="display:inline-block;margin:8px;color:#0866ff">بازگشت به خانه</a></div>';
    panel.querySelector('#rev-auth-error-message').textContent = message;
    panel.querySelector('#rev-auth-retry').addEventListener('click', function () { location.reload(); });
    document.body.appendChild(panel);
  }

  fetch(API + '/api/portal/me', { credentials: 'include', cache: 'no-store' })
    .then(function (response) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (response.ok) {
        root.style.visibility = '';
        return;
      }
      if (response.status === 401 || response.status === 403) {
        location.replace('./index.html?login=1&next=' + encodeURIComponent(next));
        return;
      }
      showConnectionError('سرویس حساب REV پاسخ معتبر نداد (' + response.status + ').');
    })
    .catch(function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      showConnectionError('ممکن است سرویس موقتاً در دسترس نباشد. با تلاش دوباره می‌توانید وضعیت ورود را بررسی کنید.');
    });
})();