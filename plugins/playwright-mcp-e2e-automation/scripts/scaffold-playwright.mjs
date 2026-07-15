#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argumentos = process.argv.slice(2);
if (argumentos.includes('--help') || argumentos.includes('-h')) {
  console.log('Uso: scaffold-playwright.mjs [raiz] --mode <basico|massa|implantacao> [--legacy-form]');
  process.exit(0);
}
const posicionais = [];
let modo = "basico";
let incluirFormularioLegado = false;

for (let indice = 0; indice < argumentos.length; indice += 1) {
  const argumento = argumentos[indice];
  if (argumento === "--mode") {
    modo = argumentos[indice + 1];
    indice += 1;
  } else if (argumento === "--legacy-form") {
    incluirFormularioLegado = true;
  } else {
    posicionais.push(argumento);
  }
}

const modosAceitos = new Set(["basico", "massa", "implantacao"]);
if (!modosAceitos.has(modo)) {
  throw new Error(`Modo invalido: ${modo}. Use basico, massa ou implantacao.`);
}

const raiz = path.resolve(posicionais[0] || process.cwd());
const diretorioScript = path.dirname(fileURLToPath(import.meta.url));
const diretorioTemplates = path.join(diretorioScript, "..", "assets", "scaffold");
const criados = [];
const preservados = [];

function escreverSeAusente(caminhoRelativo, conteudo) {
  const destino = path.join(raiz, caminhoRelativo);
  if (fs.existsSync(destino)) {
    preservados.push(caminhoRelativo);
    return;
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, conteudo, "utf8");
  criados.push(caminhoRelativo);
}

function copiarTemplate(caminhoRelativo, nomeTemplate = caminhoRelativo) {
  const origem = path.join(diretorioTemplates, nomeTemplate);
  escreverSeAusente(caminhoRelativo, fs.readFileSync(origem, "utf8"));
}

function garantirLinhas(caminhoRelativo, linhas) {
  const destino = path.join(raiz, caminhoRelativo);
  const atual = fs.existsSync(destino) ? fs.readFileSync(destino, "utf8") : "";
  const existentes = new Set(atual.split(/\r?\n/));
  const faltantes = linhas.filter((linha) => !existentes.has(linha));
  if (!faltantes.length) {
    preservados.push(caminhoRelativo);
    return;
  }
  const prefixo = atual && !atual.endsWith("\n") ? "\n" : "";
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.appendFileSync(destino, `${prefixo}${faltantes.join("\n")}\n`, "utf8");
  criados.push(caminhoRelativo);
}

function garantirEnv(chaves) {
  const destino = path.join(raiz, ".env.example");
  const atual = fs.existsSync(destino) ? fs.readFileSync(destino, "utf8") : "";
  const existentes = new Set(
    atual.split(/\r?\n/).map((linha) => linha.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1]).filter(Boolean),
  );
  const faltantes = chaves.filter(([chave]) => !existentes.has(chave));
  if (!faltantes.length) {
    preservados.push(".env.example");
    return;
  }
  const prefixo = atual && !atual.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(
    destino,
    `${atual}${prefixo}${faltantes.map(([chave, valor]) => `${chave}=${valor}`).join("\n")}\n`,
    "utf8",
  );
  criados.push(".env.example");
}

function atualizarPackageJson() {
  const destino = path.join(raiz, "package.json");
  const packageJson = fs.existsSync(destino)
    ? JSON.parse(fs.readFileSync(destino, "utf8"))
    : { private: true };
  packageJson.scripts ||= {};
  let alterado = !fs.existsSync(destino);
  const scriptsPadrao = {
    test: "playwright test",
    "test:headed": "playwright test --headed",
  };
  if (modo === "implantacao") {
    scriptsPadrao["test:qa"] = "node scripts/qa-runner.mjs";
    scriptsPadrao["test:qa:scan"] = "node scripts/scan-sensitive-artifacts.mjs";
  }
  for (const [nome, comando] of Object.entries(scriptsPadrao)) {
    if (packageJson.scripts[nome]) continue;
    packageJson.scripts[nome] = comando;
    alterado = true;
  }
  if (alterado) {
    fs.writeFileSync(destino, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
    criados.push("package.json");
  } else {
    preservados.push("package.json");
  }
}

fs.mkdirSync(raiz, { recursive: true });
atualizarPackageJson();
copiarTemplate("playwright.config.js");
copiarTemplate("tests/utils/authProfiles.js");
copiarTemplate("tests/utils/testData.js");
copiarTemplate("tests/fixtures/maximizedTest.js");

if (modo === "implantacao") {
  copiarTemplate("tests/utils/authState.js");
  copiarTemplate("tests/utils/qaEvidence.js");
  copiarTemplate("tests/qa/implantation-contract.json");
  copiarTemplate("scripts/lib/readZip.mjs");
  copiarTemplate("scripts/qa-runner.mjs");
  copiarTemplate("scripts/scan-sensitive-artifacts.mjs");
}

const chavesEnv = [
  ["BASE_URL", ""],
  ["E2E_WORKERS", "1"],
  ["E2E_EXAMPLE_USERNAME", ""],
  ["E2E_EXAMPLE_PASSWORD", ""],
];

if (incluirFormularioLegado) {
  copiarTemplate("tests/utils/legacyForm.js");
}

garantirEnv(chavesEnv);
garantirLinhas(".gitignore", [
  ".env",
  ".playwright-e2e/private-domain/",
  ".playwright-e2e/changed-files.json",
  ".playwright-e2e/error-context.md",
  "test-results/",
  "playwright-report/",
]);
escreverSeAusente("tests/e2e/.gitkeep", "");
escreverSeAusente("tests/pages/.gitkeep", "");

console.log(JSON.stringify({ raiz, modo, criados, preservados }, null, 2));
