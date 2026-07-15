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

function auditar(raiz, arquivos = [], contract = "revisao") {
  const argumentos = [raiz];
  if (arquivos.length) argumentos.push("--files", ...arquivos);
  argumentos.push("--contract", contract, "--json");
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

try {
  const manifesto = JSON.parse(fs.readFileSync(path.join(raizPlugin, ".codex-plugin", "plugin.json"), "utf8"));
  assert.match(manifesto.version, /^3\.1\.1(?:\+codex\.[0-9]+)?$/);
  assert.match(manifesto.interface.longDescription, /autenticacao fora dos testes reportados/);
  assert.match(manifesto.interface.longDescription, /dominio rastreado ate o produtor funcional/);
  assert.match(manifesto.interface.longDescription, /relatorio HTML nativo/);

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
    executar(scaffold, [projeto, "--mode", modo]);
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

  console.log("OK: contratos do plugin Playwright MCP E2E 3.1.1 validados.");
} finally {
  fs.rmSync(temporario, { recursive: true, force: true });
}
