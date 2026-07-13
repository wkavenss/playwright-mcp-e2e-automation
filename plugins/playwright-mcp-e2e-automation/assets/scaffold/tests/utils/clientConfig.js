const fs = require('node:fs');
const path = require('node:path');

const PERFIL_SEGURO = /^[a-z0-9][a-z0-9-]*$/;
const SEGMENTO_SEGURO = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const CHAVES_PERIGOSAS = new Set(['__proto__', 'prototype', 'constructor']);
const CHAVE_SENSIVEL = /(?:password|senha|passwd|token|cookie|secret|storage|session|username|cpf|cnpj|matricula|email|telefone)/i;

function objetoSimples(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function lerJson(arquivo, descricao) {
  if (!fs.existsSync(arquivo)) throw new Error(`${descricao} não encontrado: ${arquivo}`);
  let conteudo;
  try {
    conteudo = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch (erro) {
    throw new Error(`${descricao} inválido: ${arquivo} (${erro.message})`);
  }
  if (!objetoSimples(conteudo)) throw new Error(`${descricao} deve conter um objeto JSON: ${arquivo}`);
  return conteudo;
}

function mesclarDados(...fontes) {
  const resultado = {};
  for (const fonte of fontes) {
    if (!objetoSimples(fonte)) continue;
    for (const [chave, valor] of Object.entries(fonte)) {
      if (CHAVES_PERIGOSAS.has(chave)) throw new Error(`Chave estrutural proibida: ${chave}`);
      resultado[chave] = objetoSimples(valor) && objetoSimples(resultado[chave])
        ? mesclarDados(resultado[chave], valor)
        : valor;
    }
  }
  return resultado;
}

function valorSensivel(valor) {
  if (typeof valor !== 'string') return false;
  return /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(valor)
    || /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(valor)
    || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(valor)
    || /(?:bearer\s+|set-cookie|connect\.sid|localStorage|sessionStorage)/i.test(valor);
}

function validarConfiguracaoSegura(valor, local = '$') {
  if (valor == null) return;
  if (typeof valor === 'string' || typeof valor === 'number') {
    if (valorSensivel(valor)) throw new Error(`Dado sensível proibido em ${local}`);
    return;
  }
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => validarConfiguracaoSegura(item, `${local}[${indice}]`));
    return;
  }
  if (!objetoSimples(valor)) return;
  for (const [chave, conteudo] of Object.entries(valor)) {
    const chaveProibida = CHAVES_PERIGOSAS.has(chave)
      || CHAVE_SENSIVEL.test(chave)
      || /^(?:usuario|user|login)$/i.test(chave);
    if (chaveProibida) throw new Error(`Chave sensível proibida em ${local}.${chave}`);
    validarConfiguracaoSegura(conteudo, `${local}.${chave}`);
  }
}

function segmentosDoCaminho(caminho) {
  const segmentos = String(caminho || '').split('.').filter(Boolean);
  const invalido = !segmentos.length
    || segmentos.some((segmento) => !SEGMENTO_SEGURO.test(segmento) || CHAVES_PERIGOSAS.has(segmento));
  if (invalido) throw new Error(`Caminho de configuração inválido: ${caminho}`);
  return segmentos;
}

function obterValor(dados, caminho) {
  return segmentosDoCaminho(caminho).reduce(
    (valor, segmento) => (valor == null ? undefined : valor[segmento]),
    dados,
  );
}

function requisitoNormalizado(requisito) {
  if (typeof requisito === 'string') return { caminho: requisito, tipo: null };
  if (objetoSimples(requisito) && requisito.caminho) {
    return { caminho: requisito.caminho, tipo: requisito.tipo || null };
  }
  throw new Error('Requisito de massa deve ser um caminho ou objeto { caminho, tipo }.');
}

function ausente(valor) {
  return valor == null
    || (typeof valor === 'string' && !valor.trim())
    || (Array.isArray(valor) && valor.length === 0)
    || (objetoSimples(valor) && Object.keys(valor).length === 0);
}

function tipoCompativel(valor, tipoEsperado) {
  if (!tipoEsperado) return true;
  if (tipoEsperado === 'array') return Array.isArray(valor);
  if (tipoEsperado === 'object') return objetoSimples(valor);
  return typeof valor === tipoEsperado;
}

function carregarConfiguracao({ raizProjeto = process.cwd(), perfil = process.env.E2E_CLIENT_PROFILE } = {}) {
  if (!perfil) throw new Error('Informe E2E_CLIENT_PROFILE no .env.');
  if (!PERFIL_SEGURO.test(perfil)) throw new Error(`Perfil de cliente inválido: ${perfil}`);

  const arquivoDefaults = path.resolve(raizProjeto, 'config/defaults.json');
  const diretorioClientes = path.resolve(raizProjeto, 'config/clientes');
  const arquivoPerfil = path.resolve(diretorioClientes, `${perfil}.json`);
  if (path.dirname(arquivoPerfil) !== diretorioClientes) throw new Error(`Perfil de cliente inválido: ${perfil}`);

  const defaults = lerJson(arquivoDefaults, 'Defaults da implantação');
  const cliente = lerJson(arquivoPerfil, 'Perfil do cliente');
  validarConfiguracaoSegura(defaults, 'defaults');
  validarConfiguracaoSegura(cliente, `clientes.${perfil}`);
  return { perfil, arquivoPerfil, dados: mesclarDados(defaults, cliente) };
}

function obterDadosDaSpec({ spec, requisitos = [], runtime = {}, raizProjeto, perfil } = {}) {
  if (!spec || !String(spec).trim()) throw new Error('Informe o identificador funcional da spec.');
  const configuracao = carregarConfiguracao({ raizProjeto, perfil });
  const dados = mesclarDados(configuracao.dados, runtime);
  const ausentes = [];
  const invalidos = [];

  for (const requisito of requisitos.map(requisitoNormalizado)) {
    const valor = obterValor(dados, requisito.caminho);
    if (ausente(valor)) ausentes.push(requisito.caminho);
    else if (!tipoCompativel(valor, requisito.tipo)) {
      invalidos.push(`${requisito.caminho} (esperado: ${requisito.tipo})`);
    }
  }

  if (ausentes.length || invalidos.length) {
    const detalhes = [
      ausentes.length ? `Propriedade ausente:\n${ausentes.join('\n')}` : '',
      invalidos.length ? `Propriedade com tipo incompatível:\n${invalidos.join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    throw new Error([
      'Massa específica indisponível para a spec:',
      String(spec),
      '',
      detalhes,
      '',
      'Perfil:',
      configuracao.perfil,
      '',
      'Arquivo:',
      configuracao.arquivoPerfil,
    ].join('\n'));
  }
  return dados;
}

module.exports = { obterDadosDaSpec };
