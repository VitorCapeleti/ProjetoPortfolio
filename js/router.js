/* ==========================================================================
   App.router — hash router da SPA
   --------------------------------------------------------------------------
   Rotas:
     #/                    → Views.home
     #/projetos            → Views.projects
     #/projetos/<slug>     → Views.project   (params.slug)
     #/experiencia         → Views.experience
     #/sobre               → Views.about
     qualquer outra        → Views.home (e o hash vira #/)

   CONTRATO DAS VIEWS (cada arquivo js/views/*.js define uma):

     window.Views.<name> = {
       // Obrigatórios
       title:  (params) => "Projetos",            // título do header e base do document.title
       render: (params) => HTMLElement | string,  // markup puro, sem efeitos colaterais
       // Opcionais
       docTitle: (params) => "Texto completo",    // document.title (padrão: `${title} — Vitor Capeleti`)
       mount:  (root, ctx) => cleanupFn | void,   // animações/listeners; root = <div class="view view--name">
                                                  // ctx = { params, from, to, first, morphed, anim: App.anim, scene: App.scene }
                                                  //   from/to: { name, params, path } (from = null na 1ª carga)
                                                  //   first:   true na primeira renderização da página
                                                  //   morphed: elemento que acabou de receber o morph
                                                  //            compartilhado (não anime a entrada dele) ou null
                                                  // Dica: const s = ctx.anim.scope(); ...; return s.kill;
       // Hooks de elemento compartilhado (morph entre views):
       sharedOut: (root, nextRoute) => Element | null, // ao SAIR: elemento de origem (ex.: imagem do card clicado)
       sharedIn:  (root) => Element | null             // ao ENTRAR: elemento de destino (ex.: imagem do topo do projeto)
     };

   Fluxo de uma navegação:
     cleanup da view atual → animação de saída → App.scene.warp() → troca o
     conteúdo → scroll (topo, ou restaura no voltar/avançar) → animação de
     entrada + mount → foco no h1 da view (ou [data-autofocus], ou <main>).
   Se as duas views oferecem sharedOut/sharedIn, o morph usa a View
   Transitions API (view-transition-name dinâmico só durante a transição);
   sem ela, usa App.anim.morphStart (clone voando entre os retângulos).
   Navegações rápidas em sequência ficam na fila: só a última é renderizada.

   API:
     App.router.start()               → chamado pelo app.js
     App.router.go(path)              → ex.: go('/projetos/atom')
     App.router.href(name, params)    → ex.: href('project', {slug:'atom'}) === '#/projetos/atom'
     App.router.parse(hash)           → { name, params, path, unknown? }
     App.router.current               → { name, params, path } atual
     App.router.onChange(fn)          → fn(to, from) depois de cada troca; devolve off()
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  window.Views = window.Views || {};

  var SITE = 'Vitor Capeleti';
  var NAV_OF = { home: 'home', projects: 'projects', project: 'projects', experience: 'experience', about: 'about' };

  var rootEl = null;        // <main id="view">
  var viewEl = null;        // <div class="view ..."> atual
  var current = null;       // rota atual
  var currentView = null;
  var cleanup = null;
  var busy = false, pending = false, started = false;
  var scrollMem = {};
  var currentKey = null;
  var listeners = [];

  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  function parse(hash) {
    var h = String(hash == null ? location.hash : hash).replace(/^#/, '');
    var home = { name: 'home', params: {}, path: '/' };
    if (!h || h === '/') return home;
    if (h.charAt(0) !== '/') return Object.assign(home, { unknown: true });
    var parts = h.split('?')[0].split('/').filter(Boolean).map(safeDecode);
    var a = (parts[0] || '').toLowerCase();
    if ((a === 'projetos' || a === 'projects') && parts.length === 1) return { name: 'projects', params: {}, path: '/projetos' };
    if ((a === 'projetos' || a === 'projects') && parts.length === 2) return { name: 'project', params: { slug: parts[1] }, path: '/projetos/' + parts[1] };
    if ((a === 'experiencia' || a === 'experiência' || a === 'experience') && parts.length === 1) return { name: 'experience', params: {}, path: '/experiencia' };
    if ((a === 'sobre' || a === 'about') && parts.length === 1) return { name: 'about', params: {}, path: '/sobre' };
    if ((a === 'inicio' || a === 'home') && parts.length === 1) return home;
    return Object.assign(home, { unknown: true });
  }

  function href(name, params) {
    params = params || {};
    switch (name) {
      case 'projects': return '#/projetos';
      case 'project': return '#/projetos/' + encodeURIComponent(params.slug || '');
      case 'experience': return '#/experiencia';
      case 'about': return '#/sobre';
      default: return '#/';
    }
  }

  function keyOf(r) { return r ? r.name + ':' + (r.params.slug || '') : ''; }

  function viewFor(route) {
    var v = window.Views[route.name];
    if (v && typeof v.render === 'function') return { route: route, view: v };
    var home = { name: 'home', params: {}, path: '/' };
    return { route: home, view: window.Views.home || null };
  }

  function callSafe(fn, fallback) {
    try { return fn(); } catch (e) { console.error('[router]', e); return fallback; }
  }

  /* ---------------------------------------------------------------- chrome */
  function titleOf(view, params) {
    return callSafe(function () { return view.title ? view.title(params) : SITE; }, SITE);
  }

  function updateChrome(route, view, animate) {
    var t = titleOf(view, route.params);
    var docTitle = view.docTitle ? callSafe(function () { return view.docTitle(route.params); }, null) : null;
    document.title = docTitle || (t + ' — ' + SITE);

    var headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
      if (animate && App.anim) App.anim.swapText(headerTitle, t);
      else headerTitle.textContent = t;
    }

    var navKey = NAV_OF[route.name] || 'home';
    var links = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var match = a.getAttribute('data-nav') === navKey;
      var exact = match && (route.name === 'home' || route.name === 'projects' || route.name === 'experience' || route.name === 'about');
      a.classList.toggle('is-active', match);
      if (exact) a.setAttribute('aria-current', 'page');
      else if (match) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    document.documentElement.setAttribute('data-route', route.name);
    if (App.onNavChange) callSafe(function () { App.onNavChange(route); });
  }

  /* ------------------------------------------------------------------ view */
  function build(route, view) {
    var el = document.createElement('div');
    el.className = 'view view--' + route.name;
    var out = callSafe(function () { return view.render(route.params); }, null);
    if (out == null) {
      out = '<section class="main-container view-error"><h1>Algo deu errado</h1><p>Não consegui abrir esta página. <a href="#/">Voltar ao início</a></p></section>';
    }
    if (typeof out === 'string') el.innerHTML = out;
    else el.appendChild(out);
    return el;
  }

  function focusView(el) {
    var target = el.querySelector('[data-autofocus]') || el.querySelector('h1') || rootEl;
    if (target !== rootEl && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
  }

  function mount(route, view, el, from, first, morphed) {
    if (typeof view.mount !== 'function') return null;
    var ctx = { params: route.params, from: from, to: route, first: !!first, morphed: morphed || null, anim: App.anim, scene: App.scene };
    var c = callSafe(function () { return view.mount(el, ctx); }, null);
    return typeof c === 'function' ? c : null;
  }

  function runCleanup() {
    if (cleanup) { var c = cleanup; cleanup = null; callSafe(c); }
  }

  function scrollTo(y) {
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y || 0);
    html.style.scrollBehavior = prev;
  }

  /* ----------------------------------------------------- history / scroll */
  function newKey() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // Diferencia navegação nova (link) de voltar/avançar usando uma chave no
  // history.state de cada entrada.
  function entryKey() {
    var st = history.state;
    if (st && st.__vk) return { key: st.__vk, pop: Object.prototype.hasOwnProperty.call(scrollMem, st.__vk) };
    var k = newKey();
    try { history.replaceState(Object.assign({}, st || {}, { __vk: k }), ''); } catch (e) { /* file:// antigo */ }
    return { key: k, pop: false };
  }

  /* ------------------------------------------------------------ navegação */
  function navigate() {
    if (busy) { pending = true; return; }
    busy = true;
    var p;
    try { p = transition(); } catch (e) { console.error('[router]', e); p = Promise.resolve(); }
    Promise.resolve(p).catch(function (e) { console.error('[router]', e); }).then(function () {
      busy = false;
      if (pending) {
        pending = false;
        if (keyOf(parse()) !== keyOf(current) || parse().unknown) navigate();
      }
    });
  }

  function transition() {
    var parsed = parse();
    if (parsed.unknown) {
      try { history.replaceState(history.state, '', '#/'); } catch (e) { /* ignora */ }
    }
    var resolved = viewFor(parsed);
    var route = resolved.route, view = resolved.view;
    if (!view) {
      rootEl.innerHTML = '<section class="main-container view-error"><h1>Ops</h1><p>Não foi possível carregar o site. Veja meus projetos no <a href="https://github.com/VitorCapeleti">GitHub</a>.</p></section>';
      return Promise.resolve();
    }

    var from = current;
    var entry = entryKey();
    if (currentKey) scrollMem[currentKey] = window.pageYOffset || 0;
    var targetScroll = entry.pop ? (scrollMem[entry.key] || 0) : 0;
    currentKey = entry.key;

    // Mesma rota (ex.: hash reescrito): nada a trocar.
    if (from && keyOf(from) === keyOf(route) && viewEl) return Promise.resolve();

    var first = !from;
    var anim = App.anim;
    var scene = App.scene;
    var reduced = !anim || anim.reduced;

    if (first) {
      var el0 = build(route, view);
      rootEl.querySelectorAll('noscript').forEach(function (n) { n.remove(); });
      rootEl.appendChild(el0);
      viewEl = el0;
      current = route; currentView = view;
      updateChrome(route, view, false);
      if (scene) scene.setRoute(route.name);
      scrollTo(0);
      // O conteúdo já está no DOM (atrás do loader); a entrada começa quando o loader sai.
      if (anim) anim.set(el0, { opacity: 0 });
      var ready = App.loaderDone || Promise.resolve();
      return ready.then(function () {
        if (anim) anim.viewIn(el0);
        cleanup = mount(route, view, el0, null, true, null);
        emit(route, null);
      });
    }

    var oldEl = viewEl, oldView = currentView;
    var shared = (!reduced && oldView && typeof oldView.sharedOut === 'function')
      ? callSafe(function () { return oldView.sharedOut(oldEl, route); }, null) : null;
    if (shared && !(shared instanceof Element)) shared = null;
    var wantsShared = !!(shared && typeof view.sharedIn === 'function');

    runCleanup();

    // Troca síncrona do conteúdo (usada dentro e fora da View Transition).
    var newEl = null;
    function swap() {
      newEl = build(route, view);
      if (oldEl && oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
      rootEl.appendChild(newEl);
      viewEl = newEl;
      current = route; currentView = view;
      updateChrome(route, view, true);
      if (scene) scene.setRoute(route.name);
      scrollTo(targetScroll);
      return newEl;
    }

    function finish(morphed) {
      cleanup = mount(route, view, newEl, from, false, morphed);
      focusView(newEl);
      emit(route, from);
    }

    // ---- 1) View Transitions API (Chrome/Edge/Safari 18+/Firefox recente)
    if (wantsShared && typeof document.startViewTransition === 'function') {
      var target = null;
      var html = document.documentElement;
      shared.style.viewTransitionName = 'vt-shared';
      html.classList.add('vt-active');
      if (scene) scene.warp();
      var vt;
      try {
        vt = document.startViewTransition(function () {
          shared.style.viewTransitionName = '';
          swap();
          target = callSafe(function () { return view.sharedIn(newEl); }, null);
          if (target instanceof Element) target.style.viewTransitionName = 'vt-shared';
          else target = null;
        });
      } catch (e) {
        vt = null;
      }
      if (vt) {
        var done = Promise.race([vt.finished, anim ? anim.wait(1500) : Promise.resolve()]);
        // Monta assim que o DOM novo estiver pronto, para as animações da view
        // começarem junto com o morph.
        return vt.updateCallbackDone.then(function () {
          finish(target);
          return done;
        }, function () {
          if (!newEl) swap();
          finish(null);
        }).catch(function () { /* transição pulada */ }).then(function () {
          html.classList.remove('vt-active');
          if (target) target.style.viewTransitionName = '';
        });
      }
      shared.style.viewTransitionName = '';
      html.classList.remove('vt-active');
    }

    // ---- 2) Fallback: saída → warp → troca → entrada (+ morph por clone)
    var morph = (wantsShared && anim) ? anim.morphStart(shared) : null;
    var out = (anim && oldEl) ? anim.viewOut(oldEl) : Promise.resolve();
    if (scene) scene.warp();
    return out.then(function () {
      swap();
      var morphed = null;
      if (morph) {
        var tgt = callSafe(function () { return view.sharedIn(newEl); }, null);
        morphed = tgt instanceof Element ? tgt : null;
        morph.to(morphed);
      }
      if (anim) anim.viewIn(newEl);
      finish(morphed);
    });
  }

  function emit(to, from) {
    listeners.slice().forEach(function (fn) { callSafe(function () { fn(to, from); }); });
  }

  function start() {
    if (started) return;
    started = true;
    rootEl = document.getElementById('view');
    // O Chrome ignora o 'manual' definido antes do fim do load (a entrada inicial
    // volta a 'auto'); por isso reaplica no load/pageshow. Sem isso o navegador
    // rola a página antiga ao voltar/avançar, antes da animação de saída.
    function manualScroll() {
      if ('scrollRestoration' in history) {
        try { history.scrollRestoration = 'manual'; } catch (e) { /* ignora */ }
      }
    }
    manualScroll();
    window.addEventListener('load', manualScroll);
    window.addEventListener('pageshow', manualScroll);
    window.addEventListener('hashchange', navigate);
    // Clicar no link da rota atual: só volta ao topo.
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (!a) return;
      var r = parse(a.getAttribute('href'));
      if (current && keyOf(r) === keyOf(current) && !busy) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: App.anim && App.anim.reduced ? 'auto' : 'smooth' });
        if (viewEl) focusView(viewEl);
      }
    });
    navigate();
  }

  App.router = {
    start: start,
    go: function (path) { location.hash = '#' + (path.charAt(0) === '/' ? path : '/' + path); },
    href: href,
    parse: parse,
    get current() { return current; },
    onChange: function (fn) {
      listeners.push(fn);
      return function () { var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
    }
  };
})();
