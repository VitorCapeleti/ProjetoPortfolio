/* ==========================================================================
   App.anim — camada de animação
   --------------------------------------------------------------------------
   Envolve o GSAP (cdnjs 3.12.5) quando ele carregou e cai para a
   Web Animations API (element.animate) quando o CDN falhou. Se nem WAAPI
   existir, aplica o estado final direto: o site nunca quebra.

   Regras:
   - Só anima transform e opacity.
   - prefers-reduced-motion: reduce → sem deslocamento, sem loops, só fades
     curtos (≤ 200 ms).
   - Loops (anim.loop) pausam sozinhos quando a aba fica oculta.
   - Não misture, no MESMO elemento, um tween (to/from/fromTo) e um loop:
     use elementos aninhados (um wrapper para cada transform).

   API (todas as durações em SEGUNDOS, no estilo GSAP, exceto onde indicado):
     anim.reduced                     → boolean (ao vivo)
     anim.hasGsap                     → boolean
     anim.onReducedChange(fn)         → off()
     anim.to(targets, vars)           → Promise
     anim.from(targets, vars)         → Promise
     anim.fromTo(targets, from, to)   → Promise
     anim.set(targets, vars)
     anim.kill(targets)
       vars: { x, y, scale, scaleX, scaleY, rotation, opacity,
               duration, delay, stagger, ease }  (x/y em px ou string "10%")
     anim.stagger(targets, { y=18, duration=.6, stagger=.08, delay=0 }) → Promise
     anim.viewOut(root) / anim.viewIn(root) → Promise   (usados pelo router)
     anim.pop(el, { delay }) → Promise      (scale 0 → 1 com "back")
     anim.play(el, keyframes, { duration(ms), easing, delay(ms) }) → Promise  (one-shot WAAPI)
     anim.loop(el, keyframes, { duration(ms), easing, direction, delay(ms) }) → { play, pause, cancel }
     anim.typewriter(el, { speed(ms)=55, delay(ms)=0 }) → { done: Promise, cancel }
     anim.swapText(el, text) → Promise
     anim.morphStart(fromEl) → { to(toEl) → Promise, cancel() }   (morph por clone/rect)
     anim.flip(targets, mutateFn, { duration, stagger }) → Promise   (GSAP Flip ou FLIP manual)
     anim.reveal(targets, { y, stagger, duration, rootMargin }) → cleanup   (IntersectionObserver)
     anim.tilt(el, { max=8, scale=1.02, perspective=800 }) → cleanup   (tilt 3D no hover; seta --mx/--my)
     anim.wait(ms) → Promise
     anim.scope() → escopo que rastreia tudo e desfaz com scope.kill()
         scope.to/from/fromTo/set/stagger/pop/play/loop/typewriter/reveal/tilt (mesmas assinaturas)
         scope.on(target, type, fn, opts)  scope.timeout(fn, ms)  scope.interval(fn, ms)
         scope.add(cleanupFn)  scope.kill()
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reducedListeners = [];
  if (mq) {
    var onMq = function () {
      reducedListeners.slice().forEach(function (fn) {
        try { fn(!!mq.matches); } catch (e) { console.error(e); }
      });
    };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  if (window.gsap) {
    var plugins = [window.ScrollTrigger, window.Flip].filter(Boolean);
    try { if (plugins.length) window.gsap.registerPlugin.apply(window.gsap, plugins); } catch (e) { console.warn('[anim] plugins', e); }
  }

  var HAS_WAAPI = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

  /* Modo leve (celulares/tablets e aparelhos fracos): as animações grandes
     rodam no compositor (WAAPI só com transform/opacity) em vez do loop de
     JS, que trava enquanto a view nova é montada. */
  var LITE = (function () {
    try {
      var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var narrow = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                 (navigator.deviceMemory && navigator.deviceMemory <= 4);
      return !!(coarse || narrow || weak);
    } catch (e) { return false; }
  })();
  if (LITE) document.documentElement.classList.add('perf-lite');

  // Entrada/saída de view no compositor (não depende do main thread).
  // keep=true (saída): mantém o estado final até a view ser removida.
  // keep=false (entrada): ao terminar, solta a animação e limpa o inline
  // (um transform residual quebraria position: fixed dos filhos).
  function liteView(root, kf, dur, easing, keep) {
    if (!HAS_WAAPI) {
      root.style.opacity = keep ? '0' : '';
      return Promise.resolve();
    }
    var a;
    try { a = root.animate(kf, { duration: dur, easing: easing, fill: keep ? 'forwards' : 'backwards' }); } catch (e) { return Promise.resolve(); }
    return new Promise(function (res) {
      var settled = false;
      var done = function () {
        if (settled) return;
        settled = true;
        if (!keep) {
          root.style.opacity = '';
          root.style.transform = '';
        }
        res();
      };
      a.onfinish = done;
      a.oncancel = done;
      setTimeout(done, dur + 200);
    });
  }

  var EASES = {
    'none': 'linear',
    'linear': 'linear',
    'power1.out': 'cubic-bezier(.25,.46,.45,.94)',
    'power2.out': 'cubic-bezier(.22,.61,.36,1)',
    'power3.out': 'cubic-bezier(.215,.61,.355,1)',
    'power4.out': 'cubic-bezier(.165,.84,.44,1)',
    'expo.out': 'cubic-bezier(.16,1,.3,1)',
    'power1.in': 'cubic-bezier(.55,.085,.68,.53)',
    'power2.in': 'cubic-bezier(.55,.085,.68,.53)',
    'power3.in': 'cubic-bezier(.55,.055,.675,.19)',
    'power1.inOut': 'cubic-bezier(.45,0,.55,1)',
    'power2.inOut': 'cubic-bezier(.65,0,.35,1)',
    'power3.inOut': 'cubic-bezier(.65,0,.35,1)',
    'sine.inOut': 'cubic-bezier(.37,0,.63,1)',
    'sine.out': 'cubic-bezier(.61,1,.88,1)',
    'back.out': 'cubic-bezier(.34,1.56,.64,1)',
    'back.in': 'cubic-bezier(.36,0,.66,-.56)',
    'elastic.out': 'cubic-bezier(.34,1.8,.5,1)'
  };
  function cssEase(e) {
    if (!e) return EASES['power2.out'];
    if (EASES[e]) return EASES[e];
    var base = String(e).replace(/\(.*\)$/, '');
    return EASES[base] || EASES['power2.out'];
  }

  function toArray(t) {
    if (!t) return [];
    if (typeof t === 'string') return Array.prototype.slice.call(document.querySelectorAll(t));
    if (t instanceof Element) return [t];
    if (typeof t.length === 'number') return Array.prototype.slice.call(t).filter(Boolean);
    return [t];
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Resolve a promise no máximo em `ms` (protege contra tweens mortos que nunca completam).
  function capped(p, ms) { return Promise.race([p, wait(ms)]); }

  function px(v) { return typeof v === 'number' ? v + 'px' : String(v); }

  function hasTransform(v) {
    return v && ('x' in v || 'y' in v || 'scale' in v || 'scaleX' in v || 'scaleY' in v || 'rotation' in v || 'rotate' in v);
  }

  function transformOf(v) {
    var parts = [];
    var x = v.x != null ? v.x : 0, y = v.y != null ? v.y : 0;
    parts.push('translate(' + px(x) + ', ' + px(y) + ')');
    var r = v.rotation != null ? v.rotation : v.rotate;
    if (r != null) parts.push('rotate(' + (typeof r === 'number' ? r + 'deg' : r) + ')');
    if (v.scale != null) parts.push('scale(' + v.scale + ')');
    if (v.scaleX != null || v.scaleY != null) parts.push('scale(' + (v.scaleX != null ? v.scaleX : 1) + ', ' + (v.scaleY != null ? v.scaleY : 1) + ')');
    return parts.join(' ');
  }

  function keyframeOf(v, withTransform, withOpacity) {
    var k = {};
    if (withTransform) k.transform = transformOf(v || {});
    if (withOpacity) k.opacity = v && v.opacity != null ? v.opacity : 1;
    return k;
  }

  // Remove do vars as chaves de animação e devolve só o "estado" visual.
  var TIMING_KEYS = ['duration', 'delay', 'stagger', 'ease', 'onComplete', 'immediateRender', 'clearProps'];
  function stateOnly(v) {
    var o = {};
    for (var k in v) if (TIMING_KEYS.indexOf(k) === -1) o[k] = v[k];
    return o;
  }

  function stripMotion(v) {
    // reduced-motion: só opacity
    var o = {};
    if (v && v.opacity != null) o.opacity = v.opacity;
    return o;
  }

  var running = new WeakMap(); // el -> [Animation]

  function killEl(el) {
    if (window.gsap) window.gsap.killTweensOf(el);
    var list = running.get(el);
    if (list) {
      list.forEach(function (a) {
        try { if (a.playState !== 'finished') a.commitStyles(); } catch (e) { /* elemento fora do DOM */ }
        try { a.cancel(); } catch (e) { /* ignora */ }
      });
      running.delete(el);
    }
  }

  function applyState(el, v) {
    if (hasTransform(v)) el.style.transform = transformOf(v);
    if (v.opacity != null) el.style.opacity = v.opacity;
  }

  /* ------------------------------------------------------------------ tween */
  function tween(targets, fromVars, toVars) {
    var els = toArray(targets);
    toVars = toVars || {};
    if (!els.length) return Promise.resolve();

    var reduced = anim.reduced;
    var duration = toVars.duration != null ? toVars.duration : 0.5;
    var delay = toVars.delay || 0;
    var stagger = toVars.stagger || 0;
    var ease = toVars.ease || 'power2.out';

    var fromS = fromVars ? stateOnly(fromVars) : null;
    var toS = stateOnly(toVars);

    if (reduced) {
      fromS = fromS ? stripMotion(fromS) : null;
      toS = stripMotion(toS);
      duration = Math.min(duration, 0.2);
      stagger = Math.min(stagger, 0.03);
      delay = Math.min(delay, 0.1);
      // Limpa transforms que possam ter ficado de antes.
      els.forEach(function (el) { if (hasTransform(toVars)) el.style.transform = ''; });
      if (toS.opacity == null && (!fromS || fromS.opacity == null)) return Promise.resolve();
    }

    var total = (delay + duration + stagger * (els.length - 1)) * 1000 + 250;

    // ---- GSAP
    if (window.gsap) {
      return capped(new Promise(function (resolve) {
        var vars = Object.assign({}, toS, { duration: duration, delay: delay, stagger: stagger, ease: ease, onComplete: resolve, overwrite: 'auto' });
        if (fromS) window.gsap.fromTo(els, fromS, vars);
        else window.gsap.to(els, vars);
      }), total);
    }

    // ---- WAAPI
    if (!HAS_WAAPI) {
      els.forEach(function (el) { applyState(el, toS); });
      return Promise.resolve();
    }

    var withT = hasTransform(toS) || hasTransform(fromS);
    var withO = toS.opacity != null || (fromS && fromS.opacity != null);
    var promises = els.map(function (el, i) {
      killEl(el);
      var frames;
      if (fromS) {
        var f = Object.assign({}, fromS), t = Object.assign({}, toS);
        if (withO) {
          if (f.opacity == null) f.opacity = 1;
          if (t.opacity == null) t.opacity = 1;
        }
        frames = [keyframeOf(f, withT, withO), keyframeOf(t, withT, withO)];
      } else {
        frames = [keyframeOf(toS, withT, withO)];
      }
      var a;
      try {
        a = el.animate(frames, {
          duration: Math.max(1, duration * 1000),
          delay: (delay + i * stagger) * 1000,
          easing: cssEase(ease),
          fill: 'both'
        });
      } catch (e) {
        applyState(el, toS);
        return Promise.resolve();
      }
      var list = running.get(el) || [];
      list.push(a);
      running.set(el, list);
      return a.finished.then(function () {
        try { a.commitStyles(); } catch (e) { applyState(el, toS); }
        try { a.cancel(); } catch (e) { /* ignora */ }
        var l = running.get(el);
        if (l) { l.splice(l.indexOf(a), 1); if (!l.length) running.delete(el); }
      }, function () { /* cancelada */ });
    });
    return capped(Promise.all(promises), total);
  }

  /* ------------------------------------------------------------------ loops */
  var loops = new Set();
  function noopHandle() { return { play: function () {}, pause: function () {}, cancel: function () {} }; }

  function loop(el, keyframes, opts) {
    opts = opts || {};
    if (!el || anim.reduced || !HAS_WAAPI) return noopHandle();
    var a;
    try {
      a = el.animate(keyframes, {
        duration: opts.duration || 3000,
        delay: opts.delay || 0,
        easing: opts.easing || 'ease-in-out',
        direction: opts.direction || 'alternate',
        iterations: Infinity
      });
    } catch (e) { return noopHandle(); }
    loops.add(a);
    if (document.hidden) a.pause();
    return {
      play: function () { try { a.play(); } catch (e) { /* ignora */ } },
      pause: function () { try { a.pause(); } catch (e) { /* ignora */ } },
      cancel: function () { loops.delete(a); try { a.cancel(); } catch (e) { /* ignora */ } }
    };
  }

  document.addEventListener('visibilitychange', function () {
    loops.forEach(function (a) {
      try { if (document.hidden) a.pause(); else a.play(); } catch (e) { /* ignora */ }
    });
  });

  function play(el, keyframes, opts) {
    opts = opts || {};
    if (!el || anim.reduced || !HAS_WAAPI) return Promise.resolve();
    try {
      var a = el.animate(keyframes, {
        duration: opts.duration || 600,
        delay: opts.delay || 0,
        easing: opts.easing || 'ease-in-out',
        fill: opts.fill || 'none'
      });
      return capped(a.finished.catch(function () {}), (opts.duration || 600) + (opts.delay || 0) + 250);
    } catch (e) { return Promise.resolve(); }
  }

  /* ------------------------------------------------------------- typewriter */
  // Digita o texto já presente em `el`. O conteúdo completo continua ocupando
  // espaço (o resto fica invisível), então não há layout shift.
  // O elemento deve ser decorativo (aria-hidden) com o texto completo
  // disponível para leitores de tela em outro lugar.
  function typewriter(el, opts) {
    opts = opts || {};
    var cancelled = false, timer = null;
    var noop = { done: Promise.resolve(), cancel: function () {} };
    if (!el) return noop;
    var text = el.getAttribute('data-text') || el.textContent;
    if (anim.reduced) return noop;

    el.textContent = '';
    var typed = document.createElement('span');
    typed.className = 'tw-typed';
    var caret = document.createElement('span');
    caret.className = 'tw-caret';
    var rest = document.createElement('span');
    rest.className = 'tw-rest';
    rest.textContent = text;
    el.appendChild(typed);
    el.appendChild(caret);
    el.appendChild(rest);
    el.classList.add('is-typing');

    var speed = opts.speed || 55;
    var i = 0;
    var done = new Promise(function (resolve) {
      function finish() {
        typed.textContent = text;
        rest.textContent = '';
        el.classList.remove('is-typing');
        el.classList.add('is-typed');
        resolve();
      }
      function tick() {
        if (cancelled) return finish();
        i++;
        typed.textContent = text.slice(0, i);
        rest.textContent = text.slice(i);
        if (i >= text.length) return finish();
        var ch = text.charAt(i - 1);
        timer = setTimeout(tick, speed + (ch === ' ' || ch === '-' ? speed * 1.4 : Math.random() * speed * 0.6));
      }
      timer = setTimeout(tick, opts.delay || 0);
    });
    return {
      done: done,
      cancel: function () {
        cancelled = true;
        clearTimeout(timer);
        typed.textContent = text;
        rest.textContent = '';
        el.classList.remove('is-typing');
      }
    };
  }

  /* --------------------------------------------------------------- swapText */
  var swapTokens = new WeakMap();
  var swapping = new WeakSet();
  function swapText(el, text) {
    if (!el) return Promise.resolve();
    var token = {};
    swapTokens.set(el, token); // só a chamada mais recente escreve o texto
    if (el.textContent === text && !swapping.has(el)) return Promise.resolve();
    if (anim.reduced || (!window.gsap && !HAS_WAAPI)) {
      killEl(el);
      el.textContent = text;
      el.style.opacity = '';
      swapping.delete(el);
      return Promise.resolve();
    }
    swapping.add(el);
    return tween(el, null, { opacity: 0, y: -10, duration: 0.16, ease: 'power2.in' }).then(function () {
      if (swapTokens.get(el) !== token) return;
      el.textContent = text;
      return tween(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.32, ease: 'back.out(2)' }).then(function () {
        if (swapTokens.get(el) === token) swapping.delete(el);
      });
    });
  }

  /* ------------------------------------------------------------------ morph */
  // Morph genérico por clone: captura o retângulo de origem já (antes da troca
  // de view) e depois voa até o retângulo do destino. Usado pelo router quando
  // não há View Transitions API. O clone é um elemento fixo isolado; anima
  // left/top/width/height nele (só ele, fora do fluxo) para não distorcer a
  // imagem com scale não uniforme.
  function morphStart(fromEl) {
    var dead = { to: function () { return Promise.resolve(); }, cancel: function () {} };
    if (!fromEl || anim.reduced || !HAS_WAAPI) return dead;
    var r = fromEl.getBoundingClientRect();
    if (!r.width || !r.height) return dead;
    var clone = fromEl.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('morph-clone');
    var cs = getComputedStyle(fromEl);
    Object.assign(clone.style, {
      position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
      margin: '0', maxWidth: 'none', maxHeight: 'none', zIndex: '60', pointerEvents: 'none',
      borderRadius: cs.borderRadius, objectFit: cs.objectFit || 'cover', transform: 'none', opacity: '1',
      viewTransitionName: 'none'
    });
    document.body.appendChild(clone);
    function cancel() { if (clone.parentNode) clone.parentNode.removeChild(clone); }
    return {
      cancel: cancel,
      to: function (toEl, opts) {
        opts = opts || {};
        if (!toEl) {
          return play(clone, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).then(cancel);
        }
        var t = toEl.getBoundingClientRect();
        var tcs = getComputedStyle(toEl);
        var prevVis = toEl.style.visibility;
        toEl.style.visibility = 'hidden';
        var a;
        try {
          a = clone.animate([
            { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: cs.borderRadius },
            { left: t.left + 'px', top: t.top + 'px', width: t.width + 'px', height: t.height + 'px', borderRadius: tcs.borderRadius }
          ], { duration: opts.duration || 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        } catch (e) { toEl.style.visibility = prevVis; cancel(); return Promise.resolve(); }
        return capped(a.finished.catch(function () {}), (opts.duration || 560) + 300).then(function () {
          toEl.style.visibility = prevVis;
          return play(clone, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
        }).then(cancel);
      }
    };
  }

  /* ------------------------------------------------------------------- flip */
  function flip(targets, mutate, opts) {
    opts = opts || {};
    var els = toArray(targets);
    if (anim.reduced || !els.length) { mutate(); return Promise.resolve(); }
    var duration = opts.duration || 0.5;
    if (window.gsap && window.Flip) {
      var state = window.Flip.getState(els);
      mutate();
      return capped(new Promise(function (resolve) {
        window.Flip.from(state, {
          duration: duration, ease: opts.ease || 'power2.inOut', stagger: opts.stagger || 0, absolute: !!opts.absolute,
          onEnter: function (els2) { return window.gsap.fromTo(els2, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: duration * 0.8 }); },
          onLeave: function (els2) { return window.gsap.to(els2, { opacity: 0, scale: 0.9, duration: duration * 0.6 }); },
          onComplete: resolve
        });
      }), duration * 1000 + 1500);
    }
    if (!HAS_WAAPI) { mutate(); return Promise.resolve(); }
    var first = els.map(function (el) { return el.getBoundingClientRect(); });
    mutate();
    var ps = els.map(function (el, i) {
      var last = el.getBoundingClientRect();
      if (!last.width && !last.height) return Promise.resolve();
      var f = first[i];
      if (!f.width && !f.height) {
        return play(el, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: duration * 800, easing: cssEase('power2.out') });
      }
      var dx = f.left - last.left, dy = f.top - last.top;
      if (!dx && !dy) return Promise.resolve();
      return play(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: duration * 1000, easing: cssEase('power2.inOut'), delay: (opts.stagger || 0) * 1000 * i });
    });
    return Promise.all(ps);
  }

  /* ----------------------------------------------------------------- reveal */
  function reveal(targets, opts) {
    opts = opts || {};
    var els = toArray(targets);
    if (!els.length) return function () {};
    if (anim.reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach(function (el) { el.style.opacity = ''; });
      return function () {};
    }
    var y = opts.y != null ? opts.y : 28;
    els.forEach(function (el) { el.style.opacity = '0'; });
    var queue = [], flushTimer = null;
    function flush() {
      flushTimer = null;
      var batch = queue.splice(0);
      tween(batch, { opacity: 0, y: y }, { opacity: 1, y: 0, duration: opts.duration || 0.7, stagger: opts.stagger != null ? opts.stagger : 0.1, ease: 'power3.out' });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          io.unobserve(en.target);
          queue.push(en.target);
        }
      });
      if (queue.length && !flushTimer) flushTimer = setTimeout(flush, 16);
    }, { rootMargin: opts.rootMargin || '0px 0px -10% 0px', threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
    return function () { io.disconnect(); clearTimeout(flushTimer); };
  }

  /* ------------------------------------------------------------------- tilt */
  var finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  function tilt(el, opts) {
    opts = opts || {};
    if (!el || anim.reduced || (finePointer && !finePointer.matches)) return function () {};
    var max = opts.max != null ? opts.max : 8;
    var sc = opts.scale != null ? opts.scale : 1.02;
    var persp = opts.perspective || 800;
    var rect = null, raf = 0, mx = 0.5, my = 0.5, active = false;
    function render() {
      raf = 0;
      if (!active) return;
      var rx = (0.5 - my) * max * 2, ry = (mx - 0.5) * max * 2;
      el.style.transform = 'perspective(' + persp + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc + ')';
      el.style.setProperty('--mx', (mx * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (my * 100).toFixed(1) + '%');
    }
    function enter() { rect = el.getBoundingClientRect(); active = true; el.style.transition = 'transform .15s ease-out'; el.classList.add('is-tilting'); }
    function move(e) {
      if (!rect) rect = el.getBoundingClientRect();
      mx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      my = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      if (!raf) raf = requestAnimationFrame(render);
    }
    function leave() {
      active = false; rect = null;
      el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
      el.style.transform = '';
      el.classList.remove('is-tilting');
    }
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return function () {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.style.transform = ''; el.style.transition = '';
    };
  }

  /* ------------------------------------------------------------------ scope */
  function scope() {
    var cleanups = [];
    var targets = [];
    var dead = false;
    function track(t) { toArray(t).forEach(function (el) { targets.push(el); }); }
    function guard(fn) { return function () { if (!dead) fn.apply(null, arguments); }; }
    var s = {
      to: function (t, v) { track(t); return anim.to(t, v); },
      from: function (t, v) { track(t); return anim.from(t, v); },
      fromTo: function (t, f, v) { track(t); return anim.fromTo(t, f, v); },
      set: function (t, v) { track(t); anim.set(t, v); },
      stagger: function (t, o) { track(t); return anim.stagger(t, o); },
      pop: function (el, o) { track(el); return anim.pop(el, o); },
      play: function (el, k, o) { return anim.play(el, k, o); },
      loop: function (el, k, o) { var h = loop(el, k, o); cleanups.push(h.cancel); return h; },
      typewriter: function (el, o) { var h = typewriter(el, o); cleanups.push(h.cancel); return h; },
      reveal: function (t, o) { var c = reveal(t, o); cleanups.push(c); return c; },
      tilt: function (el, o) { var c = tilt(el, o); cleanups.push(c); return c; },
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        cleanups.push(function () { target.removeEventListener(type, fn, opts); });
      },
      timeout: function (fn, ms) { var id = setTimeout(guard(fn), ms); cleanups.push(function () { clearTimeout(id); }); return id; },
      interval: function (fn, ms) { var id = setInterval(guard(fn), ms); cleanups.push(function () { clearInterval(id); }); return id; },
      add: function (fn) { if (typeof fn === 'function') cleanups.push(fn); },
      get dead() { return dead; },
      kill: function () {
        if (dead) return;
        dead = true;
        targets.forEach(function (el) { try { killEl(el); } catch (e) { /* ignora */ } });
        cleanups.splice(0).reverse().forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
      }
    };
    return s;
  }

  /* ------------------------------------------------------------------- API */
  var anim = {
    get reduced() { return !!(mq && mq.matches); },
    lite: LITE,
    get hasGsap() { return !!window.gsap; },
    onReducedChange: function (fn) {
      reducedListeners.push(fn);
      return function () { var i = reducedListeners.indexOf(fn); if (i > -1) reducedListeners.splice(i, 1); };
    },
    to: function (t, v) { return tween(t, null, v); },
    from: function (t, v) {
      var els = toArray(t);
      var to = {};
      var st = stateOnly(v || {});
      if ('opacity' in st) to.opacity = 1;
      if ('x' in st) to.x = 0;
      if ('y' in st) to.y = 0;
      if ('scale' in st) to.scale = 1;
      if ('rotation' in st) to.rotation = 0;
      TIMING_KEYS.forEach(function (k) { if (v && k in v) to[k] = v[k]; });
      return tween(els, st, to);
    },
    fromTo: function (t, f, v) { return tween(t, f, v); },
    set: function (t, v) {
      toArray(t).forEach(function (el) {
        killEl(el);
        if (window.gsap) window.gsap.set(el, stateOnly(v));
        else applyState(el, stateOnly(v));
      });
    },
    kill: function (t) { toArray(t).forEach(killEl); },
    stagger: function (t, o) {
      o = o || {};
      return tween(t, { opacity: 0, y: o.y != null ? o.y : 18 }, {
        opacity: 1, y: 0, duration: o.duration || 0.6, stagger: o.stagger != null ? o.stagger : 0.08,
        delay: o.delay || 0, ease: o.ease || 'power3.out'
      });
    },
    viewOut: function (root) {
      if (LITE && !anim.reduced) {
        killEl(root);
        return liteView(root, [
          { opacity: 1, transform: 'translate3d(0,0,0)' },
          { opacity: 0, transform: 'translate3d(0,-10px,0)' }
        ], 200, 'cubic-bezier(.55,0,1,.45)', true);
      }
      return tween(root, null, { opacity: 0, y: -14, duration: 0.22, ease: 'power2.in' });
    },
    viewIn: function (root) {
      if (LITE && !anim.reduced) {
        killEl(root);
        root.style.opacity = '';
        root.style.transform = '';
        return liteView(root, [
          { opacity: 0, transform: 'translate3d(0,14px,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ], 380, 'cubic-bezier(.215,.61,.355,1)', false);
      }
      return tween(root, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    },
    pop: function (el, o) {
      o = o || {};
      return tween(el, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: o.duration || 0.6, delay: o.delay || 0, ease: 'back.out(2.2)' });
    },
    play: play,
    loop: loop,
    typewriter: typewriter,
    swapText: swapText,
    morphStart: morphStart,
    flip: flip,
    reveal: reveal,
    tilt: tilt,
    wait: wait,
    scope: scope,
    cssEase: cssEase
  };

  App.anim = anim;
})();
