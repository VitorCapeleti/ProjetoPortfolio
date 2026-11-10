/* ==========================================================================
   App — inicialização
   --------------------------------------------------------------------------
   - App.util: helpers usados pelas views (esc, img, project, projects)
   - loader (primeira visita da sessão), menu hambúrguer acessível,
     indicador da nav inline, skip link
   - inicia App.scene e App.router
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var html = document.documentElement;

  /* ------------------------------------------------------------------ util */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * <img> com WebP e fallback PNG (o handler global em <head> troca o src
   * se o WebP falhar). image = { src, fallback, alt } (formato de js/data/projects.js)
   * attrs: { class, loading, width, height, 'data-…' }
   */
  function img(image, attrs) {
    image = image || {};
    attrs = attrs || {};
    var a = ['src="' + esc(image.src) + '"'];
    if (image.fallback && image.fallback !== image.src) a.push('data-fallback="' + esc(image.fallback) + '"');
    a.push('alt="' + esc(image.alt || '') + '"');
    if (!('decoding' in attrs)) a.push('decoding="async"');
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === false || attrs[k] == null) return;
      a.push(attrs[k] === true ? k : k + '="' + esc(attrs[k]) + '"');
    });
    return '<img ' + a.join(' ') + '>';
  }

  function projects() { return Array.isArray(window.PROJECTS) ? window.PROJECTS : []; }
  function project(slug) {
    if (!slug) return null;
    var s = String(slug).toLowerCase();
    var list = projects();
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === s || (list[i].legacy && list[i].legacy.toLowerCase().replace(/\.html$/, '') === s)) return list[i];
    }
    return null;
  }

  App.util = { esc: esc, img: img, projects: projects, project: project };

  /* ---------------------------------------------------------------- loader */
  function runLoader() {
    var loader = document.getElementById('loader');
    if (!html.classList.contains('show-loader') || !loader) {
      if (loader) loader.remove();
      return Promise.resolve();
    }
    try { window.sessionStorage.setItem('vc-visited', '1'); } catch (e) { /* ignora */ }

    var MIN = 950, MAX = 1200;
    var loaded = new Promise(function (res) {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });
    var minWait = new Promise(function (res) { setTimeout(res, MIN); });
    var maxWait = new Promise(function (res) { setTimeout(res, MAX); });

    return Promise.race([Promise.all([loaded, minWait]), maxWait]).then(function () {
      loader.classList.add('is-done');
      return new Promise(function (res) {
        var finished = false;
        function end() {
          if (finished) return;
          finished = true;
          html.classList.remove('show-loader');
          loader.remove();
          res();
        }
        // A view começa a entrar enquanto o loader some (não espera o fade todo).
        setTimeout(res, 140);
        loader.addEventListener('transitionend', end, { once: true });
        setTimeout(end, 450);
      });
    });
  }

  /* ------------------------------------------------------------------ menu */
  // Painel de tela cheia (mobile). Disclosure tipo diálogo: foco preso no painel + botão,
  // Esc fecha, scroll da página travado, painel `inert` quando fechado.
  function initMenu() {
    var btn = document.getElementById('menuToggle');
    var menu = document.getElementById('dropdownMenu');
    if (!btn || !menu) return;
    var root = document.documentElement;
    var saved = null;
    // O estado vem do botão: a classe .show do painel entra 2 quadros depois.
    var isOpen = function () { return btn.classList.contains('open'); };
    var focusables = function () {
      var list = [btn];
      Array.prototype.forEach.call(menu.querySelectorAll('a[href]'), function (a) { list.push(a); });
      return list;
    };

    // Trava a rolagem só no <body>. Mexer no overflow do <html> fazia a barra
    // de endereço do celular aparecer/sumir, redimensionando a tela no meio
    // da animação (era o "pisca" ao abrir/fechar). O painel tem
    // overscroll-behavior: contain, então o toque não vaza para a página.
    function lock() {
      if (saved) return;
      saved = { body: document.body.style.overflow };
      document.body.style.overflow = 'hidden';
    }
    function unlock() {
      if (!saved) return;
      document.body.style.overflow = saved.body;
      saved = null;
    }

    // Depois que o painel termina de abrir, a cena por trás (coberta) pausa.
    var coverTimer = 0;
    function cover(on) {
      clearTimeout(coverTimer);
      if (on) coverTimer = setTimeout(function () { if (isOpen()) root.classList.add('menu-covered'); }, 480);
      else root.classList.remove('menu-covered');
    }

    function open(focusFirst) {
      if (isOpen()) return;
      // A escotilha nasce no centro do botão
      var r = btn.getBoundingClientRect();
      menu.style.setProperty('--mx', Math.round(r.left + r.width / 2) + 'px');
      menu.style.setProperty('--my', Math.round(r.top + r.height / 2) + 'px');
      menu.removeAttribute('inert');
      menu.setAttribute('aria-hidden', 'false');
      menu.scrollTop = 0;
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Fechar menu');
      lock();
      // Aplica o estado inicial num quadro e anima no seguinte: sem o reflow
      // forçado (offsetWidth) que travava o primeiro quadro.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (btn.classList.contains('open')) { menu.classList.add('show'); cover(true); }
        });
      });
      if (focusFirst) {
        var first = menu.querySelector('[aria-current="page"]') || menu.querySelector('a[href]');
        if (first) setTimeout(function () { if (isOpen()) first.focus({ preventScroll: true }); }, 80);
      }
    }
    function close(returnFocus) {
      if (!isOpen()) return;
      var hadFocus = menu.contains(document.activeElement);
      cover(false);
      btn.classList.remove('open');
      menu.classList.remove('show');
      menu.setAttribute('inert', '');
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menu');
      unlock();
      if (returnFocus || hadFocus) btn.focus();
    }

    btn.addEventListener('click', function (e) {
      if (isOpen()) close(false);
      else open(e.detail === 0); // detail 0 = ativado pelo teclado
    });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) { if (!e.target.closest('.menu-social')) close(false); return; } // fundo vazio fecha
      if (a.hasAttribute('data-nav')) close(false); // navega e fecha (redes sociais abrem em outra aba)
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key === 'Tab') {
        var list = focusables();
        var i = list.indexOf(document.activeElement);
        var last = list.length - 1;
        if (e.shiftKey && i <= 0) { e.preventDefault(); list[last].focus(); }
        else if (!e.shiftKey && i === last) { e.preventDefault(); list[0].focus(); }
        else if (i === -1) { e.preventDefault(); list[e.shiftKey ? last : 0].focus(); }
      }
    });
    // Voltar/avançar do navegador ou qualquer mudança de rota também fecha
    window.addEventListener('hashchange', function () { close(false); });
    // Ao passar para a nav inline (>= 901px) o hambúrguer some: não deixa o menu "aberto" escondido.
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 901px)');
      var onWide = function (e) { if (e.matches) close(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  /* ------------------------------------------------------ indicador da nav */
  function initNavIndicator() {
    var list = document.querySelector('.nav-inline');
    var ind = list && list.querySelector('.nav-indicator');
    if (!ind) return;
    function place() {
      var active = list.querySelector('.nav-link.is-active');
      if (!active || !list.offsetWidth) { ind.style.opacity = '0'; return; }
      ind.style.opacity = '1';
      ind.style.width = active.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    }
    App.onNavChange = function () { requestAnimationFrame(place); };
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(place, 120); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  /* ------------------------------------------------------------- skip link */
  function initSkipLink() {
    var skip = document.querySelector('[data-skip]');
    var main = document.getElementById('view');
    if (!skip || !main) return;
    skip.addEventListener('click', function (e) {
      e.preventDefault();
      var h = main.querySelector('h1') || main;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus();
    });
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    if (!App.anim) console.warn('[app] App.anim indisponível');
    initMenu();
    initNavIndicator();
    initSkipLink();
    try { if (App.scene) App.scene.init(); } catch (e) { console.error('[scene]', e); }
    App.loaderDone = runLoader().catch(function () {});
    if (App.router) App.router.start();
    else console.error('[app] router indisponível');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
