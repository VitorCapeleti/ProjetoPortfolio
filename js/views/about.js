/* ==========================================================================
   Views.about — Sobre mim (#/sobre)
   Foto redonda dentro de um sistema orbital feito com os recortes da arte
   do Vitor (lua, saturno, foguete). As órbitas são animadas em CSS
   (views.css); no reduced-motion ficam estáticas.
   ========================================================================== */
(function () {
  'use strict';

  window.Views = window.Views || {};

  var SOCIAL = [
    { name: 'GitHub', href: 'https://github.com/VitorCapeleti', icon: 'github' },
    { name: 'Instagram', href: 'https://www.instagram.com/vitorcapeleti/', icon: 'instagram' },
    { name: 'LinkedIn', href: 'https://www.linkedin.com/in/vitor-capeleti', icon: 'linkedin' }
  ];

  var TEXT = 'Olá, meu nome é Vitor Capeleti Gomes, eu sou desenvolvedor Full-Stack e Engenheiro de IA. Sou formado em técnico de Desenvolvimento de Sistemas, e graduado em Análise e Desenvolvimento de Sistemas, pela Fatec Taubaté. Atualmente atuo como Engenheiro de IA e Engenheiro de Software na Fenox Tecnologia. Tenho experiência em projetos profissionais e escaláveis, todos voltados para o mercado de trabalho, com empresas e corporações (Fenox Tecnologia, Cortapp, INPE), e estou pronto para atender seu problema e ajudar você e sua empresa a resolver todo o tipo de empecilho. Contate-me pelas redes sociais.';

  function body(u, cls, name, extra) {
    return '<span class="orbit-body ' + cls + '"><span class="orbit-spin">' +
      u.img({ src: 'img/layers/' + name + '.webp', fallback: 'img/layers/' + name + '.png', alt: '' }, { 'class': extra || '', 'aria-hidden': 'true' }) +
    '</span></span>';
  }

  window.Views.about = {
    title: function () { return 'Sobre Mim'; },

    render: function () {
      var u = window.App.util;
      var social = SOCIAL.map(function (s) {
        return '<span class="social-float"><a class="social-btn" href="' + s.href + '" target="_blank" rel="noopener" aria-label="' + s.name + '">' +
          u.img({ src: 'img/opt/' + s.icon + '.webp', fallback: 'img/' + s.icon + '.png', alt: '' }) +
        '</a></span>';
      }).join('');

      var words = TEXT.split(' ').map(function (w) { return '<span class="w">' + u.esc(w) + '</span>'; }).join(' ');

      var groups = Array.isArray(window.STACK) ? window.STACK : [];
      var stack = groups.length
        ? '<div class="about-stack"><h2 class="about-stack-title">Stack</h2><div class="stack-groups stack-groups--compact">' +
            groups.map(function (g) {
              return '<div class="stack-group"><h3 class="stack-group-title">' + u.esc(g.group) + '</h3><ul class="pill-row">' +
                (g.items || []).map(function (t) { return '<li class="pill">' + u.esc(t) + '</li>'; }).join('') + '</ul></div>';
            }).join('') +
          '</div></div>'
        : '';
      var cta = '<p class="about-cta"><a class="about-cta-link" href="' + window.App.router.href('experience') + '">Ver minha trajetória <span class="about-cta-arrow" aria-hidden="true">→</span></a></p>';

      return '' +
        '<section class="main-container about-page" aria-labelledby="about-title">' +
          '<div class="about-text">' +
            '<h1 id="about-title" class="visually-hidden">Sobre mim</h1>' +
            '<p class="about-p">' + words + '</p>' +
            cta +
            stack +
          '</div>' +
          '<div class="about-profile">' +
            '<div class="orbit-stage">' +
              '<span class="orbit orbit--outer" aria-hidden="true">' +
                '<span class="orbit-ring"></span>' +
                body(u, 'orbit-body--saturn', 'saturn') +
              '</span>' +
              '<span class="orbit orbit--inner" aria-hidden="true">' +
                '<span class="orbit-ring"></span>' +
                body(u, 'orbit-body--rocket', 'rocket') +
              '</span>' +
              '<span class="orbit orbit--moon" aria-hidden="true">' +
                body(u, 'orbit-body--moon', 'moon') +
              '</span>' +
              u.img({ src: 'img/opt/perfilM.webp', fallback: 'img/perfilM.png', alt: 'Foto de Vitor Capeleti' }, { 'class': 'profile-img', width: 400, height: 400 }) +
            '</div>' +
            '<div class="social-links">' + social + '</div>' +
          '</div>' +
        '</section>';
    },

    mount: function (root, ctx) {
      var anim = ctx.anim;
      var s = anim.scope();
      var q = function (sel) { return root.querySelector(sel); };

      /* --- texto: palavra por palavra, rápido */
      var words = root.querySelectorAll('.about-p .w');
      s.stagger(words, { y: 10, duration: 0.45, stagger: 0.012, delay: 0.1 });
      s.stagger(root.querySelectorAll('.about-cta, .about-stack'), { y: 14, duration: 0.6, delay: 0.9, stagger: 0.12 });

      /* --- palco orbital */
      var stage = q('.orbit-stage');
      s.fromTo(stage, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 0.9, delay: 0.15, ease: 'power3.out' });

      /* --- redes: entram escalonadas (wrapper) e flutuam (span interno, fases diferentes) */
      var floats = root.querySelectorAll('.social-float');
      s.stagger(q('.social-links'), { y: 18, delay: 0.5 });
      Array.prototype.forEach.call(floats, function (el, i) {
        s.loop(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }], { duration: 2200 + i * 380, delay: i * 420, easing: 'ease-in-out' });
      });

      return s.kill;
    }
  };
})();
