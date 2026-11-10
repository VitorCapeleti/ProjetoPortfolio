/* ==========================================================================
   Views.project — detalhe de um projeto (#/projetos/<slug>)
   - hero com a capa (alvo do morph), tags e botões
   - 3 seções reveladas no scroll; imagens abrem o lightbox
   - navegação anterior / próximo (circular)
   ========================================================================== */
(function () {
  'use strict';

  window.Views = window.Views || {};
  var App = (window.App = window.App || {});

  function find(params) { return window.App.util.project(params && params.slug); }

  function sameFile(a, b) { return a && b && a.src === b.src; }

  // Imagens do lightbox: capa (se for um arquivo distinto) + as das seções.
  function galleryOf(p) {
    var imgs = p.sections.map(function (s) { return s.image; });
    var coverDistinct = !imgs.some(function (i) { return sameFile(i, p.cover); });
    var list = coverDistinct ? [p.cover].concat(imgs) : imgs;
    return { list: list, offset: coverDistinct ? 1 : 0 };
  }

  window.Views.project = {
    title: function (params) {
      var p = find(params);
      return p ? p.title : 'Projeto não encontrado';
    },
    docTitle: function (params) {
      var p = find(params);
      return p ? p.pageTitle + ' — Projetos | Vitor Capeleti' : 'Projeto não encontrado — Vitor Capeleti';
    },

    render: function (params) {
      var u = window.App.util;
      var p = find(params);
      if (!p) {
        return '' +
          '<section class="main-container not-found" aria-labelledby="nf-title">' +
            '<h1 id="nf-title">Projeto não encontrado</h1>' +
            '<p>Esse projeto se perdeu no espaço. Que tal ver os outros?</p>' +
            '<a class="btn btn-primary" href="#/projetos"><span class="btn-label">Ver projetos</span><span class="btn-arrow" aria-hidden="true">→</span></a>' +
          '</section>';
      }
      App.lastProject = p.slug;

      var all = u.projects();
      var idx = all.indexOf(p);
      var prev = all[(idx - 1 + all.length) % all.length];
      var next = all[(idx + 1) % all.length];

      var pills = p.tags.map(function (t, i) {
        return '<li class="pill' + (i === 0 ? ' pill--cat' : '') + '">' + u.esc(t) + '</li>';
      }).join('');

      var g = galleryOf(p);
      var sections = p.sections.map(function (sec, i) {
        return '' +
          '<section class="psec' + (i % 2 ? ' psec--flip' : '') + '" aria-labelledby="psec-' + i + '">' +
            '<button type="button" class="psec-media" data-gi="' + (i + g.offset) + '" aria-label="Ampliar imagem: ' + u.esc(sec.image.alt || sec.heading) + '">' +
              u.img(sec.image, { loading: 'lazy' }) +
              '<span class="psec-zoom" aria-hidden="true">⤢</span>' +
            '</button>' +
            '<div class="psec-copy">' +
              '<h2 id="psec-' + i + '">' + u.esc(sec.heading) + '</h2>' +
              '<p>' + u.esc(sec.text) + '</p>' +
            '</div>' +
          '</section>';
      }).join('');

      function navCard(q, dir) {
        return '' +
          '<a class="pnav pnav--' + dir + '" href="#/projetos/' + encodeURIComponent(q.slug) + '" rel="' + dir + '">' +
            u.img(q.cover, { 'class': 'pnav-img', loading: 'lazy', width: 120, height: 80 }) +
            '<span class="pnav-text"><span class="pnav-dir">' + (dir === 'prev' ? '← Anterior' : 'Próximo →') + '</span>' +
            '<span class="pnav-title">' + u.esc(q.title) + '</span></span>' +
          '</a>';
      }
      var nav = all.length > 1
        ? '<nav class="pnav-wrap" aria-label="Outros projetos">' + navCard(prev, 'prev') + navCard(next, 'next') + '</nav>'
        : '';

      var repo = p.repo
        ? '<a class="btn btn-primary" href="' + u.esc(p.repo) + '" target="_blank" rel="noopener"><span class="btn-label">Repositório no GitHub</span><span class="btn-arrow" aria-hidden="true">↗</span></a>'
        : '';

      return '' +
        '<div class="main-container detail-page">' +
          '<article class="project-detail-wrapper" aria-labelledby="project-title">' +
            '<header class="project-hero">' +
              u.img(p.cover, { 'class': 'project-hero-img', loading: 'eager', fetchpriority: 'high' }) +
              '<h1 id="project-title">' + u.esc(p.pageTitle) + '</h1>' +
              '<ul class="pill-row pill-row--center" aria-label="Tags">' + pills + '</ul>' +
              '<div class="project-actions">' + repo +
                '<a class="btn btn-ghost" href="#/projetos"><span aria-hidden="true">←</span><span class="btn-label">Voltar aos projetos</span></a>' +
              '</div>' +
            '</header>' +
            sections +
            nav +
          '</article>' +
        '</div>';
    },

    mount: function (root, ctx) {
      var anim = ctx.anim;
      var s = anim.scope();
      var p = find(ctx.params);
      if (!p) {
        s.stagger(root.querySelectorAll('.not-found > *'), { y: 22, stagger: 0.08, delay: 0.05 });
        return s.kill;
      }

      /* --- hero */
      var hero = Array.prototype.slice.call(root.querySelectorAll('.project-hero h1, .pill-row, .project-actions'));
      if (!ctx.morphed) hero.unshift(root.querySelector('.project-hero-img'));
      s.stagger(hero, { y: 22, stagger: 0.08, delay: ctx.morphed ? 0.2 : 0.05 });

      /* --- seções reveladas no scroll, direção alternada */
      var secs = Array.prototype.slice.call(root.querySelectorAll('.psec'));
      secs.forEach(function (sec, i) {
        var media = sec.querySelector('.psec-media');
        var copy = sec.querySelectorAll('.psec-copy h2, .psec-copy p');
        s.reveal(copy, { y: 26, stagger: 0.12 });
        if (anim.reduced || typeof IntersectionObserver === 'undefined') return;
        var dir = i % 2 ? 1 : -1;
        anim.set(media, { opacity: 0 });
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          anim.fromTo(media, { opacity: 0, x: dir * 36, scale: 0.97 }, { opacity: 1, x: 0, scale: 1, duration: 0.8, ease: 'power3.out' });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
        io.observe(media);
        s.add(function () { io.disconnect(); });
      });
      s.reveal(root.querySelectorAll('.pnav'), { y: 24, stagger: 0.12 });

      /* --- lightbox */
      var g = galleryOf(p);
      s.on(root, 'click', function (e) {
        var b = e.target.closest('.psec-media');
        if (!b || !window.App.lightbox) return;
        window.App.lightbox.open(g.list, Number(b.getAttribute('data-gi')) || 0, b);
      });

      return s.kill;
    },

    sharedIn: function (root) {
      return root.querySelector('.project-hero-img');
    },

    sharedOut: function (root, next) {
      if (!next || next.name !== 'projects') return null;
      return root.querySelector('.project-hero-img');
    }
  };
})();
