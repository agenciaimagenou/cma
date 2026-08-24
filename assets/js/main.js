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
    var pausaEl = tl.querySelector('.tl-pausa');
    var atual = 0, timer = null;
    /* pausado = decisao do visitante; so ele volta a ligar */
    var pausado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DUR_TL = 9000;

    function parar() { clearInterval(timer); timer = null; }

    function andar() {
      parar();
      if (!pausado) timer = setInterval(function () { ir(atual + 1); }, DUR_TL);
    }

    function marcarBotao() {
      if (!pausaEl) return;
      pausaEl.classList.toggle('tocando', !pausado);
      pausaEl.setAttribute('aria-pressed', pausado ? 'true' : 'false');
      pausaEl.setAttribute('aria-label',
        pausado ? 'Retomar a passagem automática' : 'Pausar a passagem automática');
    }

    marcos.forEach(function (m, i) {
      var b = document.createElement('button');
      b.className = 'tl-ano';
      b.setAttribute('aria-label', 'Ver marco de ' + m.ano);
      b.innerHTML = m.ano + '<span class="ponto"></span>';
      b.addEventListener('click', function () { ir(i, true); });
      anosEl.appendChild(b);
    });
    var botoes = anosEl.querySelectorAll('.tl-ano');

    /* a regua se preenche de dourado ate o ano ativo: mostra onde estamos
       dentro dos 90 anos. E uma camada de fundo com background-attachment
       local, entao rola junto com os anos. */
    function preencher() {
      var b0 = botoes[atual];
      if (b0) {
        anosEl.style.setProperty('--tl-preenchido',
          Math.round(b0.offsetLeft + b0.offsetWidth / 2) + 'px');
      }
    }

    function ir(i, manual) {
      atual = (i + marcos.length) % marcos.length;
      var m = marcos[atual];
      botoes.forEach(function (b, j) { b.classList.toggle('ativo', j === atual); });
      botoes[atual].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      preencher();

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

      if (manual) andar();
    }

    tl.querySelector('.tl-ant').addEventListener('click', function () { ir(atual - 1, true); });
    tl.querySelector('.tl-prox').addEventListener('click', function () { ir(atual + 1, true); });
    if (pausaEl) {
      pausaEl.addEventListener('click', function () {
        pausado = !pausado;
        marcarBotao();
        andar();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (!tl.getBoundingClientRect || tl.getBoundingClientRect().bottom < 0) return;
      if (e.key === 'ArrowRight') ir(atual + 1, true);
      if (e.key === 'ArrowLeft') ir(atual - 1, true);
    });

    /* arrastar a foto (dedo ou mouse) troca de marco, como no carrossel da capa */
    var palco = tl.querySelector('.tl-palco');
    if (palco) {
      var x0 = null, y0 = null, arrastou = false;
      /* sem isto o navegador inicia o arrasto nativo da imagem e cancela o gesto */
      palco.addEventListener('dragstart', function (e) { e.preventDefault(); });
      palco.addEventListener('pointerdown', function (e) {
        if (e.button && e.button !== 0) return;
        x0 = e.clientX; y0 = e.clientY; arrastou = false;
        if (palco.setPointerCapture) {
          try { palco.setPointerCapture(e.pointerId); } catch (err) {}
        }
      });
      palco.addEventListener('pointermove', function (e) {
        if (x0 === null) return;
        if (!arrastou && Math.abs(e.clientX - x0) > 12 &&
            Math.abs(e.clientX - x0) > Math.abs(e.clientY - y0)) {
          arrastou = true;
          palco.classList.add('arrastando');
        }
      });
      function soltar(e) {
        if (x0 === null) return;
        var dx = e.clientX - x0, dy = e.clientY - y0;
        x0 = null; palco.classList.remove('arrastando');
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) ir(atual + (dx < 0 ? 1 : -1), true);
      }
      palco.addEventListener('pointerup', soltar);
      palco.addEventListener('pointercancel', function () {
        x0 = null; palco.classList.remove('arrastando');
      });
    }

    ir(0);
    marcarBotao();
    andar();
    /* a regua muda de largura ao redimensionar; so o preenchimento e refeito */
    window.addEventListener('resize', preencher);
    /* passar o mouse ou dar foco segura; sair volta, salvo se o visitante pausou */
    tl.addEventListener('pointerenter', parar);
    tl.addEventListener('pointerleave', andar);
    tl.addEventListener('focusin', parar);
    tl.addEventListener('focusout', andar);
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
        var zap = f.dataset.zap || '5517981150091';
        window.open('https://wa.me/' + zap + '?text=' + encodeURIComponent(f.dataset.assunto + '\n' + corpo), '_blank', 'noopener');
      } else {
        var caixa = f.dataset.email || 'contato@cma.agr.br';
        window.location.href = 'mailto:' + caixa + '?subject=' + encodeURIComponent(f.dataset.assunto) + '&body=' + encodeURIComponent(corpo);
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


/* ---------- galeria de depoimentos ---------- */
(function () {
  var g = document.querySelector('[data-depoimentos]');
  if (!g) return;

  var quadro = g.querySelector('.dep-quadro');
  var minis = Array.prototype.slice.call(g.querySelectorAll('.dep-mini'));
  var nomeEl = g.querySelector('.dep-nome');
  var fraseEl = g.querySelector('.dep-frase');
  var contaEl = g.querySelector('.dep-conta');
  var atual = -1;
  if (!quadro || !minis.length) return;

  var ICONE_PLAY = '<span class="dep-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8v14.4L20 12z"/></svg></span>';

  function dados(i) {
    var b = minis[i];
    return {
      tipo: b.getAttribute('data-tipo'),
      src: b.getAttribute('data-src'),
      capa: b.getAttribute('data-capa'),
      nome: b.getAttribute('data-nome') || '',
      frase: b.getAttribute('data-frase') || ''
    };
  }

  function mostrar(i, tocar) {
    if (i < 0) i = minis.length - 1;
    if (i >= minis.length) i = 0;
    var d = dados(i);
    atual = i;

    quadro.innerHTML = '';
    if (tocar) {
      if (d.tipo === 'youtube') {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + d.src + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        f.title = 'Depoimento de ' + d.nome;
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        quadro.appendChild(f);
      } else {
        var v = document.createElement('video');
        v.src = d.src;
        v.poster = d.capa;
        v.controls = true;
        v.autoplay = true;
        v.playsInline = true;
        v.preload = 'metadata';
        quadro.appendChild(v);
      }
    } else {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dep-capa';
      btn.setAttribute('aria-label', 'Assistir ao depoimento de ' + d.nome);
      var im = document.createElement('img');
      im.src = d.capa;
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.setAttribute('referrerpolicy', 'no-referrer');
      if (d.tipo === 'youtube') {
        im.onerror = function () {
          this.onerror = null;
          this.src = 'https://i.ytimg.com/vi/' + d.src + '/hqdefault.jpg';
        };
      }
      btn.appendChild(im);
      btn.insertAdjacentHTML('beforeend', ICONE_PLAY);
      btn.addEventListener('click', function () { mostrar(atual, true); });
      quadro.appendChild(btn);
    }

    var linkEl = g.querySelector('.dep-link');
    if (linkEl) {
      if (d.tipo === 'youtube') {
        linkEl.href = 'https://www.youtube.com/watch?v=' + d.src;
        linkEl.style.display = '';
      } else {
        linkEl.style.display = 'none';
      }
    }
    if (nomeEl) nomeEl.textContent = d.nome;
    if (fraseEl) {
      fraseEl.textContent = d.frase ? '\u201C' + d.frase + '\u201D' : '';
      fraseEl.style.display = d.frase ? '' : 'none';
    }
    if (contaEl) contaEl.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + minis.length).slice(-2);

    minis.forEach(function (b, j) {
      if (j === i) { b.setAttribute('aria-current', 'true'); }
      else { b.removeAttribute('aria-current'); }
    });
    var alvo = minis[i];
    if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  minis.forEach(function (b, i) {
    b.addEventListener('click', function () { mostrar(i, true); });
  });
  g.querySelectorAll('.dep-nav.ant').forEach(function (b) {
    b.addEventListener('click', function () { mostrar(atual - 1, false); });
  });
  g.querySelectorAll('.dep-nav.prox').forEach(function (b) {
    b.addEventListener('click', function () { mostrar(atual + 1, false); });
  });
  g.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { mostrar(atual - 1, false); e.preventDefault(); }
    if (e.key === 'ArrowRight') { mostrar(atual + 1, false); e.preventDefault(); }
  });

  mostrar(0, false);
})();

/* ---------- âncora vinda de outra página ----------
   Ao chegar em uma URL com #, o navegador rola antes de fontes e imagens assentarem
   e a página costuma parar antes do alvo. Aqui reposiciona a âncora ao terminar a carga. */
(function () {
  if (!location.hash || location.hash.length < 2) return;
  var alvo;
  try { alvo = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { return; }
  if (!alvo) return;
  function ir() { alvo.scrollIntoView({ block: 'start' }); }
  window.addEventListener('load', function () { setTimeout(ir, 80); setTimeout(ir, 400); });
})();
