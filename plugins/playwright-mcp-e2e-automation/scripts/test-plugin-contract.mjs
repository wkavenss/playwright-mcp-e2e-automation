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
const otimizador = path.join(diretorioScript, "optimize-context.mjs");
const scannerPublico = path.join(diretorioScript, "scan-public-leaks.mjs");
const temporario = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-plugin-contract-"));

function executar(script, argumentos = [], { allowFailure = false, cwd } = {}) {
  const resultado = spawnSync(process.execPath, [script, ...argumentos], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && resultado.status !== 0) {
    throw new Error(`${path.basename(script)} falhou:\n${resultado.stderr || resultado.stdout}`);
  }
  return resultado;
}

function escrever(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${conteudo.trim()}\n`, "utf8");
}

function existe(raiz, arquivo) {
  return fs.existsSync(path.join(raiz, arquivo));
}

function auditar(raiz, arquivos = [], contract = "revisao", caseKind = "auto") {
  const argumentos = [raiz];
  if (arquivos.length) argumentos.push("--files", ...arquivos);
  argumentos.push("--contract", contract);
  if (caseKind !== "auto") argumentos.push("--case-kind", caseKind);
  argumentos.push("--json");
  const resultado = executar(auditor, argumentos, { allowFailure: true });
  assert.match(resultado.stdout, /^\s*\{/);
  return JSON.parse(resultado.stdout);
}

function regras(resumo) {
  return new Set(resumo.findings.map(({ rule }) => rule));
}

function exigirRegra(resumo, regra) {
  assert(regras(resumo).has(regra), `Auditor nao encontrou ${regra}`);
}

function rejeitarRegra(resumo, regra) {
  assert(!regras(resumo).has(regra), `Auditor encontrou indevidamente ${regra}`);
}

function exigirErro(resumo, regra) {
  const achado = resumo.findings.find((item) => item.rule === regra);
  assert(achado, `Auditor nao encontrou ${regra}`);
  assert.equal(achado.severity, "error", `${regra} deveria ser bloqueante`);
}

try {
  const manifesto = JSON.parse(fs.readFileSync(path.join(raizPlugin, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifesto.version, "3.1.2");
  assert.match(manifesto.interface.longDescription, /autenticacao fora dos testes reportados/);
  assert.match(manifesto.interface.longDescription, /dominio rastreado ate o produtor funcional/);
  assert.match(manifesto.interface.longDescription, /relatorio HTML nativo/);

  const mcp = JSON.parse(fs.readFileSync(path.join(raizPlugin, ".mcp.json"), "utf8"));
  const mcpArgs = Object.values(mcp.mcpServers || {}).flatMap((servidor) => servidor.args || []);
  assert(mcpArgs.includes("@playwright/mcp@0.0.78"), "MCP deve usar a versao validada exata");
  assert(!mcpArgs.some((argumento) => /@latest$/.test(argumento)), "MCP nao pode depender de latest");

  const skillImplantacao = fs.readFileSync(
    path.join(raizPlugin, "skills", "criar-testes-implantacao-playwright", "SKILL.md"),
    "utf8",
  );
  assert.match(skillImplantacao, /produtor gera somente `MODULO`/);
  assert.match(skillImplantacao, /busca e a alteracao nao podem selecionar `DISCIPLINA`/);
  assert.match(skillImplantacao, /etapa generica que nao oferece o tipo real do alvo/);
  assert.match(skillImplantacao, /cancelar nessa etapa e refazer a busca pelo mesmo alvo/);
  assert.match(skillImplantacao, /Nao criar `qaEvidence`/);
  assert.match(skillImplantacao, /reporter HTML nativo/);
  assert.match(skillImplantacao, /--contract implantacao --case-kind <tipo> --files/);
  assert.match(skillImplantacao, /Exigir `AGENTS\.md` e raiz do codigo-fonte como fontes de evidencia globais/);
  assert.match(skillImplantacao, /somente as instrucoes aninhadas aplicaveis ao modulo\/caminho/);
  assert.match(skillImplantacao, /Nao ampliar o smoke/);
  assert.doesNotMatch(skillImplantacao, /AGENTS\.md e codigo-fonte sao opcionais/);
  assert.match(skillImplantacao, /filtros de arquivo do comando em `config\.argv`/);
  assert.match(skillImplantacao, /No UI Mode, o Playwright chama o `globalSetup` antes de exibir a lista/);
  assert.match(skillImplantacao, /fixture automatica/);
  assert.doesNotMatch(skillImplantacao, /E2E_AUTH_SPEC_IDS/);
  assert.match(skillImplantacao, /`SENHA` e `RESULTADO ESPERADO`/);
  assert.match(skillImplantacao, /validarAusenciaErroImpeditivo/);
  assert.match(skillImplantacao, /`submeter\(\)`, `validarMensagemSucesso\(\)` e `validarPersistencia\(\)`/);
  assert.match(skillImplantacao, /Nao gerar assertions de `maxlength`/);

  const projetoContratoEntrada = path.join(temporario, "contrato-entrada");
  fs.mkdirSync(path.join(projetoContratoEntrada, "codigo"), { recursive: true });
  escrever(path.join(projetoContratoEntrada, "AGENTS.md"), "# Instrucoes do modulo");
  const promptSemFontes = "prompt-sem-fontes.txt";
  escrever(path.join(projetoContratoEntrada, promptSemFontes), `
MODO: Implantacao
URL: https://example.test
CASO DE USO 1:
OPERACAO: Cadastrar item
CAMINHO: Menu > Cadastrar
PERFIL: Gestor
USUARIO: usuario
SENHA: senha
RESULTADO ESPERADO: Item cadastrado
  `);
  const contratoSemFontes = JSON.parse(executar(
    otimizador,
    [projetoContratoEntrada, "--input", promptSemFontes, "--json"],
  ).stdout);
  assert.equal(contratoSemFontes.normalizedInput.contractComplete, false);
  assert(contratoSemFontes.riskFlags.includes("missing-minimum-contract"));

  const promptComFontes = "prompt-com-fontes.txt";
  escrever(path.join(projetoContratoEntrada, promptComFontes), `
MODO: Implantacao
URL: https://example.test
CASO DE USO 1:
OPERACAO: Cadastrar item
CAMINHO: Menu > Cadastrar
PERFIL: Gestor
USUARIO: usuario
SENHA: senha
RESULTADO ESPERADO: Item cadastrado
AGENTS.md: AGENTS.md
CODIGO-FONTE: codigo
  `);
  const contratoComFontes = JSON.parse(executar(
    otimizador,
    [projetoContratoEntrada, "--input", promptComFontes, "--json"],
  ).stdout);
  assert.equal(contratoComFontes.normalizedInput.agentsReadable, true);
  assert.equal(contratoComFontes.normalizedInput.sourceReadable, true);
  assert.equal(contratoComFontes.normalizedInput.contractComplete, true);
  assert.doesNotMatch(skillImplantacao, /anexar exatamente um JSON|reporter `blob`|npm run test:qa/);

  const arquivosProibidos = [
    "tests/utils/authState.js",
    "tests/utils/qaEvidence.js",
    "tests/qa/implantation-contract.json",
    "scripts/lib/readZip.mjs",
    "scripts/qa-runner.mjs",
    "scripts/scan-sensitive-artifacts.mjs",
  ];

  for (const modo of ["basico", "massa", "implantacao"]) {
    const projeto = path.join(temporario, `scaffold-${modo}`);
    const resultadoScaffold = executar(scaffold, [projeto, "--mode", modo]);
    assert.equal(JSON.parse(resultadoScaffold.stdout).baseComum, true);
    for (const arquivo of [
      "playwright.config.js",
      ".env.example",
      "tests/utils/authProfiles.js",
      "tests/utils/testData.js",
      "tests/fixtures/maximizedTest.js",
    ]) assert(existe(projeto, arquivo), `${modo} nao criou ${arquivo}`);
    for (const arquivo of arquivosProibidos) {
      assert(!existe(projeto, arquivo), `${modo} criou infraestrutura desnecessaria: ${arquivo}`);
    }
    const packageJson = JSON.parse(fs.readFileSync(path.join(projeto, "package.json"), "utf8"));
    assert.equal(packageJson.scripts.test, "playwright test");
    assert.equal(packageJson.scripts["test:headed"], "playwright test --headed");
    assert.equal(packageJson.scripts["test:qa"], undefined);
    assert.equal(packageJson.scripts["test:qa:scan"], undefined);
  }

  const projetoEvidencia = path.join(temporario, "evidencia-manual");
  executar(scaffold, [projetoEvidencia, "--mode", "implantacao"]);
  escrever(
    path.join(projetoEvidencia, "tests", "utils", "qaEvidence.js"),
    "function anexarEvidenciaQa() {}\nmodule.exports = { anexarEvidenciaQa };",
  );
  const packageEvidencia = JSON.parse(fs.readFileSync(path.join(projetoEvidencia, "package.json"), "utf8"));
  packageEvidencia.scripts["test:qa"] = "node scripts/qa-runner.mjs";
  escrever(path.join(projetoEvidencia, "package.json"), JSON.stringify(packageEvidencia, null, 2));
  exigirRegra(auditar(projetoEvidencia), "manual-qa-evidence-layer");

  const projetoDominio = path.join(temporario, "dominio");
  executar(scaffold, [projetoDominio, "--mode", "implantacao"]);
  const dominioIncorreto = "tests/pages/ComponentePage.js";
  escrever(path.join(projetoDominio, dominioIncorreto), `
class ComponentePage {
  async buscarModuloPorCodigo() { await this.tipo.selectOption('MODULO'); }
  async abrirAlteracao() { await this.tipo.selectOption({ label: 'DISCIPLINA' }); }
}
module.exports = { ComponentePage };
  `);
  exigirRegra(auditar(projetoDominio, [dominioIncorreto]), "domain-value-conflicts-with-operation");

  const dominioCorreto = "tests/pages/ModuloPage.js";
  escrever(path.join(projetoDominio, dominioCorreto), `
class ModuloPage {
  async alterarModulo() { await this.tipo.selectOption({ label: 'MODULO' }); }
}
module.exports = { ModuloPage };
  `);
  rejeitarRegra(auditar(projetoDominio, [dominioCorreto]), "domain-value-conflicts-with-operation");

  const projetoSeguranca = path.join(temporario, "seguranca");
  executar(scaffold, [projetoSeguranca, "--mode", "implantacao"]);
  const specLogin = "tests/e2e/login.spec.js";
  escrever(path.join(projetoSeguranca, specLogin), `
const { test } = require('../fixtures/maximizedTest');
test('Sessao', async ({ page }) => { await acesso.realizarLogin(); await page.waitForLoadState(); });
  `);
  exigirRegra(auditar(projetoSeguranca, [specLogin]), "auth-inside-reported-test");

  const specRecuperacao = "tests/e2e/recuperacao.spec.js";
  escrever(path.join(projetoSeguranca, specRecuperacao), `
const { test } = require('../fixtures/maximizedTest');
test('Cadastro', async () => { await pagina.recuperarProposta(); });
  `);
  exigirRegra(auditar(projetoSeguranca, [specRecuperacao]), "unsafe-recovery-branch");

  const paginaObrigatorio = "tests/pages/ObrigatorioPage.js";
  escrever(path.join(projetoSeguranca, paginaObrigatorio), `
class ObrigatorioPage {
  async validarObrigatoriedade() { await expect(this.page.getByText(/Campo obrigatorio/).first()).toBeVisible(); }
}
module.exports = { ObrigatorioPage };
  `);
  exigirRegra(auditar(projetoSeguranca, [paginaObrigatorio]), "required-message-can-match-label");

  const paginaCopia = "tests/pages/CopiaPage.js";
  escrever(path.join(projetoSeguranca, paginaCopia), `
class CopiaPage {
  async abrirCadastrarNovoCurso() {
    await this.page.getByText('Cadastrar Novo Curso').click();
    await this.page.getByRole('heading', { name: 'Cadastrar Curso' }).waitFor();
  }
}
module.exports = { CopiaPage };
  `);
  exigirRegra(auditar(projetoSeguranca, [paginaCopia]), "copy-existing-without-field-proof");

  const projetoRiscos = path.join(temporario, "riscos-implantacao");
  executar(scaffold, [projetoRiscos, "--mode", "implantacao"]);
  const paginaRiscos = "tests/pages/RiscosPage.js";
  escrever(path.join(projetoRiscos, paginaRiscos), `
const { expect } = require('@playwright/test');
class RiscosPage {
  async executar(valor) {
    const periodo = { anoInicio: 2130 };
    await this.page.waitForTimeout(1000);
    await this.botao.click({ force: true });
    await this.linhas.nth(1).click();
    await this.opcoes.first().click();
    await this.page.locator('table.lista tbody tr').count();
    await expect(this.nome).toHaveAttribute('maxlength', '50');
    await this.nome.fill(valor);
    await this.nome.fill(valor);
    return periodo;
  }

  async submeter() {
    await this.botao.click();
    await expect(this.mensagem).toHaveText('Operacao realizada com sucesso');
  }
}
module.exports = { RiscosPage };
  `);
  const riscos = auditar(projetoRiscos, [paginaRiscos], "implantacao");
  for (const regra of [
    "fixed-timeout",
    "force-true-action",
    "nth-selector",
    "unfiltered-first",
    "structural-table-selector",
    "implantation-html-contract-assertion",
    "duplicated-locator-action",
    "far-future-generic-date",
    "action-hides-result-assertion",
  ]) exigirErro(riscos, regra);

  const paginaResponsabilidades = "tests/pages/PropostaGrandePage.js";
  const linhasResponsabilidades = Array.from({ length: 430 }, (_, indice) => `  // detalhe funcional ${indice}`).join('\n');
  escrever(path.join(projetoRiscos, paginaResponsabilidades), `
class PropostaGrandePage {
  async avancarDadosGerais() {}
  async abrirVisualizacao() {}
  async remover() {}
${linhasResponsabilidades}
}
module.exports = { PropostaGrandePage };
  `);
  exigirRegra(auditar(projetoRiscos, [paginaResponsabilidades], "implantacao"), "mixed-page-object-responsibilities");

  const projetoConsulta = path.join(temporario, "consulta");
  executar(scaffold, [projetoConsulta, "--mode", "implantacao"]);
  const globalSetup = "tests/auth/globalSetup.js";
  const specProfiles = "tests/auth/specProfiles.js";
  escrever(path.join(projetoConsulta, specProfiles), `
const specsAutenticadas = [
  { id: 'consulta', perfil: 'qa', arquivo: 'tests/e2e/consulta.spec.js' },
];
module.exports = { specsAutenticadas };
  `);
  escrever(path.join(projetoConsulta, globalSetup), `
const { specsAutenticadas } = require('./specProfiles');
module.exports = async function globalSetup(config) {
  if (config.argv.includes('--ui')) return;
  const filtros = config.argv.slice(config.argv.indexOf('test') + 1);
  const specs = filtros.length
    ? specsAutenticadas.filter(({ arquivo }) => filtros.some((filtro) => arquivo.includes(filtro)))
    : specsAutenticadas;
  if (!specs.length) throw new Error('Nenhuma spec corresponde ao comando');
  return specs;
};
  `);
  escrever(path.join(projetoConsulta, "tests/fixtures/maximizedTest.js"), `
const base = require('@playwright/test');
const { specsAutenticadas } = require('../auth/specProfiles');
const { obterCredenciais } = require('../utils/authProfiles');
const test = base.test.extend({
  autenticacaoUi: [async ({}, use, testInfo) => {
    if (testInfo.config.argv.includes('--ui')) {
      const spec = specsAutenticadas.find(({ arquivo }) => testInfo.file.endsWith(arquivo));
      obterCredenciais(spec.perfil);
      const contexto = { storageState: async () => {} };
      await contexto.storageState({ path: spec.id });
    }
    await use();
  }, { auto: true }],
});
module.exports = { expect: base.expect, test };
  `);
  const paginaConsulta = "tests/pages/ConsultaPage.js";
  escrever(path.join(projetoConsulta, paginaConsulta), `
class ConsultaPage {
  async buscarItens() { await this.botaoBuscar.click(); }
  async validarResultados() { return true; }
  async validarAusenciaErroImpeditivo() { return true; }
}
module.exports = { ConsultaPage };
  `);
  const specConsulta = "tests/e2e/consulta.spec.js";
  escrever(path.join(projetoConsulta, specConsulta), `
const { test } = require('../fixtures/maximizedTest');
test('deve consultar itens quando o filtro for informado', async () => {
  await consultaPage.validarAusenciaErroImpeditivo();
  await consultaPage.buscarItens();
  await consultaPage.validarResultados();
  await consultaPage.validarAusenciaErroImpeditivo();
});
  `);
  const consultaValida = auditar(projetoConsulta, [specConsulta, paginaConsulta, globalSetup], "implantacao", "consulta");
  rejeitarRegra(consultaValida, "missing-consultation-coverage");
  rejeitarRegra(consultaValida, "missing-blocking-error-checkpoint");
  rejeitarRegra(consultaValida, "missing-scoped-auth-selection");
  rejeitarRegra(consultaValida, "missing-ui-auth-defer");
  rejeitarRegra(consultaValida, "missing-ui-lazy-auth");

  const specSemCheckpoint = "tests/e2e/consulta-sem-checkpoint.spec.js";
  escrever(path.join(projetoConsulta, specSemCheckpoint), `
const { test } = require('../fixtures/maximizedTest');
test('deve consultar itens quando o filtro for informado', async () => {
  await consultaPage.buscarItens();
  await consultaPage.validarResultados();
});
  `);
  exigirErro(
    auditar(projetoConsulta, [specSemCheckpoint, paginaConsulta, globalSetup], "implantacao", "consulta"),
    "missing-blocking-error-checkpoint",
  );

  const projetoAuthIncorreta = path.join(temporario, "auth-nao-escopada");
  executar(scaffold, [projetoAuthIncorreta, "--mode", "implantacao"]);
  escrever(path.join(projetoAuthIncorreta, paginaConsulta), fs.readFileSync(path.join(projetoConsulta, paginaConsulta), "utf8"));
  escrever(path.join(projetoAuthIncorreta, specConsulta), fs.readFileSync(path.join(projetoConsulta, specConsulta), "utf8"));
  escrever(path.join(projetoAuthIncorreta, specProfiles), fs.readFileSync(path.join(projetoConsulta, specProfiles), "utf8"));
  escrever(path.join(projetoAuthIncorreta, globalSetup), "module.exports = async () => ['todos'];");
  exigirErro(
    auditar(projetoAuthIncorreta, [specConsulta, paginaConsulta, globalSetup], "implantacao", "consulta"),
    "missing-scoped-auth-selection",
  );

  escrever(path.join(projetoAuthIncorreta, globalSetup), `
const { specsAutenticadas } = require('./specProfiles');
module.exports = async function globalSetup() {
  const ids = process.env.E2E_AUTH_SPEC_IDS || 'all';
  return ids === 'all' ? specsAutenticadas : specsAutenticadas.filter(({ id }) => id === ids);
};
  `);
  exigirErro(
    auditar(projetoAuthIncorreta, [specConsulta, paginaConsulta, globalSetup], "implantacao", "consulta"),
    "manual-scoped-auth-selection",
  );

  const projetoDestrutivo = path.join(temporario, "destrutivo-explicito");
  executar(scaffold, [projetoDestrutivo, "--mode", "implantacao"]);
  escrever(path.join(projetoDestrutivo, globalSetup), fs.readFileSync(path.join(projetoConsulta, globalSetup), "utf8"));
  escrever(path.join(projetoDestrutivo, specProfiles), fs.readFileSync(path.join(projetoConsulta, specProfiles), "utf8"));
  const paginaDestrutiva = "tests/pages/RegistroPage.js";
  escrever(path.join(projetoDestrutivo, paginaDestrutiva), `
class RegistroPage {
  async validarAusenciaErroImpeditivo() { return true; }
  async criarAlvo(runId) { await this.cadastrar.click(); return { runId }; }
  async validarPersistenciaDoAlvo() { return true; }
  async removerAlvo() { await this.remover.click(); }
  async validarAusenciaFinal() { return true; }
}
module.exports = { RegistroPage };
  `);
  const specDestrutiva = "tests/e2e/remover-registro.spec.js";
  escrever(path.join(projetoDestrutivo, specDestrutiva), `
const { test } = require('../fixtures/maximizedTest');
const { criarIdExecucao } = require('../utils/testData');
test('deve remover o registro criado na execucao', async () => {
  const runId = criarIdExecucao('registro');
  await registroPage.validarAusenciaErroImpeditivo();
  const alvo = await registroPage.criarAlvo(runId);
  await registroPage.validarPersistenciaDoAlvo(alvo);
  await registroPage.removerAlvo(alvo);
  await registroPage.validarAusenciaFinal(alvo);
  await registroPage.validarAusenciaErroImpeditivo();
});
  `);
  const destrutivo = auditar(
    projetoDestrutivo,
    [specDestrutiva, paginaDestrutiva, globalSetup],
    "implantacao",
    "remocao",
  );
  assert(!destrutivo.findings.some((item) => /autoriz/i.test(item.rule)), "Operacao destrutiva expressa nao deve exigir flag adicional");
  rejeitarRegra(destrutivo, "missing-destructive-operation");

  const projetoTypeScript = path.join(temporario, "typescript-list");
  executar(scaffold, [projetoTypeScript, "--mode", "implantacao"]);
  escrever(path.join(projetoTypeScript, globalSetup), fs.readFileSync(path.join(projetoConsulta, globalSetup), "utf8"));
  escrever(path.join(projetoTypeScript, specProfiles), fs.readFileSync(path.join(projetoConsulta, specProfiles), "utf8"));
  const paginaTs = "tests/pages/ConsultaPage.ts";
  escrever(path.join(projetoTypeScript, paginaTs), `
export class ConsultaPage {
  async buscarItens() { return true; }
  async validarResultados() { return true; }
  async validarAusenciaErroImpeditivo() { return true; }
}
  `);
  const specTs = "tests/e2e/consulta.spec.ts";
  escrever(path.join(projetoTypeScript, specTs), `
import { test } from '../fixtures/maximizedTest';
test('deve consultar itens quando o filtro for informado', async () => {
  await consultaPage.validarAusenciaErroImpeditivo();
  await consultaPage.buscarItens();
  await consultaPage.validarResultados();
  await consultaPage.validarAusenciaErroImpeditivo();
});
  `);
  escrever(path.join(projetoTypeScript, "node_modules/@playwright/test/cli.js"), `
const fs = require('node:fs');
fs.writeFileSync('.playwright-list-args.json', JSON.stringify(process.argv.slice(2)));
  `);
  const gateTs = executar(
    qualityGate,
    [
      projetoTypeScript,
      "--contract", "implantacao",
      "--case-kind", "consulta",
      "--files", specTs, paginaTs, globalSetup,
      "--json",
    ],
    { allowFailure: true },
  );
  const resumoGateTs = JSON.parse(gateTs.stdout);
  assert.equal(resumoGateTs.playwrightCollection.checked, true);
  assert.equal(resumoGateTs.playwrightCollection.ok, true);
  const argumentosColeta = JSON.parse(fs.readFileSync(path.join(projetoTypeScript, ".playwright-list-args.json"), "utf8"));
  assert(argumentosColeta.includes(specTs), "playwright test --list deve receber a spec TypeScript");

  const projetoPrivado = path.join(temporario, "nome-privado");
  const termoPrivado = ["S", "I", "G", "s"].join("");
  escrever(path.join(projetoPrivado, "references", `${termoPrivado.toLowerCase()}.md`), "Referencia privada.");
  const vazamento = executar(scannerPublico, [projetoPrivado, "--json"], { allowFailure: true });
  assert.notEqual(vazamento.status, 0);
  assert(JSON.parse(vazamento.stdout).findings.length > 0);

  const autoAuditoria = executar(
    qualityGate,
    [raizPlugin, "--contract", "revisao", "--exclude", "scripts/test-plugin-contract.mjs", "--json"],
    { allowFailure: true },
  );
  assert.equal(autoAuditoria.status, 0, autoAuditoria.stderr || autoAuditoria.stdout);
  assert.equal(JSON.parse(autoAuditoria.stdout).audit.errors, 0);

  console.log("OK: contratos do plugin Playwright MCP E2E 3.1.2 validados.");
} finally {
  fs.rmSync(temporario, { recursive: true, force: true });
}
