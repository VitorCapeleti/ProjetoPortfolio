/* ==========================================================================
   Views.experience — Experiência (#/experiencia)
   --------------------------------------------------------------------------
   Uma "trajetória" espacial: linha tracejada (órbita) com um nó por emprego,
   cada nó um recorte da arte do Vitor dentro de uma escotilha. O foguete
   desce pela linha conforme o scroll (ScrollTrigger quando existe; senão
   scroll + rAF; parado no reduced-motion). Abaixo: Formação, Certificados e
   Stack. Dados em js/data/experience.js.
   ========================================================================== */
(function () {
  'use strict';

  window.Views = window.Views || {};
  var App = (window.App = window.App || {});

  var MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

  // Recorte de cada nó (galáxia/planeta são cortados pela borda da arte: aparecem preenchendo a escotilha).
  var ART = {
    fenox: { name: 'galaxy', cls: 'ph--cover', pos: '84% 64%' },
    cortapp: { name: 'saturn', cls: 'ph--contain' },
    bankup: { name: 'moon', cls: 'ph--contain' },
    inpe: { name: 'planet', cls: 'ph--cover', pos: '50% 0%' }
  };
  var ART_ORDER = ['galaxy', 'saturn', 'moon', 'planet'];

  function list(v) { return Array.isArray(v) ? v : []; }

  function ym(s) {
    var m = /^(\d{4})-(\d{2})$/.exec(s || '');
    return m ? { y: +m[1], m: +m[2] } : null;
  }

  function fmt(s) {
    var d = ym(s);
    return d ? MONTHS[d.m - 1] + ' de ' + d.y : '';
  }

  function timeEl(esc, s) { return '<time datetime="' + esc(s) + '">' + esc(fmt(s)) + '</time>'; }

  // Meses contando o mês inicial e o final (como o LinkedIn): out/2026 → hoje (nov/2026) = 2 meses.
  function monthsBetween(start, end) {
    var a = ym(start);
    if (!a) return 0;
    var b = end ? ym(end) : null;
    if (!b) { var now = new Date(); b = { y: now.getFullYear(), m: now.getMonth() + 1 }; }
    return Math.max(1, (b.y - a.y) * 12 + (b.m - a.m) + 1);
  }

  function duration(n) {
    var y = Math.floor(n / 12), m = n % 12, out = [];
    if (y) out.push(y + (y > 1 ? ' anos' : ' ano'));
    if (m) out.push(m + (m > 1 ? ' meses' : ' mês'));
    return out.join(' ');
  }

  function period(esc, start, end) {
    return timeEl(esc, start) + ' – ' + (end ? timeEl(esc, end) : '<span>o momento</span>');
  }

  function portholeOf(job, i) {
    return ART[job.id] || { name: ART_ORDER[i % ART_ORDER.length], cls: 'ph--contain' };
  }

  function jobHtml(u, job, i) {
    var esc = u.esc;
    var art = portholeOf(job, i);
    var current = !job.end;
    var proj = job.project ? u.project(job.project) : null;
    var meta = [job.type, job.mode, job.location].filter(Boolean).join(' · ');
    var idTitle = 'job-' + esc(job.id);

    var porthole = '<span class="job-porthole ' + art.cls + '"' + (art.pos ? ' style="--pos:' + art.pos + '"' : '') + '>' +
      u.img({ src: 'img/layers/' + art.name + '.webp', fallback: 'img/layers/' + art.name + '.png', alt: '' }, { 'aria-hidden': 'true', loading: 'lazy' }) +
    '</span>';

    var metric = job.metric
      ? '<p class="job-metric"><span class="job-metric-value">' + esc(job.metric.value) + '</span><span class="job-metric-label">' + esc(job.metric.label) + '</span></p>'
      : '';

    var hl = list(job.highlights).length
      ? '<ul class="job-hl">' + job.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>'
      : '';

    var stack = list(job.stack).length
      ? '<ul class="pill-row job-stack" aria-label="Tecnologias">' + job.stack.map(function (t) { return '<li class="pill">' + esc(t) + '</li>'; }).join('') + '</ul>'
      : '';

    var ind = list(job.indicators).length
      ? '<details class="job-ind"><summary>Indicadores e resultados esperados</summary><ul class="job-ind-list">' +
          job.indicators.map(function (x) { return '<li><strong>' + esc(x.label) + '</strong> ' + esc(x.text) + '</li>'; }).join('') +
        '</ul></details>'
      : '';

    var link = proj
      ? '<a class="job-link" href="' + App.router.href('project', { slug: proj.slug }) + '" aria-label="Ver projeto: ' + esc(proj.title) + '">Ver projeto <span class="job-arrow" aria-hidden="true">→</span></a>'
      : '';

    return '' +
      '<li class="job' + (current ? ' is-current' : '') + '" data-id="' + esc(job.id) + '">' +
        '<span class="job-node" aria-hidden="true">' +
          (current ? '<span class="job-beacon"></span><span class="job-beacon job-beacon--2"></span>' : '') +
          porthole +
        '</span>' +
        '<article class="job-card" aria-labelledby="' + idTitle + '">' +
          '<p class="job-period">' + period(esc, job.start, job.end) + ' <span class="job-dur">· ' + esc(duration(monthsBetween(job.start, job.end))) + '</span>' +
            (current ? ' <span class="job-now"><span class="job-now-dot" aria-hidden="true"></span>Atual</span>' : '') + '</p>' +
          '<h3 class="job-role" id="' + idTitle + '">' + esc(job.role) + '</h3>' +
          '<p class="job-company">' + esc(job.company) + '</p>' +
          '<p class="job-meta">' + esc(meta) + '</p>' +
          metric + hl + stack + ind + link +
        '</article>' +
      '</li>';
  }

  window.Views.experience = {
    title: function () { return 'Experiência'; },

    render: function () {
      var u = App.util;
      var esc = u.esc;
      var jobs = list(window.EXPERIENCE);

      var edu = list(window.EDUCATION).map(function (e) {
        return '<li class="edu"><h3 class="edu-course">' + esc(e.course) + '</h3><p class="edu-school">' + esc(e.school) + '</p>' +
          '<p class="edu-period">' + period(esc, e.start, e.end) + '</p></li>';
      }).join('');

      var certs = list(window.CERTIFICATIONS).map(function (c) {
        return '<li class="cert"><span class="cert-seal" aria-hidden="true"></span><div class="cert-body">' +
          '<h3 class="cert-name">' + esc(c.name) + '</h3>' +
          '<p class="cert-issuer">' + esc(c.issuer) + ' · ' + timeEl(esc, c.date) + '</p>' +
          (c.note ? '<p class="cert-note">' + esc(c.note) + '</p>' : '') +
        '</div></li>';
      }).join('');

      var stack = list(window.STACK).map(function (g) {
        return '<div class="stack-group"><h3 class="stack-group-title">' + esc(g.group) + '</h3>' +
          '<ul class="pill-row">' + list(g.items).map(function (t) { return '<li class="pill">' + esc(t) + '</li>'; }).join('') + '</ul></div>';
      }).join('');

      return '' +
        '<section class="main-container exp-page" aria-labelledby="exp-title">' +
          '<div class="exp-intro">' +
            '<h1 id="exp-title" class="visually-hidden">Experiência</h1>' +
            '<p class="exp-lead">Da pesquisa espacial no INPE à engenharia de IA: a rota que percorri até aqui, do mais recente ao mais antigo.</p>' +
          '</div>' +
          '<div class="exp-block">' +
            '<h2 class="exp-section-title">Trajetória profissional</h2>' +
            '<div class="traj">' +
              '<span class="traj-line" aria-hidden="true"></span>' +
              '<span class="traj-fill" aria-hidden="true"></span>' +
              '<span class="traj-rocket" aria-hidden="true"><span class="traj-rocket-in">' +
                '<span class="traj-flame"></span>' +
                u.img({ src: 'img/layers/rocket.webp', fallback: 'img/layers/rocket.png', alt: '' }, { 'aria-hidden': 'true', width: 38, height: 34 }) +
              '</span></span>' +
              '<ol class="traj-list">' + jobs.map(function (j, i) { return jobHtml(u, j, i); }).join('') + '</ol>' +
            '</div>' +
          '</div>' +
          (edu ? '<div class="exp-block"><h2 class="exp-section-title">Formação</h2><ul class="edu-grid" role="list">' + edu + '</ul></div>' : '') +
          (certs ? '<div class="exp-block"><h2 class="exp-section-title">Certificados</h2><ul class="cert-grid" role="list">' + certs + '</ul></div>' : '') +
          (stack ? '<div class="exp-block"><h2 class="exp-section-title">Stack</h2><div class="stack-groups">' + stack + '</div></div>' : '') +
        '</section>';
    },

    mount: function (root, ctx) {
      var anim = ctx.anim;
      var s = anim.scope();
      var reduced = anim.reduced;
      var q = function (sel) { return root.querySelector(sel); };
      var qa = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };

      var traj = q('.traj'), rocket = q('.traj-rocket'), fill = q('.traj-fill');
      var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

      /* --- entrada da introdução */
      s.stagger(q('.exp-lead'), { y: 14, duration: 0.6, delay: 0.1 });

      /* --- foguete desce pela trajetória */
      function setProgress(p) {
        if (!traj || !rocket || !fill) return;
        p = clamp01(p);
        var h = traj.offsetHeight || 1;
        var y = p * Math.max(0, h - 56);
        rocket.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
        fill.style.transform = 'scaleY(' + clamp01((y + 22) / h).toFixed(4) + ')';
        traj.setAttribute('data-progress', p.toFixed(3));
      }

      var st = null;
      if (traj && !reduced) {
        if (window.ScrollTrigger && window.gsap) {
          try {
            st = window.ScrollTrigger.create({
              trigger: traj, start: 'top 35%', end: 'bottom 65%',
              onUpdate: function (self) { setProgress(self.progress); },
              onRefresh: function (self) { setProgress(self.progress); }
            });
          } catch (e) { st = null; }
        }
        if (st) {
          s.add(function () { st.kill(); });
          var refresh = function () { if (!s.dead) st.refresh(); };
          s.on(root, 'toggle', refresh, true);           // <details> muda a altura
          s.on(window, 'load', refresh);
          s.timeout(refresh, 900);                        // depois da animação de entrada da view
          if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        } else {
          var raf = 0;
          var update = function () {
            raf = 0;
            var r = traj.getBoundingClientRect();
            var vh = window.innerHeight;
            setProgress((vh * 0.35 - r.top) / Math.max(1, r.height - vh * 0.3));
          };
          var req = function () { if (!raf) raf = requestAnimationFrame(update); };
          s.on(window, 'scroll', req, { passive: true });
          s.on(window, 'resize', req, { passive: true });
          s.on(root, 'toggle', req, true);
          s.add(function () { cancelAnimationFrame(raf); });
          update();
        }
      }

      /* --- cards entram alternando os lados (uma coluna no mobile) */
      var cardsIn = !reduced && typeof IntersectionObserver !== 'undefined';
      if (cardsIn) {
        var wide = window.matchMedia && window.matchMedia('(min-width: 761px)').matches;
        var jobs = qa('.job');
        jobs.forEach(function (li) {
          anim.set(li.querySelector('.job-card'), { opacity: 0 });
          anim.set(li.querySelector('.job-node'), { opacity: 0 });
        });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            var i = jobs.indexOf(en.target);
            var dir = i % 2 === 0 ? -1 : 1;
            var card = en.target.querySelector('.job-card');
            var node = en.target.querySelector('.job-node');
            anim.pop(node, { delay: 0.05, duration: 0.55 });
            anim.fromTo(card, { opacity: 0, x: wide ? dir * 44 : 0, y: wide ? 0 : 24 }, { opacity: 1, x: 0, y: 0, duration: 0.75, delay: 0.1, ease: 'power3.out' });
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
        jobs.forEach(function (li) { io.observe(li); });
        s.add(function () { io.disconnect(); });
      }

      /* --- blocos de baixo */
      s.reveal(qa('.exp-section-title').slice(1).concat(qa('.edu, .cert, .stack-group')), { y: 20, stagger: 0.07 });

      return s.kill;
    }
  };
})();
