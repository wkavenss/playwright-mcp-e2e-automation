#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");
const readStdin = args.includes("--stdin");
const inputIndex = args.indexOf("--input");

function compact(value, limit = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function readInput() {
  if (inputIndex >= 0 && args[inputIndex + 1]) {
    const file = path.resolve(root, args[inputIndex + 1]);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  }
  if (readStdin) return fs.readFileSync(0, "utf8");
  for (const candidate of [
    "error-context.md",
    ".playwright-e2e/error-context.md",
    "test-results/error-context.md",
  ]) {
    const file = path.join(root, candidate);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  }
  return "";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match;
  }
  return null;
}

function classify(text) {
  const normalized = text.toLowerCase();
  if (/strict mode violation/.test(normalized)) return "strict-mode";
  if (/not visible|hidden|to be visible|element is not visible/.test(normalized)) return "hidden-or-attached";
  if (/timeout|timed out|waiting for locator|waiting for selector/.test(normalized)) return "timeout-element";
  if (/resolved to 0 elements|no element|not found|locator resolved to 0/.test(normalized)) return "not-found";
  if (/jsf|richfaces|j_id|javax\.faces|menuitem|submenu/.test(normalized)) return "jsf-menu-or-state";
  if (/expect\(.*\)|tohave|tobe/.test(normalized)) return "assertion";
  if (/navigation|net::|page\.goto|waitforurl/.test(normalized)) return "navigation";
  return "unknown";
}

function likelyCause(errorType) {
  return ({
    "strict-mode": "locator ambiguo; escopar por formulario, menu, linha ou criterio composto.",
    "hidden-or-attached": "elemento existe no DOM mas pode estar oculto; diferenciar contrato visual de fallback JSF.",
    "timeout-element": "elemento nao ficou disponivel no estado esperado; validar locator curto antes de rerodar a spec.",
    "not-found": "locator nao encontrou elemento; confirmar tela/estado e seletor candidato.",
    "jsf-menu-or-state": "estado JSF/RichFaces pode exigir sessao preservada, attached ou acionamento centralizado.",
    assertion: "falha parece funcional; probe de locator nao substitui reexecucao do cenario corrigido.",
    navigation: "falha de navegacao; validar estado/URL e espera funcional antes de mudar seletor.",
    unknown: "contexto insuficiente; usar menor diagnostico antes de repetir suite completa.",
  })[errorType];
}

function canProbe(errorType) {
  return ["strict-mode", "hidden-or-attached", "timeout-element", "not-found", "jsf-menu-or-state"].includes(errorType);
}

function extractLocator(text) {
  const match = firstMatch(text, [
    /\b(?:page\.)?(getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)\s*\(([^)\n]{1,220})\)/m,
    /\b(?:page\.)?locator\s*\(([^)\n]{1,260})\)/m,
    /Locator:\s*([^\n]{1,260})/i,
  ]);
  if (!match) return null;
  return compact(match[0] || match[1], 260);
}

function extractLocation(text) {
  const match = firstMatch(text, [
    /([^\s()]+(?:\.spec|\.test)\.[cm]?[jt]sx?):(\d+):(\d+)/,
    /([^\s()]+(?:pages?|page-objects?|utils)[^\s()]*\.[cm]?[jt]s):(\d+):?(\d+)?/i,
    /at\s+.*?\(?([^\s()]+\.[cm]?[jt]sx?):(\d+):(\d+)\)?/,
  ]);
  if (!match) return {};
  return {
    file: match[1],
    line: Number(match[2]),
    column: match[3] ? Number(match[3]) : null,
  };
}

function extractUrl(text) {
  const match = firstMatch(text, [
    /\bURL:\s*(https?:\/\/[^\s)]+)/i,
    /\burl\s*[:=]\s*(https?:\/\/[^\s)]+)/i,
    /(https?:\/\/[^\s)]+)/i,
  ]);
  return match ? match[1] : null;
}

const text = readInput();
const errorType = classify(text);
const location = extractLocation(text);
const summary = {
  ok: Boolean(text.trim()),
  file: location.file || null,
  line: location.line || null,
  column: location.column || null,
  locator: extractLocator(text),
  errorType,
  url: extractUrl(text),
  canProbe: canProbe(errorType),
  likelyCause: likelyCause(errorType),
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`${summary.errorType}: ${summary.likelyCause}`);
  if (summary.file) console.log(`Arquivo: ${summary.file}:${summary.line || 1}`);
  if (summary.locator) console.log(`Locator: ${summary.locator}`);
  if (summary.url) console.log(`URL: ${summary.url}`);
  console.log(`Probe curto: ${summary.canProbe ? "sim" : "nao"}`);
}

process.exitCode = summary.ok ? 0 : 1;
