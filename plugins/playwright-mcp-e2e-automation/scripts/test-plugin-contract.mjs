#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const diretorioScript = path.dirname(fileURLToPath(import.meta.url));
const raizPlugin = path.dirname(diretorioScript);
const scaffold = path.join(diretorioScript, "scaffold-playwright.mjs");
const auditor = path.join(diretorioScript, "audit-playwright.mjs");
const qualityGate = path.join(diretorioScript, "quality-gate.mjs");
const scannerPublico = path.join(diretorioScript, "scan-public-leaks.mjs");
const otimizarContexto = path.join(diretorioScript, "optimize-context.mjs");
const raizTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-plugin-contract-"));

function executar(script, argumentos = [], opcoes = {}) {
  const resultado = spawnSync(process.execPath, [script, ...argumentos], {
    encoding: "utf8",
    ...opcoes,
  });
  if (resultado.status !== 0 && !opcoes.allowFailure) {
    throw new Error(`${path.basename(script)} falhou:\n${resultado.stderr || resultado.stdout}`);
  }
  return resultado;
}

function escrever(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${conteudo.trim()}\n`, "utf8");
}

function existe(raiz, caminho) {
  return fs.existsSync(path.join(raiz, caminho));
}

function auditarComOpcoes(raiz, arquivos, { contract = "implantacao", caseKind = "formulario", exclude = [] } = {}) {
  const argumentos = [raiz, "--files", ...arquivos, "--contract", contract];
  if (caseKind) argumentos.push("--case-kind", caseKind);
  for (const pattern of exclude) argumentos.push("--exclude", pattern);
  argumentos.push("--json");
  const resultado = executar(auditor, argumentos, { allowFailure: true });
  assert.match(resultado.stdout, /^\s*\{/);
  return JSON.parse(resultado.stdout);
}

function auditar(raiz, ...arquivos) {
  return auditarComOpcoes(raiz, arquivos);
}

function auditarCompleto(raiz) {
  const resultado = executar(auditor, [raiz, "--contract", "implantacao", "--case-kind", "formulario", "--json"], { allowFailure: true });
  assert.match(resultado.stdout, /^\s*\{/);
  return JSON.parse(resultado.stdout);
}

function regras(auditoria) {
  return new Set(auditoria.findings.map((item) => item.rule));
}

function exigirRegra(auditoria, regra) {
  assert(regras(auditoria).has(regra), `Auditor nao encontrou a regra ${regra}`);
}

function rejeitarRegra(auditoria, regra) {
  assert(!regras(auditoria).has(regra), `Auditor encontrou indevidamente a regra ${regra}`);
}

function otimizarPrompt(raiz, prompt) {
  const resultado = executar(
    otimizarContexto,
    [raiz, "--mode", "implantacao", "--stdin", "--json"],
    { allowFailure: true, input: prompt },
  );
  assert.match(resultado.stdout, /^\s*\{/);
  return JSON.parse(resultado.stdout);
}

try {
  const manifesto = JSON.parse(fs.readFileSync(path.join(raizPlugin, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifesto.version, "3.0.0");
  assert.match(manifesto.interface.longDescription, /varios casos numerados/);
  assert.match(manifesto.interface.longDescription, /ciclos simples para reduzir massa/);
  assert.match(manifesto.interface.longDescription, /autocompletes portateis/);
  assert.doesNotMatch(manifesto.interface.longDescription, /guia|formatos|dados por cliente/);

  const skillImplantacao = fs.readFileSync(
    path.join(raizPlugin, "skills", "criar-testes-implantacao-playwright", "SKILL.md"),
    "utf8",
  );
  const skillMassa = fs.readFileSync(
    path.join(raizPlugin, "skills", "gerar-massa-playwright", "SKILL.md"),
    "utf8",
  );
  const legibilidade = fs.readFileSync(path.join(raizPlugin, "references", "legibilidade-codigo.md"), "utf8");
  const autocompletes = fs.readFileSync(path.join(raizPlugin, "references", "autocompletes-portateis.md"), "utf8");
  assert.match(skillImplantacao, /smoke tests portateis/i);
  assert.match(skillImplantacao, /`CASO DE USO <n>`/);
  assert.match(skillImplantacao, /O lote existe apenas na orquestracao do plugin/);
  assert.match(skillImplantacao, /Agrupar casos somente quando tiverem o mesmo perfil, entidade e encadeamento natural/i);
  assert.match(skillImplantacao, /pesquisar diretamente o valor/i);
  assert.match(skillImplantacao, /consultar `%%%`/i);
  assert.match(skillImplantacao, /correspondencia exata/i);
  assert.match(skillImplantacao, /localizarTentativa.*retomarTentativa.*removerTentativa/is);
  assert.match(skillImplantacao, /expect\.soft/);
  assert.match(skillImplantacao, /testInfo\.errors/);
  assert.match(skillImplantacao, /reporters nativos `line` e `html`/);
  assert.match(skillImplantacao, /Nao gerar Markdown proprio/i);
  assert.match(skillImplantacao, /`RelatorioValidacoes`/);
  assert.match(skillImplantacao, /usar `test\.step` no mesmo nivel/i);
  assert.match(skillImplantacao, /Nao criar etapa para clique, preenchimento, espera/i);
  assert.match(skillImplantacao, /Nao criar teste negativo separado para dependencia, tipo ou formato/);
  assert.match(skillImplantacao, /`2_000` ms/);
  assert.match(skillImplantacao, /Centralizar acoes em `actionTimeout`/);
  assert.match(skillImplantacao, /Recusar `GUIA DE NAVEGACAO`/);
  assert.match(skillImplantacao, /Nao criar cache de lote/);
  assert.match(skillImplantacao, /propria spec/i);
  assert.match(skillImplantacao, /--contract implantacao --case-kind <tipo>/i);
  assert.match(skillMassa, /primeira opcao valida/);
  assert.match(skillMassa, /campos de dominio/);
  assert.match(legibilidade, /A spec conta a historia funcional/);
  assert.match(legibilidade, /sequencia direta de chamadas/i);
  assert.match(legibilidade, /uma unica massa principal/i);
  for (const contrato of [
    /Com `valorEspecifico`.*pesquise diretamente/is,
    /Sem valor especifico.*`%%%`/is,
    /zero correspondencias/i,
    /mais de uma correspondencia/i,
    /linhas vazias, ocultas, desabilitadas/i,
    /ambos informados/i,
    /somente um informado/i,
    /nenhum informado/i,
    /dois candidatos distintos/i,
  ]) assert.match(autocompletes, contrato);
  assert(!existe(raizPlugin, "references/implantacao-em-lote.md"));
  assert(!existe(raizPlugin, `references/autocompletes-${["s", "i", "g", "s"].join("")}.md`));

  const projetoComNomePrivado = path.join(raizTemporaria, "nome-privado");
  const termoPrivado = ["S", "I", "G", "s"].join("");
  escrever(path.join(projetoComNomePrivado, "references", `${termoPrivado.toLowerCase()}.md`), "Referencia generica.");
  const scannerComNomePrivado = executar(scannerPublico, [projetoComNomePrivado, "--json"], { allowFailure: true });
  assert.notEqual(scannerComNomePrivado.status, 0);
  assert(JSON.parse(scannerComNomePrivado.stdout).findings.some((item) => item.file.includes(termoPrivado.toLowerCase())));

  for (const modo of ["basico", "massa", "implantacao"]) {
    const projeto = path.join(raizTemporaria, modo);
    executar(scaffold, [projeto, "--mode", modo]);
    for (const arquivo of [
      "playwright.config.js",
      ".env.example",
      "tests/utils/authProfiles.js",
      "tests/utils/testData.js",
      "tests/fixtures/maximizedTest.js",
    ]) assert(existe(projeto, arquivo), `${modo} nao criou ${arquivo}`);
    for (const arquivo of [
      "tests/pages/BasePage.js",
      "tests/utils/clientConfig.js",
      "tests/utils/validationReport.js",
      "config/defaults.json",
      "config/clientes/referencia.json",
    ]) assert(!existe(projeto, arquivo), `${modo} criou infraestrutura desnecessaria: ${arquivo}`);

    const packageJson = JSON.parse(fs.readFileSync(path.join(projeto, "package.json"), "utf8"));
    assert.equal(packageJson.scripts.test, "playwright test");
    assert.equal(packageJson.scripts["test:headed"], "playwright test --headed");
    assert.equal(packageJson.scripts["test:e2e"], undefined);
    const config = fs.readFileSync(path.join(projeto, "playwright.config.js"), "utf8");
    assert.match(config, /\[\s*['"]line['"]\s*\]/);
    assert.match(config, /\[\s*['"]html['"]/);
    assert.match(config, /outputFolder:\s*['"]test-results\/html['"]/);
    assert.match(config, /^\s*timeout:\s*180_000,/m);
    assert.match(config, /actionTimeout:\s*15_000/);
    rejeitarRegra(auditar(projeto, "playwright.config.js"), "missing-html-reporter");
    rejeitarRegra(auditar(projeto, "playwright.config.js"), "missing-central-test-timeout");
    rejeitarRegra(auditar(projeto, "playwright.config.js"), "missing-central-action-timeout");
  }

  const projetoSemTimeouts = path.join(raizTemporaria, "sem-timeouts-centrais");
  executar(scaffold, [projetoSemTimeouts, "--mode", "implantacao"]);
  const configSemTimeouts = path.join(projetoSemTimeouts, "playwright.config.js");
  escrever(
    configSemTimeouts,
    fs.readFileSync(configSemTimeouts, "utf8")
      .replace(/^\s*timeout:\s*180_000,\s*$/m, "")
      .replace(/^\s*actionTimeout:\s*15_000,\s*$/m, ""),
  );
  const auditoriaSemTimeouts = auditar(projetoSemTimeouts, "playwright.config.js");
  exigirRegra(auditoriaSemTimeouts, "missing-central-test-timeout");
  exigirRegra(auditoriaSemTimeouts, "missing-central-action-timeout");

  const projetoLegado = path.join(raizTemporaria, "legado");
  executar(scaffold, [projetoLegado, "--mode", "implantacao", "--legacy-form"]);
  assert(existe(projetoLegado, "tests/utils/legacyForm.js"));

  const modoInvalido = executar(scaffold, [path.join(raizTemporaria, "invalido"), "--mode", "todos"], {
    allowFailure: true,
  });
  assert.notEqual(modoInvalido.status, 0);
  assert.match(modoInvalido.stderr, /Modo invalido/);

  const projeto = path.join(raizTemporaria, "contratos");
  executar(scaffold, [projeto, "--mode", "implantacao"]);
  const specBoa = "tests/e2e/cadastro.spec.js";
  const pageBoa = "tests/pages/CadastroPage.js";
  escrever(path.join(projeto, specBoa), `
const { expect } = require('@playwright/test');
const { test } = require('../fixtures/maximizedTest');
const { CadastroPage } = require('../pages/CadastroPage');

test('Cadastro: smoke valida obrigatorios e conclui', async ({ page }, testInfo) => {
  await expect.poll(async () => true, { timeout: 10_000 }).toBe(true);
  const cadastroPage = new CadastroPage(page);
  const camposObrigatorios = cadastroPage.obterCamposObrigatorios({ nome: 'TESTE RUN_001' });

  await cadastroPage.acessarFormulario();
  await cadastroPage.preencherCamposObrigatorios(camposObrigatorios);

  for (const campo of camposObrigatorios) {
    await cadastroPage.validarObrigatoriedade(campo, camposObrigatorios);
  }

  // Falhas suaves ja reprovam o teste; esta barreira impede persistencia indevida.
  if (testInfo.errors.length > 0) return;

  await cadastroPage.clicarCadastrar();
  await cadastroPage.validarMensagemSucesso();
});
  `);
  escrever(path.join(projeto, pageBoa), `
const { expect } = require('@playwright/test');

class CadastroPage {
  constructor(page) {
    this.page = page;
    this.nome = page.locator('[id="cadastro:nome"]');
    this.cadastrar = page.getByRole('button', { name: 'Cadastrar' });
    this.sucesso = page.getByText('Operacao realizada com sucesso');
  }

  obterCamposObrigatorios(dados) {
    return [{ campo: 'nome', rotulo: 'Nome', controle: this.nome, tipo: 'texto', valorValido: dados.nome }];
  }

  async acessarFormulario() { await expect(this.nome).toBeVisible(); }
  async preencherCamposObrigatorios(campos) {
    for (const campo of campos) await campo.controle.fill(campo.valorValido);
  }

  async validarObrigatoriedade(campo, campos) {
    const sentinela = campos.find((item) => item.campo !== campo.campo) || campo;
    try {
      await sentinela.controle.fill('');
      await campo.controle.fill('');
      await expect(sentinela.controle).toHaveValue('');
      await this.clicarCadastrar();
      await expect.soft(campo.controle).toHaveValue('');
      await expect(this.sucesso).toBeHidden();
    } finally {
      await campo.controle.fill(campo.valorValido);
      await sentinela.controle.fill(sentinela.valorValido);
    }
  }

  async clicarCadastrar() { await this.cadastrar.click(); }
  async validarMensagemSucesso() { await expect(this.sucesso).toBeVisible(); }
}

module.exports = { CadastroPage };
  `);

  const auditoriaBoa = auditar(projeto, specBoa, pageBoa);
  for (const regra of [
    "custom-validation-report",
    "manual-verification-inventory",
    "manual-implantation-flow-state",
    "batch-orchestration-in-spec",
    "shared-use-case-state",
    "unsafe-positive-after-soft-required-failure",
    "required-validation-without-soft-assertion",
    "required-validation-without-finally",
    "unsafe-required-submission",
    "page-object-runner-coupling",
    "technical-test-step",
    "nested-test-step",
    "implantation-annotation-noise",
    "verbose-required-descriptors",
    "single-use-sentinel-wrapper",
    "duplicated-confirmation-recovery",
    "single-use-navigation-wrapper",
    "redundant-local-action-timeout",
    "long-optional-consent-wait",
    "redundant-per-spec-timeout",
  ]) rejeitarRegra(auditoriaBoa, regra);

  const etapasFuncionais = "tests/e2e/etapas-funcionais.spec.js";
  escrever(path.join(projeto, etapasFuncionais), `
const { test } = require('../fixtures/maximizedTest');
test('Rascunho: gerenciar ciclo proprio', async () => {
  await test.step('Criar e confirmar rascunho', async () => pagina.criarRascunho());
  await test.step('Visualizar proposta', async () => pagina.abrirVisualizacao());
  await test.step('Remover rascunho', async () => pagina.removerRascunho());
});
  `);
  const auditoriaEtapasFuncionais = auditarComOpcoes(projeto, [etapasFuncionais], { contract: "implantacao", caseKind: "remocao" });
  rejeitarRegra(auditoriaEtapasFuncionais, "technical-test-step");
  rejeitarRegra(auditoriaEtapasFuncionais, "nested-test-step");

  const etapasAninhadas = "tests/e2e/etapas-aninhadas.spec.js";
  escrever(path.join(projeto, etapasAninhadas), `
const { test } = require('../fixtures/maximizedTest');
test('Rascunho: ciclo aninhado', async () => {
  await test.step('Gerenciar rascunho', async () => {
    await test.step('Visualizar proposta', async () => pagina.abrirVisualizacao());
  });
});
  `);
  exigirRegra(auditar(projeto, etapasAninhadas), "nested-test-step");

  const testesIndependentes = "tests/e2e/testes-independentes.spec.js";
  escrever(path.join(projeto, testesIndependentes), `
const { test } = require('../fixtures/maximizedTest');
test('Consulta: localizar curso independente', async () => { await pagina.consultarCurso(); await pagina.validarResultadoCurso(); });
test('Consulta: localizar calendario independente', async () => { await pagina.consultarCalendario(); await pagina.validarResultadoCalendario(); });
  `);
  const auditoriaIndependentes = auditarComOpcoes(projeto, [testesIndependentes], { contract: "implantacao", caseKind: "consulta" });
  rejeitarRegra(auditoriaIndependentes, "dependent-serial-tests");
  rejeitarRegra(auditoriaIndependentes, "shared-use-case-state");

  const credenciaisGenericas = "tests/e2e/credenciais-genericas.spec.js";
  escrever(path.join(projeto, credenciaisGenericas), `
const { test } = require('../fixtures/maximizedTest');
const { obterCredenciais } = require('../utils/authProfiles');
test('Validacao comum', async () => { obterCredenciais('Gestor'); const dataInvalida = '99/99/9999'; void dataInvalida; });
  `);
  const auditoriaRevisao = auditarComOpcoes(projeto, [credenciaisGenericas], { contract: "revisao", caseKind: "auto" });
  rejeitarRegra(auditoriaRevisao, "implantation-negative-format-test");
  rejeitarRegra(auditoriaRevisao, "missing-smoke-button-coverage");
  exigirRegra(auditar(projeto, credenciaisGenericas), "implantation-negative-format-test");

  const consultaCompleta = "tests/e2e/consulta-completa.spec.js";
  escrever(path.join(projeto, consultaCompleta), `
const { test } = require('../fixtures/maximizedTest');
test('Consulta: localizar registro', async () => { await pagina.pesquisarRegistro(); await pagina.validarResultado(); });
  `);
  const consultaAuditada = auditarComOpcoes(projeto, [consultaCompleta], { contract: "implantacao", caseKind: "consulta" });
  rejeitarRegra(consultaAuditada, "missing-smoke-button-coverage");
  rejeitarRegra(consultaAuditada, "missing-consultation-coverage");

  const relatorioCompleto = "tests/e2e/relatorio-completo.spec.js";
  escrever(path.join(projeto, relatorioCompleto), `
const { test } = require('../fixtures/maximizedTest');
test('Relatorio: emitir documento', async () => { await pagina.imprimirRelatorio(); await pagina.validarDocumentoEmitido(); });
  `);
  rejeitarRegra(
    auditarComOpcoes(projeto, [relatorioCompleto], { contract: "implantacao", caseKind: "relatorio" }),
    "missing-report-coverage",
  );

  const formularioSemBotao = "tests/e2e/formulario-sem-botao.spec.js";
  escrever(path.join(projeto, formularioSemBotao), `const { test } = require('../fixtures/maximizedTest'); test('Formulario: acessar', async () => { await pagina.acessarFormulario(); });`);
  exigirRegra(auditar(projeto, formularioSemBotao), "missing-smoke-button-coverage");

  const formularioComSubmissaoSemantica = "tests/e2e/formulario-com-submissao-semantica.spec.js";
  escrever(path.join(projeto, formularioComSubmissaoSemantica), `
const { test } = require('../fixtures/maximizedTest');
test('Formulario: submeter proposta', async () => { await pagina.submeter(); await pagina.validarMensagemSucesso(); });
  `);
  rejeitarRegra(auditar(projeto, formularioComSubmissaoSemantica), "missing-smoke-button-coverage");

  const qualityComErro = executar(
    qualityGate,
    [projeto, "--contract", "implantacao", "--case-kind", "formulario", "--files", formularioSemBotao, "--json"],
    { allowFailure: true },
  );
  const resumoQualityComErro = JSON.parse(qualityComErro.stdout);
  assert.equal(resumoQualityComErro.ok, false);
  assert.equal(resumoQualityComErro.audit.ok, false);

  const remocaoSegura = "tests/e2e/remocao-segura.spec.js";
  escrever(path.join(projeto, remocaoSegura), `
const { test } = require('../fixtures/maximizedTest');
const { criarIdExecucao } = require('../utils/testData');

test('Remocao: smoke remove somente o alvo desta execucao', async () => {
  const idExecucao = criarIdExecucao('REMOVER');
  // O alvo e criado nesta spec para impedir qualquer acao sobre massa preexistente.
  await pagina.criarAlvoDaExecucao(idExecucao);
  await pagina.confirmarPersistenciaAlvo(idExecucao);
  await pagina.cancelarRemocao(idExecucao);
  await pagina.confirmarPermanenciaAlvo(idExecucao);
  await pagina.removerAlvoAtual(idExecucao);
  await pagina.confirmarAusenciaAlvo(idExecucao);
});
  `);
  const auditoriaRemocaoSegura = auditar(projeto, remocaoSegura);
  for (const regra of [
    "unsafe-destructive-without-run-id",
    "unsafe-destructive-without-created-target",
    "unsafe-destructive-without-persistence-proof",
    "unsafe-destructive-without-final-state",
    "destructive-shared-target",
    "destructive-cancel-without-permanence-proof",
  ]) rejeitarRegra(auditoriaRemocaoSegura, regra);

  const remocaoSemantica = "tests/e2e/remocao-semantica.spec.js";
  escrever(path.join(projeto, remocaoSemantica), `
const { test } = require('../fixtures/maximizedTest');
const { criarIdExecucao } = require('../utils/testData');
test('Remocao: acionar e confirmar ausencia', async () => {
  const idExecucao = criarIdExecucao('REMOVER');
  await pagina.criarAlvoDaExecucao(idExecucao);
  await pagina.confirmarPersistenciaAlvo(idExecucao);
  await pagina.acionarRemocao(idExecucao);
  await pagina.confirmarAusenciaAlvo(idExecucao);
});
  `);
  rejeitarRegra(
    auditarComOpcoes(projeto, [remocaoSemantica], { contract: "implantacao", caseKind: "remocao" }),
    "missing-destructive-operation",
  );

  const massaPorConsulta = "tests/e2e/massa-por-consulta.spec.js";
  escrever(path.join(projeto, massaPorConsulta), `
const { test } = require('../fixtures/maximizedTest');
test('Calendario: smoke evita colisao', async ({}, testInfo) => {
  const periodosExistentes = await pagina.obterPeriodosExistentes();
  const dadosCalendario = criarDadosCalendarioUniversitario(periodosExistentes);
  await pagina.validarObrigatoriedade(dadosCalendario);
  if (testInfo.errors.length > 0) return;
  await pagina.clicarConfirmar();
});
  `);
  rejeitarRegra(auditar(projeto, massaPorConsulta), "created-data-without-run-id");

  const confirmacaoSemAlteracao = "tests/e2e/confirmacao-sem-alteracao.spec.js";
  escrever(path.join(projeto, confirmacaoSemAlteracao), `
const { test } = require('../fixtures/maximizedTest');
test('Parametros: confirmar sem alterar dados', async () => {
  await pagina.confirmarSemAlterar();
  await pagina.cancelarEValidarRetorno();
});
  `);
  rejeitarRegra(auditar(projeto, confirmacaoSemAlteracao), "created-data-without-run-id");

  const casosSpec = [
    {
      nome: "relatorio-customizado",
      regra: "custom-validation-report",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async () => { const relatorio = new RelatorioValidacoes(); await pagina.clicarCadastrar(); void relatorio; });`,
    },
    {
      nome: "estado-manual",
      regra: "manual-implantation-flow-state",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async () => { let fluxoAcessivel = true; if (fluxoAcessivel) await pagina.clicarCadastrar(); });`,
    },
    {
      nome: "inventario-manual",
      regra: "manual-verification-inventory",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('Cadastro simples', async () => { const verificacoesPlanejadas = [{ id: 'acesso' }]; await pagina.clicarCadastrar(); void verificacoesPlanejadas; });`,
    },
    {
      nome: "orquestracao-do-lote",
      regra: "batch-orchestration-in-spec",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('Cadastro simples', async () => { const casoDeUso = { statusDoLote: 'pronto' }; await pagina.clicarCadastrar(); void casoDeUso; });`,
    },
    {
      nome: "estado-compartilhado",
      regra: "shared-use-case-state",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test.beforeAll(async () => { await pagina.criarMassa(); }); test('Cadastro simples', async () => { await pagina.clicarCadastrar(); });`,
    },
    {
      nome: "persistencia-sem-barreira",
      regra: "unsafe-positive-after-soft-required-failure",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async () => { await pagina.validarObrigatoriedade(campo); await pagina.clicarCadastrar(); });`,
    },
    {
      nome: "formato-negativo",
      regra: "implantation-negative-format-test",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async ({}, testInfo) => { const dataInvalida = '99/99/9999'; if (testInfo.errors.length) return; await pagina.clicarCadastrar(dataInvalida); });`,
    },
    {
      nome: "dependente-serial",
      regra: "dependent-serial-tests",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test.describe.serial('ciclo dependente', () => { test('smoke obrigatoriedade 1', async () => { await pagina.clicarCadastrar(); }); test('smoke obrigatoriedade 2', async () => { await pagina.clicarCadastrar(); }); });`,
    },
    {
      nome: "etapas-artificiais",
      regra: "technical-test-step",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async () => { await test.step('Clicar cadastrar', () => pagina.clicarCadastrar()); });`,
    },
    {
      nome: "anotacao-de-limitacao",
      regra: "implantation-annotation-noise",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async ({}, testInfo) => { testInfo.annotations.push({ type: 'limitacao', description: 'acao insegura' }); await pagina.clicarCadastrar(); });`,
    },
    {
      nome: "timeout-repetido-na-spec",
      regra: "redundant-per-spec-timeout",
      codigo: `const { test } = require('../fixtures/maximizedTest'); test('smoke obrigatoriedade', async () => { test.setTimeout(180_000); await pagina.clicarCadastrar(); });`,
    },
  ];
  for (const caso of casosSpec) {
    const arquivo = `tests/e2e/${caso.nome}.spec.js`;
    escrever(path.join(projeto, arquivo), caso.codigo);
    exigirRegra(auditar(projeto, arquivo), caso.regra);
  }

  const casosDestrutivos = [
    {
      nome: "remocao-sem-run-id",
      regra: "unsafe-destructive-without-run-id",
      codigo: `test('Remocao: smoke', async () => { await pagina.criarAlvo(); await pagina.confirmarPersistenciaAlvo(); await pagina.removerAlvoAtual(); await pagina.confirmarAusenciaAlvo(); });`,
    },
    {
      nome: "remocao-sem-criacao",
      regra: "unsafe-destructive-without-created-target",
      codigo: `test('Remocao: smoke', async () => { const idExecucao = Date.now(); await pagina.confirmarPersistenciaAlvo(idExecucao); await pagina.removerAlvoAtual(idExecucao); await pagina.confirmarAusenciaAlvo(idExecucao); });`,
    },
    {
      nome: "remocao-sem-persistencia",
      regra: "unsafe-destructive-without-persistence-proof",
      codigo: `test('Remocao: smoke', async () => { const idExecucao = Date.now(); await pagina.criarAlvoDaExecucao(idExecucao); await pagina.removerAlvoAtual(idExecucao); await pagina.confirmarAusenciaAlvo(idExecucao); });`,
    },
    {
      nome: "remocao-sem-estado-final",
      regra: "unsafe-destructive-without-final-state",
      codigo: `test('Remocao: smoke', async () => { const idExecucao = Date.now(); await pagina.criarAlvoDaExecucao(idExecucao); await pagina.confirmarPersistenciaAlvo(idExecucao); await pagina.removerAlvoAtual(idExecucao); });`,
    },
    {
      nome: "remocao-com-alvo-compartilhado",
      regra: "destructive-shared-target",
      codigo: `let registroCompartilhado; test.beforeAll(async () => { registroCompartilhado = 'x'; }); test('Remocao: smoke', async () => { const idExecucao = Date.now(); await pagina.criarAlvoDaExecucao(idExecucao); await pagina.confirmarPersistenciaAlvo(idExecucao); await pagina.removerAlvoAtual(idExecucao); await pagina.confirmarAusenciaAlvo(idExecucao); });`,
    },
    {
      nome: "cancelamento-sem-prova-de-permanencia",
      regra: "destructive-cancel-without-permanence-proof",
      codigo: `test('Remocao: smoke', async () => { const idExecucao = Date.now(); await pagina.criarAlvoDaExecucao(idExecucao); await pagina.confirmarPersistenciaAlvo(idExecucao); await pagina.cancelarRemocao(idExecucao); await pagina.removerAlvoAtual(idExecucao); await pagina.confirmarAusenciaAlvo(idExecucao); });`,
    },
    {
      nome: "etapa-tecnica-como-spec",
      regra: "technical-step-as-spec",
      codigo: `test('Confirmar', async () => { await pagina.clicarConfirmar(); });`,
    },
  ];
  for (const caso of casosDestrutivos) {
    const arquivo = `tests/e2e/${caso.nome}.spec.js`;
    escrever(path.join(projeto, arquivo), `const { test } = require('../fixtures/maximizedTest'); ${caso.codigo}`);
    exigirRegra(auditar(projeto, arquivo), caso.regra);
  }

  const timeoutExcepcional = "tests/e2e/timeout-excepcional.spec.js";
  escrever(path.join(projeto, timeoutExcepcional), `
const { test } = require('../fixtures/maximizedTest');
test('Fluxo excepcional', async () => {
  // Excecao comprovada: esta operacao aguarda processamento externo de quatro minutos.
  test.setTimeout(300_000);
  await pagina.clicarCadastrar();
});
  `);
  rejeitarRegra(auditar(projeto, timeoutExcepcional), "redundant-per-spec-timeout");

  const fluxoLento = "tests/e2e/fluxo-lento.spec.js";
  escrever(path.join(projeto, fluxoLento), `
const { test } = require('../fixtures/maximizedTest');
test('Fluxo comprovadamente lento', async () => {
  test.slow();
  await pagina.clicarCadastrar();
});
  `);
  rejeitarRegra(auditar(projeto, fluxoLento), "redundant-per-spec-timeout");

  const fallbackSelectJsf = "tests/pages/FallbackSelectJsfPage.js";
  escrever(path.join(projeto, fallbackSelectJsf), `
class FallbackSelectJsfPage {
  async limparSelectDependente(controle, placeholder) {
    // O change dispara AJAX JSF e restaura a primeira opcao; o alvo sera submetido logo depois.
    await controle.evaluate((select, valor) => { select.value = valor; }, placeholder);
  }
}
module.exports = { FallbackSelectJsfPage };
  `);
  rejeitarRegra(auditar(projeto, fallbackSelectJsf), "direct-dom-mutation");

  const casosPage = [
    {
      nome: "SemSoftPage",
      regra: "required-validation-without-soft-assertion",
      corpo: `async validarObrigatoriedade(campo) { const sentinela = campo; try { await this.clicarCadastrar(); await expect(campo.controle).toHaveValue(''); } finally { await sentinela.controle.fill('ok'); } } async clicarCadastrar() {}`,
    },
    {
      nome: "SemSentinelaPage",
      regra: "unsafe-required-submission",
      corpo: `async validarObrigatoriedade(campo) { try { await this.clicarCadastrar(); await expect.soft(campo.controle).toHaveValue(''); } finally { await campo.controle.fill('ok'); } } async clicarCadastrar() {}`,
    },
    {
      nome: "SemFinallyPage",
      regra: "required-validation-without-finally",
      corpo: `async validarObrigatoriedade(campo) { const sentinela = campo; await this.clicarCadastrar(); await expect.soft(sentinela.controle).toHaveValue(''); } async clicarCadastrar() {}`,
    },
    {
      nome: "AcopladaPage",
      regra: "page-object-runner-coupling",
      corpo: `async abrir(testInfo) { testInfo.annotations.push({ type: 'x' }); }`,
    },
    {
      nome: "MonoliticaPage",
      regra: "hidden-complete-scenario",
      corpo: `async executarSmokeCompleto() { await this.clicarCadastrar(); } async clicarCadastrar() {}`,
    },
    {
      nome: "DescritoresVerbososPage",
      regra: "verbose-required-descriptors",
      corpo: `obterCamposObrigatorios() {
        return [
          { campo: 'a',
            rotulo: 'A',
            controle: this.a,
            tipo: 'texto',
            valorValido: 'A' },
          { campo: 'b',
            rotulo: 'B',
            controle: this.b,
            tipo: 'texto',
            valorValido: 'B' },
          { campo: 'c',
            rotulo: 'C',
            controle: this.c,
            tipo: 'texto',
            valorValido: 'C' },
          { campo: 'd',
            rotulo: 'D',
            controle: this.d,
            tipo: 'texto',
            valorValido: 'D' },
          { campo: 'e',
            rotulo: 'E',
            controle: this.e,
            tipo: 'texto',
            valorValido: 'E' },
          { campo: 'f',
            rotulo: 'F',
            controle: this.f,
            tipo: 'texto',
            valorValido: 'F' },
          { campo: 'g',
            rotulo: 'G',
            controle: this.g,
            tipo: 'texto',
            valorValido: 'G' },
          { campo: 'h',
            rotulo: 'H',
            controle: this.h,
            tipo: 'texto',
            valorValido: 'H' },
        ];
      }`,
    },
    {
      nome: "SentinelaIntermediariaPage",
      regra: "single-use-sentinel-wrapper",
      corpo: `obterCampoSentinela(campos) { return campos.find((item) => item.campo === 'nome'); }
        async validarObrigatoriedade(campo, campos) { const sentinela = this.obterCampoSentinela(campos); await expect.soft(campo.controle).toBeVisible(); return sentinela; }`,
    },
    {
      nome: "ConfirmacaoDuplicadaPage",
      regra: "duplicated-confirmation-recovery",
      corpo: `async clicarConfirmandoUmaVez(alvo) { await alvo.click(); }
        async clicarComConfirmacao(alvo) { await this.clicarConfirmandoUmaVez(alvo); }`,
    },
    {
      nome: "ReentradaIntermediariaPage",
      regra: "single-use-navigation-wrapper",
      corpo: `async reabrirEscolha() { await this.page.goto('/menu'); await this.abrirOperacao(); }
        async cancelarEReabrir() { await this.reabrirEscolha(); } async abrirOperacao() {}`,
    },
    {
      nome: "CliqueComTimeoutLocalPage",
      regra: "redundant-local-action-timeout",
      corpo: `async clicar() { await this.botao.click({ timeout: 5_000 }); }`,
    },
    {
      nome: "SelecaoComTimeoutLocalPage",
      regra: "redundant-local-action-timeout",
      corpo: `async selecionar() { await this.campo.selectOption({ label: 'Ativo' }, { timeout: 10_000 }); }`,
    },
  ];
  for (const caso of casosPage) {
    const arquivo = `tests/pages/${caso.nome}.js`;
    escrever(path.join(projeto, arquivo), `const { expect } = require('@playwright/test'); class ${caso.nome} { ${caso.corpo} } module.exports = { ${caso.nome} };`);
    exigirRegra(auditar(projeto, arquivo), caso.regra);
  }

  const submissaoSemantica = "tests/pages/SubmissaoSemanticaPage.js";
  escrever(path.join(projeto, submissaoSemantica), `
const { expect } = require('@playwright/test');
class SubmissaoSemanticaPage {
  async submeter() { await this.botao.click(); await expect(this.sucesso).toBeVisible(); }
}
module.exports = { SubmissaoSemanticaPage };
  `);
  rejeitarRegra(auditar(projeto, submissaoSemantica), "hidden-complete-scenario");

  const muitosMetodosCoesos = "tests/pages/MuitosMetodosCoesosPage.js";
  const metodosCoesos = Array.from({ length: 40 }, (_, index) => `async acaoDaTela${index + 1}() { await this.page.getByText('Acao ${index + 1}').click(); }`).join("\n");
  escrever(path.join(projeto, muitosMetodosCoesos), `class MuitosMetodosCoesosPage { ${metodosCoesos} } module.exports = { MuitosMetodosCoesosPage };`);
  rejeitarRegra(auditar(projeto, muitosMetodosCoesos), "bloated-page-object");

  const literaisDeDominio = "tests/pages/LiteraisDeDominioPage.js";
  escrever(path.join(projeto, literaisDeDominio), `
class LiteraisDeDominioPage {
  async preencher() { await this.nota.fill('7.0'); await this.frequencia.fill('75.0'); await this.status.fill('ATIVO'); }
}
module.exports = { LiteraisDeDominioPage };
  `);
  rejeitarRegra(auditar(projeto, literaisDeDominio), "literal-fill-value");

  const locatorSemErroBruto = "tests/pages/LocatorSemErroBrutoPage.js";
  escrever(path.join(projeto, locatorSemErroBruto), `
class LocatorSemErroBrutoPage {
  async adicionar() { await this.linha.locator('img[title="Adicionar Docente"]').locator('..').click(); }
}
module.exports = { LocatorSemErroBrutoPage };
  `);
  rejeitarRegra(auditar(projeto, locatorSemErroBruto), "raw-error-literal");

  const erroBrutoReal = "tests/pages/ErroBrutoRealPage.js";
  escrever(path.join(projeto, erroBrutoReal), `class ErroBrutoRealPage { mensagem() { return 'TimeoutError: waiting for locator(\"#campo\")'; } } module.exports = { ErroBrutoRealPage };`);
  exigirRegra(auditar(projeto, erroBrutoReal), "raw-error-literal");

  const jsfEscapado = "tests/pages/JsfEscapadoPage.js";
  escrever(path.join(projeto, jsfEscapado), `class JsfEscapadoPage { constructor(page) { this.campo = page.locator('#form\\\\:campo'); } } module.exports = { JsfEscapadoPage };`);
  const achadosJsf = auditar(projeto, jsfEscapado).findings.filter((item) => item.rule.includes("jsf-id") || item.rule === "escaped-jsf-id");
  assert.equal(achadosJsf.length, 1);

  const consentimentoInline = "tests/pages/ConsentimentoInlinePage.js";
  escrever(path.join(projeto, consentimentoInline), `
class ConsentimentoInlinePage {
  constructor(page) {
    this.botaoCiente = page.getByRole('button', { name: 'Ciente' });
    this.usuario = page.locator('input[name="user.login"]');
  }
  async realizarLogin(username) {
    const apareceu = await this.botaoCiente.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false);
    if (apareceu) await this.botaoCiente.click();
    await this.usuario.fill(username);
  }
}
module.exports = { ConsentimentoInlinePage };
  `);
  const auditoriaConsentimentoInline = auditar(projeto, consentimentoInline);
  rejeitarRegra(auditoriaConsentimentoInline, "known-consent-not-proactive");
  rejeitarRegra(auditoriaConsentimentoInline, "consent-after-credentials");
  rejeitarRegra(auditoriaConsentimentoInline, "long-optional-consent-wait");

  const consentimentoTardio = "tests/pages/ConsentimentoTardioPage.js";
  escrever(path.join(projeto, consentimentoTardio), `
class ConsentimentoTardioPage {
  constructor(page) {
    this.botaoCiente = page.getByRole('button', { name: 'Ciente' });
    this.usuario = page.locator('input[name="user.login"]');
  }
  async realizarLogin(username) {
    await this.usuario.fill(username);
    await this.botaoCiente.click();
  }
}
module.exports = { ConsentimentoTardioPage };
  `);
  exigirRegra(auditar(projeto, consentimentoTardio), "consent-after-credentials");

  const consentimentoLento = "tests/pages/ConsentimentoLentoPage.js";
  escrever(path.join(projeto, consentimentoLento), `
class ConsentimentoLentoPage {
  constructor(page) {
    this.botaoCiente = page.getByRole('button', { name: 'Ciente' });
    this.usuario = page.locator('input[name="user.login"]');
  }
  async realizarLogin(username) {
    const apareceu = await this.botaoCiente.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
    if (apareceu) await this.botaoCiente.click();
    await this.usuario.fill(username);
  }
}
module.exports = { ConsentimentoLentoPage };
  `);
  exigirRegra(auditar(projeto, consentimentoLento), "long-optional-consent-wait");

  const timeoutJustificado = "tests/pages/TimeoutJustificadoPage.js";
  escrever(path.join(projeto, timeoutJustificado), `
class TimeoutJustificadoPage {
  async clicar() {
    // Limite funcional exigido pelo roteiro: a acao deve responder em dois segundos.
    await this.botao.click({ timeout: 2_000 });
  }
}
module.exports = { TimeoutJustificadoPage };
  `);
  rejeitarRegra(auditar(projeto, timeoutJustificado), "redundant-local-action-timeout");

  const opcoesCegas = "tests/pages/OpcoesCegasPage.js";
  escrever(path.join(projeto, opcoesCegas), `class OpcoesCegasPage { async escolher(controle) { await controle.selectOption({ index: 0 }); } } module.exports = { OpcoesCegasPage };`);
  exigirRegra(auditar(projeto, opcoesCegas), "blind-first-option");

  const primeiraLinhaFiltrada = "tests/pages/PrimeiraLinhaFiltradaPage.js";
  escrever(path.join(projeto, primeiraLinhaFiltrada), `
class PrimeiraLinhaFiltradaPage {
  async abrir(nome) {
    const candidatos = this.tabela
      .getByRole('row')
      .filter({ hasText: nome })
      .filter({ has: this.acaoAlterar });
    await candidatos.first().click();
  }
}
module.exports = { PrimeiraLinhaFiltradaPage };
  `);
  rejeitarRegra(auditar(projeto, primeiraLinhaFiltrada), "unfiltered-first");

  const primeiraLinhaCega = "tests/pages/PrimeiraLinhaCegaPage.js";
  escrever(path.join(projeto, primeiraLinhaCega), `
class PrimeiraLinhaCegaPage {
  async abrir() {
    await this.tabela.getByRole('row').first().click();
  }
}
module.exports = { PrimeiraLinhaCegaPage };
  `);
  exigirRegra(auditar(projeto, primeiraLinhaCega), "unfiltered-first");

  const remocaoPosicional = "tests/pages/RemocaoPosicionalPage.js";
  escrever(path.join(projeto, remocaoPosicional), `
class RemocaoPosicionalPage {
  async removerAlvo(idExecucao) {
    const linha = this.tabela.getByRole('row').filter({ hasText: idExecucao }).first();
    await linha.getByRole('button', { name: 'Remover' }).click();
  }
}
module.exports = { RemocaoPosicionalPage };
  `);
  exigirRegra(auditar(projeto, remocaoPosicional), "unsafe-destructive-row-scope");

  const autocompleteSeguro = "tests/pages/AutocompleteSeguroPage.js";
  escrever(path.join(projeto, autocompleteSeguro), `
const { expect } = require('@playwright/test');
class AutocompleteSeguroPage {
  normalizar(texto) { return texto.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toUpperCase(); }
  async selecionarSugestao(campo, valorEspecifico, valorExcluido) {
    const consulta = valorEspecifico?.trim() || '%%%';
    await campo.fill(consulta);
    const sugestoes = this.page.getByRole('option');
    const candidatos = [];
    for (const sugestao of await sugestoes.all()) {
      const texto = (await sugestao.textContent() || '').trim();
      if (!texto || !await sugestao.isVisible() || await sugestao.getAttribute('aria-disabled') === 'true') continue;
      if (valorExcluido && this.normalizar(texto) === this.normalizar(valorExcluido)) continue;
      candidatos.push({ sugestao, texto });
    }
    const valorNormalizado = valorEspecifico && this.normalizar(valorEspecifico);
    const correspondencias = valorEspecifico
      ? candidatos.filter(({ texto }) => this.normalizar(texto) === valorNormalizado)
      : candidatos;
    if (valorEspecifico && correspondencias.length !== 1) throw new Error('Autocomplete ambiguo ou ausente');
    const [candidato] = correspondencias;
    if (!candidato) throw new Error('Autocomplete sem candidato elegivel');
    await candidato.sugestao.click();
    await expect(campo).toHaveValue(candidato.texto);
  }
}
module.exports = { AutocompleteSeguroPage };
  `);
  for (const regra of [
    "autocomplete-hardcoded-person-query",
    "autocomplete-positional-candidate",
    "autocomplete-ignores-specific-value",
    "autocomplete-without-exact-match",
    "autocomplete-without-value-confirmation",
  ]) rejeitarRegra(auditar(projeto, autocompleteSeguro), regra);

  const autocompleteNomeFixo = "tests/pages/AutocompleteNomeFixoPage.js";
  escrever(path.join(projeto, autocompleteNomeFixo), `
class AutocompleteNomeFixoPage {
  async selecionarSugestao(consulta = 'BEATRIZ MENEZES') { await this.campo.fill(consulta); }
}
module.exports = { AutocompleteNomeFixoPage };
  `);
  exigirRegra(auditar(projeto, autocompleteNomeFixo), "autocomplete-hardcoded-person-query");

  const indiceForaDoAutocomplete = "tests/pages/IndiceForaDoAutocompletePage.js";
  escrever(path.join(projeto, indiceForaDoAutocomplete), `
const { expect } = require('@playwright/test');
class IndiceForaDoAutocompletePage {
  normalizar(texto) { return texto.trim().toUpperCase(); }
  async selecionarSugestao(campo, valorEspecifico) {
    const consulta = valorEspecifico?.trim() || '%%%';
    await campo.fill(consulta);
    const valorNormalizado = valorEspecifico && this.normalizar(valorEspecifico);
    const candidatos = this.sugestoes.filter(({ texto }) => this.normalizar(texto) === valorNormalizado);
    await candidatos.click();
    await expect(campo).toHaveValue(valorEspecifico);
  }
  async abrirSegundaAbaTecnica() { await this.abas.nth(1).click(); }
}
module.exports = { IndiceForaDoAutocompletePage };
  `);
  rejeitarRegra(auditar(projeto, indiceForaDoAutocomplete), "autocomplete-positional-candidate");

  const autocompletePosicional = "tests/pages/AutocompletePosicionalPage.js";
  escrever(path.join(projeto, autocompletePosicional), `
class AutocompletePosicionalPage {
  async selecionarSugestao() { await this.sugestoes.nth(1).click(); }
}
module.exports = { AutocompletePosicionalPage };
  `);
  exigirRegra(auditar(projeto, autocompletePosicional), "autocomplete-positional-candidate");

  const autocompleteIgnoraEspecifico = "tests/pages/AutocompleteIgnoraEspecificoPage.js";
  escrever(path.join(projeto, autocompleteIgnoraEspecifico), `
class AutocompleteIgnoraEspecificoPage {
  normalizar(texto) { return texto.trim().toUpperCase(); }
  async selecionarSugestao(valorEspecifico) {
    await this.campo.fill('%%%');
    const valorNormalizado = this.normalizar(valorEspecifico);
    const candidato = this.sugestoes.filter(({ texto }) => this.normalizar(texto) === valorNormalizado);
    await candidato.click();
  }
}
module.exports = { AutocompleteIgnoraEspecificoPage };
  `);
  const auditoriaIgnoraEspecifico = auditar(projeto, autocompleteIgnoraEspecifico);
  exigirRegra(auditoriaIgnoraEspecifico, "autocomplete-ignores-specific-value");
  exigirRegra(auditoriaIgnoraEspecifico, "autocomplete-without-value-confirmation");

  const autocompleteSemExatidao = "tests/pages/AutocompleteSemExatidaoPage.js";
  escrever(path.join(projeto, autocompleteSemExatidao), `
const { expect } = require('@playwright/test');
class AutocompleteSemExatidaoPage {
  async selecionarSugestao(valorEspecifico) {
    const consulta = valorEspecifico?.trim() || '%%%';
    await this.campo.fill(consulta);
    const candidato = this.sugestoes.filter({ hasText: valorEspecifico });
    await candidato.click();
    await expect(this.campo).toHaveValue(valorEspecifico);
  }
}
module.exports = { AutocompleteSemExatidaoPage };
  `);
  exigirRegra(auditar(projeto, autocompleteSemExatidao), "autocomplete-without-exact-match");

  const papeisSemDistincao = "tests/pages/PapeisSemDistincaoPage.js";
  escrever(path.join(projeto, papeisSemDistincao), `
const { expect } = require('@playwright/test');
class PapeisSemDistincaoPage {
  normalizar(texto) { return texto.trim().toUpperCase(); }
  async selecionarSugestao(campo, valorEspecifico) {
    const consulta = valorEspecifico?.trim() || '%%%';
    await campo.fill(consulta);
    const valorNormalizado = this.normalizar(valorEspecifico || '');
    const candidato = this.sugestoes.filter(({ texto }) => this.normalizar(texto) === valorNormalizado);
    await candidato.click();
    await expect(campo).toHaveValue(valorEspecifico);
  }
  async preencherCoordenadorEVice(coordenador, viceCoordenador) {}
}
module.exports = { PapeisSemDistincaoPage };
  `);
  exigirRegra(auditar(projeto, papeisSemDistincao), "related-autocomplete-without-distinct-candidates");

  const tentativaTecnica = "tests/pages/TentativaTecnicaPage.js";
  escrever(path.join(projeto, tentativaTecnica), `
class TentativaTecnicaPage {
  async localizarTentativa(runId) { return this.tabela.getByText(runId); }
}
module.exports = { TentativaTecnicaPage };
  `);
  exigirRegra(auditar(projeto, tentativaTecnica), "generation-attempt-method-in-project");

  const limpezaTecnica = "tests/e2e/limpeza-tecnica.spec.js";
  escrever(path.join(projeto, limpezaTecnica), `
const { test } = require('../fixtures/maximizedTest');
test.afterAll(async () => { await pagina.removerTentativa(); });
test('Cadastro: smoke conclui', async () => { await pagina.cadastrar(); });
  `);
  const auditoriaLimpezaTecnica = auditar(projeto, limpezaTecnica);
  exigirRegra(auditoriaLimpezaTecnica, "generation-cleanup-hook-in-project");
  exigirRegra(auditoriaLimpezaTecnica, "generation-attempt-method-in-project");

  const massasDuplicadas = "tests/e2e/massas-duplicadas.spec.js";
  escrever(path.join(projeto, massasDuplicadas), `
const { test } = require('../fixtures/maximizedTest');
test('Cadastro: smoke usa massas repetidas', async () => {
  const primeira = criarPropostaLato('RUN_1');
  const segunda = criarPropostaLato('RUN_2');
  await pagina.cadastrar(primeira);
  await pagina.cadastrar(segunda);
});
  `);
  exigirRegra(auditar(projeto, massasDuplicadas), "multiple-main-data-in-lifecycle");

  const massaPrincipalEAuxiliar = "tests/e2e/massa-principal-e-auxiliar.spec.js";
  escrever(path.join(projeto, massaPrincipalEAuxiliar), `
const { test } = require('../fixtures/maximizedTest');
test('Cadastro: smoke usa apoio sintetico', async () => {
  const proposta = criarPropostaLato('RUN_1');
  const componente = criarDadosComponente('RUN_1');
  await pagina.cadastrarProposta(proposta, componente);
});
  `);
  rejeitarRegra(auditar(projeto, massaPrincipalEAuxiliar), "multiple-main-data-in-lifecycle");

  const projetoCache = path.join(raizTemporaria, "cache-proibido");
  executar(scaffold, [projetoCache, "--mode", "implantacao"]);
  escrever(path.join(projetoCache, ".playwright-e2e", "cache", "flows.json"), "{}");
  exigirRegra(auditarCompleto(projetoCache), "generation-cache-in-project");

  const projetoScriptTentativa = path.join(raizTemporaria, "script-tentativa");
  executar(scaffold, [projetoScriptTentativa, "--mode", "implantacao"]);
  const packageScriptTentativa = JSON.parse(fs.readFileSync(path.join(projetoScriptTentativa, "package.json"), "utf8"));
  packageScriptTentativa.scripts["limpar-massa"] = "node scripts/limpar-massa.js";
  escrever(path.join(projetoScriptTentativa, "package.json"), JSON.stringify(packageScriptTentativa, null, 2));
  exigirRegra(auditarCompleto(projetoScriptTentativa), "generation-attempt-script-in-project");

  escrever(path.join(projeto, "tests", "pages", ".gitkeep"), "");
  exigirRegra(auditarCompleto(projeto), "redundant-gitkeep");

  const configSemHtml = path.join(projeto, "playwright.config.js");
  escrever(configSemHtml, fs.readFileSync(configSemHtml, "utf8").replace(/\s*\['html'[\s\S]*?\],\n/, ""));
  exigirRegra(auditar(projeto, specBoa), "missing-html-reporter");

  executar(scaffold, [projeto]);
  const packageDoProjeto = JSON.parse(fs.readFileSync(path.join(projeto, "package.json"), "utf8"));
  packageDoProjeto.devDependencies = { ...(packageDoProjeto.devDependencies || {}), "@playwright/test": "1.55.0" };
  escrever(path.join(projeto, "package.json"), JSON.stringify(packageDoProjeto, null, 2));
  executar(otimizarContexto, [projeto, "--mode", "implantacao", "--json"]);
  assert(!existe(projeto, ".playwright-e2e/cache"));

  const promptBase = `
MODO: Implantacao
URL: https://exemplo.invalid/app
USUARIO: exemplo
SENHA: exemplo
FONTES DE REFERENCIA:
AGENTS.md do modulo: /tmp/AGENTS.md
Codigo-fonte: /tmp/sistema
  `;
  const individual = otimizarPrompt(projeto, `${promptBase}\nCAMINHO: Modulo > Cadastro`);
  assert.equal(individual.normalizedInput.requestKind, "individual");
  assert.equal(individual.normalizedInput.contractComplete, true);

  const promptNumeradoBase = `
MODO: Implantacao
URL: https://exemplo.invalid/app

CASO DE USO 1:
OPERACAO: Cadastrar curso
CAMINHO: Stricto > Cursos > Cadastrar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um
MASSA E PRE-CONDICOES: Programa disponivel
DADOS ESPECIFICOS: Situacao ativa
RESULTADO ESPERADO: Cadastro concluido
OBSERVACOES: Nao alterar registros existentes

FONTES DE REFERENCIA:
AGENTS.md do modulo: /tmp/AGENTS.md
Codigo-fonte: /tmp/sistema
  `;
  const umCaso = otimizarPrompt(projeto, promptNumeradoBase);
  assert.equal(umCaso.normalizedInput.requestKind, "lote");
  assert.equal(umCaso.normalizedInput.useCaseCount, 1);
  assert.equal(umCaso.normalizedInput.readyUseCaseCount, 1);
  assert.equal(umCaso.normalizedInput.contractComplete, true);
  assert.equal(umCaso.normalizedInput.useCases[0].hasMass, true);
  assert.equal(umCaso.normalizedInput.useCases[0].hasSpecificData, true);
  assert.equal(umCaso.normalizedInput.useCases[0].hasExpectedResult, true);
  assert.equal(umCaso.normalizedInput.useCases[0].hasObservations, true);
  assert.doesNotMatch(JSON.stringify(umCaso), /usuario-um|segredo-um|Cadastrar curso/);

  const doisCasos = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 2:
OPERACAO: Consultar curso
CAMINHO: Stricto > Cursos > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

FONTES DE REFERENCIA:`,
  ));
  assert.equal(doisCasos.normalizedInput.useCaseCount, 2);
  assert.deepEqual(doisCasos.normalizedInput.readyUseCaseNumbers, [1, 2]);
  assert.equal(doisCasos.normalizedInput.allUseCasesComplete, true);

  const tresCasos = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 2:
OPERACAO: Consultar curso
CAMINHO: Stricto > Cursos > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

CASO DE USO 3:
OPERACAO: Consultar calendario
CAMINHO: Stricto > Calendario > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

FONTES DE REFERENCIA:`,
  ));
  assert.equal(tresCasos.normalizedInput.useCaseCount, 3);
  assert.deepEqual(tresCasos.normalizedInput.readyUseCaseNumbers, [1, 2, 3]);

  for (const [linha, vazia, bloqueio] of [
    ["OPERACAO: Cadastrar curso", "OPERACAO:", "operacao-ausente"],
    ["CAMINHO: Stricto > Cursos > Cadastrar", "CAMINHO:", "caminho-ausente"],
    ["PERFIL: Gestor Stricto", "PERFIL:", "perfil-ausente"],
    ["USUARIO: usuario-um", "USUARIO:", "usuario-ausente"],
    ["SENHA: segredo-um", "SENHA:", "senha-ausente"],
  ]) {
    const ausente = otimizarPrompt(projeto, promptNumeradoBase.replace(linha, vazia));
    assert.equal(ausente.normalizedInput.readyUseCaseCount, 0);
    assert(ausente.normalizedInput.blockedUseCases[0].reasons.includes(bloqueio));
  }

  const casoParcial = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 2:
OPERACAO: Consultar calendario
CAMINHO: Stricto > Calendario > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA:

FONTES DE REFERENCIA:`,
  ));
  assert.equal(casoParcial.normalizedInput.contractComplete, true);
  assert.deepEqual(casoParcial.normalizedInput.readyUseCaseNumbers, [1]);
  assert.deepEqual(casoParcial.normalizedInput.blockedUseCases, [{ number: 2, reasons: ["senha-ausente"] }]);
  assert.equal(casoParcial.nextAction, "processar-casos-prontos-e-relatar-bloqueados");

  const numeracaoInvalida = otimizarPrompt(projeto, promptNumeradoBase.replace("CASO DE USO 1:", "CASO DE USO 2:"));
  assert.equal(numeracaoInvalida.normalizedInput.numberingValid, false);
  assert.equal(numeracaoInvalida.normalizedInput.contractComplete, false);
  assert.equal(numeracaoInvalida.nextAction, "corrigir-numeracao-dos-casos");

  const numeroRepetido = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 1:
OPERACAO: Consultar curso
CAMINHO: Stricto > Cursos > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

FONTES DE REFERENCIA:`,
  ));
  assert.equal(numeroRepetido.normalizedInput.numberingValid, false);

  const numeroForaDeOrdem = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 3:
OPERACAO: Consultar curso
CAMINHO: Stricto > Cursos > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

FONTES DE REFERENCIA:`,
  ));
  assert.equal(numeroForaDeOrdem.normalizedInput.numberingValid, false);

  const numeroAusente = otimizarPrompt(projeto, promptNumeradoBase.replace("CASO DE USO 1:", "CASO DE USO:"));
  assert.equal(numeroAusente.normalizedInput.numberingValid, false);
  assert.equal(numeroAusente.nextAction, "corrigir-numeracao-dos-casos");

  const casoDuplicado = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 2:
OPERACAO: Cadastrar curso
CAMINHO: Stricto > Cursos > Cadastrar
PERFIL: Gestor Stricto
USUARIO: usuario-um
SENHA: segredo-um

FONTES DE REFERENCIA:`,
  ));
  assert.deepEqual(casoDuplicado.normalizedInput.duplicateUseCases, [{ number: 2, duplicateOf: 1 }]);
  assert.deepEqual(casoDuplicado.normalizedInput.readyUseCaseNumbers, [1]);

  const credenciaisConflitantes = otimizarPrompt(projeto, promptNumeradoBase.replace(
    "\nFONTES DE REFERENCIA:",
    `
CASO DE USO 2:
OPERACAO: Consultar curso
CAMINHO: Stricto > Cursos > Listar
PERFIL: Gestor Stricto
USUARIO: usuario-dois
SENHA: segredo-dois

FONTES DE REFERENCIA:`,
  ));
  assert.deepEqual(credenciaisConflitantes.normalizedInput.inconsistentProfileCaseNumbers, [1, 2]);
  assert.equal(credenciaisConflitantes.normalizedInput.readyUseCaseCount, 0);
  assert.equal(credenciaisConflitantes.nextAction, "corrigir-credenciais-conflitantes");
  assert.doesNotMatch(JSON.stringify(credenciaisConflitantes), /usuario-dois|segredo-dois/);

  const formatoSeparado = otimizarPrompt(projeto, `${promptNumeradoBase}\nCREDENCIAIS:\nCASOS DE USO:`);
  assert.equal(formatoSeparado.normalizedInput.requestKind, "secoes-separadas");
  assert.equal(formatoSeparado.nextAction, "juntar-credenciais-em-cada-caso");

  const formatoMisto = otimizarPrompt(projeto, promptNumeradoBase.replace("URL: https://exemplo.invalid/app", "URL: https://exemplo.invalid/app\nCAMINHO: Modulo > Cadastro"));
  assert.equal(formatoMisto.normalizedInput.requestKind, "misto");
  assert.equal(formatoMisto.nextAction, "escolher-formato-individual-ou-numerado");

  const guiaRecusado = otimizarPrompt(projeto, `${promptBase}\nGUIA DE NAVEGACAO: /tmp/guia.pdf\nABRANGENCIA: Guia completo`);
  assert.equal(guiaRecusado.normalizedInput.requestKind, "guia-removido");
  assert.equal(guiaRecusado.normalizedInput.contractComplete, false);
  assert.equal(guiaRecusado.nextAction, "converter-guia-em-casos-de-uso");

  for (const campoRemovido of ["ABRANGENCIA: Casos selecionados", "SECOES/CASOS: Cursos"]) {
    const recusado = otimizarPrompt(projeto, `${promptBase}\n${campoRemovido}`);
    assert.equal(recusado.normalizedInput.requestKind, "guia-removido");
    assert.equal(recusado.nextAction, "converter-guia-em-casos-de-uso");
  }

  for (const campoGlobal of [
    "URL: https://exemplo.invalid/app",
    "AGENTS.md do modulo: /tmp/AGENTS.md",
    "Codigo-fonte: /tmp/sistema",
  ]) {
    const globalIncompleto = otimizarPrompt(projeto, promptNumeradoBase.replace(campoGlobal, campoGlobal.slice(0, campoGlobal.indexOf(":") + 1)));
    assert.equal(globalIncompleto.normalizedInput.contractComplete, false);
    assert(globalIncompleto.riskFlags.includes("missing-minimum-contract"));
  }

  const contexto = executar(otimizarContexto, [projeto, "--mode", "implantacao", "--json"], { allowFailure: true });
  const resumoContexto = JSON.parse(contexto.stdout);
  assert.equal(resumoContexto.projectShape.isPlaywrightProject, true);
  assert.match(resumoContexto.recommendedCommand, /test:headed|playwright test/);

  const autoAuditoria = executar(
    qualityGate,
    [raizPlugin, "--contract", "revisao", "--exclude", "scripts/test-plugin-contract.mjs", "--json"],
    { allowFailure: true },
  );
  assert.equal(autoAuditoria.status, 0, autoAuditoria.stderr || autoAuditoria.stdout);
  const resumoAutoAuditoria = JSON.parse(autoAuditoria.stdout);
  assert.equal(resumoAutoAuditoria.audit.errors, 0);
  assert.equal(resumoAutoAuditoria.audit.warnings, 0);
  assert.equal(resumoAutoAuditoria.contract, "revisao");

  const exclusoesRepetidas = executar(
    auditor,
    [projeto, "--files", specBoa, pageBoa, "--exclude", specBoa, "--exclude", pageBoa, "--contract", "revisao", "--json"],
    { allowFailure: true },
  );
  assert.equal(JSON.parse(exclusoesRepetidas.stdout).scannedFiles, 0);

  const contratoInvalido = executar(auditor, [projeto, "--contract", "desconhecido", "--json"], { allowFailure: true });
  exigirRegra(JSON.parse(contratoInvalido.stdout), "invalid-audit-contract");
  const tipoInvalido = executar(auditor, [projeto, "--case-kind", "desconhecido", "--json"], { allowFailure: true });
  exigirRegra(JSON.parse(tipoInvalido.stdout), "invalid-case-kind");

  console.log("OK: contratos do plugin Playwright MCP E2E 3.0.0 validados.");
} finally {
  fs.rmSync(raizTemporaria, { recursive: true, force: true });
}
