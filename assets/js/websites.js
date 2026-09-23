/* ==========================================================================
   VERANDA FILMS — websites.js
   F30 live site-builder demo (form → laptop + phone frames render a mini landing page)
   F31 auto-typing demo on load (types "Villa Saya" / "Uluwatu, Bali", assembles the preview piece by piece)
   F32 "What's in the box" score dial animating to 98
   Vanilla JS, no dependencies. Respects html.noanim / prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';
  var html = document.documentElement;
  var NOANIM = html.classList.contains('noanim');
  var REDUCE = html.classList.contains('reduce') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var STATIC = NOANIM || REDUCE;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, STATIC ? 0 : ms); }); }

  /* ---------- Content ------------------------------------------------------ */
  var VIBES = {
    jungle: { label: 'Jungle', line: 'where the mornings arrive in mist', img: 'assets/img/vibe-jungle.webp', alt: 'Villa with a pool surrounded by dense jungle in morning mist' },
    beach:  { label: 'Beach',  line: 'forty steps from the sand',           img: 'assets/img/vibe-beach.webp',  alt: 'Beachfront villa with palms and a pool steps from the sand at dusk' },
    cliff:  { label: 'Cliff',  line: 'the ocean, from above',               img: 'assets/img/vibe-cliff.webp',  alt: 'Clifftop villa with an infinity pool above the ocean' },
    city:   { label: 'City',   line: 'a quiet house in a loud city',        img: 'assets/img/vibe-city.webp',   alt: 'Rooftop villa terrace with a pool above a city skyline at night' }
  };
  var PALETTES = { dusk: 'Dusk', ocean: 'Ocean', sand: 'Sand', night: 'Night' };
  var STEPS = ['Writing the headline', 'Placing the film', 'Laying out the rooms', 'Adding the map', 'Ready'];

  /* ---------- F30: one renderer per device frame --------------------------- */
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1×1 transparent: no <img> ever sits without a src
  function MiniSite(screen) {
    this.root = document.createElement('div');
    this.root.className = 'mini';
    this.root.setAttribute('data-palette', 'dusk');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML =
      '<div class="mini-nav piece" data-piece="nav">' +
        '<span class="mini-brand" data-m="brand">Your villa</span>' +
        '<span class="mini-links"><span>Film</span><span>Rooms</span><span>Location</span></span>' +
        '<span class="mini-btn mini-btn--sm">Book</span>' +
      '</div>' +
      '<div class="mini-hero">' +
        '<img class="mini-hero-img" src="' + BLANK + '" alt="" decoding="async">' +
        '<img class="mini-hero-img" src="' + BLANK + '" alt="" decoding="async">' +
        '<div class="mini-hero-shade"></div>' +
        '<span class="mini-film-tag piece" data-piece="film"><i></i>Film · 0:30</span>' +
        '<div class="mini-hero-copy">' +
          '<h2 class="mini-h1 piece" data-piece="headline"><span class="mini-line" data-m="name">Your villa</span> — <em class="mini-line" data-m="line">the ocean, from above</em></h2>' +
          '<p class="mini-sub piece" data-piece="sub" data-m="loc">Your location</p>' +
          '<span class="mini-btn piece" data-piece="book">Book direct</span>' +
        '</div>' +
      '</div>' +
      '<div class="mini-sections">' +
        '<div class="mini-sec piece" data-piece="s1"><span class="mini-sec-k">01</span><h3 class="mini-sec-t">The film</h3><p class="mini-sec-s">Thirty seconds, from the photos we already had.</p>' +
          '<div class="mini-sec-visual"><img class="mini-film-thumb" src="' + BLANK + '" alt="" decoding="async"><span class="mini-play"><i></i></span></div></div>' +
        '<div class="mini-sec piece" data-piece="s2"><span class="mini-sec-k">02</span><h3 class="mini-sec-t">Rooms</h3><p class="mini-sec-s">Three bedrooms, one pool, no neighbors.</p>' +
          '<div class="mini-sec-visual"><span class="mini-rooms"><i></i><i></i><i></i></span></div></div>' +
        '<div class="mini-sec piece" data-piece="s3"><span class="mini-sec-k">03</span><h3 class="mini-sec-t">Location</h3><p class="mini-sec-s"><span data-m="loc2">Your location</span>. Airport in under an hour.</p>' +
          '<div class="mini-sec-visual"><svg class="mini-map" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice">' +
            '<path class="land" d="M-2 44 C 12 30, 22 34, 34 22 S 58 4, 78 8 S 104 18, 104 34 L 104 62 L -2 62 Z"/>' +
            '<path class="road" d="M4 52 C 20 40, 40 46, 58 30 S 84 20, 100 26"/>' +
            '<path class="road" d="M30 62 C 36 46, 50 44, 62 50"/>' +
            '<circle class="ring" cx="60" cy="33" r="4"/><circle class="pin" cx="60" cy="33" r="2.2"/>' +
          '</svg></div></div>' +
      '</div>' +
      '<div class="mini-foot piece" data-piece="foot"><span class="mini-foot-links"><span>Book direct</span><span>WhatsApp</span></span><b data-m="brand2">Your villa</b></div>';
    screen.appendChild(this.root);
    this.imgs = $$('.mini-hero-img', this.root);
    this.thumb = $('.mini-film-thumb', this.root);
    this.front = 0;
    this.vibe = null;
    this.state = { name: '', loc: '', vibe: 'cliff', palette: 'dusk' };
  }
  MiniSite.prototype.setText = function (key, text) {
    $$('[data-m="' + key + '"]', this.root).forEach(function (el) { el.textContent = text; });
  };
  MiniSite.prototype.update = function (s, opts) {
    opts = opts || {};
    var name = s.name.trim() || 'Your villa';
    var loc = s.loc.trim() || 'Your location';
    this.setText('brand', name); this.setText('brand2', name);
    this.setText('loc', loc); this.setText('loc2', loc);
    var nameEl = $('[data-m="name"]', this.root);
    if (nameEl.textContent !== name) {
      nameEl.textContent = name;
      if (opts.caret) { var c = document.createElement('i'); c.className = 'mini-caret'; nameEl.appendChild(c); }
    }
    if (s.palette !== this.state.palette) this.root.setAttribute('data-palette', s.palette);
    if (s.vibe !== this.vibe) this.setVibe(s.vibe);
    this.state = { name: s.name, loc: s.loc, vibe: s.vibe, palette: s.palette };
  };
  MiniSite.prototype.setVibe = function (key) {
    var v = VIBES[key] || VIBES.cliff, self = this;
    var first = this.vibe === null;
    this.vibe = key;
    /* headline line: out → swap → in */
    var lineEl = $('[data-m="line"]', this.root);
    if (first || STATIC) { lineEl.textContent = v.line; }
    else {
      lineEl.classList.add('is-out');
      setTimeout(function () { lineEl.textContent = v.line; lineEl.classList.remove('is-out'); }, 380);
    }
    /* hero crossfade between the two layers */
    var next = this.imgs[1 - this.front], cur = this.imgs[this.front];
    next.src = v.img; next.alt = '';
    var show = function () {
      next.classList.add('is-front'); cur.classList.remove('is-front');
    };
    if (next.complete && next.naturalWidth) show(); else next.addEventListener('load', show, { once: true });
    this.front = 1 - this.front;
    this.thumb.src = v.img;
  };
  MiniSite.prototype.show = function (piece) {
    $$('[data-piece="' + piece + '"]', this.root).forEach(function (el) { el.classList.add('on'); });
  };
  MiniSite.prototype.showAll = function () { $$('.piece', this.root).forEach(function (el) { el.classList.add('on'); }); this.root.classList.add('is-built'); };
  MiniSite.prototype.reset = function () {
    $$('.piece', this.root).forEach(function (el) { el.classList.remove('on'); });
    this.root.classList.remove('is-built');
    $$('.mini-caret', this.root).forEach(function (c) { c.remove(); });
  };
  MiniSite.prototype.built = function () { this.root.classList.add('is-built'); };
  MiniSite.prototype.removeCaret = function () { $$('.mini-caret', this.root).forEach(function (c) { c.remove(); }); };

  /* ---------- Builder controller (F30 + F31) ------------------------------- */
  function builder() {
    var sec = $('#builder'); if (!sec) return;
    var nameIn = $('#vf-name'), locIn = $('#vf-location');
    var vibeIns = $$('input[name="vibe"]', sec), palIns = $$('input[name="palette"]', sec);
    var status = $('[data-status]', sec), statusTxt = $('[data-status] .txt', sec);
    var cta = $('[data-build-cta]', sec), resetBtn = $('[data-build-reset]', sec);
    var screens = $$('.device-screen', sec);
    var sites = screens.map(function (s) { return new MiniSite(s); });
    var demoRunning = false, demoToken = 0, userTouched = false;

    function readState() {
      var v = vibeIns.filter(function (i) { return i.checked; })[0];
      var p = palIns.filter(function (i) { return i.checked; })[0];
      return { name: nameIn.value, loc: locIn.value, vibe: v ? v.value : 'cliff', palette: p ? p.value : 'dusk' };
    }
    function render(opts) {
      var s = readState();
      sites.forEach(function (m) { m.update(s, opts); });
      updateCta(s);
    }
    function updateCta(s) {
      var q = 'name=' + encodeURIComponent(s.name.trim()) +
              '&location=' + encodeURIComponent(s.loc.trim()) +
              '&vibe=' + encodeURIComponent(s.vibe) +
              '&palette=' + encodeURIComponent(s.palette) +
              '&need=website';
      cta.href = 'contact.html?' + q;
    }
    function setStatus(text, ready) {
      if (!status) return;
      if (STATIC) { statusTxt.textContent = text; status.classList.toggle('is-ready', !!ready); return; }
      status.classList.add('is-swap');
      setTimeout(function () { statusTxt.textContent = text; status.classList.remove('is-swap'); status.classList.toggle('is-ready', !!ready); }, 200);
    }
    function pulse(input) {
      var chip = input.closest('.chip'); if (!chip || STATIC) return;
      chip.classList.remove('is-pulse'); void chip.offsetWidth; chip.classList.add('is-pulse');
    }
    function showAll(piece) { sites.forEach(function (m) { m.show(piece); }); }

    /* typing helper: types text into an input, char by char, rendering live */
    function typeInto(input, text, token) {
      var field = input.closest('.field');
      return new Promise(function (resolve) {
        if (STATIC) { input.value = text; render(); resolve(); return; }
        field && field.classList.add('field--typing');
        var i = 0;
        (function tick() {
          if (token !== demoToken) { field && field.classList.remove('field--typing'); resolve(); return; }
          input.value = text.slice(0, ++i);
          render({ caret: input === nameIn });
          if (i < text.length) setTimeout(tick, 55 + Math.random() * 60);
          else { field && field.classList.remove('field--typing'); sites.forEach(function (m) { m.removeCaret(); }); resolve(); }
        })();
      });
    }
    function choose(list, value, token) {
      if (token !== demoToken) return;
      list.forEach(function (i) { i.checked = (i.value === value); if (i.checked) pulse(i); });
      render();
    }

    /* F31: the demo */
    function runDemo() {
      var token = ++demoToken;
      demoRunning = true; userTouched = false;
      sec.classList.add('is-demo');
      nameIn.value = ''; locIn.value = '';
      choose(vibeIns, 'cliff', token); choose(palIns, 'dusk', token);
      sites.forEach(function (m) { m.reset(); });
      render();
      if (STATIC) {
        nameIn.value = 'Villa Saya'; locIn.value = 'Uluwatu, Bali'; render();
        sites.forEach(function (m) { m.showAll(); });
        setStatus('Now change anything.', true); demoRunning = false; sec.classList.remove('is-demo');
        return;
      }
      setStatus('Writing the headline');
      showAll('nav');
      wait(350).then(function () { return typeInto(nameIn, 'Villa Saya', token); })
      .then(function () { if (token !== demoToken) return; showAll('headline'); return wait(500); })
      .then(function () { if (token !== demoToken) return; return typeInto(locIn, 'Uluwatu, Bali', token); })
      .then(function () { if (token !== demoToken) return; showAll('sub'); return wait(350); })
      .then(function () { if (token !== demoToken) return; choose(vibeIns, 'cliff', token); setStatus('Placing the film'); showAll('film'); return wait(700); })
      .then(function () { if (token !== demoToken) return; showAll('book'); showAll('s1'); return wait(550); })
      .then(function () { if (token !== demoToken) return; setStatus('Laying out the rooms'); showAll('s2'); return wait(650); })
      .then(function () { if (token !== demoToken) return; choose(palIns, 'dusk', token); setStatus('Adding the map'); showAll('s3'); return wait(650); })
      .then(function () { if (token !== demoToken) return; showAll('foot'); sites.forEach(function (m) { m.built(); }); setStatus('Ready', true); return wait(900); })
      .then(function () { if (token !== demoToken) return; setStatus('Now change anything.', true); demoRunning = false; sec.classList.remove('is-demo'); });
    }
    function stopDemo() {
      if (!demoRunning) return;
      demoToken++; demoRunning = false; sec.classList.remove('is-demo');
      $$('.field--typing', sec).forEach(function (f) { f.classList.remove('field--typing'); });
      sites.forEach(function (m) { m.removeCaret(); m.showAll(); });
      setStatus('Now change anything.', true);
    }

    /* live editing */
    function onEdit(e) {
      if (demoRunning) { userTouched = true; stopDemo(); }
      if (e && e.target && e.target.type === 'radio') pulse(e.target);
      render();
      if (!STATIC) { setStatus('Updating'); clearTimeout(onEdit.t); onEdit.t = setTimeout(function () { setStatus('Now change anything.', true); }, 700); }
    }
    [nameIn, locIn].forEach(function (i) { i.addEventListener('input', onEdit); });
    vibeIns.concat(palIns).forEach(function (i) { i.addEventListener('change', onEdit); });
    /* the moment a visitor focuses a field during the demo, the demo hands over */
    [nameIn, locIn].forEach(function (i) { i.addEventListener('pointerdown', function () { if (demoRunning) stopDemo(); }); });

    resetBtn && resetBtn.addEventListener('click', function (e) { e.preventDefault(); runDemo(); });

    /* start: on load when the section is (nearly) in view, else when it enters */
    render();
    if (STATIC || !('IntersectionObserver' in window)) { runDemo(); return; }
    var started = false;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting && !started) { started = true; io.disconnect(); setTimeout(runDemo, 250); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    io.observe($('.builder-stage', sec) || sec);
    /* safety: if it never intersects (tiny viewport), start after 1.2 s anyway */
    setTimeout(function () { if (!started) { started = true; io.disconnect(); runDemo(); } }, 1200);
  }

  /* ---------- F32: score dial ---------------------------------------------- */
  function dial() {
    var d = $('.dial'); if (!d) return;
    var arc = $('.arc', d), glow = $('.glow', d), num = $('[data-dial-num]', d);
    var target = parseInt(d.getAttribute('data-score'), 10) || 98;
    var C = 339.3;
    function set(v) {
      var off = C - C * (v / 100);
      arc.style.strokeDashoffset = off; glow.style.strokeDashoffset = off;
      num.textContent = Math.round(v);
    }
    if (STATIC) { set(target); return; }
    set(0);
    var done = false;
    function run() {
      if (done) return; done = true;
      var t0 = null, dur = 1900;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        set(target * e);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if (!('IntersectionObserver' in window)) { run(); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io.disconnect(); setTimeout(run, 200); } }); }, { threshold: 0.4 });
    io.observe(d);
  }

  function boot() { builder(); dial(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
