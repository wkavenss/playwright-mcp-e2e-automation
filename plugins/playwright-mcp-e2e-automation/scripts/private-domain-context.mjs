#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");
const privateDir = path.join(root, ".playwright-e2e", "private-domain");
const expectedFiles = ["glossary.json", "legacy-patterns.json", "flow-hints.md", "selector-recipes.md"];

function readJsonSummary(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      valid: true,
      keys: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 20) : [],
      items: Array.isArray(parsed) ? parsed.length : null,
      error: null,
    };
  } catch (error) {
    return { valid: false, keys: [], items: null, error: error.message };
  }
}

function readMarkdownSummary(file) {
  const lines = fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("<!--"));
  return {
    headings: lines.filter((line) => /^#{1,3}\s+/.test(line)).slice(0, 10),
    lineCount: lines.length,
  };
}

const files = expectedFiles.map((name) => {
  const file = path.join(privateDir, name);
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  const summary = !exists
    ? null
    : (name.endsWith(".json") ? readJsonSummary(file) : readMarkdownSummary(file));
  return { name, exists, summary };
});

const found = files.filter((file) => file.exists);
const invalid = files.filter((file) => file.exists && file.summary?.valid === false);
const result = {
  root,
  privateDir: path.relative(root, privateDir),
  exists: fs.existsSync(privateDir),
  foundFiles: found.map((file) => file.name),
  missingFiles: files.filter((file) => !file.exists).map((file) => file.name),
  invalidFiles: invalid.map((file) => ({ name: file.name, error: file.summary.error })),
  files,
  guidance: found.length
    ? "Use este overlay apenas como contexto local; nao copie valores, nomes ou exemplos privados para arquivos versionados."
    : "Overlay privado ausente; seguir como toolkit generico para sistemas legados JSF/RichFaces.",
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.guidance);
  console.log(`Diretorio: ${result.privateDir}`);
  console.log(`Arquivos encontrados: ${result.foundFiles.length ? result.foundFiles.join(", ") : "nenhum"}`);
  if (result.invalidFiles.length) {
    console.log(`Invalidos: ${result.invalidFiles.map((file) => file.name).join(", ")}`);
  }
}

process.exitCode = invalid.length ? 1 : 0;
