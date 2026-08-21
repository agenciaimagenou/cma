/* ============================================================
   CMA · Cotações — consome /api/cotacoes (Indicador CEPEA/ESALQ e futuros BGI da B3)
   O navegador nunca fala com as fontes: só com a nossa API, que guarda as credenciais.
   ============================================================ */
(function () {
  'use strict';

  var alvoInd = document.querySelector('[data-cot-indicador]');
  var alvoFut = document.querySelector('[data-cot-futuros]');
  if (!alvoInd && !alvoFut) return;

  var FUSO = 'America/Sao_Paulo';

  var fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  var fmtNum = new Intl.NumberFormat('pt-BR');
  var fmtData = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
  var fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dinheiro(v) {
    return fmtMoeda.format(v) + '/@';
  }

  function variacao(v) {
    if (v === null || v === undefined || isNaN(v)) return '<span class="cot-var neutra">—</span>';
    var classe = v > 0 ? 'sobe' : (v < 0 ? 'desce' : 'neutra');
    var sinal = v > 0 ? '+' : (v < 0 ? '−' : '');
    return '<span class="cot-var ' + classe + '">' + sinal + fmtNum.format(Math.abs(v).toFixed(2)).replace('.', ',') + '%</span>';
  }

  function dataCurta(iso) {
    if (!iso) return null;
    var d = new Date(iso.length === 10 ? iso + 'T12:00:00-03:00' : iso);
    return isNaN(d) ? null : fmtData.format(d);
  }

  function dataHora(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d) ? null : fmtDataHora.format(d);
  }

  function aviso(el, texto, tom) {
    el.innerHTML = '<p class="cot-aviso' + (tom ? ' ' + tom : '') + '">' + esc(texto) + '</p>';
  }


  /* ---------- indicador CEPEA ---------- */
  function pintarIndicador(bloco) {
    var corpo = alvoInd.querySelector('[data-corpo]');
    alvoInd.setAttribute('aria-busy', 'false');

    if (bloco.estado === 'sem_credenciais') {
      return aviso(corpo, 'Integração com a fonte oficial em andamento.');
    }
    if (bloco.estado === 'indisponivel' || !bloco.dados) {
      return aviso(corpo, 'Não foi possível atualizar o indicador agora. Tente novamente em alguns minutos.', 'atencao');
    }

    var d = bloco.dados;
    var ref = dataCurta(d.dataReferencia);
    var atual = dataHora(d.atualizadoEm);

    var html = '<p class="cot-valor">' + esc(dinheiro(d.valor)) + '</p>' +
      '<dl class="cot-vars">' +
      '<div><dt>No dia</dt><dd>' + variacao(d.variacaoDia) + '</dd></div>' +
      '<div><dt>No mês</dt><dd>' + variacao(d.variacaoMes) + '</dd></div>' +
      '</dl>';

    if (ref) html += '<p class="cot-meta">Referência: <strong>' + esc(ref) + '</strong></p>';
    if (bloco.estado === 'ultimo_valido') {
      html += '<p class="cot-aviso atencao">Fonte indisponível no momento. Exibindo o último dado válido' +
        (atual ? ', de ' + esc(atual) : '') + '.</p>';
    } else if (atual) {
      html += '<p class="cot-meta">Atualizado em ' + esc(atual) + '</p>';
    }
    corpo.innerHTML = html;
  }

  /* ---------- futuros B3 ---------- */
  function pintarFuturos(bloco) {
    var corpo = alvoFut.querySelector('[data-corpo]');
    alvoFut.setAttribute('aria-busy', 'false');

    if (bloco.estado === 'sem_credenciais') {
      return aviso(corpo, 'Integração com a fonte oficial em andamento.');
    }
    if (bloco.estado === 'indisponivel' || !bloco.dados || !bloco.dados.contratos || !bloco.dados.contratos.length) {
      return aviso(corpo, 'Não foi possível carregar os vencimentos agora. Tente novamente em alguns minutos.', 'atencao');
    }

    var d = bloco.dados;
    var linhas = d.contratos.map(function (c) {
      return '<tr>' +
        '<th scope="row">' + esc(c.codigo) + '</th>' +
        '<td>' + esc(c.vencimentoRotulo || c.vencimento) + '</td>' +
        '<td class="num">' + esc(dinheiro(c.preco)) +
        '<span class="cot-tipo">' + (c.tipoPreco === 'ajuste' ? 'ajuste' : 'último') + '</span></td>' +
        '<td class="num">' + variacao(c.variacaoDia) + '</td>' +
        '<td class="num">' + (c.volume == null ? '—' : esc(fmtNum.format(c.volume))) + '</td>' +
        '</tr>';
    }).join('');

    var html = '<div class="cot-rolagem"><table class="cot-tabela">' +
      '<caption class="visual-oculto">Contratos futuros de Boi Gordo negociados na B3</caption>' +
      '<thead><tr><th scope="col">Contrato</th><th scope="col">Vencimento</th>' +
      '<th scope="col">Preço</th><th scope="col">No dia</th><th scope="col">Contratos</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table></div>';

    var atual = dataHora(d.atualizadoEm);
    if (bloco.estado === 'ultimo_valido') {
      html += '<p class="cot-aviso atencao">Fonte indisponível no momento. Exibindo o último dado válido' +
        (atual ? ', de ' + esc(atual) : '') + '.</p>';
    } else if (atual) {
      html += '<p class="cot-meta">Atualizado em ' + esc(atual) +
        (d.atrasoMinutos ? ' · dados com atraso de ' + esc(d.atrasoMinutos) + ' minutos' : '') + '</p>';
    }
    corpo.innerHTML = html;
  }

  /* ---------- carga ----------
     Os cards já nascem com os widgets oficiais (CEPEA e TradingView/B3), que funcionam
     sem contrato. Se um dia a CMA licenciar as APIs, a resposta de /api/cotacoes passa a
     valer e substitui o widget pela nossa própria diagramação; enquanto isso, o widget fica. */
  if (location.protocol === 'file:') return;

  fetch('/api/cotacoes', { headers: { 'Accept': 'application/json' } })
    .then(function (r) {
      if (!r.ok) return null;
      return r.json();
    })
    .then(function (j) {
      if (!j) return;
      if (alvoInd && j.indicador && (j.indicador.estado === 'ok' || j.indicador.estado === 'ultimo_valido')) {
        pintarIndicador(j.indicador);
      }
      if (alvoFut && j.futuros && (j.futuros.estado === 'ok' || j.futuros.estado === 'ultimo_valido')) {
        pintarFuturos(j.futuros);
      }
    })
    .catch(function () { /* widget oficial permanece na tela */ });
})();
