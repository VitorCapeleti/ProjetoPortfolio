/* ==========================================================================
   Views.home — Início (#/)
   Mesmo conteúdo do hero original. O avatar vem recortado em duas camadas
   (img/layers/avatar + bubble) para o balão "</>" ganhar vida própria.
   ========================================================================== */
(function () {
  'use strict';

  window.Views = window.Views || {};

  // Posição do balão dentro do avatar (img/layers/manifest.json → bubble, em % de 666x374).
  var BUBBLE = { left: 25.3754, top: 7.2193, width: 16.8168, height: 19.7861 };

  // Frases que se alternam no destaque do título (a primeira também é o texto estático).
  var PHRASES = ['Desenvolvedor Full-Stack', 'Engenheiro de IA'];
  var HOLD_MS = 2500, TYPE_MS = 55, DELETE_MS = 28;

  var GLYPHS = ['{', '}', ';', '<', '/', '>', '(', ')'];
  var GLYPH_COLORS = ['#925aff', '#b892ff', '#d9c6ff', '#7a3cff', '#c9a8ff'];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  window.Views.home = {
    title: function () { return 'Início'; },
    docTitle: function () { return 'Vitor Capeleti — Desenvolvedor Full-Stack & Engenheiro de IA'; },

    render: function () {
      var img = window.App.util.img;
      return '' +
        '<section class="main-container hero-page home" aria-labelledby="home-title">' +
          '<div class="hero-text">' +
            '<p class="badge-intro home-badge"><span class="wave">Olá</span>, eu sou o Vitor</p>' +
            '<h1 id="home-title" class="hero-title">' +
              '<span class="visually-hidden">Um Desenvolvedor Full-Stack e Engenheiro de IA. Pronto para ajudar sua empresa</span>' +
              '<span class="hero-title-visual" aria-hidden="true">' +
                '<span class="hero-line hero-line--type">Um <span class="accent type-target">' + PHRASES[0] + '</span>.</span>' +
                '<span class="hero-line">Pronto para <span class="accent">ajudar</span> sua empresa</span>' +
              '</span>' +
            '</h1>' +
            '<p class="hero-desc">Sou programador há 6 anos, sempre demonstrando meu máximo para maximizar meus resultados em trabalhos. Desenvolvedor Full-Stack pronto para atender suas necessidades</p>' +
            '<div class="hero-cta">' +
              '<a class="btn btn-primary" href="#/projetos"><span class="btn-label">Ver projetos</span><span class="btn-arrow" aria-hidden="true">→</span></a>' +
              '<a class="btn btn-ghost" href="#/sobre"><span class="btn-label">Sobre mim</span></a>' +
            '</div>' +
          '</div>' +
          '<div class="hero-image">' +
            '<div class="avatar-rig">' +
              '<div class="avatar-breathe">' +
                img({ src: 'img/layers/avatar.webp', fallback: 'img/layers/avatar.png', alt: 'Ícone de apresentação do Vitor' },
                    { 'class': 'avatar-img', width: 666, height: 374 }) +
                '<span class="monitor-glow" aria-hidden="true"></span>' +
                '<div class="avatar-bubble" aria-hidden="true" style="left:' + BUBBLE.left + '%;top:' + BUBBLE.top + '%;width:' + BUBBLE.width + '%;height:' + BUBBLE.height + '%">' +
                  '<div class="bubble-float"><div class="bubble-pop">' +
                    img({ src: 'img/layers/bubble.webp', fallback: 'img/layers/bubble.png', alt: '' }, { width: 112, height: 74 }) +
                  '</div></div>' +
                  '<div class="bubble-glyphs"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>';
    },

    mount: function (root, ctx) {
      var anim = ctx.anim;
      if (!anim) return;
      var s = anim.scope();
      var reduced = anim.reduced;
      var q = function (sel) { return root.querySelector(sel); };

      var badge = q('.home-badge'), wave = q('.wave'), title = q('.hero-title'), desc = q('.hero-desc'), cta = q('.hero-cta');
      var image = q('.hero-image'), rig = q('.avatar-rig'), breathe = q('.avatar-breathe'), glow = q('.monitor-glow');
      var pop = q('.bubble-pop'), float = q('.bubble-float'), glyphs = q('.bubble-glyphs'), typeEl = q('.type-target');
      var first = ctx.first;

      /* --- digitação em "Desenvolvedor Full-Stack" (esconde o resto já, sem layout shift) */
      if (!reduced && typeEl) startTyping(typeEl, first ? 820 : 620);

      /* Digita → segura → apaga → próxima frase, em loop. Layout estável: a linha do título
         ganha uma cópia invisível com a frase mais longa (grid), então a altura nunca muda;
         o restante da frase atual fica invisível ocupando espaço (sem reflow ao digitar). */
      function startTyping(el, delay) {
        var line = el.parentNode;
        var longest = PHRASES.reduce(function (a, b) { return b.length > a.length ? b : a; });
        line.classList.add('is-looping');
        var ghost = document.createElement('span');
        ghost.className = 'hero-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.innerHTML = 'Um <span class="accent">' + longest + '</span>.';
        var live = document.createElement('span');
        live.className = 'hero-live';
        while (line.firstChild) live.appendChild(line.firstChild);
        // o ponto final vai para dentro do alvo (invisível até a frase completar): assim ele não muda de linha entre as frases
        if (live.lastChild && live.lastChild.nodeType === 3) live.removeChild(live.lastChild);
        line.appendChild(ghost);
        line.appendChild(live);

        var typed = document.createElement('span'); typed.className = 'tw-typed';
        var caret = document.createElement('span'); caret.className = 'tw-caret';
        var rest = document.createElement('span'); rest.className = 'tw-rest';
        var dot = document.createElement('span'); dot.className = 'tw-dot'; dot.textContent = '.';
        el.textContent = '';
        el.appendChild(typed); el.appendChild(caret); el.appendChild(rest); el.appendChild(dot);

        var p = 0, n = 0, dir = 1, timer = 0;
        function paint() {
          var t = PHRASES[p];
          typed.textContent = t.slice(0, n);
          rest.textContent = t.slice(n);
          dot.classList.toggle('on', n >= t.length);
        }
        function later(fn, ms) { timer = setTimeout(fn, ms); }
        function tick() {
          if (s.dead) return;
          if (document.hidden) return later(tick, 400);   // aba oculta: pausa
          var t = PHRASES[p];
          if (dir > 0) {
            el.classList.add('is-typing');
            n++; paint();
            if (n >= t.length) { el.classList.remove('is-typing'); dir = -1; return later(tick, HOLD_MS); }
            var ch = t.charAt(n - 1);
            return later(tick, TYPE_MS + (ch === ' ' || ch === '-' ? TYPE_MS * 1.2 : Math.random() * TYPE_MS * 0.5));
          }
          el.classList.add('is-typing');
          n--; paint();
          if (n <= 0) { p = (p + 1) % PHRASES.length; dir = 1; paint(); return later(tick, 380); }
          later(tick, DELETE_MS);
        }
        paint();
        s.add(function () { clearTimeout(timer); });
        later(tick, delay);
      }

      /* --- entrada escalonada */
      s.stagger([badge, title, desc, cta], { y: 22, duration: 0.7, stagger: 0.12, delay: 0.05 });
      s.fromTo(image, { opacity: 0, y: 26, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, delay: 0.2, ease: 'power3.out' });

      /* --- balão "</>" estoura, flutua e solta glifos de código */
      s.fromTo(pop, { opacity: 0, scale: 0.15 }, { opacity: 1, scale: 1, duration: 0.65, delay: 0.95, ease: 'back.out(2.4)' })
        .then(function () { if (!s.dead) startBubble(); });

      function startBubble() {
        s.loop(float, [
          { transform: 'translateY(0) rotate(0deg)' },
          { transform: 'translateY(-7%) rotate(-2deg)' }
        ], { duration: 2600, easing: 'ease-in-out' });
        if (reduced || typeof Element.prototype.animate !== 'function') return;
        emitGlyph();
        s.interval(emitGlyph, 1150);
      }

      function emitGlyph() {
        if (document.hidden || !glyphs || glyphs.childElementCount > 7) return;
        var g = document.createElement('span');
        g.className = 'glyph';
        g.textContent = pick(GLYPHS);
        g.style.left = rand(18, 82).toFixed(1) + '%';
        g.style.color = pick(GLYPH_COLORS);
        g.style.fontSize = rand(0.8, 1.35).toFixed(2) + 'em';
        glyphs.appendChild(g);
        var dx = rand(-30, 30), dy = rand(45, 85), r = rand(-30, 30);
        try {
          var a = g.animate([
            { transform: 'translate(0, 0) scale(.4)', opacity: 0 },
            { transform: 'translate(' + (dx * 0.25).toFixed(1) + 'px, ' + (-dy * 0.25).toFixed(1) + 'px) scale(1)', opacity: 1, offset: 0.22 },
            { transform: 'translate(' + dx.toFixed(1) + 'px, ' + (-dy).toFixed(1) + 'px) scale(.85) rotate(' + r.toFixed(1) + 'deg)', opacity: 0 }
          ], { duration: rand(1700, 2500), easing: 'cubic-bezier(.22,.61,.36,1)' });
          a.onfinish = a.oncancel = function () { g.remove(); };
        } catch (e) { g.remove(); }
      }

      /* --- "Olá" acena: na intro e no hover do badge */
      var waving = false;
      function waveHello() {
        if (waving || reduced) return;
        waving = true;
        anim.play(wave, [
          { transform: 'rotate(0deg)' }, { transform: 'rotate(14deg)', offset: 0.15 },
          { transform: 'rotate(-8deg)', offset: 0.3 }, { transform: 'rotate(14deg)', offset: 0.45 },
          { transform: 'rotate(-4deg)', offset: 0.6 }, { transform: 'rotate(10deg)', offset: 0.75 },
          { transform: 'rotate(0deg)' }
        ], { duration: 1100, easing: 'ease-in-out' }).then(function () { waving = false; });
      }
      s.timeout(waveHello, first ? 1000 : 750);
      s.on(badge, 'pointerenter', waveHello);

      /* --- respiração do avatar e brilho do monitor */
      s.loop(breathe, [
        { transform: 'scale(1, 1)' },
        { transform: 'scale(1.006, 1.014)' }
      ], { duration: 3600, easing: 'ease-in-out' });
      s.loop(glow, [{ opacity: 0.22 }, { opacity: 0.75 }], { duration: 2300, easing: 'ease-in-out' });

      /* --- avatar inclina em direção ao ponteiro */
      var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (!reduced && fine && rig) {
        var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0;
        var step = function (now) {
          raf = 0;
          var dt = Math.min(64, now - (last || now));
          last = now;
          var k = 1 - Math.exp(-dt / 160);
          cx += (tx - cx) * k;
          cy += (ty - cy) * k;
          rig.style.transform = 'perspective(1100px) rotateY(' + (cx * 7).toFixed(2) + 'deg) rotateX(' + (-cy * 5).toFixed(2) + 'deg)';
          if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(step);
          else last = 0;
        };
        s.on(window, 'pointermove', function (e) {
          if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
          tx = Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1));
          ty = Math.max(-1, Math.min(1, e.clientY / window.innerHeight * 2 - 1));
          if (!raf) raf = requestAnimationFrame(step);
        }, { passive: true });
        s.add(function () { cancelAnimationFrame(raf); rig.style.transform = ''; });
      }

      return s.kill;
    }
  };
})();
