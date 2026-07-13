#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const diretorioScript = path.dirname(fileURLToPath(import.meta.url));
const raizPlugin = path.dirname(diretorioScript);
const scaffold = path.join(diretorioScript, "scaffold-playwright.mjs");
const auditor = path.join(diretorioScript, "audit-playwright.mjs");
const otimizarContexto = path.join(diretorioScript, "optimize-context.mjs");
const atualizarPerfis = path.join(diretorioScript, "update-client-profiles.mjs");
const raizTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-plugin-contract-"));
const require = createRequire(import.meta.url);

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

function escreverJson(arquivo, valor) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${JSON.stringify(valor, null, 2)}\n`, "utf8");
}

function existe(raiz, caminho) {
  return fs.existsSync(path.join(raiz, caminho));
}

function auditar(raiz, arquivo) {
  const resultado = executar(auditor, [raiz, "--files", arquivo, "--json"], { allowFailure: true });
  return JSON.parse(resultado.stdout);
}

try {
  const manifesto = JSON.parse(fs.readFileSync(path.join(raizPlugin, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifesto.version, "1.0.4");

  const skillImplantacao = fs.readFileSync(
    path.join(raizPlugin, "skills", "criar-testes-implantacao-playwright", "SKILL.md"),
    "utf8",
  );
  const skillMassa = fs.readFileSync(
    path.join(raizPlugin, "skills", "gerar-massa-playwright", "SKILL.md"),
    "utf8",
  );
  const referenciaLegibilidade = fs.readFileSync(
    path.join(raizPlugin, "references", "legibilidade-codigo.md"),
    "utf8",
  );
  assert.match(skillImplantacao, /--mode implantacao/);
  assert.match(skillImplantacao, /RelatorioValidacoes/);
  assert.match(skillImplantacao, /campo, rotulo, controle, tipo, valorValido/);
  assert.match(skillMassa, /--mode massa/);
  assert.match(referenciaLegibilidade, /unica colecao/);
  assert.match(referenciaLegibilidade, /Nao criar `BasePage`/);

  const projetoBasico = path.join(raizTemporaria, "basico");
  executar(scaffold, [projetoBasico]);
  for (const arquivo of [
    "playwright.config.js",
    ".env.example",
    "tests/utils/authProfiles.js",
    "tests/utils/testData.js",
    "tests/fixtures/maximizedTest.js",
  ]) assert(existe(projetoBasico, arquivo), `Modo basico nao criou ${arquivo}`);
  for (const arquivo of [
    "tests/pages/BasePage.js",
    "tests/utils/clientConfig.js",
    "tests/utils/validationReport.js",
    "tests/utils/legacyForm.js",
    "config/defaults.json",
  ]) assert(!existe(projetoBasico, arquivo), `Modo basico criou arquivo preventivo: ${arquivo}`);
  assert(!fs.readFileSync(path.join(projetoBasico, ".env.example"), "utf8").includes("E2E_CLIENT_PROFILE"));

  const projetoMassa = path.join(raizTemporaria, "massa");
  executar(scaffold, [projetoMassa, "--mode", "massa"]);
  assert(existe(projetoMassa, "tests/utils/testData.js"));
  assert(!existe(projetoMassa, "tests/utils/validationReport.js"));
  assert(!existe(projetoMassa, "config/clientes/referencia.json"));

  const projetoImplantacao = path.join(raizTemporaria, "implantacao");
  executar(scaffold, [projetoImplantacao, "--mode", "implantacao"]);
  for (const arquivo of [
    "config/defaults.json",
    "config/clientes/referencia.json",
    "tests/utils/clientConfig.js",
    "tests/utils/validationReport.js",
  ]) assert(existe(projetoImplantacao, arquivo), `Modo implantacao nao criou ${arquivo}`);
  assert(!existe(projetoImplantacao, "tests/pages/BasePage.js"));
  assert(!existe(projetoImplantacao, "tests/utils/legacyForm.js"));
  assert.match(
    fs.readFileSync(path.join(projetoImplantacao, ".env.example"), "utf8"),
    /^E2E_CLIENT_PROFILE=referencia$/m,
  );

  const projetoLegado = path.join(raizTemporaria, "legado");
  executar(scaffold, [projetoLegado, "--mode", "implantacao", "--legacy-form"]);
  assert(existe(projetoLegado, "tests/utils/legacyForm.js"));

  const modoInvalido = executar(scaffold, [path.join(raizTemporaria, "invalido"), "--mode", "todos"], {
    allowFailure: true,
  });
  assert.notEqual(modoInvalido.status, 0);
  assert.match(modoInvalido.stderr, /Modo invalido/);

  fs.writeFileSync(
    path.join(projetoBasico, ".env.example"),
    "CUSTOM_SETTING=preservar\nE2E_WORKERS=2\n",
    "utf8",
  );
  executar(scaffold, [projetoBasico]);
  const envPreservado = fs.readFileSync(path.join(projetoBasico, ".env.example"), "utf8");
  assert.match(envPreservado, /^CUSTOM_SETTING=preservar$/m);
  assert.match(envPreservado, /^E2E_WORKERS=2$/m);
  assert(!envPreservado.includes("E2E_WORKERS=1"));

  const configuracao = require(path.join(projetoImplantacao, "tests", "utils", "clientConfig.js"));
  escreverJson(path.join(projetoImplantacao, "config", "defaults.json"), {
    curso: { estado: "PADRAO", municipio: "CIDADE PADRAO" },
  });
  escreverJson(path.join(projetoImplantacao, "config", "clientes", "cliente-a.json"), {
    curso: { programa: "PROGRAMA A", municipio: "CIDADE A", pendente: null },
  });

  const dadosCliente = configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "cliente-a",
    spec: "curso.cadastrar",
    requisitos: [
      { caminho: "curso.estado", tipo: "string" },
      { caminho: "curso.municipio", tipo: "string" },
      { caminho: "curso.programa", tipo: "string" },
    ],
  });
  assert.equal(dadosCliente.curso.estado, "PADRAO");
  assert.equal(dadosCliente.curso.municipio, "CIDADE A");
  assert.equal(dadosCliente.curso.programa, "PROGRAMA A");

  const dadosRuntime = configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "cliente-a",
    spec: "curso.cadastrar",
    requisitos: ["curso.programa"],
    runtime: { curso: { programa: "PROGRAMA RUNTIME" } },
  });
  assert.equal(dadosRuntime.curso.programa, "PROGRAMA RUNTIME");
  assert.throws(() => configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "cliente-a",
    spec: "curso.outra",
    requisitos: ["curso.pendente"],
  }), /curso\.pendente/);
  assert.throws(() => configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "cliente-a",
    spec: "curso.cadastrar",
    requisitos: [{ caminho: "curso.programa", tipo: "number" }],
  }), /tipo incompatível/);
  assert.throws(() => configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "../segredo",
    spec: "curso.cadastrar",
  }), /Perfil de cliente inválido/);
  assert.throws(() => configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "inexistente",
    spec: "curso.cadastrar",
  }), /não encontrado/);

  const chaveSensivel = ["se", "nha"].join("");
  escreverJson(
    path.join(projetoImplantacao, "config", "clientes", "sensivel.json"),
    { [chaveSensivel]: ["nao", "permitido"].join("-") },
  );
  assert.throws(() => configuracao.obterDadosDaSpec({
    raizProjeto: projetoImplantacao,
    perfil: "sensivel",
    spec: "curso.cadastrar",
  }), /Chave sensível proibida/);

  const { RelatorioValidacoes } = require(
    path.join(projetoImplantacao, "tests", "utils", "validationReport.js"),
  );
  const relatorio = new RelatorioValidacoes({
    raizProjeto: projetoImplantacao,
    spec: "curso.cadastrar",
    idExecucao: "RUN_001",
    verificacoesPlanejadas: [
      { id: "nome", tela: "Cadastro", tipo: "obrigatoriedade", campo: "Nome" },
      { id: "persistencia", tela: "Consulta", tipo: "persistencia", campo: "Curso" },
    ],
  });
  assert.equal(await relatorio.verificar("nome", async () => {}), true);
  assert.equal(await relatorio.verificar("persistencia", async () => {
    throw new Error("senha=segredo usuario=admin");
  }), false);
  const arquivoRelatorio = relatorio.gravar();
  const conteudoRelatorio = fs.readFileSync(arquivoRelatorio, "utf8");
  assert(!conteudoRelatorio.includes("segredo"));
  assert(!conteudoRelatorio.includes("admin"));
  assert.throws(() => relatorio.validarResultado(), /1 falha/);
  assert.throws(() => new RelatorioValidacoes({
    spec: "duplicada",
    idExecucao: "RUN_002",
    verificacoesPlanejadas: [
      { id: "a", tela: "Tela", tipo: "obrigatoriedade", campo: "Nome" },
      { id: "b", tela: "Tela", tipo: "obrigatoriedade", campo: "Nome" },
    ],
  }), /semanticamente duplicada/);

  executar(atualizarPerfis, [
    projetoImplantacao,
    "--classification", "default",
    "--path", "curso.area",
    "--value-json", JSON.stringify("AREA PADRAO"),
  ]);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(projetoImplantacao, "config", "defaults.json"), "utf8")).curso.area,
    "AREA PADRAO",
  );

  const paginaBase = path.join(projetoImplantacao, "tests", "pages", "BasePage.js");
  fs.writeFileSync(paginaBase, [
    "class BasePage {",
    "  constructor(page) { this.page = page; }",
    "  byId(id) { return this.page.locator(`[id=\"${id}\"]`); }",
    "}",
    "module.exports = { BasePage };",
    "",
  ].join("\n"), "utf8");
  const auditoriaBase = auditar(projetoImplantacao, "tests/pages/BasePage.js");
  assert(auditoriaBase.findings.some((item) => item.rule === "trivial-base-page"));
  assert(auditoriaBase.findings.some((item) => item.rule === "generic-id-helper"));
  fs.rmSync(paginaBase);

  const paginaDireta = path.join(projetoImplantacao, "tests", "pages", "CursoPage.js");
  fs.writeFileSync(paginaDireta, [
    "class CursoPage {",
    "  constructor(page) {",
    "    this.nome = page.locator('[id=\"cadastroCurso:nome\"]');",
    "  }",
    "}",
    "module.exports = { CursoPage };",
    "",
  ].join("\n"), "utf8");
  const auditoriaDireta = auditar(projetoImplantacao, "tests/pages/CursoPage.js");
  assert(!auditoriaDireta.findings.some((item) => item.rule === "generic-id-helper"));
  assert(!auditoriaDireta.findings.some((item) => item.rule === "escaped-jsf-id"));

  const paginaLocalidade = path.join(projetoImplantacao, "tests", "pages", "LocalidadePage.js");
  fs.writeFileSync(paginaLocalidade, [
    "class LocalidadePage {",
    "  async selecionar() {",
    "    await this.estado.selectOption({ label: 'Rio Grande do Norte' });",
    "  }",
    "}",
    "module.exports = { LocalidadePage };",
    "",
  ].join("\n"), "utf8");
  assert(auditar(projetoImplantacao, "tests/pages/LocalidadePage.js").findings
    .some((item) => item.rule === "institutional-location-hardcoded"));

  const specLegivel = path.join(projetoImplantacao, "tests", "e2e", "implantacao-legivel.spec.js");
  fs.writeFileSync(specLegivel, [
    "const { test } = require('../fixtures/maximizedTest');",
    "const { obterDadosDaSpec } = require('../utils/clientConfig');",
    "const { RelatorioValidacoes } = require('../utils/validationReport');",
    "let dadosCliente;",
    "// O preflight valida somente a massa desta spec antes da navegacao.",
    "test.beforeAll(() => { dadosCliente = obterDadosDaSpec({ spec: 'x', requisitos: [] }); });",
    "test('deve validar obrigatorios da implantacao', async () => {",
    "  const CAMPOS_OBRIGATORIOS = [",
    "    { campo: 'nome', rotulo: 'Nome', controle: {}, tipo: 'texto', valorValido: 'CURSO E2E' },",
    "  ];",
    "  const relatorio = new RelatorioValidacoes({ spec: 'x', idExecucao: 'RUN', verificacoesPlanejadas: [] });",
    "  await test.step('Preparar formulario', async () => { void dadosCliente; });",
    "  // A mesma colecao orienta todas as validacoes na sessao unica.",
    "  await test.step('Validar campos obrigatorios', async () => {",
    "    for (const campo of CAMPOS_OBRIGATORIOS) void campo;",
    "  });",
    "  relatorio.gravar();",
    "  relatorio.validarResultado();",
    "});",
    "",
  ].join("\n"), "utf8");
  const auditoriaLegivel = auditar(projetoImplantacao, "tests/e2e/implantacao-legivel.spec.js");
  for (const regra of [
    "missing-validation-report",
    "positional-validation-cases",
    "callback-field-descriptors",
    "duplicated-field-sources",
    "implantation-without-functional-steps",
  ]) assert(!auditoriaLegivel.findings.some((item) => item.rule === regra), regra);

  const specDuplicada = path.join(projetoImplantacao, "tests", "e2e", "implantacao-duplicada.spec.js");
  fs.writeFileSync(specDuplicada, [
    "const { test } = require('@playwright/test');",
    "const { obterDadosDaSpec } = require('../utils/clientConfig');",
    "test.beforeAll(() => obterDadosDaSpec({ spec: 'x', requisitos: [] }));",
    "test('obrigatorios da implantacao', async () => {",
    "  const CAMPOS_OBRIGATORIOS = [",
    "    { campo: 'nome', rotulo: 'Nome', restaurar: () => preencher() },",
    "  ];",
    "  const restauracoes = { nome: () => preencher() };",
    "  void CAMPOS_OBRIGATORIOS; void restauracoes;",
    "});",
    "",
  ].join("\n"), "utf8");
  const auditoriaDuplicada = auditar(projetoImplantacao, "tests/e2e/implantacao-duplicada.spec.js");
  assert(auditoriaDuplicada.findings.some((item) => item.rule === "callback-field-descriptors"));
  assert(auditoriaDuplicada.findings.some((item) => item.rule === "duplicated-field-sources"));

  const fabrica = path.join(projetoImplantacao, "tests", "utils", "factory.js");
  fs.writeFileSync(fabrica, "function criar(opcoes) { return new RelatorioValidacoes(opcoes); }\nmodule.exports = { criar };\n", "utf8");
  assert(auditar(projetoImplantacao, "tests/utils/factory.js").findings
    .some((item) => item.rule === "trivial-factory"));

  const promptMassa = [
    "MODO: Geracao de massa de dados",
    "URL: https://example.test",
    "USUARIO: exemplo",
    "SENHA: exemplo",
    "CAMINHO: Menu > Cadastro",
  ].join("\n");
  const resumoMassa = JSON.parse(executar(
    otimizarContexto,
    [projetoMassa, "--json", "--stdin"],
    { input: promptMassa },
  ).stdout);
  assert.equal(resumoMassa.normalizedInput.functionalMode, "massa");
  assert.equal(resumoMassa.normalizedInput.quantity, 1);

  const promptImplantacao = [
    "MODO: Implantacao",
    "URL: https://example.test",
    "USUARIO: exemplo",
    "SENHA: exemplo",
    "CAMINHO: Menu > Cadastro",
    "AGENTS.md do modulo: /repo/AGENTS.md",
    "Codigo-fonte: /repo/sistema",
  ].join("\n");
  const resumoImplantacao = JSON.parse(executar(
    otimizarContexto,
    [projetoImplantacao, "--json", "--stdin"],
    { input: promptImplantacao },
  ).stdout);
  assert.equal(resumoImplantacao.normalizedInput.functionalMode, "implantacao");
  assert.equal(resumoImplantacao.normalizedInput.contractComplete, true);

  const ambiguo = JSON.parse(executar(
    otimizarContexto,
    [projetoImplantacao, "--json", "--stdin"],
    { input: `${promptMassa}\nMODO: Implantacao` },
  ).stdout);
  assert.equal(ambiguo.normalizedInput.functionalMode, "contraditorio");

  console.log("OK: contrato 1.0.4, scaffold por modo, fonte unica, perfis e legibilidade validados.");
} finally {
  fs.rmSync(raizTemporaria, { recursive: true, force: true });
}
