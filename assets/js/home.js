/* ==========================================================================
   VERANDA FILMS — home.js  (index.html only; loads after site.js)
   F01 preloader · F02 hero frame scrub · F03 altitude HUD · F04 kinetic headline ·
   F11 photo→film slider · F13 how-it-works sticky scene · F14 187 tiles · F15 calculator
   QA hooks: ?scrub=0.5 pins the hero to that fraction of the descent (deterministic, no lerp, no scrolling);
   ?noanim disables animation; ?only=<id> shows one section (handled in site.js).
   ========================================================================== */
(function () {
  'use strict';
  var VF = window.VF || {};
  var html = document.documentElement;
  var NOANIM = html.classList.contains('noanim');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATIC = NOANIM || REDUCE;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function param(name) { var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function pad3(n) { return ('00' + Math.round(n)).slice(-3); }

  /* ---------- F01 Preloader (first visit per session; skipped by noanim / reduced motion / QA hooks) ---------- */
  function preloader() {
    var pre = $('.preloader');
    if (!pre) return;
    if (html.classList.contains('vf-seen') || STATIC || param('scrub') !== null || param('only') !== null) { pre.remove(); return; }
    try { sessionStorage.setItem('vf-seen', '1'); } catch (e) {}
    html.classList.add('pre-lock');
    var num = $('.pre-num', pre), t0 = performance.now(), D = 980, finished = false;
    function finish(instant) {
      if (finished) return; finished = true;
      if (num) num.textContent = '100';
      pre.classList.add('is-done');
      setTimeout(function () { if (pre.parentNode) pre.remove(); html.classList.remove('pre-lock'); html.classList.add('pre-done'); }, instant ? 0 : 620);
    }
    /* hidden/background tab: rAF is suspended, so skip the animation instead of locking the page */
    if (document.visibilityState === 'hidden') { finish(true); return; }
    /* safety net: the <= 1.6 s promise holds even if the rAF loop never completes */
    setTimeout(function () { finish(false); }, 1800);
    raf(function tick(now) {
      if (finished) return;
      var p = clamp((now - t0) / D, 0, 1), e = 1 - Math.pow(1 - p, 3);
      if (num) num.textContent = pad3(e * 100);
      if (p < 1) { raf(tick); return; }
      finish(false);
    });
  }

  /* ---------- F02 / F03 / F04 Hero: orbit → veranda frame scrub, HUD, captions, headline ---------- */
  function hero() {
    var sec = $('#hero');
    if (!sec) return;
    var sticky = $('.hero-sticky', sec), canvas = $('.hero-canvas', sec), poster = $('.hero-poster', sec), vid = $('.hero-video', sec);
    var caps = $$('.cap', sec), capsWrap = $('.hero-captions', sec), end = $('.hero-end', sec), hint = $('.hero-hint', sec);
    var hud = {
      alt: $('[data-hud-alt]', sec), lat: $('[data-hud-lat]', sec), lng: $('[data-hud-lng]', sec), pct: $('[data-hud-pct]', sec),
      rail: $('[data-hud-rail]', sec), tag: $('[data-hud-tag]', sec), stops: $$('[data-hud-stop]', sec)
    };
    var mobile = window.matchMedia('(max-width: 859px)').matches;
    var scrubParam = param('scrub');
    var scrubP = scrubParam !== null ? clamp(parseFloat(scrubParam) || 0, 0, 1) : null;
    var mode = REDUCE ? 'static' : (mobile ? 'video' : 'scrub');
    if (scrubP !== null && !mobile) mode = 'scrub';
    html.classList.add('mode-' + mode); // html.mode-scrub | mode-video | mode-static (never 'hero-video': that is the <video> class)
    caps.forEach(function (c) { if (VF.splitWords) VF.splitWords(c); });

    /* static: villa still + headline, nothing moves */
    if (mode === 'static') {
      if (canvas) canvas.remove();
      if (vid) vid.remove();
      if (poster) { poster.src = 'assets/img/hero-villa.webp'; poster.width = 2400; poster.height = 1018; poster.alt = 'Luxury villa with an infinity pool at dusk, warm light in the windows and a navy sky over the jungle'; }
      if (end) end.classList.add('is-in');
      if (hud.tag) hud.tag.classList.add('is-on');
      return;
    }

    /* mobile: the descent as a muted looping video, captions on timers, then the headline */
    if (mode === 'video') {
      if (canvas) canvas.remove();
      if (vid) {
        vid.muted = true;
        /* let the poster paint first (LCP), then fetch the 2.7 MB loop */
        var startVid = function () {
          var vp = vid.getAttribute('data-poster'); if (vp) vid.setAttribute('poster', vp); // cached 960 poster, no second 1920 fetch
          vid.src = vid.getAttribute('data-src');
          var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { vid.style.display = 'none'; });
        };
        /* poster is the LCP; the 2.7 MB loop waits for window load + idle (or first scroll) */
        var started = false;
        var kick = function () { if (started) return; started = true; startVid(); };
        var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 800); })(kick, { timeout: 2500 }); };
        if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
        window.addEventListener('scroll', kick, { once: true, passive: true });
      }
      document.addEventListener('visibilitychange', function () { if (!document.hidden && vid && vid.paused) { var q = vid.play(); if (q && q.catch) q.catch(function () {}); } });
      var shown = false;
      var showEnd = function () {
        if (shown) return; shown = true;
        caps.forEach(function (c) { c.classList.remove('is-in'); c.classList.add('is-out'); });
        if (end) end.classList.add('is-in');
        if (hint) hint.classList.add('is-gone');
      };
      if (NOANIM) { showEnd(); return; }
      var t = 0, step = 2500;
      caps.forEach(function (c, i) {
        if (i === 0) { c.classList.add('is-in'); } /* first caption paints immediately (no LCP render delay) */
        else setTimeout(function () { if (!shown) c.classList.add('is-in'); }, t + i * step);
        setTimeout(function () { c.classList.remove('is-in'); c.classList.add('is-out'); }, t + i * step + step - 260);
      });
      setTimeout(showEnd, t + caps.length * step);
      window.addEventListener('scroll', showEnd, { passive: true, once: true });
      window.addEventListener('touchstart', showEnd, { passive: true, once: true });
      return;
    }

    /* desktop: canvas scrub through 240 frames */
    var N = 240, DIR = 'assets/seq/hero/', frames = [], loaded = [];
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cw = 0, ch = 0, cur = -1, target = 0, smooth = 0, lastP = -1;

    function resize() {
      cw = sticky.clientWidth; ch = sticky.clientHeight;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cur = -1; draw();
    }
    function drawImg(img) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw) return;
      var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    function wantIdx(p) { return 1 + Math.round(clamp(p / .82, 0, 1) * (N - 1)); }
    function nearest(i) {
      if (loaded[i]) return i;
      for (var d = 1; d < N; d++) {
        if (i - d >= 1 && loaded[i - d]) return i - d;
        if (i + d <= N && loaded[i + d]) return i + d;
      }
      return 0;
    }
    function draw(force) {
      var want = wantIdx(smooth), use = nearest(want);
      if (use !== want) prioritize(want);
      if (use === cur && !force) return;
      cur = use;
      if (use === 0) return;
      drawImg(frames[use]);
      canvas.classList.add('is-drawn');
    }
    function src(i) { return DIR + 'f_' + ('000' + i).slice(-4) + '.jpg'; }

    var queue = [], inflight = 0, MAX = 6;
    function load(i, cb) {
      if (frames[i]) { if (loaded[i] && cb) cb(); else if (cb) frames[i].addEventListener('load', cb, { once: true }); return; }
      var im = new Image(); im.decoding = 'async';
      im.onload = function () {
        loaded[i] = true;
        if (Math.abs(i - wantIdx(smooth)) <= 8) { cur = -1; draw(); }
        if (cb) cb();
      };
      im.onerror = function () { if (cb) cb(); };
      im.src = src(i); frames[i] = im;
    }
    function pump() {
      while (inflight < MAX && queue.length) {
        var k = queue.shift();
        if (frames[k]) continue;
        inflight++;
        load(k, function () { inflight--; pump(); });
      }
    }
    function prioritize(i) {
      if (frames[i]) return;
      var at = queue.indexOf(i);
      if (at > 0) queue.splice(at, 1);
      queue.unshift(i);
      pump();
    }
    function loadAll() {
      var i, j, first = {};
      for (i = 1; i <= N; i += 8) { queue.push(i); first[i] = 1; }
      if (!first[N]) { queue.push(N); first[N] = 1; }
      for (j = 1; j <= N; j++) if (!first[j]) queue.push(j);
      pump();
    }

    /* captions / headline / HUD as a function of progress p ∈ [0,1] */
    var capRanges = [[.04, .30], [.34, .55], [.59, .80]], END_AT = .84;
    function states(p) {
      caps.forEach(function (c, i) {
        var r = capRanges[i];
        c.classList.toggle('is-in', p >= r[0] && p < r[1]);
        c.classList.toggle('is-out', p >= r[1]);
      });
      if (end) end.classList.toggle('is-in', p >= END_AT);
      sec.classList.toggle('is-end', p >= END_AT); /* integration: HUD steps aside once the headline settles */
      if (hint) hint.classList.toggle('is-gone', p > .02);
      hudUpdate(p);
    }
    function hudUpdate(p) {
      if (!hud.alt) return;
      var k = Math.pow(1 - clamp(p / .9, 0, 1), 2.4), alt = 12 + 408000 * k;
      hud.alt.textContent = alt >= 1000 ? (alt >= 10000 ? Math.round(alt / 1000) : (alt / 1000).toFixed(1)) + ' KM' : Math.round(alt) + ' M';
      var jit = Math.pow(1 - p, 2);
      var lat = -8.6478 + 6.25 * (1 - p) + Math.sin(p * 61) * .4 * jit;
      var lng = 115.1385 - 8.54 * (1 - p) + Math.cos(p * 47) * .4 * jit;
      if (hud.lat) hud.lat.textContent = lat.toFixed(4);
      if (hud.lng) hud.lng.textContent = lng.toFixed(4);
      if (hud.pct) hud.pct.textContent = pad3(p * 100) + '%';
      if (hud.rail) hud.rail.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      hud.stops.forEach(function (s, i) { s.classList.toggle('is-on', p >= [0, .5, .92][i]); });
      if (hud.tag) hud.tag.classList.toggle('is-on', p > .9);
    }

    var top = 0, runway = 1, secH = 0;
    function measure() {
      var r = sec.getBoundingClientRect();
      top = r.top + window.scrollY;
      secH = sec.offsetHeight;
      runway = Math.max(1, secH - sticky.offsetHeight);
    }
    function progress() { return clamp((window.scrollY - top) / runway, 0, 1); }
    function loop() {
      target = scrubP !== null ? scrubP : progress();
      if (scrubP !== null || window.scrollY < top + secH + innerHeight) {
        smooth = (STATIC || scrubP !== null) ? target : lerp(smooth, target, .16);
        if (Math.abs(smooth - target) < .0006) smooth = target;
        if (smooth !== lastP) { lastP = smooth; draw(); states(smooth); }
      }
      raf(loop);
    }

    /* F23 subtle mouse parallax on the hero layers (desktop only) */
    if (FINE && !STATIC && scrubP === null) {
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
        canvas.style.transform = 'scale(1.04) translate3d(' + (px * -8).toFixed(1) + 'px,' + (py * -6).toFixed(1) + 'px,0)';
        if (capsWrap) capsWrap.style.transform = 'translate3d(' + (px * 14).toFixed(1) + 'px,' + (py * 10).toFixed(1) + 'px,0)';
      }, { passive: true });
    }

    resize(); measure(); loadAll();
    window.addEventListener('resize', function () { resize(); measure(); });
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    /* QA hook: ?scrub=0.5 pins the hero to that fraction of the descent without scrolling
       (headless screenshots of a scrolled page come back blank, so the hook drives the scene directly). */
    if (scrubP !== null) {
      html.classList.add('hero-pinned');
      var jump = function () {
        target = smooth = scrubP; lastP = scrubP;
        cur = -1; draw(true); states(scrubP);
      };
      load(wantIdx(scrubP), jump);
      jump(); setTimeout(jump, 400); setTimeout(jump, 1500);
    }
    states(0);
    raf(loop);
  }

  /* ---------- F11 Photo → film comparison slider ---------- */
  function compare() {
    var c = $('.compare');
    if (!c) return;
    var handle = $('.compare-handle', c), x = 50, drag = false;
    function set(v) {
      x = clamp(v, 0, 100);
      c.style.setProperty('--x', x.toFixed(2) + '%');
      if (handle) handle.setAttribute('aria-valuenow', Math.round(x));
    }
    function fromEvent(e) { var r = c.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    c.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      drag = true; c.classList.add('is-dragging');
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
      fromEvent(e);
    });
    c.addEventListener('pointermove', function (e) { if (drag) fromEvent(e); });
    function up() { drag = false; c.classList.remove('is-dragging'); }
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    if (handle) handle.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') { set(x - 2); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'ArrowUp') { set(x + 2); e.preventDefault(); }
      else if (k === 'Home') { set(0); e.preventDefault(); }
      else if (k === 'End') { set(100); e.preventDefault(); }
    });
    set(50);
  }

  /* ---------- F13 How it works: sticky scene driven by scroll ---------- */
  function howItWorks() {
    var sec = $('.hiw');
    if (!sec) return;
    var sticky = $('.hiw-sticky', sec), steps = $$('.hiw-step', sec), scenes = $$('.hiw-scene', sec);
    var fill = $('.hiw-fill', sec), num = $('[data-hiw-num]', sec), track = $('.strip-track', sec);
    var desktop = window.matchMedia('(min-width: 960px)'), active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      scenes.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      if (num) num.textContent = '0' + (i + 1);
    }
    function trackWidth() { if (track) sec.style.setProperty('--track-w', track.clientWidth + 'px'); }
    function onScroll() {
      if (sec.classList.contains('is-stacked')) return;
      var r = sec.getBoundingClientRect(), run = Math.max(1, sec.offsetHeight - sticky.offsetHeight);
      var p = clamp(-r.top / run, 0, 1);
      if (fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      setActive(Math.min(2, Math.floor(p * 2.999)));
    }
    function mode() {
      if (desktop.matches && !STATIC) {
        sec.classList.remove('is-stacked');
        active = -1; onScroll();
      } else {
        sec.classList.add('is-stacked');
        steps.concat(scenes).forEach(function (s) { s.classList.add('is-on'); });
      }
      trackWidth();
    }
    mode();
    desktop.addEventListener('change', mode);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { onScroll(); trackWidth(); });
  }

  /* ---------- F14 187 tiles ---------- */
  function tiles() {
    var wrap = $('.tiles');
    if (!wrap) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 187; i++) { var t = document.createElement('i'); t.style.setProperty('--i', i); frag.appendChild(t); }
    wrap.appendChild(frag);
  }

  /* ---------- F15 Crew-vs-us calculator ---------- */
  function calculator() {
    var c = $('.calc');
    if (!c) return;
    var range = $('input[type="range"]', c);
    if (!range) return;
    var q = function (s) { return $(s, c); };
    var out = {
      n: $$('[data-calc-n]', c), crewCost: q('[data-calc="crew-cost"]'), crewDays: q('[data-calc="crew-days"]'), crewVisits: q('[data-calc="crew-visits"]'),
      usCost: q('[data-calc="us-cost"]'), usDays: q('[data-calc="us-days"]'), usVisits: q('[data-calc="us-visits"]'),
      bCostCrew: q('[data-bar="cost-crew"]'), bCostUs: q('[data-bar="cost-us"]'), bTimeCrew: q('[data-bar="time-crew"]'), bTimeUs: q('[data-bar="time-us"]'),
      result: q('[data-calc-result]')
    };
    function eur(v) { return '€' + v.toLocaleString('en-US'); }
    function txt(el, v) { if (el) el.textContent = v; }
    function bar(el, w) { if (el) el.style.setProperty('--w', clamp(w, .02, 1).toFixed(3)); }
    function update() {
      var n = parseInt(range.value, 10) || 1;
      var crewCost = n * 800, crewDays = n, usCost = n * 100, usDays = Math.ceil(n / 15) * 5;
      out.n.forEach(function (el) { el.textContent = n; });
      txt(out.crewCost, eur(crewCost)); txt(out.crewDays, crewDays + (crewDays === 1 ? ' day' : ' days')); txt(out.crewVisits, n + (n === 1 ? ' visit' : ' visits'));
      txt(out.usCost, eur(usCost)); txt(out.usDays, usDays + ' days'); txt(out.usVisits, '0 visits');
      var maxCost = Math.max(crewCost, usCost), maxDays = Math.max(crewDays, usDays);
      bar(out.bCostCrew, crewCost / maxCost); bar(out.bCostUs, usCost / maxCost);
      bar(out.bTimeCrew, crewDays / maxDays); bar(out.bTimeUs, usDays / maxDays);
      var save = crewCost - usCost, days = crewDays - usDays;
      if (out.result) {
        out.result.innerHTML = 'For <b>' + n + (n === 1 ? ' property' : ' properties') + '</b> you save about <b>' + eur(save) + '</b>' +
          (days > 0 ? ' and roughly <b>' + days + ' working days</b>.' : ', and the film arrives <b>within a week</b>.');
      }
      range.style.setProperty('--p', ((n - 1) / 199 * 100).toFixed(2) + '%');
      range.setAttribute('aria-valuenow', n);
      range.setAttribute('aria-valuetext', n + (n === 1 ? ' property' : ' properties'));
    }
    range.addEventListener('input', update);
    update();
  }

  function boot() {
    preloader();
    tiles();
    hero();
    compare();
    howItWorks();
    calculator();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
