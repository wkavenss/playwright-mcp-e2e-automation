const path = require('path');

function normalizarIdentificador(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function obterCaminhoEstadoAutenticacao(nomePerfil, specId) {
  if (!nomePerfil || !specId) throw new Error('Informe perfil e identificador da spec para o storageState.');
  const arquivo = `${normalizarIdentificador(nomePerfil)}--${normalizarIdentificador(specId)}.json`;
  return path.resolve(process.cwd(), 'test-results', 'auth', arquivo);
}

module.exports = { normalizarIdentificador, obterCaminhoEstadoAutenticacao };
