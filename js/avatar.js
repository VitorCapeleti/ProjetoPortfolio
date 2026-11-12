/* ==========================================================================
   App.avatar — o Vitor programando, como boneco 2D animado
   --------------------------------------------------------------------------
   A arte é o desenho original (img/iconR.png) vetorizado em peças por
   tools/build_avatar.py → js/avatar-art.js (window.AVATAR_ART). Aqui as peças
   são montadas em camadas (cadeira → corpo → fone → cabeça → mão esquerda →
   monitor → mesa → xícara → braço direito → efeitos) e animadas.

   Rotina: ele digita (os dedos se movem, símbolos sobem da tela) e, entre
   trechos de digitação de 8–12 s, faz uma das animações, sorteada sem repetir:
     • café   — pega a xícara no canto da mesa, bebe e devolve
     • código — digita rápido, pensa com a mão no queixo (balão
                "..."), volta a digitar, compila: tela em neon ciano, estrelas

     App.avatar.html()            → string <svg> (pose de repouso)
     App.avatar.mount(svg, opts)  → { stop() }   opts: { reduced, first }
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var NS = 'http://www.w3.org/2000/svg';

  var C = {
    ink: '#140404', skin: '#fca88c', brown: '#62432b', lilac: '#aa82c8', lilacDark: '#8a64aa',
    purple: '#905afc', black: '#000', white: '#fefefc', cup: '#f4eefc', coffee: '#5b3324',
    cyan: '#3ff4ff', bubble: '#d0acdc', glyph: '#6c3cf4'
  };

  /* ------------------------------------------------------------- geometria */
  // Braço direito: ombro fixo; cotovelo e punho de cada pose são definidos à
  // mão (o desenho é 2D: o braço encurta quando vem para a frente, então não
  // dá para usar comprimentos fixos). A manga é desenhada entre os três pontos
  // e a mão (punho) sai de dentro dela, apontando na direção do antebraço.
  var SHO = { x: 462, y: 222 };                // ombro
  var E0 = { x: 466, y: 292 };                 // cotovelo em repouso (apoiado na mesa)
  var W0 = { x: 446, y: 311 };                 // pulso em repouso (no teclado)
  var HA0 = -30;                               // ângulo do punho em repouso
  var ARM_W = { sh: 20, el: 17, cuff: 12.5 };  // meia-largura da manga
  var NECK = { x: 405, y: 196 };               // pivô da cabeça (base do pescoço)
  var CUP0 = { x: 507, y: 336 };               // caneca: base, no canto direito da mesa
  var CUP_K = 1.2;                             // escala da xícara
  var HANDLE = { x: 24, y: -15.6 };          // centro da alça (coordenadas da xícara)
  var FIST_GRIP = { x: -26, y: -1 };           // centro dos dedos fechados (coordenadas do punho)

  function rot(p, deg) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
  }
  // pulso que deixa os dedos na alça da xícara (xícara em cx,cy com giro cr; mão com giro ha)
  function wristForCup(cx, cy, cr, ha) {
    var h = rot(HANDLE, cr), g = rot(FIST_GRIP, ha);
    return { x: cx + h.x - g.x, y: cy + h.y - g.y };
  }
  // manga: dois segmentos afunilados + juntas redondas (tudo preto, como a jaqueta)
  function seg(a, b, ra, rb) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / d, ny = dx / d;
    function p(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }
    return 'M' + p(a.x + nx * ra, a.y + ny * ra) + 'L' + p(b.x + nx * rb, b.y + ny * rb) +
      'L' + p(b.x - nx * rb, b.y - ny * rb) + 'L' + p(a.x - nx * ra, a.y - ny * ra) + 'Z';
  }

  /* ------------------------------------------------------------ montagem */
  function art(name) {
    var A = window.AVATAR_ART;
    return A && A.parts[name] ? A.parts[name] : '';
  }
  function scaled(name, cls) {
    var A = window.AVATAR_ART;
    return '<g class="' + (cls || ('av-' + name)) + '"><g transform="scale(' + (A ? A.scale : 0.25) + ')">' + art(name) + '</g></g>';
  }
  function pts(poly) { return poly.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }

  // mão: a arte inteira fica num <g id> nas defs; a palma é ela com os dedos
  // recortados fora, e cada dedo é ela recortada pelo polígono do dedo.
  function handMarkup(side) {
    var A = window.AVATAR_ART;
    var fingers = (A ? A.fingers : []).filter(function (f) { return f.hand === side; });
    var hole = 'M0,0H666V374H0Z ' + fingers.map(function (f) { return 'M' + pts(f.poly).replace(/ /g, ' L') + 'Z'; }).join(' ');
    var defs = '<clipPath id="avPalm-' + side + '" clipPathUnits="userSpaceOnUse"><path d="' + hole + '" clip-rule="evenodd"/></clipPath>' +
      fingers.map(function (f) {
        return '<clipPath id="avF-' + f.id + '" clipPathUnits="userSpaceOnUse"><polygon points="' + pts(f.poly) + '"/></clipPath>';
      }).join('');
    var body = scaled('shadow-' + side, 'av-shadow') +
      '<g clip-path="url(#avPalm-' + side + ')"><use href="#avHand-' + side + '"/></g>' +
      fingers.map(function (f) {
        return '<g class="av-finger" data-px="' + f.pivot[0] + '" data-py="' + f.pivot[1] + '">' +
          '<g clip-path="url(#avF-' + f.id + ')"><use href="#avHand-' + side + '"/></g></g>';
      }).join('');
    return { defs: defs, body: body };
  }

  // Expressões: sobrancelhas, nariz "<" e bigode são SEMPRE os traços do
  // desenho original. Só olhos e boca trocam — e só quando a expressão pede;
  // no resto do tempo são os traços originais (no máximo deslocados).
  var STROKE = 'stroke="' + C.ink + '" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  var EYES = {
    blink:  '<path d="M390.6,152.4 Q393.3,154.8 396,152.2 M404.8,152.8 Q407.7,155.2 410.6,152.6" ' + STROKE + ' stroke-width="2"/>',
    happy:  '<path d="M390.4,154.4 Q393.3,148.4 396.2,154.2 M404.6,154.6 Q407.7,148.6 410.8,154.4" ' + STROKE + ' stroke-width="2.3"/>',
    closed: '<path d="M390.6,151.6 Q393.3,155.2 396,151.4 M404.8,152 Q407.7,155.6 410.6,151.8" ' + STROKE + ' stroke-width="2.1"/>'
  };
  var MOUTHS = {
    happy:
      '<path d="M396.2,168.6 C400.4,176 412.4,175 416.6,161.6 C409.8,165.4 402.8,167.8 396.2,168.6 Z" fill="#7a2d22" stroke="' + C.ink + '" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M400.4,171.8 C404.6,173.2 409.8,171.6 412.8,168.8" stroke="#e86d6d" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
    closed: '<path d="M396.6,169.4 C403,172.6 411.8,169.6 416.2,162" ' + STROKE + ' stroke-width="2"/>',
    think:  '<path d="M400.6,167.8 C404.6,167.2 408.6,166.2 412.2,164.6" ' + STROKE + ' stroke-width="2"/>',
    sip:    '<ellipse cx="404.6" cy="168.4" rx="2.6" ry="2.2" fill="#7a2d22" stroke="' + C.ink + '" stroke-width="1.5"/>'
  };
  // cada expressão: olhos (trace = original; dx/dy desloca o olhar) e boca
  var FACES = {
    neutral: { eyes: 'trace', mouth: 'trace' },
    think:   { eyes: 'trace', mouth: 'think' },
    happy:   { eyes: 'happy', mouth: 'happy' },
    closed:  { eyes: 'closed', mouth: 'closed' },
    sip:     { eyes: 'closed', mouth: 'sip' }
  };
  function faceMarkup() {
    var out = scaled('features-brows', 'av-f-brows') + scaled('features-nose', 'av-f-nose') +
      '<g class="av-eyes" data-k="trace">' + scaled('features-eyes', 'av-f-eyes') + '</g>';
    Object.keys(EYES).forEach(function (k) { out += '<g class="av-eyes" data-k="' + k + '" display="none">' + EYES[k] + '</g>'; });
    out += '<g class="av-mouth" data-k="trace">' + scaled('features-mouth', 'av-f-mouth') + '</g>';
    Object.keys(MOUTHS).forEach(function (k) { out += '<g class="av-mouth" data-k="' + k + '" display="none">' + MOUTHS[k] + '</g>'; });
    return out + scaled('features-stache', 'av-f-stache');
  }

  // Mão fechada (punho) para pegar a xícara, o fone, apoiar o queixo e comemorar.
  // Mesmo estilo das mãos do original: sem contorno externo, pele chapada,
  // traço escuro só entre os dedos e nas unhas. Pulso em (0,0), dedos para -x.
  var FIST =
    '<path d="M2,-10.5 C-6,-14.5 -15,-15.2 -22.5,-13.4 C-25.6,-12.6 -27,-9.6 -27,-6 L-27,8.4 C-26.4,11.8 -23.6,13.4 -19.8,13.2 C-12,13 -4.6,12.4 2,9.6 Z" fill="' + C.skin + '"/>' +
    '<path d="M-21.6,-13.6 C-28.8,-14.6 -33.6,-12.4 -33.4,-8.6 C-33.2,-6 -31,-5 -28.4,-5.2 C-32.8,-4.4 -34.4,-1 -33.4,1.6 C-32.4,3.8 -30.2,4.4 -28.2,4 C-32,5.4 -33,8.6 -31.6,10.8 C-30.2,13 -27,13.6 -24.4,13 L-18,13 L-18,-13 Z" fill="' + C.skin + '"/>' +
    '<path d="M-33,-5.6 C-29.4,-5 -25.8,-4.6 -22.4,-4.8 M-32.8,3.2 C-29.4,3.6 -25.8,3.8 -22.6,3.4" stroke="' + C.ink + '" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M-24.6,-9.4 c-2.2,0.2 -2.6,2.6 -0.6,3.2 M-24.2,-0.6 c-2.2,0.2 -2.6,2.6 -0.6,3.2 M-24,8 c-2.2,0.2 -2.6,2.6 -0.6,3.2" stroke="' + C.ink + '" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
    '<path d="M-3.6,-11.4 C-10,-17.6 -20,-19.8 -27.4,-17.6 C-30.6,-16.6 -30.8,-13.4 -28.2,-12.4 C-21.6,-11.6 -14,-10.2 -7.4,-7.2 Z" fill="' + C.skin + '"/>' +
    '<path d="M-27.6,-17.4 c-1.8,0.8 -1.8,3.4 0.4,4.2" stroke="' + C.ink + '" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
    '<path d="M-8.6,-10.2 C-14,-12.6 -19.6,-13.6 -24.4,-13.4" stroke="' + C.ink + '" stroke-width="1.4" stroke-linecap="round" fill="none"/>' +
    '<path d="M-6,1.8 C-9.4,2.6 -12.8,2.8 -15.6,2.4" stroke="' + C.ink + '" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".55"/>';

  // caneca de café no traço do original. Origem: centro da base.
  var CUP =
    '<g transform="scale(' + CUP_K + ')">' +
      '<path d="M12.6,-19.2 C23.6,-21.4 24.6,-7.6 11,-6.8" stroke="' + C.ink + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<path d="M12.6,-19.2 C23.6,-21.4 24.6,-7.6 11,-6.8" stroke="' + C.cup + '" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path d="M-14.5,-24 C-14.5,-10.5 -10.4,-1.2 -6,0 L6,0 C10.4,-1.2 14.5,-10.5 14.5,-24 Z" fill="' + C.cup + '" stroke="' + C.ink + '" stroke-width="1.9" stroke-linejoin="round"/>' +
      '<ellipse cx="0" cy="-24" rx="14.5" ry="3.4" fill="' + C.coffee + '" stroke="' + C.ink + '" stroke-width="1.7"/>' +
      '<path d="M-10.8,-18.6 C-10.6,-12.4 -9,-7.2 -6.4,-3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".8"/>' +
      '<path d="M-2.6,-13.6 l2.6,-2.6 l2.6,2.6 l-2.6,2.6 Z" fill="' + C.purple + '" opacity=".9"/>' +
    '</g>';

  function html() {
    var L = handMarkup('l'), R = handMarkup('r');
    var A = window.AVATAR_ART, sc = A ? A.scale : 0.25;
    return '' +
'<svg class="av" viewBox="0 0 666 374" width="666" height="374" role="img" aria-label="Ilustração animada do Vitor programando no computador">' +
  '<defs>' +
    '<g id="avHand-l"><g transform="scale(' + sc + ')">' + art('hand-l') + '</g></g>' +
    '<g id="avHand-r"><g transform="scale(' + sc + ')">' + art('hand-r') + '</g></g>' +
    L.defs + R.defs +
    '<radialGradient id="avGlow"><stop offset="0" stop-color="#c4a0ff" stop-opacity=".5"/><stop offset="1" stop-color="#925aff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="avNeon"><stop offset="0" stop-color="' + C.cyan + '" stop-opacity=".75"/><stop offset=".55" stop-color="#2fd8ff" stop-opacity=".22"/><stop offset="1" stop-color="#2fd8ff" stop-opacity="0"/></radialGradient>' +
  '</defs>' +

  scaled('chair') +
  '<g class="av-torso">' + scaled('body') + '</g>' +

  /* fone no pescoço (fica sempre ali, como no desenho original) */
  scaled('phones') +

  /* cabeça: arte (cabelo, rosto, orelha, cavanhaque) + traços do rosto */
  '<g class="av-head">' +
    scaled('head') +
    '<g class="av-face">' + faceMarkup() + '</g>' +
  '</g>' +

  /* luz da tela batendo nele (normal lilás; sucesso: neon ciano) */
  '<g class="av-light" style="mix-blend-mode:screen" pointer-events="none">' +
    '<ellipse class="av-glow" cx="345" cy="190" rx="150" ry="120" fill="url(#avGlow)" opacity=".45"/>' +
    '<ellipse class="av-neon" cx="345" cy="195" rx="210" ry="160" fill="url(#avNeon)" opacity="0"/>' +
  '</g>' +

  '<g class="av-hand av-hand-l">' + L.body + '</g>' +

  scaled('monitor') +
  '<path class="av-rim" d="M333,100 C335,160 337,220 339,280" stroke="' + C.cyan + '" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0"/>' +
  scaled('desk') +

  /* braço direito: manga original em repouso; fora do repouso, manga montada
     (ombro → cotovelo → punho) com a mão saindo de dentro dela */
  '<g class="av-arm-r">' +
    '<g class="av-sleeve-art">' + scaled('sleeve-r', 'av-sleeve-r') + '</g>' +
    '<g class="av-sleeve" fill="' + C.black + '" opacity="0">' +
      '<path class="av-up"/><path class="av-fore"/>' +
      '<circle class="av-sh" r="' + ARM_W.sh + '"/><circle class="av-el" r="' + ARM_W.el + '"/>' +
      '<path class="av-fold" stroke="#dedede" stroke-width="1.4" stroke-linecap="round" fill="none"/>' +
    '</g>' +
    /* (a caneca entra aqui quando está na mão: na frente da manga, atrás dos dedos) */
    '<g class="av-fist" opacity="0">' + FIST + '</g>' +
    /* boca da manga: cobre o pulso, por cima da mão */
    '<g class="av-cap" fill="' + C.black + '" opacity="0">' +
      '<path class="av-cap-in"/>' +
      '<path class="av-cuff" stroke="#2c2c2c" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
    '</g>' +
    '<g class="av-hand av-hand-r">' + R.body + '</g>' +
  '</g>' +

  /* caneca: na mesa; vai na mão ao beber. Fica NA FRENTE do
     braço, sempre à mostra (a mão segura pela alça, do lado direito) */
  '<g class="av-cup" transform="translate(' + CUP0.x + ',' + CUP0.y + ')">' +
    '<g class="av-steam" stroke="#efe4ff" stroke-width="2.4" stroke-linecap="round" fill="none">' +
      '<path d="M-6,-36 C-11,-43 -1,-48 -6,-55 C-11,-62 -2,-67 -6,-74"/>' +
      '<path d="M5,-36 C0,-43 10,-48 5,-55 C0,-62 9,-67 5,-74"/>' +
    '</g>' + CUP +
  '</g>' +


  '<g class="av-fx"></g>' +
'</svg>';
  }

  /* ================================================================ motor */
  function lerp(a, b, t) { return a + (b - a) * t; }
  var EASE = {
    linear: function (t) { return t; },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t * t; },
    back: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  function rand(a, b) { return a + Math.random() * (b - a); }

  function mount(svg, opts) {
    opts = opts || {};
    if (!svg) return { stop: function () {} };
    var reduced = !!opts.reduced;
    var q = function (s) { return svg.querySelector(s); };
    var qa = function (s) { return Array.prototype.slice.call(svg.querySelectorAll(s)); };

    var el = {
      head: q('.av-head'), armR: q('.av-arm-r'),
      sleeveArt: q('.av-sleeve-art'), sleeve: q('.av-sleeve'), up: q('.av-up'), fore: q('.av-fore'),
      sh: q('.av-sh'), elb: q('.av-el'), fold: q('.av-fold'), cuff: q('.av-cuff'), cap: q('.av-cap'), capIn: q('.av-cap-in'),
      handR: q('.av-hand-r'), fist: q('.av-fist'),
      cup: q('.av-cup'), steam: q('.av-steam'),
      glow: q('.av-glow'), neon: q('.av-neon'), rim: q('.av-rim'),
      fx: q('.av-fx')
    };
    var eyes = {}, mouths = {};
    qa('.av-eyes').forEach(function (g) { eyes[g.getAttribute('data-k')] = g; });
    qa('.av-mouth').forEach(function (g) { mouths[g.getAttribute('data-k')] = g; });
    var fingers = { l: qa('.av-hand-l .av-finger'), r: qa('.av-hand-r .av-finger') };

    /* estado animável (o quadro aplica tudo de uma vez) */
    var S = {
      ex: E0.x, ey: E0.y,               // cotovelo direito
      wx: W0.x, wy: W0.y, ha: HA0,      // pulso direito e giro da mão
      cx: CUP0.x, cy: CUP0.y, cr: 0,    // xícara (base) e inclinação
      cupOn: 0,                         // 1 = xícara na mão (o pulso segue a alça)
      headR: 0, headY: 0,               // cabeça (gira na base do pescoço)
      neon: 0, glow: .45
    };
    var typingL = true, typingR = true, typingFast = false;
    var dead = false, paused = false, raf = 0, lastFrame = performance.now();
    var timers = [], anims = [];

    /* ----------------------------------------------- utilidades de tempo */
    function later(fn, ms) {
      var id = setTimeout(function () {
        var i = timers.indexOf(id);
        if (i > -1) timers.splice(i, 1);
        if (!dead) fn();
      }, ms);
      timers.push(id);
      return id;
    }
    // espera que respeita a pausa (aba oculta / fora da tela)
    function wait(ms) {
      return new Promise(function (res, rej) {
        var left = ms;
        (function tick() {
          if (dead) return rej(new Error('stop'));
          if (left <= 0) return res();
          var step = Math.min(200, left);
          later(function () { if (!paused) left -= step; tick(); }, step);
        })();
      });
    }
    var tweens = [];
    // dispara sem esperar (sem erro solto no console quando a view sai)
    function go(props, ms, ease) { to(props, ms, ease).catch(function () {}); }
    function to(props, ms, ease) {
      if (dead) return Promise.reject(new Error('stop'));
      return new Promise(function (res, rej) {
        var tw = { from: {}, to: props, t0: performance.now(), ms: ms, ease: EASE[ease || 'inOut'], res: res, rej: rej };
        Object.keys(props).forEach(function (k) { tw.from[k] = S[k]; });
        tweens.push(tw);
        kick();
      });
    }

    /* ------------------------------------------------------- aplicação */
    function f1(v) { return v.toFixed(1); }
    function apply() {
      // braço direito
      if (S.cupOn) { var wc = wristForCup(S.cx, S.cy, S.cr, S.ha); S.wx = wc.x; S.wy = wc.y; }
      var W = { x: S.wx, y: S.wy }, E = { x: S.ex, y: S.ey };
      var away = Math.min(1, Math.hypot(W.x - W0.x, W.y - W0.y) / 12 + Math.hypot(E.x - E0.x, E.y - E0.y) / 16 + Math.abs(S.ha - HA0) / 60);
      var atRest = away < .01;
      // em repouso: manga e mão do desenho original
      el.handR.setAttribute('transform', atRest ? '' : 'translate(' + (W.x - W0.x).toFixed(2) + ',' + (W.y - W0.y).toFixed(2) + ')');
      el.handR.setAttribute('opacity', (1 - away).toFixed(3));
      el.sleeveArt.setAttribute('opacity', (1 - away).toFixed(3));
      // fora do repouso: manga montada + punho saindo dela
      el.sleeve.setAttribute('opacity', Math.min(1, away * 3).toFixed(3));
      el.cap.setAttribute('opacity', Math.min(1, away * 3).toFixed(3));
      el.fist.setAttribute('opacity', away.toFixed(3));
      el.fist.setAttribute('transform', 'translate(' + W.x.toFixed(2) + ',' + W.y.toFixed(2) + ') rotate(' + S.ha.toFixed(2) + ')');
      if (!atRest) {
        var fx = W.x - E.x, fy = W.y - E.y, fl = Math.hypot(fx, fy) || 1;
        var ux = fx / fl, uy = fy / fl;
        var C2 = { x: W.x + ux * 3, y: W.y + uy * 3 };              // a manga cobre o pulso
        el.up.setAttribute('d', seg(SHO, E, ARM_W.sh, ARM_W.el));
        el.fore.setAttribute('d', seg(E, C2, ARM_W.el, ARM_W.cuff));
        var P = { x: C2.x - ux * Math.min(12, fl * .4), y: C2.y - uy * Math.min(12, fl * .4) };
        el.capIn.setAttribute('d', seg(P, C2, ARM_W.cuff + .8, ARM_W.cuff));
        el.sh.setAttribute('cx', SHO.x); el.sh.setAttribute('cy', SHO.y);
        el.elb.setAttribute('cx', f1(E.x)); el.elb.setAttribute('cy', f1(E.y));
        // dobras claras da manga (como os traços brancos do original)
        var ax = E.x - SHO.x, ay = E.y - SHO.y, al = Math.hypot(ax, ay) || 1;
        var nx = -ay / al, ny = ax / al; if (nx < 0) { nx = -nx; ny = -ny; }
        var mx = -uy, my = ux; if (mx < 0) { mx = -mx; my = -my; }
        var w = ARM_W.sh;
        // com o antebraço dobrado por cima do braço, só a dobra do antebraço aparece
        var folded = (ax * ux + ay * uy) / al < -.2;
        el.fold.setAttribute('d', (folded ? '' :
          'M' + f1(SHO.x + ax * .3 + nx * w * .45) + ',' + f1(SHO.y + ay * .3 + ny * w * .45) +
          'L' + f1(SHO.x + ax * .72 + nx * w * .05) + ',' + f1(SHO.y + ay * .72 + ny * w * .05)) +
          'M' + f1(E.x + fx * .18 + mx * ARM_W.el * .5) + ',' + f1(E.y + fy * .18 + my * ARM_W.el * .5) +
          'L' + f1(E.x + fx * .5 + mx * ARM_W.cuff * .1) + ',' + f1(E.y + fy * .5 + my * ARM_W.cuff * .1));
        var k = { x: C2.x - ux * 4, y: C2.y - uy * 4 }, cw = ARM_W.cuff * .92;
        el.cuff.setAttribute('d', 'M' + f1(k.x + mx * cw) + ',' + f1(k.y + my * cw) + 'L' + f1(k.x - mx * cw) + ',' + f1(k.y - my * cw));
      }
      // xícara (sempre de pé; só inclina no gole)
      el.cup.setAttribute('transform', 'translate(' + S.cx.toFixed(2) + ',' + S.cy.toFixed(2) + ')' + (S.cr ? ' rotate(' + S.cr.toFixed(2) + ')' : ''));
      // cabeça (gira na base do pescoço)
      el.head.setAttribute('transform', 'rotate(' + S.headR.toFixed(2) + ' ' + NECK.x + ' ' + NECK.y + ') translate(0,' + S.headY.toFixed(2) + ')');
      // luz
      el.neon.setAttribute('opacity', S.neon.toFixed(3));
      el.rim.setAttribute('opacity', S.neon.toFixed(3));
      el.glow.setAttribute('opacity', (S.glow * (1 - S.neon * .6)).toFixed(3));
    }

    function frame(now) {
      raf = 0;
      if (dead) return;
      lastFrame = now;
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i];
        var t = Math.min(1, (now - tw.t0) / tw.ms);
        var e = tw.ease(t);
        for (var k in tw.to) S[k] = lerp(tw.from[k], tw.to[k], e);
        if (t >= 1) { tweens.splice(i, 1); tw.res(); }
      }
      apply();
      if (tweens.length && !paused) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && !paused && !dead) raf = requestAnimationFrame(frame); }

    /* --------------------------------------------------------- expressões */
    var face = 'neutral', blinking = false;
    function showFace() {
      var f = FACES[face];
      var e = blinking && f.eyes === 'trace' ? 'blink' : f.eyes;
      Object.keys(eyes).forEach(function (k) { eyes[k].setAttribute('display', k === e ? 'inline' : 'none'); });
      eyes.trace.setAttribute('transform', f.dx || f.dy ? 'translate(' + (f.dx || 0) + ',' + (f.dy || 0) + ')' : '');
      Object.keys(mouths).forEach(function (k) { mouths[k].setAttribute('display', k === f.mouth ? 'inline' : 'none'); });
    }
    function setFace(name) { face = name; showFace(); }
    function blinkLoop() {
      later(function () {
        if (!paused && FACES[face].eyes === 'trace') {
          blinking = true; showFace();
          later(function () { blinking = false; showFace(); }, 130);
        }
        blinkLoop();
      }, rand(2600, 5200));
    }

    /* ------------------------------------------------------ digitação */
    function strike(list, deg, ms) {
      if (!list.length) return;
      var f = list[(Math.random() * list.length) | 0];
      if (!f.style.transformBox) {
        f.style.transformBox = 'view-box';
        f.style.transformOrigin = f.getAttribute('data-px') + 'px ' + f.getAttribute('data-py') + 'px';
      }
      try {
        f.animate([
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(' + deg.toFixed(2) + 'deg)', offset: .45 },
          { transform: 'rotate(' + (-deg * .18).toFixed(2) + 'deg)', offset: .82 },
          { transform: 'rotate(0deg)' }
        ], { duration: ms, easing: 'cubic-bezier(.3,0,.4,1)' });
      } catch (e) { /* sem WAAPI: os dedos ficam parados */ }
    }
    var keyCount = 0;
    function typeLoop() {
      var gap = typingFast ? rand(70, 110) : rand(100, 170);
      later(function () {
        if (!paused) {
          var useR = typingR && (!typingL || Math.random() < .5);
          if (useR) { strike(fingers.r, rand(3.6, 5.2), rand(140, 190)); keyCount++; }
          else if (typingL) { strike(fingers.l, rand(2.4, 3.6), rand(140, 190)); keyCount++; }
          // a cada poucas teclas um símbolo sobe da tela
          if ((typingL || typingR) && keyCount >= (typingFast ? 3 : 5)) { keyCount = 0; glyph(); }
          if (Math.random() < .12) { later(typeLoop, rand(250, 600)); return; } // respiro entre palavras
        }
        typeLoop();
      }, gap);
    }

    /* ------------------------------------------------------------- efeitos */
    function svgEl(tag, attrs, text) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text != null) n.textContent = text;
      return n;
    }
    function particle(node, kf, ms, easing) {
      el.fx.appendChild(node);
      node.style.transformBox = 'fill-box';
      node.style.transformOrigin = 'center';
      try {
        var a = node.animate(kf, { duration: ms, easing: easing || 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
        anims.push(a);
        a.onfinish = a.oncancel = function () { node.remove(); var i = anims.indexOf(a); if (i > -1) anims.splice(i, 1); };
      } catch (e) { node.remove(); }
    }
    var GLYPHS = ['{', '}', ';', '<', '/', '>', '(', ')', '=', '</>'];
    var GLYPH_COLORS = ['#925aff', '#b892ff', '#d9c6ff', '#7a3cff', '#c9a8ff'];
    function glyph() {
      if (document.hidden || el.fx.childElementCount > 18) return;
      var x = rand(190, 320), y = rand(96, 118);
      var t = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), fill: GLYPH_COLORS[(Math.random() * 5) | 0], 'font-family': 'VT323, monospace', 'font-size': rand(13, 20).toFixed(1), 'text-anchor': 'middle', opacity: '0' }, GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      var dx = rand(-22, 22), dy = rand(45, 80), r = rand(-25, 25);
      particle(t, [
        { transform: 'translate(0,0) scale(.5)', opacity: 0 },
        { transform: 'translate(' + (dx * .25).toFixed(1) + 'px,' + (-dy * .25).toFixed(1) + 'px) scale(1)', opacity: .95, offset: .2 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + (-dy).toFixed(1) + 'px) rotate(' + r.toFixed(1) + 'deg) scale(.85)', opacity: 0 }
      ], rand(1600, 2400));
    }
    function stars() {
      for (var i = 0; i < 12; i++) {
        var x = rand(200, 330), y = rand(95, 130);
        var s = rand(4, 7);
        var col = i % 3 === 0 ? C.cyan : (i % 3 === 1 ? '#d9c6ff' : '#925aff');
        var star = svgEl('path', { d: 'M' + x + ',' + (y - s) + ' L' + (x + s * .3) + ',' + (y - s * .3) + ' L' + (x + s) + ',' + y + ' L' + (x + s * .3) + ',' + (y + s * .3) + ' L' + x + ',' + (y + s) + ' L' + (x - s * .3) + ',' + (y + s * .3) + ' L' + (x - s) + ',' + y + ' L' + (x - s * .3) + ',' + (y - s * .3) + ' Z', fill: col, opacity: '0' });
        var ang = rand(-2.6, -.5), dist = rand(40, 95);
        particle(star, [
          { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + (Math.cos(ang) * dist * .45).toFixed(1) + 'px,' + (Math.sin(ang) * dist * .45).toFixed(1) + 'px) scale(1.1) rotate(60deg)', opacity: 1, offset: .3 },
          { transform: 'translate(' + (Math.cos(ang) * dist).toFixed(1) + 'px,' + (Math.sin(ang) * dist + 20).toFixed(1) + 'px) scale(.6) rotate(160deg)', opacity: 0 }
        ], rand(1100, 1600), 'cubic-bezier(.16,.84,.44,1)');
      }
    }
    // balão de pensamento "..." (no estilo do balão do original)
    var thought = null;
    function showThought(on) {
      if (on && !thought) {
        thought = svgEl('g', { class: 'av-thought' });
        thought.innerHTML =
          '<circle cx="384" cy="118" r="2.6" fill="' + C.bubble + '" stroke="' + C.ink + '" stroke-width="1.4"/>' +
          '<circle cx="377" cy="106" r="4" fill="' + C.bubble + '" stroke="' + C.ink + '" stroke-width="1.5"/>' +
          '<path d="M334,62 C330,50 342,42 352,46 C356,36 372,34 378,42 C388,36 402,42 400,54 C410,58 408,72 398,74 C396,84 380,86 374,80 C366,88 350,86 348,78 C336,80 328,70 334,62 Z" fill="' + C.bubble + '" stroke="' + C.ink + '" stroke-width="1.8" stroke-linejoin="round"/>' +
          '<circle class="av-dot" cx="356" cy="63" r="3.2" fill="' + C.glyph + '"/><circle class="av-dot" cx="368" cy="63" r="3.2" fill="' + C.glyph + '"/><circle class="av-dot" cx="380" cy="63" r="3.2" fill="' + C.glyph + '"/>';
        el.fx.appendChild(thought);
        thought.style.transformBox = 'fill-box';
        thought.style.transformOrigin = '80% 100%';
        try { thought.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }); } catch (e) { /* ignora */ }
        Array.prototype.forEach.call(thought.querySelectorAll('.av-dot'), function (d, i) {
          d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center';
          try { anims.push(d.animate([{ transform: 'translateY(0)', opacity: .35 }, { transform: 'translateY(-3px)', opacity: 1 }, { transform: 'translateY(0)', opacity: .35 }], { duration: 900, delay: i * 180, iterations: Infinity })); } catch (e) { /* ignora */ }
        });
      } else if (!on && thought) {
        var t = thought; thought = null;
        try { var a = t.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 260, fill: 'forwards' }); a.onfinish = function () { t.remove(); }; } catch (e) { t.remove(); }
      }
    }
    // vapor do café: dois fios ondulando para cima
    function steamLoop() {
      var p = el.steam.children;
      for (var i = 0; i < p.length; i++) {
        p[i].style.transformBox = 'fill-box';
        p[i].style.transformOrigin = '50% 100%';
        try {
          anims.push(p[i].animate([
            { transform: 'translateY(4px) scaleY(.7)', opacity: 0 },
            { transform: 'translateY(0) scaleY(1)', opacity: .85, offset: .35 },
            { transform: 'translateY(-10px) scaleY(1.1) skewX(8deg)', opacity: 0 }
          ], { duration: 2400, delay: i * 1200, iterations: Infinity, easing: 'ease-out' }));
        } catch (e) { /* ignora */ }
      }
    }

    /* ----------------------------------------------------------- cenas */
    function holdCup(on) {
      S.cupOn = on ? 1 : 0;
      if (on) el.armR.insertBefore(el.cup, el.fist);
      else el.armR.parentNode.insertBefore(el.cup, el.fx);
      el.steam.style.opacity = on ? '0' : '';
      apply();
    }
    function toRest(ms) { return to({ wx: W0.x, wy: W0.y, ha: HA0, ex: E0.x, ey: E0.y }, ms || 900, 'inOut'); }

    async function coffee() {
      typingR = false;
      await wait(250);
      // a mão sai do teclado pela frente do corpo e o braço estica até a alça
      var g = wristForCup(CUP0.x, CUP0.y, 0, -90);
      await to({ wx: 486, wy: 300, ha: -60, ex: 494, ey: 270 }, 520, 'in');
      await to({ wx: g.x, wy: g.y, ha: -90, ex: 506, ey: 258 }, 640, 'out');
      holdCup(true);
      // o cotovelo volta para junto do corpo e só o antebraço sobe: a caneca
      // passa pelo meio do peito até o meio da boca
      await to({ cx: 428, cy: 284, cr: -2, ha: 0, ex: 492, ey: 292 }, 650, 'in');
      await to({ cx: 410, cy: 196, cr: -4, ha: 36, ex: 478, ey: 280, headR: -1 }, 760, 'out');
      // gole: a mão vira só um pouco, a caneca fica reta na boca
      setFace('sip');
      await to({ cx: 409, cy: 193, cr: -10, ha: 42, ex: 478, ey: 279, headR: -2.5 }, 600, 'inOut');
      await wait(950);
      await to({ cx: 410, cy: 196, cr: -4, ha: 36, ex: 478, ey: 280, headR: -1 }, 500, 'inOut');
      setFace('closed');
      await wait(500);
      setFace('neutral');
      // desce pelo meio do peito e devolve na mesa
      await to({ cx: 428, cy: 284, cr: -2, ha: 0, ex: 492, ey: 292, headR: 0 }, 650, 'in');
      await to({ cx: CUP0.x, cy: CUP0.y, cr: 0, ha: -90, ex: 506, ey: 258 }, 620, 'out');
      holdCup(false);
      await wait(200);
      await to({ wx: 486, wy: 300, ha: -60, ex: 494, ey: 270 }, 450, 'in');
      await toRest(550);
      typingR = true;
    }

    async function code() {
      typingFast = true;
      await wait(2600);
      // para e pensa: mão no queixo, olhando para a tela
      typingFast = false; typingR = false; typingL = false;
      setFace('think');
      await to({ wx: 403, wy: 221, ha: 88, ex: 452, ey: 280, headR: -1.5 }, 950, 'inOut');
      showThought(true);
      await wait(2400);
      showThought(false);
      setFace('neutral');
      await to({ wx: W0.x, wy: W0.y, ha: HA0, ex: E0.x, ey: E0.y, headR: 0 }, 900, 'inOut');
      // volta a digitar, agora com a ideia
      typingR = true; typingL = true; typingFast = true;
      await wait(2000);
      typingFast = false; typingR = false; typingL = false;
      // compilou! tela em neon ciano, sorriso e comemoração
      go({ neon: 1 }, 380, 'out');
      setFace('happy');
      stars();
      await to({ wx: 486, wy: 198, ha: 100, ex: 502, ey: 248, headR: -2 }, 560, 'back');
      await to({ wy: 182, ey: 240 }, 200, 'out'); await to({ wy: 198, ey: 248 }, 230, 'inOut');
      await to({ wy: 182, ey: 240 }, 200, 'out'); await to({ wy: 198, ey: 248 }, 230, 'inOut');
      await wait(700);
      await to({ wx: W0.x, wy: W0.y, ha: HA0, ex: E0.x, ey: E0.y, headR: 0 }, 950, 'inOut');
      go({ neon: 0 }, 1500, 'inOut');
      setFace('neutral');
      typingR = true; typingL = true;
    }

    var SCENES = { coffee: coffee, code: code };
    var last = null;
    async function routine() {
      try {
        await wait(opts.first ? 4000 : 2500);
        for (;;) {
          await wait(rand(8000, 12000));          // só digitando entre as animações
          var keys = Object.keys(SCENES).filter(function (k) { return k !== last; });
          last = keys[(Math.random() * keys.length) | 0];
          await SCENES[last]();
        }
      } catch (e) { /* parado */ }
    }

    /* --------------------------------------------------- liga / desliga */
    var inView = true, io = null;
    function setPaused(p) {
      if (p === paused) return;
      paused = p;
      anims.forEach(function (a) { try { p ? a.pause() : a.play(); } catch (e) { /* ignora */ } });
      if (p) { cancelAnimationFrame(raf); raf = 0; }
      else {
        var now = performance.now();
        tweens.forEach(function (tw) { tw.t0 += now - lastFrame; });
        lastFrame = now;
        kick();
      }
    }
    function visibility() { setPaused(document.hidden || !inView); }
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(function (es) { inView = es[0].isIntersecting; visibility(); });
      io.observe(svg);
    }
    document.addEventListener('visibilitychange', visibility);

    apply();
    if (!reduced) {
      steamLoop();
      blinkLoop();
      typeLoop();
      routine();
    }

    var api = {
      stop: function () {
        dead = true;
        if (App.avatar._last === api) App.avatar._last = null;
        cancelAnimationFrame(raf);
        timers.forEach(function (t) { clearTimeout(t); });
        anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* ignora */ } });
        tweens.forEach(function (tw) { tw.rej(new Error('stop')); });
        tweens = [];
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', visibility);
      },
      // para testes
      _play: function (name) { return SCENES[name] ? SCENES[name]().catch(function () {}) : null; },
      _state: S
    };
    App.avatar._last = api; // gancho de teste: o boneco montado agora
    return api;
  }

  App.avatar = { html: html, mount: mount };
})();
