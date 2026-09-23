/* ============================================================================
   VERANDA FILMS — studio.js  (page modules for studio.html, loaded after site.js)
   F33 manifesto: sticky kinetic text, one line per scroll step
   F34 method strip: five steps light up in sequence when in view
   F35 timeline: vertical beam fills with scroll and lights each day marker
   Vanilla JS, no dependencies. Every module checks its DOM and bails quietly.
   ============================================================================ */
(function () {
  'use strict';
  var html = document.documentElement;
  var VF = window.VF || {};
  var STATIC = typeof VF.STATIC === 'boolean' ? VF.STATIC : (html.classList.contains('noanim') || html.classList.contains('reduce'));
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- F33 Manifesto ---------- */
  function manifesto() {
    var sec = $('.manifesto');
    if (!sec) return;
    var sticky = $('.mf-sticky', sec), lines = $$('[data-mf-line]', sec);
    var num = $('[data-mf-num]', sec), fill = $('[data-mf-fill]', sec);
    var n = lines.length, active = -1;
    if (!n) return;
    var total = $('[data-mf-total]', sec); if (total) total.textContent = '/ ' + (n < 10 ? '0' : '') + n;
    if (STATIC) { sec.classList.add('is-stacked'); if (num) num.textContent = (n < 10 ? '0' : '') + n; return; }
    function setActive(i) {
      if (i === active) return;
      active = i;
      lines.forEach(function (l, k) {
        l.classList.toggle('is-on', k === i);
        l.classList.toggle('is-past', k < i);
      });
      if (num) num.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      sec.classList.toggle('is-done', i === n - 1);
    }
    /* QA hook: ?mf=0.6 pins the manifesto to that fraction of its runway (like ?scrub= on Home) */
    var pinned = typeof VF.param === 'function' ? parseFloat(VF.param('mf')) : NaN;
    function onScroll() {
      var r = sec.getBoundingClientRect();
      var run = Math.max(1, sec.offsetHeight - sticky.offsetHeight);
      var p = isNaN(pinned) ? clamp(-r.top / run, 0, 1) : clamp(pinned, 0, 1);
      if (fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      /* first step holds a little longer so the first line is readable on arrival */
      var i = p < 0.14 ? 0 : Math.min(n - 1, 1 + Math.floor((p - 0.14) / (0.86 / (n - 1))));
      setActive(i);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------- F34 Method strip: light steps in sequence ---------- */
  function method() {
    var wrap = $('[data-method]');
    if (!wrap) return;
    var steps = $$('.method-step', wrap);
    if (STATIC || !('IntersectionObserver' in window)) { steps.forEach(function (s) { s.classList.add('is-lit'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.disconnect();
        steps.forEach(function (s, k) { setTimeout(function () { s.classList.add('is-lit'); }, 160 + k * 180); });
      });
    }, { threshold: 0.35 });
    io.observe(wrap);
  }

  /* ---------- F35 Timeline: scroll-driven fill + markers ---------- */
  function timeline() {
    var tl = $('[data-timeline]');
    if (!tl) return;
    var items = $$('[data-tl-item]', tl), fill = $('[data-tl-fill]', tl);
    if (STATIC) { items.forEach(function (i) { i.classList.add('is-lit'); }); if (fill) fill.style.setProperty('--fill', 1); return; }
    var ticking = false;
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect();
      var line = window.innerHeight * 0.72;               /* the "now" line, 72 % down the viewport */
      var p = clamp((line - r.top) / Math.max(1, r.height), 0, 1);
      if (fill) fill.style.setProperty('--fill', p.toFixed(4));
      items.forEach(function (it) {
        var d = $('.tl-dot', it), y = d ? d.getBoundingClientRect().top : it.getBoundingClientRect().top;
        it.classList.toggle('is-lit', y <= line);
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  function boot() { manifesto(); method(); timeline(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
