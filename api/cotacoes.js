'use strict';
/**
 * GET /api/cotacoes
 * Reúne o Indicador do Boi Gordo CEPEA/ESALQ e os contratos futuros BGI da B3
 * no formato interno da CMA. Toda consulta às fontes acontece aqui, no servidor:
 * nenhuma credencial chega ao navegador.
 *
 * Módulo de reposição (bezerro, garrote e boi magro) desligado por padrão:
 * com ENABLE_REPOSICAO diferente de 'true' nenhuma requisição externa é feita.
 */
const cepea = require('./_lib/cepea');
const b3 = require('./_lib/b3');
const { registrarErro } = require('./_lib/nucleo');

const CACHE_SEG = parseInt(process.env.COTACOES_CACHE_SEG || '300', 10);
const REPOSICAO_ATIVA = process.env.ENABLE_REPOSICAO === 'true';   // padrão: false

/* memória da instância quente: cache curto + último dado válido para contingência */
const memoria = {
  indicador: { dado: null, em: 0 },
  futuros: { dado: null, em: 0 }
};

async function bloco(chave, provedor) {
  const agora = Date.now();
  const guardado = memoria[chave];

  if (guardado.dado && agora - guardado.em < CACHE_SEG * 1000) {
    return { estado: 'ok', dados: guardado.dado, doCache: true };
  }

  if (!provedor.configurado()) {
    return { estado: 'sem_credenciais', dados: null };
  }

  try {
    const dado = await provedor.obter();
    memoria[chave] = { dado: dado, em: agora };
    return { estado: 'ok', dados: dado, doCache: false };
  } catch (err) {
    registrarErro(chave, err);
    if (guardado.dado) {
      // fonte fora do ar: mantemos o último dado válido, sinalizando que ele é antigo
      return { estado: 'ultimo_valido', dados: guardado.dado };
    }
    return { estado: 'indisponivel', dados: null };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const [indicador, futuros] = await Promise.all([
    bloco('indicador', cepea),
    bloco('futuros', b3)
  ]);

  res.setHeader('Cache-Control', 's-maxage=' + CACHE_SEG + ', stale-while-revalidate=1800');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  return res.status(200).json({
    geradoEm: new Date().toISOString(),
    fuso: 'America/Sao_Paulo',
    indicador: indicador,
    futuros: futuros,
    reposicao: REPOSICAO_ATIVA ? { estado: 'indisponivel', dados: null } : { estado: 'desativado', dados: null }
  });
};
