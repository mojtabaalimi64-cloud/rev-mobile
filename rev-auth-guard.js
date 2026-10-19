/* REV global authentication gate.
   All app pages except index require a valid server-side phone/SMS session. */
(function () {
  'use strict';
  var API = 'https://rev-auth-api.mojtaba-alimi64.workers.dev';
  var allowed = /^(index\.html|profile\.html|trips\.html|nearby-map\.html|nearby-map-ml\.html|businesses\.html|experiences\.html)$/;
  var path = (location.pathname.split('/').pop() || 'index.html');
  if (path === 'index.html' || path === '') return;
  document.documentElement.style.visibility = 'hidden';
  var next = path + location.search + location.hash;
  if (!allowed.test(path)) next = 'index.html';
  fetch(API + '/api/portal/me', { credentials: 'include', cache: 'no-store' })
    .then(function (response) {
      if (response.ok) {
        document.documentElement.style.visibility = '';
        return;
      }
      location.replace('./index.html?login=1&next=' + encodeURIComponent(next));
    })
    .catch(function () {
      location.replace('./index.html?login=1&next=' + encodeURIComponent(next));
    });
})();