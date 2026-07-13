const fs = require('node:fs');
const path = require('node:path');

const STATUS = {
  PASSOU: 'passou',
  FALHOU: 'falhou',
  BLOQUEADO: 'nao-executado',
  PENDENTE: 'pendente',
};

function sanitizar(valor) {
  return String(valor || '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .split(/\r?\n|Call log:/)[0]
    .replace(/(senha|password|passwd|token|cookie|secret)\s*[:=]\s*\S+/gi, '$1=<redacted>')
    .replace(/(usuario|usuário|username|user|login)\s*[:=]\s*\S+/gi, '$1=<redacted>')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '<email>')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '<documento>')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '<documento>')
    .replace(/\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g, '<telefone>')
    .replace(/(?:bearer\s+|set-cookie|connect\.sid|localStorage|sessionStorage)\S*/gi, '<estado-autenticado>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function markdown(valor) {
  return sanitizar(valor).replace(/([*_{}\[\]<>])/g, '\\$1');
}

function slug(valor) {
  return String(valor || 'spec')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'spec';
}

function normalizarVerificacao(verificacao) {
  if (!verificacao || !verificacao.id) throw new Error('Cada validação planejada deve possuir um ID único.');
  return {
    id: String(verificacao.id),
    tela: sanitizar(verificacao.tela || 'Fluxo'),
    tipo: sanitizar(verificacao.tipo || 'validação'),
    campo: sanitizar(verificacao.campo || verificacao.id),
    status: STATUS.PENDENTE,
    detalhe: '',
  };
}

class RelatorioValidacoes {
  constructor({ spec, idExecucao, verificacoesPlanejadas = [], raizProjeto = process.cwd() } = {}) {
    if (!spec || !idExecucao) throw new Error('Informe spec e idExecucao para o relatório.');
    this.spec = sanitizar(spec);
    this.idExecucao = sanitizar(idExecucao);
    this.raizProjeto = path.resolve(raizProjeto);
    this.verificacoes = new Map();
    this.descritores = new Set();
    for (const verificacao of verificacoesPlanejadas) this.registrar(verificacao);
  }

  registrar(verificacao) {
    const item = normalizarVerificacao(verificacao);
    if (this.verificacoes.has(item.id)) throw new Error(`Validação duplicada: ${item.id}`);
    const descritor = [item.tela, item.tipo, item.campo].join('::');
    if (this.descritores.has(descritor)) throw new Error(`Validação semanticamente duplicada: ${descritor}`);
    this.verificacoes.set(item.id, item);
    this.descritores.add(descritor);
  }

  item(id) {
    const item = this.verificacoes.get(String(id));
    if (!item) throw new Error(`Validação não planejada: ${id}`);
    return item;
  }

  marcar(id, status, detalhe = '') {
    const item = this.item(id);
    item.status = status;
    item.detalhe = sanitizar(detalhe);
  }

  async verificar(id, acao) {
    try {
      await acao();
      this.marcar(id, STATUS.PASSOU);
      return true;
    } catch (erro) {
      this.marcar(id, STATUS.FALHOU, erro?.message || erro);
      return false;
    }
  }

  bloquearPendentes({ tela, motivo = 'Validação impossível no estado atual.' } = {}) {
    for (const item of this.verificacoes.values()) {
      if (item.status !== STATUS.PENDENTE) continue;
      if (tela && item.tela !== sanitizar(tela)) continue;
      this.marcar(item.id, STATUS.BLOQUEADO, motivo);
    }
  }

  resumo() {
    const itens = [...this.verificacoes.values()];
    return {
      total: itens.length,
      aprovadas: itens.filter((item) => item.status === STATUS.PASSOU).length,
      falhas: itens.filter((item) => item.status === STATUS.FALHOU).length,
      bloqueadas: itens.filter((item) => item.status === STATUS.BLOQUEADO || item.status === STATUS.PENDENTE).length,
    };
  }

  gravar() {
    this.bloquearPendentes({ motivo: 'A spec terminou antes desta validação.' });
    const resumo = this.resumo();
    const diretorio = path.join(this.raizProjeto, 'test-results', 'implantacao');
    const arquivo = path.join(diretorio, `${slug(this.spec)}-${slug(this.idExecucao)}.md`);
    const secoes = [
      [STATUS.PASSOU, 'Passou'],
      [STATUS.FALHOU, 'Falhou'],
      [STATUS.BLOQUEADO, 'Não executado'],
    ];
    const linhas = [
      `# Relatório de implantação - ${markdown(this.spec)}`,
      '',
      `- Run ID: ${markdown(this.idExecucao)}`,
      `- Resultado: ${resumo.falhas || resumo.bloqueadas ? 'FALHOU' : 'PASSOU'}`,
      `- Total: ${resumo.total}`,
      `- Passou: ${resumo.aprovadas}`,
      `- Falhou: ${resumo.falhas}`,
      `- Não executado: ${resumo.bloqueadas}`,
    ];
    for (const [status, titulo] of secoes) {
      const itens = [...this.verificacoes.values()].filter((item) => item.status === status);
      if (!itens.length) continue;
      linhas.push('', `## ${titulo}`, '');
      for (const item of itens) {
        linhas.push(`- [${markdown(item.tela)}] ${markdown(item.tipo)} - ${markdown(item.campo)}`);
        if (item.detalhe) linhas.push(`  - Detalhe: ${markdown(item.detalhe)}`);
      }
    }
    fs.mkdirSync(diretorio, { recursive: true });
    fs.writeFileSync(arquivo, `${linhas.join('\n')}\n`, 'utf8');
    return arquivo;
  }

  validarResultado() {
    const resumo = this.resumo();
    if (resumo.falhas || resumo.bloqueadas) {
      throw new Error(`Validações com problema: ${resumo.falhas} falha(s), ${resumo.bloqueadas} não executada(s).`);
    }
  }
}

module.exports = { RelatorioValidacoes };
