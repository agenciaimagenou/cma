'use strict';
/**
 * CepeaProvider — Indicador do Boi Gordo CEPEA/ESALQ
 *
 * Fonte permitida: API comercial licenciada do CEPEA.
 * Proibido: raspagem do site público e APIs não oficiais.
 *
 * Variáveis de ambiente:
 *   CEPEA_API_URL        endpoint completo do indicador contratado
 *   CEPEA_API_TOKEN      token/chave entregue pelo CEPEA
 *   CEPEA_AUTH_HEADER    (opcional) nome do cabeçalho; padrão 'Authorization'
 *   CEPEA_AUTH_PREFIXO   (opcional) prefixo do valor; padrão 'Bearer '
 *
 * Ao contratar a API, ajuste apenas a função mapear(): ela traduz o JSON do
 * fornecedor para o formato interno descrito em _lib/nucleo.js.
 */
const { precoValido, numero, campo, buscar, agoraISO } = require('./nucleo');

function configurado() {
  return Boolean(process.env.CEPEA_API_URL && process.env.CEPEA_API_TOKEN);
}

/** Traduz a resposta do CEPEA para o formato interno. Ponto único de ajuste. */
function mapear(bruto) {
  const raiz = (bruto && (bruto.data || bruto.indicador || bruto.result || bruto)) || {};
  const alvo = Array.isArray(raiz) ? raiz[0] : raiz;

  const valor = precoValido(campo(alvo, ['valor', 'preco', 'price', 'value', 'vlIndicador']));
  if (valor === null) {
    const e = new Error('indicador sem valor numérico válido');
    e.codigo = 'resposta_invalida';
    throw e;
  }

  const dataRef = campo(alvo, ['data', 'dataReferencia', 'date', 'dtReferencia', 'referencia']);

  return {
    fonte: 'CEPEA/ESALQ',
    produto: 'Boi Gordo',
    unidade: 'R$/@',
    periodicidade: 'Atualização diária',
    valor: valor,
    variacaoDia: numero(campo(alvo, ['variacaoDia', 'variacaoDiaria', 'varDia', 'variacao', 'changeDay'])),
    variacaoMes: numero(campo(alvo, ['variacaoMes', 'variacaoMensal', 'varMes', 'changeMonth'])),
    dataReferencia: dataRef ? String(dataRef).slice(0, 10) : null,
    atualizadoEm: agoraISO()
  };
}

async function obter() {
  if (!configurado()) {
    const e = new Error('credenciais ausentes');
    e.codigo = 'sem_credenciais';
    throw e;
  }
  const cabecalho = process.env.CEPEA_AUTH_HEADER || 'Authorization';
  const prefixo = process.env.CEPEA_AUTH_PREFIXO !== undefined ? process.env.CEPEA_AUTH_PREFIXO : 'Bearer ';
  const bruto = await buscar(process.env.CEPEA_API_URL, {
    headers: {
      [cabecalho]: prefixo + process.env.CEPEA_API_TOKEN,
      'Accept': 'application/json'
    }
  });
  return mapear(bruto);
}

module.exports = { configurado, obter, mapear };
