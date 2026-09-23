/* ==========================================================================
   VERANDA FILMS — services.html page script (after site.js)
   F27 tilt + F26 toggle are handled by site.js. This file:
   • F28: keeps the map's pulses/comets running only while the map is on screen
   • F27: deep links (#websites …) land below the sticky nav and give the card a short highlight
   ========================================================================== */
(function () {
  'use strict';
  var html = document.documentElement;
  var STATIC = html.classList.contains('noanim') || html.classList.contains('reduce');

  /* ---------- F28 remote map: live only in view ---------- */
  function remoteMap() {
    var map = document.querySelector('.remote-map');
    if (!map) return;
    if (STATIC || !('IntersectionObserver' in window)) { map.classList.add('in', 'is-live'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { map.classList.toggle('is-live', en.isIntersecting); });
    }, { threshold: 0.05 });
    io.observe(map);
  }

  /* ---------- F27 deep links from the Home bento (services.html#websites …) ---------- */
  function deepLink() {
    function flash() {
      var id = location.hash.replace('#', '');
      if (!id) return;
      var wrap = document.getElementById(id);
      if (!wrap || !wrap.classList.contains('tilt-wrap')) return;
      var card = wrap.querySelector('.svc-card');
      if (!card) return;
      card.classList.add('is-target');
      setTimeout(function () { card.classList.remove('is-target'); }, 2400);
    }
    window.addEventListener('hashchange', flash);
    if (location.hash) setTimeout(flash, 350);
  }

  function boot() { remoteMap(); deepLink(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
