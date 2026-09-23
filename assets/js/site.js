/* ==========================================================================
   VERANDA FILMS — site.js  (shared behaviour for every page, vanilla, no deps)
   Modules (each one checks its own DOM and exits quietly when absent):
   config · qa hooks · link wiring · nav · cursor+magnet · reveals · counters ·
   marquee · spotlight · tilt · accordion · toast · copy · clock · progress ·
   lightbox player · hover-to-play · lazy background loops · format morph ·
   toggle groups · badge/back-to-top.  Public API: window.VF
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- config (edit here) ---------- */
  var CONFIG = {
    WHATSAPP_NUMBER: '',            // E.164 digits, e.g. "6281234567890" — empty hides every WhatsApp link
    YOUTUBE_URL: '',                // e.g. "https://www.youtube.com/@verandafilms" — empty hides YouTube links
    WHATSAPP_TEXT: 'Hi Veranda Films — I would like a film for my property. Name: [ ] Location: [ ] Number of properties: [ ]',
    INSTAGRAM_URL: 'https://instagram.com/verandafilms',
    EMAIL: 'hello@verandafilms.com',
    TIMEZONE: 'Asia/Makassar'
  };

  var html = document.documentElement;
  html.classList.add('js');
  var NOANIM = html.classList.contains('noanim');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATIC = NOANIM || REDUCE;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function param(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function store(key, val) {
    try { if (val === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* ---------- QA: ?only=<section-id> hides every other <section> ---------- */
  function qaOnly() {
    var id = param('only');
    if (!id) return;
    var target = document.getElementById(id);
    $$('section').forEach(function (s) {
      if (s.id === id) return;
      if (target && (s.contains(target) || target.contains(s))) return;
      s.hidden = true;
    });
    html.classList.add('qa-only');
  }

  /* ---------- WhatsApp / YouTube wiring ---------- */
  function wireLinks() {
    var wa = (CONFIG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    $$('[data-whatsapp]').forEach(function (el) {
      if (!wa) { hideWrap(el, '[data-whatsapp-wrap]'); return; }
      var text = el.getAttribute('data-whatsapp') || CONFIG.WHATSAPP_TEXT;
      el.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text);
      el.target = '_blank'; el.rel = 'noopener';
    });
    $$('[data-youtube]').forEach(function (el) {
      if (!CONFIG.YOUTUBE_URL) { hideWrap(el, '[data-youtube-wrap]'); return; }
      el.href = CONFIG.YOUTUBE_URL; el.target = '_blank'; el.rel = 'noopener';
    });
    function hideWrap(el, sel) {
      var w = el.closest(sel);
      (w || el).hidden = true;
    }
  }

  /* ---------- Nav: shrink, sliding indicator, mobile overlay, wipe, prefetch ---------- */
  function nav() {
    var bar = $('.nav');
    if (!bar) return;
    var list = $('.nav-links', bar);
    var links = list ? $$('a', list) : [];
    var ind = $('.nav-indicator', bar);
    var active = links.filter(function (a) { return a.getAttribute('aria-current') === 'page'; })[0] || null;

    function moveTo(a) {
      if (!ind || !list) return;
      if (!a) { ind.style.opacity = '0'; return; }
      var r = a.getBoundingClientRect(), p = list.getBoundingClientRect();
      ind.style.opacity = '1';
      ind.style.left = (r.left - p.left) + 'px';
      ind.style.width = r.width + 'px';
    }
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { moveTo(a); });
      a.addEventListener('focus', function () { moveTo(a); });
    });
    if (list) {
      list.addEventListener('mouseleave', function () { moveTo(active); });
      list.addEventListener('focusout', function () { setTimeout(function () { if (!list.contains(document.activeElement)) moveTo(active); }, 0); });
    }
    moveTo(active);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTo(active); });
    window.addEventListener('resize', function () { moveTo(active); });
    window.addEventListener('load', function () { moveTo(active); });

    var scrolled = null;
    function onScroll() {
      var s = window.scrollY > 40;
      if (s !== scrolled) { scrolled = s; bar.classList.toggle('is-scrolled', s); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var burger = $('.nav-burger'), menu = $('.menu');
    if (burger && menu) {
      var setMenu = function (open) {
        html.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (open) { var f = $('a', menu); if (f) setTimeout(function () { f.focus(); }, 350); }
      };
      burger.addEventListener('click', function () { setMenu(!html.classList.contains('menu-open')); });
      window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
      $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
      window.matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
    }

    // prefetch internal pages on hover / touch
    var seen = {};
    function prefetch(href) {
      if (seen[href]) return; seen[href] = 1;
      var l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; l.as = 'document';
      document.head.appendChild(l);
    }
    function internal(a) {
      if (!a || a.host !== location.host) return false;
      if (a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-wipe')) return false;
      if (a.hasAttribute('data-player') || a.hasAttribute('data-playall') || a.hasAttribute('data-copy')) return false; // handled by other modules
      if (a.getAttribute('href').charAt(0) === '#') return false;
      return /\.html$|\/$/.test(a.pathname);
    }
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && internal(a) && a.pathname !== location.pathname) prefetch(a.href);
    }, { passive: true });
    document.addEventListener('touchstart', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && internal(a) && a.pathname !== location.pathname) prefetch(a.href);
    }, { passive: true });

    // page transition: beam wipe on internal links
    var wipe = $('.wipe');
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || !internal(a)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || e.defaultPrevented) return;
      var url = new URL(a.href, location.href);
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor: native smooth scroll
      if (STATIC || !wipe) return;
      e.preventDefault();
      html.classList.add('is-leaving');
      store('vf-wipe', '1');
      setTimeout(function () { location.href = url.href; }, 640);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { html.classList.remove('is-leaving'); html.classList.remove('vf-enter'); } });
  }

  /* ---------- Custom cursor (dot + ring + label) and magnetic buttons ---------- */
  function cursor() {
    if (!FINE || STATIC) return;
    var c = document.createElement('div');
    c.className = 'cursor'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor-ring"><span class="cursor-label"></span></div><div class="cursor-dot"></div>';
    document.body.appendChild(c);
    var ring = $('.cursor-ring', c), dot = $('.cursor-dot', c), label = $('.cursor-label', c);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, shown = false, moving = false;
    html.classList.add('has-cursor');

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; rx = mx; ry = my; c.classList.add('is-on'); }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!moving) { moving = true; raf(tick); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () { c.classList.remove('is-on'); });
    document.addEventListener('mouseenter', function () { if (shown) c.classList.add('is-on'); });

    function tick() {
      rx = lerp(rx, mx, .2); ry = lerp(ry, my, .2);
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      if (Math.abs(rx - mx) > .1 || Math.abs(ry - my) > .1) raf(tick); else moving = false;
    }

    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var lab = t.closest('[data-cursor]');
      var link = t.closest('a, button, [role="button"], label, summary, input[type="range"], .acc-btn');
      var field = t.closest('input:not([type="range"]), textarea, select');
      c.classList.toggle('is-label', !!lab);
      c.classList.toggle('is-link', !lab && !!link);
      c.classList.toggle('is-hidden', !!field);
      if (lab) label.textContent = lab.getAttribute('data-cursor');
    });

    $$('[data-mag]').forEach(function (el) {
      var k = parseFloat(el.getAttribute('data-mag')) || .28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate3d(' + (dx * k) + 'px,' + (dy * k) + 'px,0)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Reveals (IntersectionObserver) + word masks ---------- */
  function splitWords(el) {
    if (!el || el.getAttribute('data-split')) return;
    el.setAttribute('data-split', '1');
    var i = 0, frag = document.createDocumentFragment(), cur = null;
    function word() {
      if (!cur) {
        var w = document.createElement('span'); w.className = 'w';
        cur = document.createElement('span'); cur.style.setProperty('--i', i++);
        w.appendChild(cur); frag.appendChild(w);
      }
      return cur;
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { cur = null; frag.appendChild(document.createTextNode(' ')); return; }
          word().appendChild(document.createTextNode(p));
        });
      } else if (n.nodeType === 1) {
        if (n.tagName === 'BR') { cur = null; frag.appendChild(n); return; }
        word().appendChild(n); // <em>, <b>… stay glued to adjacent punctuation: "the <em>photos</em>." is one word
        if (n.tagName === 'EM' && n.classList.contains('serif')) cur.parentNode.classList.add('w--serif'); // italic side-bearing: tighten the gap after the word
      }
    });
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('words');
  }

  function reveals() {
    $$('[data-words]').forEach(splitWords);
    $$('[data-stagger]').forEach(function (p) {
      $$(':scope > *', p).forEach(function (c, i) { c.style.setProperty('--i', i); });
    });
    var els = $$('[data-reveal], [data-reveal-kids], [data-words]:not([data-manual])');
    if (STATIC || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Counters ([data-count="187"] [data-decimals] [data-prefix] [data-suffix]) ---------- */
  function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    function fmt(el, v) {
      var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var s = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-US');
      return (el.getAttribute('data-prefix') || '') + s + (el.getAttribute('data-suffix') || '');
    }
    function run(el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var dur = parseFloat(el.getAttribute('data-duration')) || 1400;
      if (STATIC) { el.textContent = fmt(el, to); return; }
      var t0 = null;
      (function step(now) {
        if (!t0) t0 = now;
        var p = clamp((now - t0) / dur, 0, 1);
        el.textContent = fmt(el, to * easeOut(p));
        if (p < 1) raf(step);
      })(performance.now());
    }
    if (STATIC || !('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: .4 });
    els.forEach(function (el) { el.textContent = fmt(el, 0); io.observe(el); });
  }

  /* ---------- Marquee: duplicate track for a seamless loop, duration by width ---------- */
  function marquee() {
    $$('.marquee').forEach(function (m) {
      var track = $('.marquee-track', m);
      if (!track || track.getAttribute('data-ready')) return;
      track.setAttribute('data-ready', '1');
      var clone = track.firstElementChild ? track.firstElementChild.cloneNode(true) : null;
      if (clone) { clone.setAttribute('aria-hidden', 'true'); track.appendChild(clone); }
      function speed() {
        var w = track.scrollWidth / 2;
        var px = parseFloat(m.getAttribute('data-speed')) || 55; // px per second
        track.style.setProperty('--dur', Math.max(20, w / px) + 's');
      }
      speed();
      window.addEventListener('resize', speed);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(speed);
    });
  }

  /* ---------- Spotlight cards ([data-spot]) ---------- */
  function spotlight() {
    if (!FINE) return;
    $$('[data-spot]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- 3D tilt cards ([data-tilt] with optional .tilt-glare child) ---------- */
  function tilt() {
    if (!FINE || STATIC) return;
    $$('[data-tilt]').forEach(function (card) {
      var max = parseFloat(card.getAttribute('data-tilt')) || 7;
      var glare = $('.tilt-glare', card);
      card.addEventListener('pointerenter', function () { card.classList.add('is-tilting'); });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(1000px) rotateX(' + ((y - .5) * -max).toFixed(2) + 'deg) rotateY(' + ((x - .5) * max).toFixed(2) + 'deg) translateZ(0)';
        if (glare) glare.style.setProperty('--gx', ((x - .5) * 120) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  /* ---------- Accordion (.acc > .acc-item > .acc-btn + .acc-panel) ---------- */
  function accordion() {
    $$('.acc').forEach(function (acc) {
      var single = acc.hasAttribute('data-single');
      $$('.acc-btn', acc).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.acc-item');
          var open = !item.classList.contains('is-open');
          if (single) $$('.acc-item.is-open', acc).forEach(function (o) { if (o !== item) { o.classList.remove('is-open'); $('.acc-btn', o).setAttribute('aria-expanded', 'false'); } });
          item.classList.toggle('is-open', open);
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      });
    });
  }

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  /* ---------- Copy to clipboard ([data-copy="text"] [data-toast="msg"]) ---------- */
  function copy() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy],[data-copy-from]');
      if (!b) return;
      e.preventDefault();
      var text = b.getAttribute('data-copy') || '';
      if (b.getAttribute('data-copy-from')) { var src = $(b.getAttribute('data-copy-from')); text = src ? (src.value !== undefined ? src.value : src.textContent) : ''; }
      if (!text) { toast(b.getAttribute('data-toast-empty') || 'Nothing to copy yet'); return; }
      var done = function () { toast(b.getAttribute('data-toast') || 'Copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      else { fallback(text); done(); }
    });
    function fallback(text) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------- Bali clock ([data-bali-time]) ---------- */
  function clock() {
    var els = $$('[data-bali-time]');
    if (!els.length) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CONFIG.TIMEZONE }); } catch (e) { fmt = null; }
    function tick() {
      var now = new Date(), s;
      if (fmt) s = fmt.format(now);
      else { var d = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000); s = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      els.forEach(function (el) {
        var p = s.split(':');
        el.innerHTML = p[0] + '<span class="blink">:</span>' + p[1];
        el.setAttribute('data-value', s);
      });
    }
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- Scroll progress bar ---------- */
  function progress() {
    var bar = $('.progress');
    if (!bar) return;
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()') && !NOANIM) { html.classList.add('st'); return; }
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(scrollY / max, 0, 1) : 0) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Lightbox player (<dialog class="lightbox" id="lightbox">) ----------
     Triggers: [data-player data-src data-title data-poster data-group] — click opens that film,
     prev/next walk the same data-group. [data-playall="group"] plays the group back to back
     (showreel) with an end card ([data-end] text, [data-end-cta], [data-end-href]).            */
  function player() {
    var dlg = $('#lightbox');
    if (!dlg) return;
    var video = $('.lb-video', dlg), title = $('.lb-title', dlg), fill = $('.lb-fill', dlg), time = $('.lb-time', dlg);
    var prog = $('[data-lb-progress]', dlg), btnPlay = $('[data-lb-play]', dlg), btnMute = $('[data-lb-mute]', dlg);
    var btnPrev = $('[data-lb-prev]', dlg), btnNext = $('[data-lb-next]', dlg), endCard = $('.lb-end', dlg), hint = $('.lb-hint', dlg);
    var queue = [], idx = 0, opts = {}, opener = null;
    var native = typeof dlg.showModal === 'function';

    function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function load(i) {
      idx = i;
      var it = queue[i];
      if (!it) return;
      if (endCard) endCard.hidden = true;
      video.poster = it.poster || '';
      video.src = it.src;
      video.muted = false;
      dlg.classList.remove('is-muted');
      title.textContent = (opts.showreel ? 'Showreel · ' + (i + 1) + '/' + queue.length + ' ' : '') + (it.title || '');
      if (btnPrev) btnPrev.hidden = queue.length < 2;
      if (btnNext) btnNext.hidden = queue.length < 2;
      var p = video.play();
      if (p && p.catch) p.catch(function () { video.muted = true; dlg.classList.add('is-muted'); video.play().catch(function () {}); });
    }
    function open(list, i, o) {
      queue = list || []; opts = o || {}; opener = document.activeElement;
      if (!queue.length) return;
      if (native) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
      html.classList.add('lb-open');
      load(i || 0);
      if (hint && FINE && !STATIC && !store('vf-hint')) { hint.hidden = false; store('vf-hint', '1'); setTimeout(function () { hint.hidden = true; }, 4000); }
    }
    function close() {
      video.pause();
      video.removeAttribute('src'); video.load();
      if (native) { if (dlg.open) dlg.close(); } else dlg.removeAttribute('open');
      html.classList.remove('lb-open');
      dlg.classList.remove('is-playing');
      if (opener && opener.focus) opener.focus();
    }
    function toItem(el) {
      return { src: el.getAttribute('data-src'), poster: el.getAttribute('data-poster') || '', title: el.getAttribute('data-title') || '' };
    }
    function seek(frac) { if (video.duration) video.currentTime = clamp(frac, 0, 1) * video.duration; }

    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-player]');
      if (t) {
        e.preventDefault();
        var g = t.getAttribute('data-group');
        var items = g ? $$('[data-player][data-group="' + g + '"]') : [t];
        var i = items.indexOf(t);
        open(items.map(toItem), i < 0 ? 0 : i, {});
        return;
      }
      var pa = e.target.closest && e.target.closest('[data-playall]');
      if (pa) {
        e.preventDefault();
        var items2 = $$('[data-player][data-group="' + pa.getAttribute('data-playall') + '"]');
        open(items2.map(toItem), 0, { showreel: true, end: pa.getAttribute('data-end') || '', endCta: pa.getAttribute('data-end-cta') || '', endHref: pa.getAttribute('data-end-href') || '' });
      }
    });
    $$('[data-lb-close]', dlg).forEach(function (b) { b.addEventListener('click', close); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    if (btnPlay) btnPlay.addEventListener('click', function () { if (video.paused) video.play(); else video.pause(); });
    if (btnMute) btnMute.addEventListener('click', function () { video.muted = !video.muted; dlg.classList.toggle('is-muted', video.muted); btnMute.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute'); });
    if (btnPrev) btnPrev.addEventListener('click', function () { load((idx - 1 + queue.length) % queue.length); });
    if (btnNext) btnNext.addEventListener('click', function () { load((idx + 1) % queue.length); });
    video.addEventListener('play', function () { dlg.classList.add('is-playing'); if (btnPlay) btnPlay.setAttribute('aria-label', 'Pause film'); });
    video.addEventListener('pause', function () { dlg.classList.remove('is-playing'); if (btnPlay) btnPlay.setAttribute('aria-label', 'Play film'); });
    video.addEventListener('timeupdate', function () {
      var f = video.duration ? video.currentTime / video.duration : 0;
      if (fill) fill.style.transform = 'scaleX(' + f + ')';
      if (prog) prog.setAttribute('aria-valuenow', Math.round(f * 100));
      if (time) time.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    });
    video.addEventListener('ended', function () {
      if (idx < queue.length - 1 && opts.showreel) { load(idx + 1); return; }
      if (opts.showreel && endCard) {
        endCard.hidden = false;
        var t = $('.lb-end-text', endCard), a = $('a', endCard);
        if (t) t.textContent = opts.end || 'That is the method. Yours next.';
        if (a) { a.textContent = opts.endCta || 'Get a film'; a.href = opts.endHref || 'contact.html'; }
      }
    });
    video.addEventListener('click', function () { if (video.paused) video.play(); else video.pause(); });
    if (prog) {
      prog.addEventListener('click', function (e) { var r = prog.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); });
      prog.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { seek((video.currentTime - 5) / (video.duration || 1)); e.preventDefault(); }
        if (e.key === 'ArrowRight') { seek((video.currentTime + 5) / (video.duration || 1)); e.preventDefault(); }
      });
    }
    dlg.addEventListener('keydown', function (e) {
      var k = e.key;
      if (e.target.tagName === 'INPUT') return;
      if (k === ' ' || k === 'k') { e.preventDefault(); if (video.paused) video.play(); else video.pause(); }
      else if (k === 'ArrowLeft' && e.target !== prog) { e.preventDefault(); seek((video.currentTime - 5) / (video.duration || 1)); }
      else if (k === 'ArrowRight' && e.target !== prog) { e.preventDefault(); seek((video.currentTime + 5) / (video.duration || 1)); }
      else if (k === 'm') { video.muted = !video.muted; dlg.classList.toggle('is-muted', video.muted); }
      else if (k === 'n' && queue.length > 1) load((idx + 1) % queue.length);
      else if (k === 'p' && queue.length > 1) load((idx - 1 + queue.length) % queue.length);
      else if (k === 'Escape') { e.preventDefault(); close(); }
    });
    dlg.addEventListener('close', function () { if (html.classList.contains('lb-open')) close(); }); // closed natively (close watcher) → tidy up
    window.VF.openPlayer = open;
    window.VF.closePlayer = close;
  }

  /* ---------- Hover-to-play film cards ([data-hoverplay] containing video[data-src]) ---------- */
  function hoverPlay() {
    var cards = $$('[data-hoverplay]');
    if (!cards.length || STATIC) return;
    cards.forEach(function (card) {
      var v = $('video', card);
      if (!v) return;
      /* pointer devices preview the real film on hover; touch devices only ever fetch the small
         data-preview clip in view (never the 10–15 MB film — that stays in the lightbox) */
      var previewSrc = FINE ? v.getAttribute('data-src') : v.getAttribute('data-preview');
      if (!previewSrc) return;
      function start() {
        if (!v.getAttribute('src')) { v.src = previewSrc; v.load(); }
        v.muted = true;
        var p = v.play();
        if (p && p.then) p.then(function () { card.classList.add('is-playing'); }).catch(function () {});
        else card.classList.add('is-playing');
      }
      function stop() { v.pause(); card.classList.remove('is-playing'); try { v.currentTime = 0; } catch (e) {} }
      if (FINE) {
        card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') start(); });
        card.addEventListener('pointerleave', stop);
      } else if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.intersectionRatio >= .6) start(); else stop(); }); }, { threshold: [0, .6] }).observe(card);
      }
    });
  }

  /* ---------- Lazy background loops (video[data-lazy][data-src][data-poster]): poster + source load in view, pause out of view ---------- */
  function lazyLoops() {
    var vids = $$('video[data-lazy]');
    if (!vids.length) return;
    function poster(v) { var p = v.getAttribute('data-poster'); if (p && !v.getAttribute('poster')) v.setAttribute('poster', p); }
    if (!('IntersectionObserver' in window)) { vids.forEach(poster); return; } // poster only
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          poster(v);
          if (STATIC) { io.unobserve(v); return; } // reduced motion / noanim: poster only, never the loop
          if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); }
          v.muted = true;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---------- Format morph (.morph > .morph-frame + .morph-labels li) ---------- */
  function morph() {
    $$('.morph').forEach(function (m) {
      var frame = $('.morph-frame', m), labels = $$('.morph-labels li', m), tag = $('.morph-tag', m);
      if (!frame) return;
      var ratios = [[16, 9], [9, 16], [4, 5]], names = ['16:9', '9:16', '4:5'], i = 0, timer = null;
      function size() {
        var pad = parseFloat(getComputedStyle(m).paddingBottom) || 0;
        var H = m.clientHeight - pad - 8, W = m.clientWidth - 8;
        var r = ratios[i];
        var w = Math.min(W, H * r[0] / r[1]), h = w * r[1] / r[0];
        frame.style.width = Math.round(w) + 'px'; frame.style.height = Math.round(h) + 'px';
        labels.forEach(function (l, k) { l.classList.toggle('is-on', k === i); });
        if (tag) tag.textContent = names[i];
        frame.setAttribute('data-ratio', names[i]);
      }
      size();
      window.addEventListener('resize', size);
      labels.forEach(function (l, k) { l.addEventListener('click', function () { i = k; size(); restart(); }); });
      if (STATIC) return;
      function restart() { clearInterval(timer); timer = setInterval(function () { i = (i + 1) % 3; size(); }, 3000); }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { if (en[0].isIntersecting) restart(); else clearInterval(timer); }, { threshold: .3 }).observe(m);
      } else restart();
    });
  }

  /* ---------- Toggle groups ([data-toggle] > .toggle-btn[data-toggle-btn=i]; panels [data-toggle-panel=i]) ---------- */
  function toggles() {
    $$('[data-toggle]').forEach(function (t) {
      var name = t.getAttribute('data-toggle');
      var btns = $$('[data-toggle-btn]', t);
      var panels = $$('[data-toggle-panel][data-toggle-for="' + name + '"]');
      function set(i) {
        t.setAttribute('data-active', i);
        btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
        panels.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-toggle-panel') === String(i)); });
      }
      btns.forEach(function (b, k) {
        b.addEventListener('click', function () { set(k); });
        b.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = (k + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length; set(n); btns[n].focus(); }
        });
      });
      set(parseInt(t.getAttribute('data-active') || '0', 10));
    });
  }

  /* ---------- Badge back-to-top ([data-top]) ---------- */
  function backToTop() {
    $$('[data-top]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: STATIC ? 'auto' : 'smooth' }); });
    });
  }

  /* ---------- Boot ---------- */
  window.VF = { config: CONFIG, toast: toast, splitWords: splitWords, STATIC: STATIC, REDUCE: REDUCE, NOANIM: NOANIM, FINE: FINE, param: param, clamp: clamp, lerp: lerp, easeOut: easeOut };
  function boot() {
    qaOnly();
    wireLinks();
    nav();
    cursor();
    reveals();
    counters();
    marquee();
    spotlight();
    tilt();
    accordion();
    copy();
    clock();
    progress();
    player();
    hoverPlay();
    lazyLoops();
    morph();
    toggles();
    backToTop();
    html.classList.add('ready');
    document.dispatchEvent(new CustomEvent('vf:ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
