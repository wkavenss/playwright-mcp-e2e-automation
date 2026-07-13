function criarIdExecucao(prefixo = 'E2E') {
  const dataHora = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const sufixo = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefixo}_${dataHora}_${sufixo}`;
}

module.exports = { criarIdExecucao };
