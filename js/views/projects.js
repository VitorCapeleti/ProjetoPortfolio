/* ==========================================================================
   Views.projects — Projetos (#/projetos)
   - barra de filtro por tag (seleção única) com animação FLIP
   - filtro guardado na query do hash (#/projetos?tag=Python) via
     history.replaceState (o router ignora a query) e na memória da sessão
   - cards com tilt 3D + brilho que segue o ponteiro
   - morph: imagem do card -> topo do projeto (sharedOut) e de volta (sharedIn)
   ========================================================================== */
(function () {
  'use strict';

  window.Views = window.Views || {};
  var App = (window.App = window.App || {});

  // Categorias vêm dos dados (PROJECT_CATEGORIES); a lista fixa é só reserva.
  var CATEGORIES = Array.isArray(window.PROJECT_CATEGORIES) ? window.PROJECT_CATEGORIES : ['Web', 'API', 'Pesquisa', 'Acadêmico', 'Profissional'];
  var selected = ''; // '' = Todos (memória da sessão)

  function tagsList() {
    var all = Array.isArray(window.PROJECT_TAGS) ? window.PROJECT_TAGS : [];
    return all.slice();
  }

  function readQuery() {
    var m = /[?&]tag=([^&]*)/.exec(location.hash || '');
    if (!m) return null;
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return null; }
  }

  function writeQuery(tag) {
    var base = '#/projetos';
    var next = tag ? base + '?tag=' + encodeURIComponent(tag) : base;
    if (location.hash === next) return;
    try { history.replaceState(history.state, '', next); } catch (e) { /* ignora */ }
  }

  function countFor(tag) {
    return window.App.util.projects().filter(function (p) { return !tag || p.tags.indexOf(tag) > -1; }).length;
  }

  function countText(n) { return n + (n === 1 ? ' projeto' : ' projetos'); }

  window.Views.projects = {
    title: function () { return 'Projetos'; },

    render: function () {
      var u = window.App.util;
      var tags = tagsList();
      var q = readQuery();
      if (q !== null) selected = tags.indexOf(q) > -1 ? q : '';
      var total = u.projects().length;

      function chip(tag, label, extra) {
        var on = selected === tag;
        return '<button type="button" class="chip ' + extra + '" data-tag="' + u.esc(tag) + '" aria-pressed="' + on + '">' +
          '<span class="chip-label">' + u.esc(label) + '</span><span class="chip-n" aria-hidden="true">' + countFor(tag) + '</span></button>';
      }
      var chips = chip('', 'Todos', 'chip--all') +
        tags.map(function (t) { return chip(t, t, CATEGORIES.indexOf(t) > -1 ? 'chip--cat' : 'chip--tech'); }).join('');

      var cards = u.projects().map(function (p) {
        var hidden = selected && p.tags.indexOf(selected) < 0;
        var link = '#/projetos/' + encodeURIComponent(p.slug);
        var pills = p.tags.slice(0, 4).map(function (t, i) {
          return '<span class="pill' + (i === 0 ? ' pill--cat' : '') + '">' + u.esc(t) + '</span>';
        }).join('');
        return '' +
          '<li class="pcard" data-slug="' + u.esc(p.slug) + '"' + (hidden ? ' hidden' : '') + '>' +
            '<a class="pcard-link" href="' + link + '">' +
              '<span class="pcard-media">' + u.img(p.cover, { 'class': 'pcard-img', loading: 'lazy', width: 480, height: 320 }) + '</span>' +
              '<span class="pcard-body">' +
                '<span class="pcard-pills" aria-hidden="true">' + pills + '</span>' +
                '<h2 class="pcard-title">' + u.esc(p.title) + '</h2>' +
                '<span class="pcard-summary">' + u.esc(p.summary) + '</span>' +
                '<span class="pcard-more">Ver projeto <span class="pcard-arrow" aria-hidden="true">→</span></span>' +
              '</span>' +
            '</a>' +
          '</li>';
      }).join('');

      return '' +
        '<section class="main-container projects-page" aria-labelledby="projects-title">' +
          '<h1 id="projects-title" class="visually-hidden">Projetos</h1>' +
          '<div class="filter-bar">' +
            '<div class="filter-chips" role="group" aria-label="Filtrar projetos por tag">' + chips + '</div>' +
            '<p class="filter-count" role="status" aria-live="polite">' + countText(selected ? countFor(selected) : total) + '</p>' +
          '</div>' +
          '<ul class="projects-grid" role="list">' + cards + '</ul>' +
        '</section>';
    },

    mount: function (root, ctx) {
      var anim = ctx.anim;
      var s = anim.scope();
      var grid = root.querySelector('.projects-grid');
      var cards = Array.prototype.slice.call(root.querySelectorAll('.pcard'));
      var chipsEl = root.querySelector('.filter-chips');
      var countEl = root.querySelector('.filter-count');
      var busy = false, queued = null;

      /* --- entrada (o card que recebeu o morph não pisca) */
      var skip = ctx.morphed && ctx.morphed.closest ? ctx.morphed.closest('.pcard') : null;
      var enter = cards.filter(function (c) { return !c.hidden && c !== skip; });
      s.stagger([root.querySelector('.filter-bar')].concat(enter), { y: 24, stagger: 0.06, duration: 0.55, delay: 0.05 });

      /* --- tilt + brilho */
      cards.forEach(function (c) { s.tilt(c.querySelector('.pcard-link'), { max: 6, scale: 1.015 }); });

      /* --- filtro */
      function setPressed(tag) {
        Array.prototype.forEach.call(chipsEl.querySelectorAll('.chip'), function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-tag') === tag));
        });
      }

      function applyFilter(tag) {
        if (busy) { queued = tag; return; }
        if (tag === selected) return;
        selected = tag;
        setPressed(tag);
        writeQuery(tag);
        var show = cards.filter(function (c) { return !tag || window.App.util.project(c.getAttribute('data-slug')).tags.indexOf(tag) > -1; });
        var hide = cards.filter(function (c) { return show.indexOf(c) < 0; });
        countEl.textContent = countText(show.length);
        busy = true;

        var leaving = hide.filter(function (c) { return !c.hidden; });
        var fade = leaving.length && !anim.reduced
          ? anim.to(leaving, { opacity: 0, scale: 0.92, duration: 0.18, ease: 'power2.in' })
          : Promise.resolve();
        fade.then(function () {
          if (s.dead) return;
          return anim.flip(cards, function () {
            hide.forEach(function (c) { c.hidden = true; });
            show.forEach(function (c) {
              if (c.hidden) { c.hidden = false; anim.kill(c); c.style.opacity = ''; c.style.transform = ''; }
            });
          }, { duration: 0.5, stagger: 0.025 });
        }).then(function () {
          if (s.dead) return;
          // limpa resíduos de transform/opacity dos que ficaram visíveis
          show.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; });
        }).catch(function (e) { console.error(e); }).then(function () {
          busy = false;
          if (s.dead) return;
          if (queued !== null) { var t = queued; queued = null; applyFilter(t); }
        });
      }

      s.on(chipsEl, 'click', function (e) {
        var b = e.target.closest('.chip');
        if (!b) return;
        var tag = b.getAttribute('data-tag');
        // clicar no chip ativo volta para "Todos"
        applyFilter(tag && selected === tag ? '' : tag);
      });

      // sincroniza a URL com o filtro restaurado da memória/URL
      writeQuery(selected);

      return s.kill;
    },

    sharedOut: function (root, next) {
      if (!next || next.name !== 'project') return null;
      var slug = String(next.params.slug || '').replace(/["\\]/g, '');
      var card = root.querySelector('.pcard[data-slug="' + slug + '"]');
      return card && !card.hidden ? card.querySelector('img') : null;
    },

    sharedIn: function (root) {
      var slug = String(App.lastProject || '').replace(/["\\]/g, '');
      if (!slug) return null;
      var card = root.querySelector('.pcard[data-slug="' + slug + '"]');
      if (!card || card.hidden) return null;
      var r = card.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 10) {
        var y = window.pageYOffset + r.top - Math.max(90, (window.innerHeight - r.height) / 2);
        var html = document.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, Math.max(0, y));
        html.style.scrollBehavior = prev;
      }
      return card.querySelector('img');
    }
  };
})();
