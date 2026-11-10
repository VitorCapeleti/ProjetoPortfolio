/* ==========================================================================
   App.scene — o cenário vivo
   --------------------------------------------------------------------------
   O fundo do Vitor (img/background.png, 1366x768) foi recortado em camadas
   (img/layers/*). O HTML de #scene já posiciona cada recorte exatamente onde
   ele fica na arte original, com a mesma matemática de `background-size:
   cover` (feita em CSS, então sem JS o fundo fica idêntico ao original).

   Este arquivo dá vida às camadas:
   - loops de personalidade em CSS (.scene.is-alive): lua gira e flutua,
     Saturno balança o anel, planeta deriva preso à borda de baixo, galáxia
     respira em torno do "olho", estrelas originais piscam;
   - parallax por ponteiro / giroscópio (sem pedir permissão) e por scroll;
   - o foguetinho decola de tempos em tempos, cruza o céu e volta pro lugar;
   - estrelas cadentes ocasionais;
   - warp (riscos de estrela em canvas) nas trocas de rota;
   - "câmera" por rota (zoom sutil em direção a um astro).

   API:
     App.scene.init()                 → chamado pelo app.js uma vez
     App.scene.warp({ duration })     → Promise (resolve no fim; ~560 ms; não bloqueia)
     App.scene.setRoute(name)         → move a câmera ('home'|'projects'|'project'|'experience'|'about')
     App.scene.launchRocket()         → faz o foguete decolar agora (se estiver parado)
     App.scene.shootingStar()         → dispara uma estrela cadente agora
     App.scene.toStage(x, y)          → {x, y} em px de viewport para um ponto da arte (1366x768)
     App.scene.alive                  → boolean (false com reduced-motion)
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var W0 = 1366, H0 = 768;

  // Centro e raio (px da arte) dos 37 pontinhos de estrela de stars.png.
  var STARS = [
    [601, 16, 8], [773, 25, 8], [827, 25, 8], [81, 23, 4], [1358, 38, 8], [131, 47, 8], [457, 48, 8], [25, 65, 4],
    [1352, 90, 8], [549, 97, 8], [1287, 100, 8], [444, 123, 8], [216, 222, 8], [620, 236, 8], [310, 243, 8],
    [58, 274, 8], [7, 279, 8], [1280, 334, 8], [251, 348, 8], [1327, 360, 8], [1272, 365, 8], [1006, 369, 8],
    [1076, 384, 8], [307, 396, 8], [14, 397, 8], [278, 417, 8], [1014, 438, 8], [172, 532, 8], [612, 571, 10],
    [242, 592, 4], [549, 599, 8], [165, 606, 6], [128, 649, 6], [280, 646, 6], [375, 656, 8], [335, 702, 8], [836, 764, 8]
  ];

  // Caixas dos recortes (px da arte) — iguais a img/layers/manifest.json.
  var BOXES = {
    moon: [198, 253, 82, 80],
    saturn: [871, 225, 162, 86],
    planet: [108, 650, 184, 118],
    galaxy: [999, 452, 367, 316],
    rocket: [302, 734, 38, 34]
  };

  // Profundidade de parallax (0 = parado, 1 = mais perto). lockY: recortes
  // cortados pela borda de baixo/direita não sobem (não revelam o corte).
  var DEPTH = {
    far: { d: 0.08 },
    stars: { d: 0.18 },
    moon: { d: 0.55 },
    saturn: { d: 0.4 },
    galaxy: { d: 0.22, lockY: true },
    planet: { d: 0.75, lockY: true },
    rocket: { d: 0.65 }
  };

  // Câmera por rota: ponto da arte para onde o zoom "olha" e a escala.
  var CAMERA = {
    home: { pt: [952, 268], s: 1.03 },      // Saturno
    projects: { pt: [1299, 662], s: 1.07 }, // olho da galáxia
    project: { pt: [200, 709], s: 1.06 },   // planeta grande
    experience: { pt: [321, 751], s: 1.05 }, // foguete (canto de baixo)
    about: { pt: [239, 293], s: 1.07 }      // lua
  };

  var AMP = 16;          // deslocamento máximo de parallax (px da arte) em depth 1
  var SCROLL_K = 0.06;   // fator do parallax de scroll
  var SCROLL_MAX = 1400;

  // Foguete: centro na arte e o ângulo para onde o bico aponta no desenho.
  var RK = { x: 302, y: 734, cx: 321, cy: 751, rest: -143 };
  var LEG_A = [[321, 751], [230, 600], [560, 40], [1500, -40]];   // decola e cruza o céu
  var LEG_B = [[470, 840], [440, 800], [352, 772], [321, 751]];   // volta por baixo e pousa
  var T_RUMBLE = 520, T_A = 4300, T_GAP = 1500, T_B = 1900;
  var TRAIL_N = 18, TRAIL_LIFE = 650, TRAIL_EVERY = 34;

  var WARP_COLORS = ['#925aff', '#b892ff', '#d9c6ff', '#7a3cff', '#c9a8ff'];

  var root, camera, stage, fx, warpCanvas, warpCtx, rocketFly;
  var layers = [];       // { el, d, lockY }
  var trailDots = [];
  var vw = 0, vh = 0, S = 1, ox = 0, oy = 0;
  var ptr = { tx: 0, ty: 0, x: 0, y: 0 };
  var scr = { t: 0, c: 0 };
  var raf = 0, lastT = 0;
  var alive = false, paused = false, pausedAt = 0, inited = false;
  var route = 'home';
  var rocketTimer = 0, shootTimer = 0;
  var rk = { phase: 'idle', t0: 0, samples: [], lastSample: 0 };
  var wp = { active: false, t0: 0, dur: 560, streaks: [], resolve: null, dpr: 1 };

  function anim() { return App.anim || { reduced: false, onReducedChange: function () {} }; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ------------------------------------------------------------- medidas */
  function measure() {
    vw = root.clientWidth || window.innerWidth;
    vh = root.clientHeight || window.innerHeight;
    S = Math.max(vw / W0, vh / H0);
    ox = (vw - W0 * S) / 2;
    oy = (vh - H0 * S) / 2;
  }

  function toStage(x, y) { return { x: ox + x * S, y: oy + y * S }; }

  /* -------------------------------------------------------------- estrelas */
  function pct(v, total) { return (v / total * 100).toFixed(4) + '%'; }

  function buildTwinkles() {
    var host = stage.querySelector('.layer--stars');
    if (!host || host.querySelector('.twk')) return;
    var frag = document.createDocumentFragment();
    STARS.forEach(function (s, i) {
      var el = document.createElement('i');
      el.className = 'twk';
      var size = s[2] * 2.6;
      el.style.left = pct(s[0], W0);
      el.style.top = pct(s[1], H0);
      el.style.width = pct(size, W0);
      el.style.setProperty('--dur', rand(3.2, 7.5).toFixed(2) + 's');
      el.style.setProperty('--delay', (-rand(0, 7)).toFixed(2) + 's');
      el.style.setProperty('--peak', (s[2] <= 4 ? rand(0.5, 0.8) : rand(0.35, 0.6)).toFixed(2));
      if (i % 3 === 0) el.classList.add('twk--slow');
      frag.appendChild(el);
    });
    host.appendChild(frag);
  }

  // Pontinhos extras no mesmo estilo (círculos chapados roxo-escuros), gerados
  // de forma determinística, longe dos astros e das estrelas originais.
  function buildFarStars() {
    var host = stage.querySelector('.layer--far');
    if (!host || host.childElementCount) return;
    var seed = 1366;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var avoid = Object.keys(BOXES).map(function (k) { return BOXES[k]; });
    var placed = [];
    var frag = document.createDocumentFragment();
    var tries = 0;
    while (placed.length < 22 && tries++ < 600) {
      var x = 20 + rnd() * (W0 - 40), y = 14 + rnd() * (H0 - 60), r = 2.5 + rnd() * 3.5;
      var ok = avoid.every(function (b) { return x < b[0] - 40 || x > b[0] + b[2] + 40 || y < b[1] - 40 || y > b[1] + b[3] + 40; });
      ok = ok && STARS.concat(placed).every(function (s) { return Math.hypot(s[0] - x, s[1] - y) > 70; });
      if (!ok) continue;
      placed.push([x, y, r]);
      var el = document.createElement('i');
      el.className = 'far-star';
      el.style.left = pct(x, W0);
      el.style.top = pct(y, H0);
      el.style.width = pct(r * 2, W0);
      el.style.setProperty('--dur', (3 + rnd() * 5).toFixed(2) + 's');
      el.style.setProperty('--delay', (-rnd() * 6).toFixed(2) + 's');
      frag.appendChild(el);
    }
    host.appendChild(frag);
  }

  function buildTrail() {
    var host = stage.querySelector('.layer--rocket');
    if (!host) return;
    var wrap = document.createElement('div');
    wrap.className = 'rocket-trail';
    for (var i = 0; i < TRAIL_N; i++) {
      var d = document.createElement('i');
      wrap.appendChild(d);
      trailDots.push(d);
    }
    host.insertBefore(wrap, host.firstChild);
  }

  /* -------------------------------------------------------------- loop */
  function schedule() {
    if (!raf && !paused) {
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(64, now - lastT);
    lastT = now;
    var busy = false;

    if (alive) {
      var k = 1 - Math.exp(-dt / 140);
      ptr.x += (ptr.tx - ptr.x) * k;
      ptr.y += (ptr.ty - ptr.y) * k;
      scr.c += (scr.t - scr.c) * (1 - Math.exp(-dt / 90));
      if (Math.abs(ptr.tx - ptr.x) < 0.0005 && Math.abs(ptr.ty - ptr.y) < 0.0005 && Math.abs(scr.t - scr.c) < 0.1) {
        ptr.x = ptr.tx; ptr.y = ptr.ty; scr.c = scr.t;
      } else busy = true;
      writeLayers();
      if (updateRocket(now)) busy = true;
    }
    if (wp.active) { drawWarp(now); busy = true; }
    if (busy) schedule();
  }

  function writeLayers() {
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var x = -ptr.x * AMP * L.d * S;
      var y = L.lockY ? 0 : (-ptr.y * AMP * L.d * S - scr.c * L.d * SCROLL_K);
      L.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
    }
  }

  function resetLayers() {
    layers.forEach(function (L) { L.el.style.transform = ''; });
  }

  /* -------------------------------------------------------------- foguete */
  function bez(p, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  }
  function bezD(p, t) {
    var u = 1 - t;
    return [
      3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]),
      3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1])
    ];
  }
  function angDiff(a) { while (a > 180) a -= 360; while (a < -180) a += 360; return a; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function scheduleRocket(ms) {
    clearTimeout(rocketTimer);
    rocketTimer = setTimeout(function () {
      if (!alive || paused || document.hidden) return scheduleRocket(5000);
      launchRocket();
    }, ms);
  }

  function launchRocket() {
    if (!alive || !rocketFly || rk.phase !== 'idle') return;
    clearTimeout(rocketTimer);
    rk.phase = 'rumble';
    rk.t0 = performance.now();
    root.classList.add('rocket-flying');
    schedule();
  }

  function setFly(x, y, rot) {
    rocketFly.style.transform = 'translate3d(' + ((x - RK.cx) * S).toFixed(2) + 'px,' + ((y - RK.cy) * S).toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
  }

  // Devolve true enquanto precisar de frames.
  function updateRocket(now) {
    var t = now - rk.t0, x = RK.cx, y = RK.cy, rot = 0, emit = false;
    switch (rk.phase) {
      case 'idle':
        return updateTrail(now);
      case 'rumble':
        if (t >= T_RUMBLE) { rk.phase = 'legA'; rk.t0 += T_RUMBLE; return true; }
        x += Math.sin(now * 0.09) * 0.7;
        y += Math.cos(now * 0.11) * 0.5;
        rot = Math.sin(now * 0.07) * 2.5;
        emit = t > T_RUMBLE * 0.4;
        break;
      case 'legA': {
        if (t >= T_A) { rk.phase = 'gap'; rk.t0 += T_A; setFly(LEG_A[3][0], LEG_A[3][1], 138); return true; }
        var pa = t / T_A, ea = Math.pow(pa, 1.6);
        var p = bez(LEG_A, ea), d = bezD(LEG_A, ea);
        x = p[0]; y = p[1];
        var target = angDiff(Math.atan2(d[1], d[0]) * 180 / Math.PI - RK.rest);
        rot = target * smooth(pa / 0.12);
        emit = true;
        break;
      }
      case 'gap':
        if (t >= T_GAP) { rk.phase = 'legB'; rk.t0 += T_GAP; return true; }
        updateTrail(now);
        return true;
      case 'legB': {
        if (t >= T_B) {
          rk.phase = 'idle';
          rocketFly.style.transform = '';
          root.classList.remove('rocket-flying');
          scheduleRocket(rand(16000, 26000));
          return updateTrail(now);
        }
        var pb = t / T_B, eb = 1 - Math.pow(1 - pb, 3);
        var q = bez(LEG_B, eb), dq = bezD(LEG_B, eb);
        x = q[0]; y = q[1];
        rot = angDiff(Math.atan2(dq[1], dq[0]) * 180 / Math.PI - RK.rest) * (1 - smooth((pb - 0.7) / 0.3));
        emit = pb < 0.85;
        break;
      }
    }
    setFly(x, y, rot);
    if (emit && now - rk.lastSample > TRAIL_EVERY) {
      rk.lastSample = now;
      var h = (RK.rest + rot) * Math.PI / 180;
      rk.samples.unshift({ x: x - Math.cos(h) * 15 + rand(-1, 1), y: y - Math.sin(h) * 15 + rand(-1, 1), t: now });
      if (rk.samples.length > TRAIL_N) rk.samples.length = TRAIL_N;
    }
    updateTrail(now);
    return true;
  }

  function updateTrail(now) {
    var any = false;
    for (var i = 0; i < trailDots.length; i++) {
      var el = trailDots[i], s = rk.samples[i];
      var age = s ? (now - s.t) / TRAIL_LIFE : 1;
      if (age >= 1) {
        if (el.style.opacity !== '0') el.style.opacity = '0';
        continue;
      }
      any = true;
      var sc = (1 - age * 0.65) * S;
      el.style.opacity = ((1 - age) * 0.8).toFixed(3);
      el.style.transform = 'translate3d(' + ((s.x - RK.x) * S).toFixed(2) + 'px,' + ((s.y - RK.y) * S).toFixed(2) + 'px,0) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
    }
    if (!any && rk.samples.length) rk.samples.length = 0;
    return any;
  }

  function stopRocket() {
    clearTimeout(rocketTimer);
    rk.phase = 'idle';
    rk.samples.length = 0;
    if (rocketFly) rocketFly.style.transform = '';
    trailDots.forEach(function (d) { d.style.opacity = '0'; });
    if (root) root.classList.remove('rocket-flying');
  }

  /* ------------------------------------------------------- estrela cadente */
  function scheduleShoot(ms) {
    clearTimeout(shootTimer);
    shootTimer = setTimeout(function () {
      shootingStar();
      scheduleShoot(rand(8000, 17000));
    }, ms);
  }

  function shootingStar() {
    if (!alive || paused || document.hidden || !fx || typeof fx.animate !== 'function') return;
    var el = document.createElement('i');
    el.className = 'shooting-star';
    fx.appendChild(el);
    var x0 = rand(0.12, 0.88) * vw, y0 = rand(0.04, 0.38) * vh;
    var ang = Math.random() < 0.5 ? rand(18, 34) : 180 - rand(18, 34);
    var dist = rand(220, 400) * Math.max(0.7, Math.min(1.4, S));
    var base = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px) rotate(' + ang.toFixed(1) + 'deg) ';
    try {
      var a = el.animate([
        { transform: base + 'translateX(0) scaleX(.3)', opacity: 0 },
        { transform: base + 'translateX(' + (dist * 0.25).toFixed(1) + 'px) scaleX(1)', opacity: 1, offset: 0.25 },
        { transform: base + 'translateX(' + dist.toFixed(1) + 'px) scaleX(.6)', opacity: 0 }
      ], { duration: rand(850, 1250), easing: 'cubic-bezier(.3,.1,.5,1)' });
      a.onfinish = a.oncancel = function () { el.remove(); };
    } catch (e) { el.remove(); }
  }

  /* ------------------------------------------------------------------ warp */
  function sizeWarp() {
    wp.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(vw * wp.dpr), h = Math.round(vh * wp.dpr);
    if (warpCanvas.width !== w || warpCanvas.height !== h) {
      warpCanvas.width = w;
      warpCanvas.height = h;
    }
  }

  function warp(opts) {
    opts = opts || {};
    if (!alive || paused || !warpCtx || anim().reduced) return Promise.resolve();
    sizeWarp();
    var R = Math.hypot(vw, vh) / 2 * wp.dpr;
    var n = Math.round(clamp(vw * vh / 9000, 60, 140));
    wp.streaks = [];
    for (var i = 0; i < n; i++) {
      wp.streaks.push({
        a: Math.random() * Math.PI * 2,
        r: rand(0.03, 0.45) * R,
        v: rand(0.55, 1.35),
        w: rand(0.6, 2.1) * wp.dpr,
        o: rand(0.45, 1),
        c: WARP_COLORS[(Math.random() * WARP_COLORS.length) | 0]
      });
    }
    wp.R = R;
    wp.dur = opts.duration || 560;
    wp.t0 = performance.now();
    if (wp.resolve) wp.resolve();
    wp.active = true;
    root.classList.add('is-warping');
    schedule();
    return new Promise(function (res) {
      wp.resolve = res;
      setTimeout(res, wp.dur + 200);
    });
  }

  function endWarp() {
    wp.active = false;
    if (warpCtx) warpCtx.clearRect(0, 0, warpCanvas.width, warpCanvas.height);
    root.classList.remove('is-warping');
    if (wp.resolve) { var r = wp.resolve; wp.resolve = null; r(); }
  }

  function drawWarp(now) {
    var t = (now - wp.t0) / wp.dur;
    if (t >= 1) return endWarp();
    var ctx = warpCtx, W = warpCanvas.width, H = warpCanvas.height;
    var cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    var env = Math.sin(Math.PI * Math.min(1, t * 1.15));
    // brilho central suave
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, wp.R * 0.6);
    g.addColorStop(0, 'rgba(146, 90, 255,' + (0.16 * env).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(146, 90, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    var acc = t * t;
    for (var i = 0; i < wp.streaks.length; i++) {
      var s = wp.streaks[i];
      var r = s.r + s.v * wp.R * acc * 1.25;
      var len = (12 + 300 * acc) * s.v * wp.dpr;
      var ca = Math.cos(s.a), sa = Math.sin(s.a);
      ctx.globalAlpha = env * s.o;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(cx + ca * r, cy + sa * r);
      ctx.lineTo(cx + ca * (r + len), cy + sa * (r + len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- câmera */
  function applyCamera() {
    if (!camera) return;
    if (!alive) { camera.style.transform = ''; return; }
    var c = CAMERA[route] || CAMERA.home;
    var p = toStage(c.pt[0], c.pt[1]);
    var s = c.s;
    camera.style.transform = 'translate3d(' + (p.x * (1 - s)).toFixed(2) + 'px,' + (p.y * (1 - s)).toFixed(2) + 'px,0) scale(' + s + ')';
  }

  function setRoute(name) {
    route = name || 'home';
    applyCamera();
  }

  /* ------------------------------------------------------------- entradas */
  function onPointer(e) {
    if (!alive || (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    ptr.tx = clamp(e.clientX / vw * 2 - 1, -1, 1);
    ptr.ty = clamp(e.clientY / vh * 2 - 1, -1, 1);
    schedule();
  }
  function onPointerLeave(e) {
    if (e.relatedTarget) return;
    ptr.tx = 0; ptr.ty = 0;
    schedule();
  }
  function onOrientation(e) {
    if (!alive || e.gamma == null || e.beta == null) return;
    ptr.tx = clamp(e.gamma / 25, -1, 1);
    ptr.ty = clamp((e.beta - 45) / 25, -1, 1);
    schedule();
  }
  function onScroll() {
    if (!alive) return;
    scr.t = Math.min(window.pageYOffset || document.documentElement.scrollTop || 0, SCROLL_MAX);
    schedule();
  }
  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      applyCamera();
      if (alive) { writeLayers(); updateTrail(performance.now()); }
    }, 80);
  }
  function onVisibility() {
    if (document.hidden) {
      paused = true;
      pausedAt = performance.now();
      root.classList.add('is-paused');
      cancelAnimationFrame(raf);
      raf = 0;
      if (wp.active) endWarp();
    } else {
      var gap = performance.now() - pausedAt;
      paused = false;
      root.classList.remove('is-paused');
      if (rk.phase !== 'idle') rk.t0 += gap;
      rk.samples.forEach(function (s) { s.t += gap; });
      schedule();
    }
  }

  function setAlive(on) {
    alive = !!on;
    root.classList.toggle('is-alive', alive);
    if (!alive) {
      stopRocket();
      clearTimeout(shootTimer);
      ptr.x = ptr.y = ptr.tx = ptr.ty = 0;
      scr.c = scr.t = 0;
      resetLayers();
      if (wp.active) endWarp();
    } else {
      onScroll();
      scheduleRocket(rand(5000, 8000));
      scheduleShoot(rand(4000, 9000));
    }
    applyCamera();
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    if (inited) return;
    root = document.getElementById('scene');
    if (!root) return;
    inited = true;
    camera = root.querySelector('.scene-camera');
    stage = root.querySelector('.scene-stage');
    fx = root.querySelector('.scene-fx');
    warpCanvas = root.querySelector('.scene-warp');
    rocketFly = root.querySelector('.rocket-fly');
    try { warpCtx = warpCanvas && warpCanvas.getContext('2d'); } catch (e) { warpCtx = null; }

    Object.keys(DEPTH).forEach(function (k) {
      var el = stage.querySelector('[data-layer="' + k + '"]');
      if (el) layers.push({ el: el, d: DEPTH[k].d, lockY: !!DEPTH[k].lockY });
    });

    buildTwinkles();
    buildFarStars();
    buildTrail();
    measure();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerout', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse && 'DeviceOrientationEvent' in window && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    }

    setAlive(!anim().reduced);
    anim().onReducedChange(function (reduced) { setAlive(!reduced); });
    if (document.hidden) onVisibility();
  }

  App.scene = {
    init: init,
    warp: warp,
    setRoute: setRoute,
    launchRocket: launchRocket,
    shootingStar: shootingStar,
    toStage: toStage,
    get alive() { return alive; }
  };
})();
