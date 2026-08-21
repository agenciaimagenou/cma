'use strict';
/**
 * Camada interna de cotações — CMA
 * Define o formato padronizado que a página consome, independentemente do fornecedor.
 *
 *  indicador = {
 *    fonte:      'CEPEA/ESALQ',
 *    produto:    'Boi Gordo',
 *    unidade:    'R$/@',
 *    valor:      345.7,            // number, sempre > 0
 *    variacaoDia:  -0.42,          // % no dia   (null quando a fonte não envia)
 *    variacaoMes:   2.15,          // % no mês   (null quando a fonte não envia)
 *    dataReferencia: '2026-08-20', // dia a que o indicador se refere
 *    atualizadoEm: '2026-08-21T09:12:00-03:00'
 *  }
 *
 *  futuros = {
 *    fonte: 'B3',
 *    produto: 'BGI',
 *    atrasoMinutos: 15,            // 0 quando o feed é em tempo real
 *    atualizadoEm: '...ISO...',
 *    contratos: [{
 *      codigo: 'BGIV26',
 *      vencimento: '2026-10',      // sempre presente; contrato sem vencimento é descartado
 *      vencimentoRotulo: 'outubro/2026',
 *      tipoPreco: 'ajuste' | 'ultimo',
 *      preco: 352.4,
 *      variacaoDia: 0.31,
 *      volume: 1240,               // contratos negociados (null quando indisponível)
 *      atualizadoEm: '...ISO...'
 *    }]
 *  }
 *
 * Estados possíveis de cada bloco:
 *   'ok'              — dado válido e fresco
 *   'ultimo_valido'   — fonte indisponível agora; devolvemos o último dado bom, com a data dele
 *   'sem_credenciais' — integração ainda não contratada/configurada
 *   'indisponivel'    — falhou e não há dado anterior em memória
 */

const FUSO = 'America/Sao_Paulo';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Código de mês dos contratos futuros da B3 (F=jan ... Z=dez). */
const CODIGO_MES = { F: 1, G: 2, H: 3, J: 4, K: 5, M: 6, N: 7, Q: 8, U: 9, V: 10, X: 11, Z: 12 };

function agoraISO() {
  return new Date().toISOString();
}

/** Rótulo "outubro/2026" a partir de '2026-10'. */
function rotuloVencimento(aaaaMm) {
  if (!aaaaMm || typeof aaaaMm !== 'string') return null;
  const [a, m] = aaaaMm.split('-');
  const i = parseInt(m, 10) - 1;
  if (!a || isNaN(i) || !MESES[i]) return null;
  return MESES[i] + '/' + a;
}

/** Deriva o vencimento a partir do código (ex.: BGIV26 -> 2026-10). Só é usado como reforço. */
function vencimentoPeloCodigo(codigo) {
  if (typeof codigo !== 'string') return null;
  const m = codigo.toUpperCase().match(/^BGI([FGHJKMNQUVXZ])(\d{2})$/);
  if (!m) return null;
  const mes = CODIGO_MES[m[1]];
  const ano = 2000 + parseInt(m[2], 10);
  return ano + '-' + String(mes).padStart(2, '0');
}

/** Aceita number ou string ("345,70" / "345.70"); devolve null se não for número válido. */
function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const limpo = String(v).replace(/\s|R\$|\/@/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isFinite(n) ? n : null;
}

/** Preço válido: número positivo. Zero, negativo ou nulo nunca substituem um dado bom. */
function precoValido(v) {
  const n = numero(v);
  return n !== null && n > 0 ? n : null;
}

/** Primeiro campo presente entre vários nomes possíveis do fornecedor. */
function campo(obj, nomes) {
  if (!obj) return undefined;
  for (const n of nomes) {
    if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  }
  return undefined;
}

/** fetch com timeout; lança erro nomeado para o log do servidor. */
async function buscar(url, opcoes = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, Object.assign({ signal: ctrl.signal }, opcoes));
    if (!r.ok) {
      const e = new Error('HTTP ' + r.status);
      e.codigo = r.status === 429 ? 'limite_requisicoes' : 'resposta_invalida';
      throw e;
    }
    return await r.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('timeout');
      e.codigo = 'timeout';
      throw e;
    }
    if (!err.codigo) err.codigo = 'falha_rede';
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/** Log de integração — só no servidor, nunca devolvido ao visitante. */
function registrarErro(fonte, err) {
  console.error('[cotacoes][' + fonte + ']', err && err.codigo ? err.codigo : 'erro', err && err.message);
}

module.exports = {
  FUSO, MESES, agoraISO, rotuloVencimento, vencimentoPeloCodigo,
  numero, precoValido, campo, buscar, registrarErro
};
