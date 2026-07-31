/* CMA · cma.agr.br — interações
   Movimento conforme Manual v2.3: crescer e revelar (scale .96→1 + fade),
   saídas em cubic-bezier(.25,1,.4,1), nada de bounce ou glitch. */
(function () {
  'use strict';

  /* ---------- menu mobile ---------- */
  var hamb = document.querySelector('.hamb');
  var nav = document.querySelector('nav.principal');
  if (hamb && nav) {
    hamb.addEventListener('click', function () {
      nav.classList.toggle('aberto');
      document.body.style.overflow = nav.classList.contains('aberto') ? 'hidden' : '';
    });
    nav.querySelectorAll(':scope > div > .nav-link').forEach(function (l) {
      l.addEventListener('click', function (e) {
        if (window.innerWidth <= 1080 && l.parentElement.querySelector('.submenu')) {
          e.preventDefault();
          l.parentElement.classList.toggle('aberto');
        }
      });
    });
  }

  /* ---------- revelar ao rolar ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- linha do tempo interativa ---------- */
  var tl = document.querySelector('.tl');
  if (tl && window.TL_MARCOS) {
    var marcos = window.TL_MARCOS;
    var anosEl = tl.querySelector('.tl-anos');
    var fotoEl = tl.querySelector('.tl-foto');
    var infoEl = tl.querySelector('.tl-info');
    var progEl = tl.querySelector('.tl-prog');
    var atual = 0, timer = null;

    marcos.forEach(function (m, i) {
      var b = document.createElement('button');
      b.className = 'tl-ano';
      b.setAttribute('aria-label', 'Ver marco de ' + m.ano);
      b.innerHTML = m.ano + '<span class="ponto"></span>';
      b.addEventListener('click', function () { ir(i, true); });
      anosEl.appendChild(b);
    });
    var botoes = anosEl.querySelectorAll('.tl-ano');

    function ir(i, manual) {
      atual = (i + marcos.length) % marcos.length;
      var m = marcos[atual];
      botoes.forEach(function (b, j) { b.classList.toggle('ativo', j === atual); });
      botoes[atual].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

      fotoEl.classList.remove('anim'); infoEl.classList.remove('anim');
      void fotoEl.offsetWidth;
      var alt = m.titulo.replace(/"/g, '');
      var img = '<img src="' + m.foto + '" alt="' + alt + '" loading="lazy" decoding="async">';
      if (m.webp && m.webp.length) {
        var ss = m.webp.map(function (w) {
          return 'assets/img/' + m.base + '-' + w + '.webp ' + w + 'w';
        }).join(', ');
        img = '<picture><source type="image/webp" srcset="' + ss +
              '" sizes="(max-width:900px) 92vw, (max-width:1240px) 46vw, 600px">' + img + '</picture>';
      }
      fotoEl.innerHTML = img;
      infoEl.querySelector('.tl-marco').textContent = m.ano;
      infoEl.querySelector('h3').textContent = m.titulo;
      infoEl.querySelector('p').textContent = m.texto;
      fotoEl.classList.add('anim'); infoEl.classList.add('anim');
      if (progEl) progEl.textContent = (atual + 1) + ' / ' + marcos.length;

      if (manual) { clearInterval(timer); timer = setInterval(function () { ir(atual + 1); }, 9000); }
    }

    tl.querySelector('.tl-ant').addEventListener('click', function () { ir(atual - 1, true); });
    tl.querySelector('.tl-prox').addEventListener('click', function () { ir(atual + 1, true); });
    document.addEventListener('keydown', function (e) {
      if (!tl.getBoundingClientRect || tl.getBoundingClientRect().bottom < 0) return;
      if (e.key === 'ArrowRight') ir(atual + 1, true);
      if (e.key === 'ArrowLeft') ir(atual - 1, true);
    });

    ir(0);
    timer = setInterval(function () { ir(atual + 1); }, 9000);
    tl.addEventListener('pointerenter', function () { clearInterval(timer); });
    tl.addEventListener('pointerleave', function () { timer = setInterval(function () { ir(atual + 1); }, 9000); });
  }

  /* ---------- contadores (números validados) ---------- */
  var ioNum = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      ioNum.unobserve(en.target);
      var el = en.target, alvo = parseFloat(el.dataset.contar), pref = el.dataset.pref || '', suf = el.dataset.suf || '';
      var dur = 1600, t0 = null;
      function passo(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        p = 1 - Math.pow(1 - p, 3);
        var v = Math.round(alvo * p);
        el.textContent = pref + v.toLocaleString('pt-BR') + suf;
        if (p < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-contar]').forEach(function (el) { ioNum.observe(el); });

  /* ---------- formulários (sem backend: abre e-mail/WhatsApp) ---------- */
  document.querySelectorAll('form[data-destino]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var linhas = [];
      f.querySelectorAll('input,select,textarea').forEach(function (c) {
        if (c.name && c.value) linhas.push(c.closest('div').querySelector('label').textContent + ': ' + c.value);
      });
      var corpo = linhas.join('\n');
      if (f.dataset.destino === 'whatsapp') {
        window.open('https://wa.me/5517981140041?text=' + encodeURIComponent(f.dataset.assunto + '\n' + corpo));
      } else {
        window.location.href = 'mailto:contato@cma.agr.br?subject=' + encodeURIComponent(f.dataset.assunto) + '&body=' + encodeURIComponent(corpo);
      }
    });
  });
})();

/* ---------- hero: transição de assuntos ---------- */
(function () {
  'use strict';
  var slider = document.querySelector('.hero-slider');
  if (!slider) return;
  var slides = slider.querySelectorAll('.hs-slide');
  var tabs = slider.querySelectorAll('.hs-tab');
  var atual = 0, timer = null, DUR = 7000;

  /* carrega a foto de um slide so quando ela vai ser vista */
  function carregar(i) {
    var s = slides[i];
    if (!s || s.dataset.pronto) return;
    s.dataset.pronto = '1';
    s.querySelectorAll('source[data-srcset]').forEach(function (o) {
      o.srcset = o.dataset.srcset; o.removeAttribute('data-srcset');
    });
    s.querySelectorAll('img[data-src]').forEach(function (im) {
      im.src = im.dataset.src; im.removeAttribute('data-src');
    });
  }

  function ir(i) {
    atual = (i + slides.length) % slides.length;
    carregar(atual);
    carregar((atual + 1) % slides.length);   /* deixa o proximo pronto */
    slides.forEach(function (s, j) { s.classList.toggle('ativo', j === atual); });
    tabs.forEach(function (t, j) {
      t.classList.toggle('ativo', j === atual);
      var p = t.querySelector('.prog');
      p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
    });
  }
  function agenda() { clearInterval(timer); timer = setInterval(function () { ir(atual + 1); }, DUR); }
  if (slides.length > 1) {
    window.addEventListener('load', function () { setTimeout(function () { carregar(1); }, 600); });
  }

  tabs.forEach(function (t, i) { t.addEventListener('click', function () { ir(i); agenda(); }); });
  slider.querySelector('.hs-ant').addEventListener('click', function () { ir(atual - 1); agenda(); });
  slider.querySelector('.hs-prox').addEventListener('click', function () { ir(atual + 1); agenda(); });

  /* toque: arrastar para trocar */
  var x0 = null;
  slider.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  slider.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) { ir(atual + (dx < 0 ? 1 : -1)); agenda(); }
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) agenda();
})();
