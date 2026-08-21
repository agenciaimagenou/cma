'use strict';
/**
 * B3Provider — contratos futuros de Boi Gordo (BGI)
 *
 * Fonte permitida: API de distribuidor autorizado pela B3 (market data licenciado).
 * Proibido: raspagem de páginas da B3 e serviços não autorizados.
 *
 * Variáveis de ambiente:
 *   B3_API_URL         endpoint de cotações do distribuidor
 *   B3_API_TOKEN       token/chave do distribuidor
 *   B3_PRODUTO         (opcional) código do produto; padrão 'BGI'
 *   B3_AUTH_HEADER     (opcional) nome do cabeçalho; padrão 'Authorization'
 *   B3_AUTH_PREFIXO    (opcional) prefixo do valor; padrão 'Bearer '
 *   B3_ATRASO_MINUTOS  (opcional) atraso do feed contratado; padrão 15
 *
 * A lista de vencimentos vem sempre da API: nenhum ticker fica fixo no código.
 * Contratos sem vencimento identificável ou já vencidos são descartados.
 */
const {
  precoValido, numero, campo, buscar, agoraISO,
  rotuloVencimento, vencimentoPeloCodigo
} = require('./nucleo');

function configurado() {
  return Boolean(process.env.B3_API_URL && process.env.B3_API_TOKEN);
}

function mesAtual() {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  });
  return f.format(new Date()).slice(0, 7);
}

/** Normaliza um contrato do fornecedor. Devolve null quando o registro não serve. */
function mapearContrato(bruto) {
  const codigo = campo(bruto, ['codigo', 'symbol', 'ticker', 'instrumento', 'contrato']);
  if (!codigo) return null;

  let venc = campo(bruto, ['vencimento', 'maturity', 'expiration', 'dtVencimento', 'expiryMonth']);
  venc = venc ? String(venc).slice(0, 7) : vencimentoPeloCodigo(codigo);
  if (!venc || !/^\d{4}-\d{2}$/.test(venc)) return null;   // sem vencimento, não publicamos

  const ajuste = precoValido(campo(bruto, ['precoAjuste', 'ajuste', 'settlementPrice', 'settle']));
  const ultimo = precoValido(campo(bruto, ['ultimoPreco', 'ultimo', 'lastPrice', 'last', 'preco']));
  const preco = ajuste !== null ? ajuste : ultimo;
  if (preco === null) return null;                          // nunca publicamos preço zerado ou vazio

  return {
    codigo: String(codigo).toUpperCase(),
    vencimento: venc,
    vencimentoRotulo: rotuloVencimento(venc),
    tipoPreco: ajuste !== null ? 'ajuste' : 'ultimo',
    preco: preco,
    variacaoDia: numero(campo(bruto, ['variacaoDia', 'variacao', 'changePercent', 'varDia'])),
    volume: numero(campo(bruto, ['volume', 'contratos', 'quantidade', 'volumeContratos'])),
    atualizadoEm: campo(bruto, ['atualizadoEm', 'timestamp', 'updatedAt', 'dataHora']) || agoraISO()
  };
}

/** Traduz a resposta do distribuidor para o formato interno. Ponto único de ajuste. */
function mapear(bruto) {
  const lista = (bruto && (bruto.data || bruto.contratos || bruto.results || bruto.quotes)) || bruto;
  if (!Array.isArray(lista)) {
    const e = new Error('resposta sem lista de contratos');
    e.codigo = 'resposta_invalida';
    throw e;
  }

  const corte = mesAtual();
  const contratos = lista
    .map(mapearContrato)
    .filter(Boolean)
    .filter(c => c.vencimento >= corte)          // só contratos ativos
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  if (!contratos.length) {
    const e = new Error('nenhum contrato ativo válido na resposta');
    e.codigo = 'resposta_invalida';
    throw e;
  }

  return {
    fonte: 'B3',
    produto: process.env.B3_PRODUTO || 'BGI',
    unidade: 'R$/@',
    atrasoMinutos: parseInt(process.env.B3_ATRASO_MINUTOS || '15', 10),
    atualizadoEm: agoraISO(),
    contratos: contratos
  };
}

async function obter() {
  if (!configurado()) {
    const e = new Error('credenciais ausentes');
    e.codigo = 'sem_credenciais';
    throw e;
  }
  const cabecalho = process.env.B3_AUTH_HEADER || 'Authorization';
  const prefixo = process.env.B3_AUTH_PREFIXO !== undefined ? process.env.B3_AUTH_PREFIXO : 'Bearer ';
  const url = process.env.B3_API_URL.replace('{produto}', process.env.B3_PRODUTO || 'BGI');
  const bruto = await buscar(url, {
    headers: {
      [cabecalho]: prefixo + process.env.B3_API_TOKEN,
      'Accept': 'application/json'
    }
  });
  return mapear(bruto);
}

module.exports = { configurado, obter, mapear, mapearContrato };
