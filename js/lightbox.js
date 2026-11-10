/* ==========================================================================
   App.lightbox — visualizador de imagens acessível
   --------------------------------------------------------------------------
     App.lightbox.open(images, index, opener?)
         images = [{ src, fallback, alt }], index = imagem inicial,
         opener = elemento que abriu (foco volta nele; o retângulo da miniatura
         é a origem da animação de zoom). Padrão: document.activeElement.
     App.lightbox.bind(root) → cleanup
         Liga todo [data-lightbox="grupo"] dentro de root. O grupo são os
         botões com o mesmo valor, em ordem do DOM. Cada botão traz
         data-src, data-fallback e data-alt.
     App.lightbox.close()

   Esc fecha, ←/→ navegam, Tab fica preso no diálogo, a rolagem da página é
   travada, swipe horizontal no toque, contador "2 / 3".
   ========================================================================== */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var state = null; // { el, images, index, opener, ... } enquanto aberto
  var uid = 0;

  function reduced() { return !!(App.anim && App.anim.reduced); }
  function canAnimate() { return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'; }

  function build() {
    var id = 'lb' + (++uid);
    var el = document.createElement('div');
    el.className = 'lb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', id + '-cap');
    el.innerHTML =
      '<div class="lb-backdrop" data-lb-close></div>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Fechar imagem"><span aria-hidden="true">×</span></button>' +
      '<p class="lb-count" aria-live="polite"></p>' +
      '<button type="button" class="lb-btn lb-nav lb-prev" aria-label="Imagem anterior"><span aria-hidden="true">‹</span></button>' +
      '<button type="button" class="lb-btn lb-nav lb-next" aria-label="Próxima imagem"><span aria-hidden="true">›</span></button>' +
      '<figure class="lb-fig">' +
        '<img class="lb-img" alt="" decoding="async" draggable="false">' +
        '<figcaption class="lb-cap" id="' + id + '-cap"></figcaption>' +
      '</figure>';
    return el;
  }

  function focusables(el) {
    return Array.prototype.filter.call(el.querySelectorAll('button:not([hidden])'), function (b) {
      return !b.disabled && b.offsetParent !== null;
    });
  }

  function lockScroll() {
    var b = document.body, h = document.documentElement;
    var gap = window.innerWidth - h.clientWidth;
    var prev = { o: b.style.overflow, p: b.style.paddingRight };
    b.style.overflow = 'hidden';
    if (gap > 0) b.style.paddingRight = gap + 'px';
    h.classList.add('lb-open');
    return function () { b.style.overflow = prev.o; b.style.paddingRight = prev.p; h.classList.remove('lb-open'); };
  }

  function show(i, dir, firstRect) {
    var s = state;
    var n = s.images.length;
    s.index = (i + n) % n;
    var data = s.images[s.index];
    var img = s.img;
    var token = ++s.token;

    s.count.textContent = n > 1 ? (s.index + 1) + ' / ' + n : '';
    s.cap.textContent = data.alt || '';
    s.cap.hidden = !data.alt;
    s.prev.hidden = s.next.hidden = n < 2;

    img.onerror = function () {
      if (data.fallback && img.getAttribute('src') !== data.fallback) img.src = data.fallback;
    };
    img.onload = function () {
      if (token !== s.token) return;
      img.classList.add('is-ready');
      if (firstRect) animateFrom(img, firstRect);
      else if (dir && canAnimate() && !reduced()) {
        img.animate([{ opacity: 0, transform: 'translateX(' + (dir * 40) + 'px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' });
      } else if (dir && canAnimate()) {
        img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      }
    };
    img.classList.remove('is-ready');
    img.alt = data.alt || '';
    img.src = data.src;
    // imagens em cache: onload pode já ter passado
    if (img.complete && img.naturalWidth) img.onload();
  }

  // Zoom a partir do retângulo da miniatura (fade se reduced-motion).
  function animateFrom(img, from) {
    if (!canAnimate()) return;
    if (reduced() || !from || !from.width) {
      img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      return;
    }
    var r = img.getBoundingClientRect();
    if (!r.width) return;
    var dx = (from.left + from.width / 2) - (r.left + r.width / 2);
    var dy = (from.top + from.height / 2) - (r.top + r.height / 2);
    var sc = Math.max(0.1, Math.min(1, from.width / r.width));
    img.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: 0.4 },
      { transform: 'none', opacity: 1 }
    ], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  function open(images, index, opener) {
    if (state || !images || !images.length) return;
    opener = opener || document.activeElement;
    var el = build();
    document.body.appendChild(el);

    var s = state = {
      el: el, images: images, index: 0, opener: opener, token: 0, closing: false,
      img: el.querySelector('.lb-img'), cap: el.querySelector('.lb-cap'), count: el.querySelector('.lb-count'),
      prev: el.querySelector('.lb-prev'), next: el.querySelector('.lb-next'), closeBtn: el.querySelector('.lb-close'),
      unlock: lockScroll(), off: []
    };

    function on(t, type, fn, o) { t.addEventListener(type, fn, o); s.off.push(function () { t.removeEventListener(type, fn, o); }); }

    on(s.closeBtn, 'click', close);
    on(el.querySelector('[data-lb-close]'), 'click', close);
    on(el.querySelector('.lb-fig'), 'click', function (e) { if (e.target === e.currentTarget) close(); });
    on(s.prev, 'click', function () { show(s.index - 1, -1); });
    on(s.next, 'click', function () { show(s.index + 1, 1); });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft' && images.length > 1) { e.preventDefault(); show(s.index - 1, -1); }
      else if (e.key === 'ArrowRight' && images.length > 1) { e.preventDefault(); show(s.index + 1, 1); }
      else if (e.key === 'Tab') {
        var f = focusables(el);
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (!el.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
    on(document, 'focusin', function (e) { if (!el.contains(e.target)) s.closeBtn.focus(); });
    on(window, 'hashchange', function () { close(true); });

    // swipe (toque)
    var sx = 0, sy = 0, tracking = false;
    on(el, 'pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    on(el, 'pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && images.length > 1) show(s.index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    on(el, 'pointercancel', function () { tracking = false; });

    // abertura
    var thumb = opener && opener.querySelector ? (opener.querySelector('img') || opener) : null;
    var from = thumb && thumb.getBoundingClientRect ? thumb.getBoundingClientRect() : null;
    if (canAnimate()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced() ? 120 : 220, easing: 'ease-out' });
    el.classList.add('is-open');
    show(Math.max(0, Math.min(images.length - 1, index || 0)), 0, from);
    s.closeBtn.focus();
  }

  function close(immediate) {
    var s = state;
    if (!s || s.closing) return;
    s.closing = true;
    function done() {
      s.off.forEach(function (f) { f(); });
      s.unlock();
      if (s.el.parentNode) s.el.parentNode.removeChild(s.el);
      state = null;
      var o = s.opener;
      if (o && o.isConnected && o.focus) { try { o.focus({ preventScroll: true }); } catch (e) { o.focus(); } }
    }
    if (immediate === true || !canAnimate()) return done();
    var a = s.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = a.oncancel = done;
    setTimeout(function () { if (state === s) done(); }, 400);
  }

  function bind(root) {
    if (!root) return function () {};
    function onClick(e) {
      var btn = e.target.closest && e.target.closest('[data-lightbox]');
      if (!btn || !root.contains(btn)) return;
      e.preventDefault();
      var group = btn.getAttribute('data-lightbox');
      var list = Array.prototype.filter.call(root.querySelectorAll('[data-lightbox]'), function (b) {
        return b.getAttribute('data-lightbox') === group;
      });
      var images = list.map(function (b) {
        return { src: b.getAttribute('data-src'), fallback: b.getAttribute('data-fallback') || '', alt: b.getAttribute('data-alt') || '' };
      });
      open(images, list.indexOf(btn), btn);
    }
    root.addEventListener('click', onClick);
    return function () { root.removeEventListener('click', onClick); };
  }

  App.lightbox = { open: open, close: close, bind: bind };
})();
