(function () {
  'use strict';
  var body = document.body;
  var SINGLE = body.getAttribute('data-mode') === 'single';
  var ROOT = body.getAttribute('data-root') || './';
  var root = document.documentElement;

  function store(get, key, val) {
    try { if (get) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
    return null;
  }

  /* ---------- tema ---------- */
  var themeBtn = document.getElementById('themeToggle');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function paintThemeBtn() {
    if (!themeBtn) return;
    var dark = currentTheme() === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.querySelector('.lbl').textContent = dark ? 'Mode clar' : 'Mode fosc';
  }
  var saved = store(true, 'sox:theme');
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  paintThemeBtn();
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store(false, 'sox:theme', next);
    paintThemeBtn();
  });

  /* ---------- navegació mòbil ---------- */
  var navBtn = document.getElementById('navToggle');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (navBtn) navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (navBtn) navBtn.addEventListener('click', function () { setNav(!body.classList.contains('nav-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  /* ---------- botons de còpia ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.copy');
    if (!b) return;
    var pre = b.closest('figure.code').querySelector('pre');
    var txt = pre.innerText.replace(/\n$/, '');
    function ok() { b.textContent = 'Copiat'; setTimeout(function () { b.textContent = 'Copia'; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, function () {}); }
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (x) {} document.body.removeChild(ta); }
  });

  /* ---------- exercicis fets ---------- */
  var doneSet = {};
  try { doneSet = JSON.parse(store(true, 'sox:done') || '{}') || {}; } catch (e) { doneSet = {}; }
  function paintExercises() {
    document.querySelectorAll('.page').forEach(function (pg) {
      var all = pg.querySelectorAll('.exercise');
      var n = 0;
      all.forEach(function (ex) {
        var on = !!doneSet[ex.getAttribute('data-id')];
        ex.classList.toggle('is-done', on);
        var cb = ex.querySelector('input[type=checkbox]');
        if (cb) cb.checked = on;
        if (on) n++;
      });
      var out = pg.querySelector('.ex-progress');
      if (out) out.textContent = 'Exercicis marcats com a fets en aquest bloc: ' + n + ' de ' + all.length + '.';
    });
  }
  document.addEventListener('change', function (e) {
    var cb = e.target;
    if (!cb.matches || !cb.matches('.exercise input[type=checkbox]')) return;
    var ex = cb.closest('.exercise');
    if (cb.checked) doneSet[ex.getAttribute('data-id')] = 1; else delete doneSet[ex.getAttribute('data-id')];
    store(false, 'sox:done', JSON.stringify(doneSet));
    paintExercises();
  });
  paintExercises();

  /* ---------- cerca ---------- */
  function urlFor(p, a) {
    if (SINGLE) return '#/' + p + (a ? '~' + a : '');
    return ROOT + (p === 'index' ? '' : p + '/') + (a ? '#' + a : '');
  }
  var input = document.getElementById('search');
  var results = document.getElementById('searchResults');
  if (input && results && window.SEARCH) {
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (q.length < 2) return;
      var words = q.split(/\s+/);
      var hits = [];
      window.SEARCH.forEach(function (s) {
        var hay = (s.t + ' ' + s.x).toLowerCase(), score = 0;
        for (var i = 0; i < words.length; i++) {
          var idx = hay.indexOf(words[i]);
          if (idx < 0) return;
          score += s.t.toLowerCase().indexOf(words[i]) >= 0 ? 5 : 1;
        }
        hits.push([score, s]);
      });
      hits.sort(function (a, b) { return b[0] - a[0]; });
      hits.slice(0, 8).forEach(function (h) {
        var s = h[1], li = document.createElement('li'), a = document.createElement('a');
        a.href = urlFor(s.p, s.a);
        a.innerHTML = '<span></span><small></small>';
        a.firstChild.textContent = s.t;
        a.lastChild.textContent = s.b;
        li.appendChild(a); results.appendChild(li);
      });
      if (!hits.length) { var li = document.createElement('li'); li.style.padding = '6px 8px'; li.textContent = 'Cap resultat.'; results.appendChild(li); }
    });
    results.addEventListener('click', function () { setNav(false); input.value = ''; results.innerHTML = ''; });
  }

  /* ---------- pàgina activa, progrés i navegació ---------- */
  var activePage = null, sections = [], scrollTick = false;
  var status = document.getElementById('statusText');

  function paintStatus(secIdx) {
    if (!status || !activePage) return;
    var u = activePage.getAttribute('data-unit'), b = activePage.getAttribute('data-bloc');
    var ub = activePage.getAttribute('data-nunits'), bb = activePage.getAttribute('data-nblocs');
    var txt = 'Curs SOX';
    if (u && b) txt = 'Tema (' + u + '/' + ub + ')  Bloc (' + b + '/' + bb + ')  Secció (' + (secIdx + 1) + '/' + sections.length + ')';
    else if (u) txt = 'Tema (' + u + '/' + ub + ')';
    status.textContent = txt;
  }
  function onScroll() {
    scrollTick = false;
    if (!activePage) return;
    var cur = 0, y = 140;
    for (var i = 0; i < sections.length; i++) { if (sections[i].getBoundingClientRect().top <= y) cur = i; }
    paintStatus(cur);
    document.querySelectorAll('.nav-toc a.on').forEach(function (a) { a.classList.remove('on'); });
    if (sections[cur]) {
      var id = sections[cur].id;
      var link = document.querySelector('li.is-current .nav-toc a[data-sec="' + id + '"]');
      if (link) link.classList.add('on');
    }
    if (activePage.getAttribute('data-bloc')) {
      store(false, 'sox:last', JSON.stringify({ p: activePage.getAttribute('data-page'), s: sections[cur] ? sections[cur].id : '' }));
    }
  }
  window.addEventListener('scroll', function () { if (!scrollTick) { scrollTick = true; requestAnimationFrame(onScroll); } }, { passive: true });

  function activate(pid, anchor) {
    var pages = document.querySelectorAll('.page');
    var found = null;
    pages.forEach(function (pg) {
      var match = pg.getAttribute('data-page') === pid;
      if (SINGLE) pg.hidden = !match;
      if (match) found = pg;
    });
    if (!found && pages.length) found = pages[0];
    activePage = found;
    if (!activePage) return;
    pid = activePage.getAttribute('data-page');
    document.title = activePage.getAttribute('data-title') || document.title;
    sections = Array.prototype.slice.call(activePage.querySelectorAll('section.sec'));
    document.querySelectorAll('.sidebar [aria-current]').forEach(function (a) { a.removeAttribute('aria-current'); });
    document.querySelectorAll('.sidebar li.is-current').forEach(function (l) { l.classList.remove('is-current'); });
    var link = document.querySelector('.sidebar a[data-page="' + pid + '"]');
    if (link) { link.setAttribute('aria-current', 'page'); if (link.parentNode.tagName === 'LI') link.parentNode.classList.add('is-current'); }
    if (SINGLE) {
      if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
      else window.scrollTo(0, 0);
    }
    onScroll();
  }

  function route() {
    var h = decodeURIComponent(location.hash || '');
    if (SINGLE) {
      var m = /^#\/([^~]*)(?:~(.+))?$/.exec(h);
      activate(m && m[1] ? m[1] : 'index', m ? m[2] : null);
    } else {
      activate(document.querySelector('.page').getAttribute('data-page'), null);
    }
  }
  if (SINGLE) window.addEventListener('hashchange', function () { setNav(false); route(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.sidebar a');
    if (a) setNav(false);
  });
  route();

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (!activePage) return;
    var sel = e.key === 'ArrowRight' ? '.pager a.next' : e.key === 'ArrowLeft' ? '.pager a.prev' : null;
    if (!sel) return;
    var l = activePage.querySelector(sel);
    if (l) { e.preventDefault(); location.href = l.href; }
  });
  var bp = document.getElementById('goPrev'), bn = document.getElementById('goNext'), bt = document.getElementById('goTop');
  function go(sel) { if (!activePage) return; var l = activePage.querySelector(sel); if (l) location.href = l.href; }
  if (bp) bp.addEventListener('click', function () { go('.pager a.prev'); });
  if (bn) bn.addEventListener('click', function () { go('.pager a.next'); });
  if (bt) bt.addEventListener('click', function () { window.scrollTo({ top: 0 }); });

  /* ---------- mermaid (mode multipàgina) ---------- */
  if (window.mermaid) { try { window.mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' }); } catch (e) {} }
})();
