/* ==========================================================================
   VERANDA FILMS — films.js  (films.html only; loads after site.js)
   F24 "How it was made" strips: 4 stills → 4 tiny clips, hover (fine pointer) or tap (touch/keyboard)
   plays the clip in place of the still; a 2px line under the tile shows clip progress.
   F25 showreel: the "Play all" buttons use [data-playall="films"] from site.js — nothing to add here
   except the total-duration readout in the page head.
   Lightbox player, hover-to-play on the big players, morph, reveals: all in site.js.
   QA hooks: ?noanim / prefers-reduced-motion → no hover playback (tap/keyboard still works, one clip at a time).
   ========================================================================== */
(function () {
  'use strict';
  var VF = window.VF || {};
  var html = document.documentElement;
  var NOANIM = html.classList.contains('noanim');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATIC = NOANIM || REDUCE;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- F24 made-strip tiles ---------- */
  function madeStrips() {
    var tiles = $$('.made-tile');
    if (!tiles.length) return;
    var current = null; // only one clip runs at a time (keeps the page light on touch devices)

    tiles.forEach(function (tile) {
      var btn = $('.made-btn', tile), v = $('video', tile), line = $('.made-line', tile);
      if (!btn || !v) return;
      var raf = 0;

      function tick() {
        if (line && v.duration) line.style.setProperty('--p', (v.currentTime / v.duration).toFixed(3));
        raf = window.requestAnimationFrame(tick);
      }
      function start() {
        if (current && current !== tile) stopTile(current);
        if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); }
        v.muted = true;
        var p = v.play();
        function on() { tile.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true'); current = tile; if (!NOANIM) { cancelAnimationFrame(raf); raf = window.requestAnimationFrame(tick); } }
        if (p && p.then) p.then(on).catch(function () {}); else on();
      }
      function stop() {
        v.pause();
        tile.classList.remove('is-on'); btn.setAttribute('aria-pressed', 'false');
        cancelAnimationFrame(raf);
        if (line) line.style.setProperty('--p', '0');
        try { v.currentTime = 0; } catch (e) {}
        if (current === tile) current = null;
      }
      tile._stop = stop;

      if (FINE && !STATIC) {
        btn.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') start(); });
        btn.addEventListener('pointerleave', function () { stop(); });
      }
      // tap / click / Enter / Space toggles (touch devices, keyboard users, reduced motion)
      btn.addEventListener('click', function () { if (tile.classList.contains('is-on')) stop(); else start(); });
      btn.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tile.classList.contains('is-on')) { stop(); e.preventDefault(); } });
    });
    function stopTile(t) { if (t && t._stop) t._stop(); }

    // stop whatever runs when it leaves the viewport (touch scrolling past a playing tile)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (!x.isIntersecting && x.target.classList.contains('is-on')) stopTile(x.target); });
      }, { threshold: 0 });
      tiles.forEach(function (t) { io.observe(t); });
    }
    // stop when the lightbox opens (so two videos never play at once)
    document.addEventListener('click', function (e) {
      if (e.target.closest && (e.target.closest('[data-player]') || e.target.closest('[data-playall]'))) stopTile(current);
    });
  }

  /* ---------- F25 showreel readout: sum the film durations from data-dur (seconds) ---------- */
  function reelReadout() {
    var out = $('[data-reel-total]');
    if (!out) return;
    var total = 0;
    $$('[data-player][data-group="films"]').forEach(function (a) { total += parseFloat(a.getAttribute('data-dur') || '0') || 0; });
    if (!total) return;
    var s = Math.round(total);
    out.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ---------- Deep links: films.html#babylon arrives from Home — settle under the nav ---------- */
  function deepLink() {
    if (!location.hash) return;
    var t = document.getElementById(location.hash.slice(1));
    if (!t || !t.classList.contains('film-feature')) return;
    window.requestAnimationFrame(function () { t.scrollIntoView({ block: 'start', behavior: STATIC ? 'auto' : 'smooth' }); });
  }

  function boot() { madeStrips(); reelReadout(); deepLink(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
