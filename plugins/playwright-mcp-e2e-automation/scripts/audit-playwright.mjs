#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const jsonOutput = process.argv.includes("--json");
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const codeExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".tsx"]);
const findings = [];

function add(severity, rule, file, line, message) {
  findings.push({ severity, rule, file, line, message });
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(file) {
  return path.relative(root, file) || ".";
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function firstMatch(content, regex) {
  regex.lastIndex = 0;
  return regex.exec(content);
}

const files = walk(root);
const codeFiles = files.filter((file) => codeExtensions.has(path.extname(file)));
const specFiles = codeFiles.filter((file) => /(?:\.spec|\.test)\.[cm]?[jt]sx?$/.test(file));
const pageObjectFiles = codeFiles.filter((file) => /(?:^|[/\\])(?:pages?|page-objects?)(?:[/\\])/i.test(file));

if (specFiles.length && !pageObjectFiles.length) {
  add("error", "page-objects-required", ".", 1, "Specs encontradas sem Page Objects em diretorio pages/page-objects.");
}

for (const file of codeFiles) {
  const content = fs.readFileSync(file, "utf8");
  const rel = relative(file);
  const wait = firstMatch(content, /\bwaitForTimeout\s*\(/g);
  if (wait) add("warning", "fixed-timeout", rel, lineNumber(content, wait.index), "Evite waitForTimeout; espere uma condicao observavel.");

  const secret = firstMatch(content, /\b(?:password|senha|passwd|username|usuario)\s*[:=]\s*["'`]([^"'`\n]{3,})["'`]/gi);
  if (secret && !secret[0].includes("process.env")) {
    add("error", "hardcoded-credential", rel, lineNumber(content, secret.index), "Possivel credencial fixa; use process.env.");
  }
}

for (const file of specFiles) {
  const content = fs.readFileSync(file, "utf8");
  const directLocator = firstMatch(content, /\bpage\s*\.\s*(?:locator|getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)\s*\(/g);
  if (directLocator) {
    add("error", "selector-in-spec", relative(file), lineNumber(content, directLocator.index), "Mova seletores e interacoes da spec para um Page Object.");
  }
}

const gitignorePath = path.join(root, ".gitignore");
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");
if (fs.existsSync(envPath)) {
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  if (!gitignore.split(/\r?\n/).some((line) => line.trim() === ".env")) {
    add("error", "env-not-ignored", ".gitignore", 1, ".env existe, mas nao esta explicitamente ignorado.");
  }
}

if (fs.existsSync(envExamplePath)) {
  const lines = fs.readFileSync(envExamplePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Z0-9_]*(?:PASSWORD|PASS|SENHA|USERNAME|USER|USUARIO)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/i);
    if (match && !/^(?:<.*>|example|change-me|your-.*)$/i.test(match[2])) {
      add("error", "credential-in-env-example", ".env.example", index + 1, `${match[1]} deve ficar vazio ou usar placeholder seguro.`);
    }
  });
}

const configFile = files.find((file) => /playwright\.config\.[cm]?[jt]s$/.test(file));
if (!configFile) {
  add("warning", "missing-config", ".", 1, "playwright.config nao encontrado.");
} else {
  const config = fs.readFileSync(configFile, "utf8");
  const rel = relative(configFile);
  if (!/headless\s*:\s*false/.test(config)) add("warning", "headed-default", rel, 1, "O padrao do plugin e Chromium headed (headless: false).");
  for (const artifact of ["trace", "screenshot", "video"]) {
    if (!new RegExp(`${artifact}\\s*:\\s*["']off["']`).test(config)) {
      add("warning", "minimal-evidence", rel, 1, `Defina ${artifact}: 'off' para evidencias minimas por padrao.`);
    }
  }
}

const summary = {
  root,
  scannedFiles: codeFiles.length,
  errors: findings.filter((item) => item.severity === "error").length,
  warnings: findings.filter((item) => item.severity === "warning").length,
  findings,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else if (!findings.length) {
  console.log(`OK: ${codeFiles.length} arquivos verificados; nenhum achado.`);
} else {
  for (const item of findings) {
    console.log(`${item.severity.toUpperCase()} ${item.rule} ${item.file}:${item.line} - ${item.message}`);
  }
  console.log(`Resumo: ${summary.errors} erro(s), ${summary.warnings} alerta(s), ${summary.scannedFiles} arquivo(s) verificado(s).`);
}

process.exitCode = summary.errors ? 1 : 0;
