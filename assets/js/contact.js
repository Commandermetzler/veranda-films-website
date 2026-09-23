/* Veranda Films — contact.html (F36): message composer → mailto, copy, query-param prefill */
(function () {
  'use strict';
  var EMAIL = (window.VF && VF.config && VF.config.EMAIL) || 'hello@verandafilms.com';
  var toast = function (m) { if (window.VF && VF.toast) VF.toast(m); };
  var param = function (n) {
    try { return new URLSearchParams(location.search).get(n) || ''; } catch (e) { return ''; }
  };
  var clean = function (s) { return String(s || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200); };
  var cap = function (s) { s = clean(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; };

  function init() {
    var form = document.getElementById('composer');
    if (!form) return;
    var f = {
      name: form.querySelector('#c-name'),
      property: form.querySelector('#c-property'),
      location: form.querySelector('#c-location'),
      count: form.querySelector('#c-count'),
      message: form.querySelector('#c-message')
    };
    var checks = Array.prototype.slice.call(form.querySelectorAll('input[name="need"]'));
    var composed = document.getElementById('composed');
    var pvSubject = document.querySelector('[data-preview-subject]');
    var pvBody = document.querySelector('[data-preview-body]');
    var msgLine = form.querySelector('[data-form-msg]');

    /* ---- prefill from query params (websites.html "Build it for real", or any link) ---- */
    (function prefill() {
      var name = clean(param('name') || param('property'));
      var loc = clean(param('location'));
      var vibe = cap(param('vibe'));
      var palette = cap(param('palette'));
      var need = clean(param('need')).toLowerCase();
      var n = clean(param('n') || param('count'));
      var who = clean(param('from') || param('who'));
      if (who && f.name) f.name.value = who;
      if (name && f.property) f.property.value = name;
      if (loc && f.location) f.location.value = loc;
      if (n && /^\d{1,4}$/.test(n) && f.count) f.count.value = n;
      var wants = need ? need.split(/[,\s]+/) : [];
      if (vibe || palette) wants.push('website');
      checks.forEach(function (c) { if (wants.indexOf(c.value.toLowerCase()) > -1) c.checked = true; });
      if ((vibe || palette) && f.message && !f.message.value) {
        var bits = [];
        if (name) bits.push('I built a preview for ' + name + ' on your Websites page');
        else bits.push('I built a preview on your Websites page');
        if (vibe) bits.push('vibe: ' + vibe);
        if (palette) bits.push('palette: ' + palette);
        f.message.value = bits.join(' — ') + '. I would like to build it for real.';
      }
      if (name || loc || vibe || palette || need) {
        var w = document.getElementById('write');
        if (w && !param('only')) setTimeout(function () { w.scrollIntoView({ behavior: (window.VF && (VF.REDUCE || VF.NOANIM)) ? 'auto' : 'smooth', block: 'start' }); }, 300);
      }
    })();

    /* ---- compose ---- */
    function needs() {
      return checks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    }
    function build() {
      var v = {
        name: clean(f.name.value), property: clean(f.property.value), location: clean(f.location.value),
        count: clean(f.count.value), message: String(f.message.value || '').trim().slice(0, 4000)
      };
      var list = needs();
      var subjectParts = [v.property, list.join(', ')].filter(Boolean);
      var subject = subjectParts.join(' — ') || 'A film for my property';
      var lines = [];
      if (v.name) lines.push('Name: ' + v.name);
      if (v.property) lines.push('Property: ' + v.property);
      if (v.location) lines.push('Location: ' + v.location);
      if (v.count) lines.push('Number of properties: ' + v.count);
      if (list.length) lines.push('I need: ' + list.join(' / ').toLowerCase());
      var body = 'Hi Veranda Films,' + (lines.length ? '\n\n' + lines.join('\n') : '') + (v.message ? '\n\n' + v.message : '');
      var any = v.name || v.property || v.location || v.count || v.message || list.length;
      return { subject: subject, body: body, any: !!any, valid: !!(v.name && v.message), v: v, list: list };
    }
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function ph(v, p) { return v ? esc(v) : '<span class="ph">' + p + '</span>'; }
    function render() {
      var r = build();
      if (composed) composed.value = r.any ? ('Subject: ' + r.subject + '\n\n' + r.body) : '';
      if (pvSubject) pvSubject.textContent = r.subject;
      if (pvBody) {
        pvBody.innerHTML = 'Hi Veranda Films,\n\n' +
          'Name: ' + ph(r.v.name, 'your name') + '\n' +
          'Property: ' + ph(r.v.property, 'villa name or company') + '\n' +
          'Location: ' + ph(r.v.location, 'town, island or country') + '\n' +
          'Number of properties: ' + ph(r.v.count, '1') + '\n' +
          'I need: ' + ph(r.list.join(' / ').toLowerCase(), 'film / website / presentation / other') + '\n\n' +
          ph(r.v.message, 'A link to your listing is the fastest way to start.');
      }
      if (msgLine && r.valid) msgLine.textContent = '';
      return r;
    }
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    render();

    /* ---- send: opens the visitor's own email app (no backend, nothing stored) ---- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = build();
      if (!r.valid) {
        if (msgLine) msgLine.textContent = 'Add your name and a short message first.';
        (r.v.name ? f.message : f.name).focus();
        return;
      }
      if (msgLine) msgLine.textContent = '';
      var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(r.subject) + '&body=' + encodeURIComponent(r.body);
      toast('Opening your email app');
      setTimeout(function () { window.location.href = href; }, 120);
    });

    /* ---- Copy message (site.js data-copy-from reads #composed): refresh before the shared handler runs ---- */
    var copyBtn = form.querySelector('[data-copy-from="#composed"]');
    if (copyBtn) copyBtn.addEventListener('click', function () { render(); }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
