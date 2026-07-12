#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(scriptDir);
const scaffold = path.join(scriptDir, "scaffold-playwright.mjs");
const checkEnvironment = path.join(scriptDir, "check-environment.mjs");
const updateProfiles = path.join(scriptDir, "update-client-profiles.mjs");
const optimizeContext = path.join(scriptDir, "optimize-context.mjs");
const audit = path.join(scriptDir, "audit-playwright.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-plugin-contract-"));
const projectRoot = path.join(tempRoot, "project");
const require = createRequire(import.meta.url);

function run(script, args = [], options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${path.basename(script)} falhou:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

try {
  const manifest = readJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"));
  assert.equal(manifest.version, "1.0.0");
  const skillNames = fs.readdirSync(path.join(pluginRoot, "skills"))
    .filter((name) => fs.existsSync(path.join(pluginRoot, "skills", name, "SKILL.md")));
  assert(skillNames.includes("gerar-massa-playwright"));
  assert(skillNames.includes("criar-testes-implantacao-playwright"));
  assert(!skillNames.includes("criar-automacao-playwright"));

  const massSkill = fs.readFileSync(path.join(pluginRoot, "skills", "gerar-massa-playwright", "SKILL.md"), "utf8");
  const implementationSkill = fs.readFileSync(path.join(pluginRoot, "skills", "criar-testes-implantacao-playwright", "SKILL.md"), "utf8");
  assert.match(massSkill, /MODO: Geracao de massa de dados/);
  assert.match(massSkill, /Nao usar quando.*MODO: Implantacao/);
  assert.match(implementationSkill, /MODO: Implantacao/);
  assert.match(implementationSkill, /Nao usar.*MODO: Geracao de massa de dados/);
  assert.match(implementationSkill, /playwright test <spec> --list/);
  assert.match(implementationSkill, /unico `test`/);
  assert.match(implementationSkill, /validationReport/);
  assert.match(implementationSkill, /headed maximizado/);

  run(scaffold, [projectRoot]);
  for (const relative of [
    ".env.example",
    "config/defaults.json",
    "config/clientes/referencia.json",
    "tests/utils/clientConfig.js",
    "tests/utils/validationReport.js",
    "tests/fixtures/maximizedTest.js",
  ]) assert(fs.existsSync(path.join(projectRoot, relative)), `Scaffold nao criou ${relative}`);
  const generatedConfig = fs.readFileSync(path.join(projectRoot, "playwright.config.js"), "utf8");
  assert.match(generatedConfig, /viewport:\s*null/);
  assert.match(generatedConfig, /--start-maximized/);
  assert(!generatedConfig.includes("devices['Desktop Chrome']"));
  assert.match(fs.readFileSync(path.join(projectRoot, "tests", "fixtures", "maximizedTest.js"), "utf8"), /Browser\.setWindowBounds/);
  assert.match(fs.readFileSync(path.join(projectRoot, ".env.example"), "utf8"), /^E2E_CLIENT_PROFILE=referencia$/m);
  fs.writeFileSync(path.join(projectRoot, ".env.example"), "CUSTOM_SETTING=preservar\nE2E_CLIENT_PROFILE=cliente-a\n", "utf8");
  run(scaffold, [projectRoot]);
  const updatedEnvExample = fs.readFileSync(path.join(projectRoot, ".env.example"), "utf8");
  assert.match(updatedEnvExample, /^CUSTOM_SETTING=preservar$/m);
  assert.match(updatedEnvExample, /^E2E_CLIENT_PROFILE=cliente-a$/m);
  assert(!updatedEnvExample.includes("E2E_CLIENT_PROFILE=referencia"));
  const headedSmokeResult = run(checkEnvironment, [projectRoot, "--headed-smoke", "--json"], { allowFailure: true });
  const headedSmokeSummary = JSON.parse(headedSmokeResult.stdout);
  assert.equal(headedSmokeSummary.browserSmoke.requested, true);
  assert.equal(headedSmokeSummary.browserSmoke.headed, true);
  const scaffoldSnapshot = fs.readFileSync(path.join(projectRoot, "tests", "utils", "clientConfig.js"), "utf8");
  run(scaffold, [projectRoot]);
  assert.equal(fs.readFileSync(path.join(projectRoot, "tests", "utils", "clientConfig.js"), "utf8"), scaffoldSnapshot);

  const { createValidationReport } = require(path.join(projectRoot, "tests", "utils", "validationReport.js"));
  const report = createValidationReport({
    projectRoot,
    spec: "modulo.fluxo-multipagina",
    runId: "RUN_001",
    planned: [
      { id: "tela1.nome", screen: "Tela 1", kind: "obrigatoriedade", field: "Nome" },
      { id: "tela1.data", screen: "Tela 1", kind: "formato", field: "Data" },
      { id: "tela2.curso", screen: "Tela 2", kind: "obrigatoriedade", field: "Curso" },
    ],
  });
  await report.check("tela1.nome", async () => {});
  await report.check("tela1.data", async () => { throw new Error("senha=segredo contato qa@example.test"); });
  report.blockPending({ screen: "Tela 2", reason: "Avanco indevido impediu a verificacao" });
  const reportFile = report.write();
  const reportMarkdown = fs.readFileSync(reportFile, "utf8");
  assert.match(reportMarkdown, /Passou: 1/);
  assert.match(reportMarkdown, /Falhou: 1/);
  assert.match(reportMarkdown, /Nao executado: 1/);
  assert.match(reportMarkdown, /senha=\\<redacted\\>/);
  assert.match(reportMarkdown, /\\<email\\>/);
  assert(!reportMarkdown.includes("segredo"));
  assert(!reportMarkdown.includes("qa@example.test"));
  assert.throws(() => report.assertSuccessful(), /1 falha\(s\), 1 nao executada\(s\)/);

  const counters = { login: 0, entry: 0, advances: 0, persistence: 0 };
  const continuationReport = createValidationReport({
    projectRoot,
    spec: "modulo.fluxo-continuo",
    runId: "RUN_003",
    planned: [
      { id: "tela1.a", screen: "Tela 1", field: "A" },
      { id: "tela1.b", screen: "Tela 1", field: "B" },
      { id: "tela1.c", screen: "Tela 1", field: "C" },
      { id: "tela2.d", screen: "Tela 2", field: "D" },
      { id: "persistencia", screen: "Resultado", field: "Registro" },
    ],
  });
  counters.login += 1;
  counters.entry += 1;
  continuationReport.pass("tela1.a");
  continuationReport.fail("tela1.b", "O sistema avancou quando deveria bloquear");
  continuationReport.blockPending({ screen: "Tela 1", reason: "Tela anterior ficou inacessivel" });
  counters.advances += 1;
  continuationReport.pass("tela2.d");
  counters.persistence += 1;
  continuationReport.pass("persistencia");
  continuationReport.write();
  assert.deepEqual(counters, { login: 1, entry: 1, advances: 1, persistence: 1 });
  assert.deepEqual(continuationReport.summary(), { total: 5, passed: 3, failed: 1, blocked: 1 });

  const successfulReport = createValidationReport({
    projectRoot,
    spec: "modulo.fluxo-sucesso",
    runId: "RUN_002",
    planned: [{ id: "persistencia", screen: "Resultado", kind: "persistencia", field: "Registro" }],
  });
  successfulReport.pass("persistencia");
  successfulReport.write();
  assert.doesNotThrow(() => successfulReport.assertSuccessful());

  writeJson(path.join(projectRoot, "config", "defaults.json"), {
    comum: { modalidade: "PADRAO" },
  });
  writeJson(path.join(projectRoot, "config", "clientes", "referencia.json"), {
    modulo: {
      specA: { dependencia: "VALOR_REFERENCIA" },
      specB: { outraDependencia: null },
    },
  });
  writeJson(path.join(projectRoot, "config", "clientes", "cliente-a.json"), {
    modulo: {
      specA: { dependencia: "VALOR_CLIENTE_A" },
      specB: { outraDependencia: null },
    },
  });

  const clientConfig = require(path.join(projectRoot, "tests", "utils", "clientConfig.js"));
  const specA = clientConfig.requireSpecData({
    projectRoot,
    profile: "cliente-a",
    spec: "modulo.spec-a",
    required: ["modulo.specA.dependencia"],
  });
  assert.equal(specA.modulo.specA.dependencia, "VALOR_CLIENTE_A");
  assert.equal(specA.comum.modalidade, "PADRAO");

  const runtime = clientConfig.requireSpecData({
    projectRoot,
    profile: "cliente-a",
    spec: "modulo.spec-a",
    required: [{ path: "modulo.specA.dependencia", type: "string" }],
    runtime: { modulo: { specA: { dependencia: "VALOR_RUNTIME" } } },
  });
  assert.equal(runtime.modulo.specA.dependencia, "VALOR_RUNTIME");
  assert.throws(() => clientConfig.requireSpecData({
    projectRoot,
    profile: "cliente-a",
    spec: "modulo.spec-b",
    required: ["modulo.specB.outraDependencia"],
  }), /modulo\.specB\.outraDependencia/);
  assert.throws(() => clientConfig.requireSpecData({
    projectRoot,
    profile: "cliente-a",
    spec: "modulo.spec-a",
    required: [{ path: "modulo.specA.dependencia", type: "number" }],
  }), /tipo incompativel/);
  assert.throws(() => clientConfig.requireSpecData({
    projectRoot,
    profile: "cliente-a",
    spec: "modulo.spec-vazia",
    required: ["modulo.objetoVazio"],
    runtime: { modulo: { objetoVazio: {} } },
  }), /modulo\.objetoVazio/);
  assert.throws(() => clientConfig.loadClientConfig({ projectRoot, profile: "\.\.\/segredo" }), /Perfil de cliente invalido/);
  assert.throws(() => clientConfig.loadClientConfig({ projectRoot, profile: "cliente-inexistente" }), /Perfil do cliente nao encontrado/);

  const invalidProfile = path.join(projectRoot, "config", "clientes", "invalido.json");
  fs.writeFileSync(invalidProfile, "{", "utf8");
  assert.throws(() => clientConfig.loadClientConfig({ projectRoot, profile: "invalido" }), /Perfil do cliente invalido/);
  fs.rmSync(invalidProfile);

  const sensitiveKey = ["se", "nha"].join("");
  const sensitiveProfile = path.join(projectRoot, "config", "clientes", "sensivel.json");
  writeJson(sensitiveProfile, { [sensitiveKey]: ["nao", "permitido"].join("-") });
  assert.throws(() => clientConfig.loadClientConfig({ projectRoot, profile: "sensivel" }), /Chave sensivel proibida/);
  fs.rmSync(sensitiveProfile);
  const structuralProfile = path.join(projectRoot, "config", "clientes", "estrutural.json");
  fs.writeFileSync(structuralProfile, '{"__proto__":{"poluido":true}}\n', "utf8");
  assert.throws(() => clientConfig.loadClientConfig({ projectRoot, profile: "estrutural" }), /Chave sensivel proibida|Chave estrutural proibida/);
  fs.rmSync(structuralProfile);

  run(updateProfiles, [
    projectRoot,
    "--classification", "client",
    "--path", "modulo.specC.preRequisito",
    "--reference-value-json", JSON.stringify("VALOR_REFERENCIA_C"),
  ]);
  assert.equal(readJson(path.join(projectRoot, "config", "clientes", "referencia.json")).modulo.specC.preRequisito, "VALOR_REFERENCIA_C");

  run(updateProfiles, [
    projectRoot,
    "--classification", "default",
    "--path", "comum.categoria",
    "--value-json", JSON.stringify("CATEGORIA_PADRAO"),
  ]);
  assert.equal(readJson(path.join(projectRoot, "config", "defaults.json")).comum.categoria, "CATEGORIA_PADRAO");
  const rejectedSensitive = run(updateProfiles, [
    projectRoot,
    "--classification", "client",
    "--path", "modulo.senha",
    "--reference-value-json", JSON.stringify("segredo"),
  ], { allowFailure: true });
  assert.notEqual(rejectedSensitive.status, 0);
  const rejectedStructuralPath = run(updateProfiles, [
    projectRoot,
    "--classification", "client",
    "--path", "constructor.prototype.poluido",
    "--reference-value-json", JSON.stringify(true),
  ], { allowFailure: true });
  assert.notEqual(rejectedStructuralPath.status, 0);
  assert.equal(readJson(path.join(projectRoot, "config", "clientes", "cliente-a.json")).modulo.specC.preRequisito, null);

  writeJson(path.join(projectRoot, "config", "clientes", "cliente-b.json"), {
    modulo: { specC: { preRequisito: "VALOR_EXISTENTE" } },
  });
  run(updateProfiles, [
    projectRoot,
    "--classification", "client",
    "--path", "modulo.specC.preRequisito",
    "--reference-value-json", JSON.stringify("NAO_SOBRESCREVER"),
  ]);
  assert.equal(readJson(path.join(projectRoot, "config", "clientes", "cliente-b.json")).modulo.specC.preRequisito, "VALOR_EXISTENTE");
  assert.equal(readJson(path.join(projectRoot, "config", "clientes", "referencia.json")).modulo.specC.preRequisito, "VALOR_REFERENCIA_C");

  const massPrompt = [
    "MODO: Geracao de massa de dados",
    "URL: https://example.test",
    "USUARIO: exemplo",
    "SENHA: exemplo",
    "CAMINHO: Menu > Cadastro",
  ].join("\n");
  const massResult = run(optimizeContext, [projectRoot, "--json", "--stdin"], { input: massPrompt });
  const massSummary = JSON.parse(massResult.stdout);
  assert.equal(massSummary.normalizedInput.functionalMode, "massa");
  assert.equal(massSummary.normalizedInput.quantity, 1);
  assert.equal(massSummary.normalizedInput.quantityValid, true);
  assert.equal(massSummary.normalizedInput.contractComplete, true);
  const invalidQuantity = run(optimizeContext, [projectRoot, "--json", "--stdin"], {
    input: `${massPrompt}\nQUANTIDADE: zero`,
  });
  const invalidQuantitySummary = JSON.parse(invalidQuantity.stdout);
  assert.equal(invalidQuantitySummary.normalizedInput.quantityValid, false);
  assert.equal(invalidQuantitySummary.normalizedInput.contractComplete, false);
  const blankContract = run(optimizeContext, [projectRoot, "--json", "--stdin"], {
    input: [
      "MODO: Implantacao",
      "URL:",
      "USUARIO:",
      "SENHA:",
      "CAMINHO:",
      "AGENTS.md do modulo:",
      "Codigo-fonte:",
    ].join("\n"),
  });
  const blankContractSummary = JSON.parse(blankContract.stdout);
  assert.equal(blankContractSummary.normalizedInput.contractComplete, false);
  assert.equal(blankContractSummary.nextAction, "pedir-contrato-minimo");

  const implementationPrompt = [
    "MODO: Implantação",
    "URL: https://example.test",
    "USUARIO: exemplo",
    "SENHA: exemplo",
    "CAMINHO: Menu > Cadastro",
    "AGENTS.md do módulo: /repo/AGENTS.md",
    "Código-fonte: /repo/sistema",
  ].join("\n");
  const implementationResult = run(optimizeContext, [projectRoot, "--json", "--stdin"], { input: implementationPrompt });
  const implementationSummary = JSON.parse(implementationResult.stdout);
  assert.equal(implementationSummary.normalizedInput.functionalMode, "implantacao");
  assert.equal(implementationSummary.normalizedInput.contractComplete, true);

  const ambiguous = run(optimizeContext, [projectRoot, "--json", "--stdin"], {
    input: `${massPrompt}\nMODO: Implantacao`,
  });
  const ambiguousSummary = JSON.parse(ambiguous.stdout);
  assert.equal(ambiguousSummary.normalizedInput.functionalMode, "contraditorio");
  assert.equal(ambiguousSummary.nextAction, "pedir-modo-funcional");
  const missingMode = run(optimizeContext, [projectRoot, "--json", "--stdin"], {
    input: massPrompt.replace("MODO: Geracao de massa de dados\n", ""),
  });
  const missingModeSummary = JSON.parse(missingMode.stdout);
  assert.equal(missingModeSummary.normalizedInput.functionalMode, "ausente");
  assert.equal(missingModeSummary.nextAction, "pedir-modo-funcional");

  const cleanAuditResult = run(audit, [projectRoot, "--json"], { allowFailure: true });
  const cleanAuditSummary = JSON.parse(cleanAuditResult.stdout);
  assert(!cleanAuditSummary.findings.some((item) => item.rule === "local-absolute-path"));

  const badSpec = path.join(projectRoot, "tests", "e2e", "preflight-fora-do-escopo.spec.js");
  fs.writeFileSync(badSpec, "const { requireSpecData } = require('../utils/clientConfig');\nrequireSpecData({ spec: 'x', required: [] });\n", "utf8");
  const auditResult = run(audit, [projectRoot, "--files", path.relative(projectRoot, badSpec), "--json"], { allowFailure: true });
  const auditSummary = JSON.parse(auditResult.stdout);
  assert(auditSummary.findings.some((item) => item.rule === "client-data-preflight-scope"));

  const goodSpec = path.join(projectRoot, "tests", "e2e", "preflight-por-spec.spec.js");
  fs.writeFileSync(goodSpec, [
    "const { test } = require('@playwright/test');",
    "const { requireSpecData } = require('../utils/clientConfig');",
    "let data;",
    "test.beforeAll(() => { data = requireSpecData({ spec: 'x', required: [] }); });",
    "test('deve validar somente sua massa quando selecionada', async () => { void data; });",
    "",
  ].join("\n"), "utf8");
  const goodAuditResult = run(audit, [projectRoot, "--files", path.relative(projectRoot, goodSpec), "--json"], { allowFailure: true });
  const goodAuditSummary = JSON.parse(goodAuditResult.stdout);
  assert(!goodAuditSummary.findings.some((item) => item.rule === "client-data-preflight-scope"));

  const singleSessionSpec = path.join(projectRoot, "tests", "e2e", "obrigatorios-sessao-unica.spec.js");
  fs.writeFileSync(singleSessionSpec, [
    "const { test } = require('../fixtures/maximizedTest');",
    "const { requireSpecData } = require('../utils/clientConfig');",
    "const { createValidationReport } = require('../utils/validationReport');",
    "let data;",
    "test.beforeAll(() => { data = requireSpecData({ spec: 'x', required: [] }); });",
    "test('deve validar obrigatorios e concluir implantacao', async () => {",
    "  const report = createValidationReport({ spec: 'x', runId: 'RUN', planned: [] });",
    "  for (const campo of ['nome']) await report.check(campo, async () => {});",
    "  report.write();",
    "  report.assertSuccessful();",
    "  void data;",
    "});",
    "",
  ].join("\n"), "utf8");
  const singleSessionAudit = JSON.parse(run(audit, [projectRoot, "--files", path.relative(projectRoot, singleSessionSpec), "--json"], { allowFailure: true }).stdout);
  assert(!singleSessionAudit.findings.some((item) => item.rule === "fragmented-implantation-flow"));
  assert(!singleSessionAudit.findings.some((item) => item.rule === "missing-validation-report"));

  const fragmentedSpec = path.join(projectRoot, "tests", "e2e", "obrigatorios-fragmentados.spec.js");
  fs.writeFileSync(fragmentedSpec, [
    "const { test } = require('../fixtures/maximizedTest');",
    "const { requireSpecData } = require('../utils/clientConfig');",
    "test.beforeAll(() => requireSpecData({ spec: 'x', required: [] }));",
    "test.beforeEach(async () => { await login(); await acessarFluxo(); });",
    "test('campo obrigatorio nome', async () => {});",
    "test('campo obrigatorio data', async () => {});",
    "",
  ].join("\n"), "utf8");
  const fragmentedAudit = JSON.parse(run(audit, [projectRoot, "--files", path.relative(projectRoot, fragmentedSpec), "--json"], { allowFailure: true }).stdout);
  assert(fragmentedAudit.findings.some((item) => item.rule === "fragmented-implantation-flow"));
  assert(fragmentedAudit.findings.some((item) => item.rule === "repeated-login-per-validation"));
  assert(fragmentedAudit.findings.some((item) => item.rule === "missing-validation-report"));

  console.log("OK: contrato 1.0.0, sessao unica, relatorio, maximização, perfis e preflight por spec validados.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
