#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const args = process.argv.slice(3);
const jsonOutput = args.includes("--json");
const initCache = args.includes("--init-cache");
const readStdin = args.includes("--stdin");
const inputIndex = args.indexOf("--input");
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? args[modeIndex + 1] : "padrao";
const cacheDir = path.join(root, ".playwright-e2e", "cache");
const cacheFiles = ["screens.json", "flows.json", "auth.json"];
const commonSurnames = new Set([
  "almeida", "alves", "araujo", "barbosa", "batista", "carvalho", "costa", "dias",
  "ferreira", "gomes", "lima", "martins", "nascimento", "oliveira", "pereira",
  "ribeiro", "rocha", "rodrigues", "santos", "silva", "sousa", "souza",
]);

function normalizeText(text) {
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function words(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function hasLikelyPersonName(value) {
  const text = String(value);
  const candidates = [
    ...text.matchAll(/\b[A-Z][A-Za-z]{2,}(?:\s+(?:de|da|do|dos|das|e))?\s+[A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,4}\b/g),
    ...text.matchAll(/\b[A-Z]{3,}(?:\s+(?:DE|DA|DO|DOS|DAS|E))?\s+[A-Z]{3,}(?:\s+[A-Z]{3,}){0,4}\b/g),
  ];
  return candidates.some((match) => {
    const tokens = words(match[0]).filter((token) => !["de", "da", "do", "dos", "das", "e"].includes(token));
    return tokens.length >= 2 && tokens.some((token) => commonSurnames.has(token));
  });
}

function sensitiveReasons(value, key = "") {
  const text = String(value);
  const normalizedKey = normalizeText(key);
  const reasons = [];
  if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text)) reasons.push("cpf");
  if (/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(text)) reasons.push("cnpj");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) reasons.push("email");
  if (/\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/.test(text)) reasons.push("telefone");
  if (hasLikelyPersonName(text)) reasons.push("nome-real-provavel");
  if (/(password|senha|passwd|token|cookie|secret|storage|session|usuario|username)/i.test(normalizedKey)) reasons.push("chave-sensivel");
  if (/(bearer\s+|set-cookie|connect\.sid|playwright\.storageState|localStorage|sessionStorage)/i.test(text)) reasons.push("estado-autenticado");
  return [...new Set(reasons)];
}

function scanSensitive(value, location = "$", findings = []) {
  if (value == null) return findings;
  if (typeof value === "string" || typeof value === "number") {
    const reasons = sensitiveReasons(value);
    if (reasons.length) findings.push({ location, reasons });
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSensitive(item, `${location}[${index}]`, findings));
    return findings;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const keyReasons = sensitiveReasons("", key);
      if (keyReasons.length) findings.push({ location: `${location}.${key}`, reasons: keyReasons });
      scanSensitive(nested, `${location}.${key}`, findings);
    }
  }
  return findings;
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return { exists: false, value: null, error: null };
  try {
    return { exists: true, value: JSON.parse(fs.readFileSync(file, "utf8")), error: null };
  } catch (error) {
    return { exists: true, value: null, error: error.message };
  }
}

function ensureCache() {
  fs.mkdirSync(cacheDir, { recursive: true });
  for (const file of cacheFiles) {
    const target = path.join(cacheDir, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, "{}\n", "utf8");
  }
}

function gitignoreAllowsCache() {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return false;
  return fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".playwright-e2e/cache/" || line === ".playwright-e2e/" || line === ".playwright-e2e/cache");
}

function readInput() {
  if (inputIndex >= 0 && args[inputIndex + 1]) {
    const file = path.resolve(root, args[inputIndex + 1]);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  }
  if (readStdin) return fs.readFileSync(0, "utf8");
  return "";
}

function parsePrompt(text) {
  if (!text.trim()) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const steps = lines
    .filter((line) => /^(\d+[\).:-]|\-|\*)\s+/.test(line))
    .map((line) => line.replace(/^(\d+[\).:-]|\-|\*)\s+/, ""));
  const url = lines.find((line) => /^url\s*base\s*:/i.test(line));
  const user = lines.find((line) => /^(usuario|usuário|user)\s*:/i.test(line));
  const password = lines.find((line) => /^(senha|password)\s*:/i.test(line));
  return {
    hasBaseUrl: Boolean(url),
    hasUsername: Boolean(user),
    hasPassword: Boolean(password),
    stepCount: steps.length,
    steps: steps.map((step, index) => ({
      id: index + 1,
      text: step.replace(/(senha|password)\s*:\s*\S+/gi, "$1:<redacted>"),
      suggestedChannel: classifyStep(step),
    })),
  };
}

function classifyStep(step) {
  const text = normalizeText(step);
  if (/(instalar|dependencia|scaffold|executar|rodar teste|validar teste|lint|typecheck|relatorio|trace)/.test(text)) return "cli";
  if (/(dom completo|html completo|screenshot sem necessidade|log completo|readme sem pedido)/.test(text)) return "remover";
  if (/(tela|campo|botao|menu|modal|autocomplete|tabela|mensagem|permissao|estado visual|seletor)/.test(text)) return "mcp";
  return "cache";
}

if (initCache) ensureCache();

const caches = cacheFiles.map((name) => {
  const file = path.join(cacheDir, name);
  const data = readJsonIfExists(file);
  const sensitive = data.value ? scanSensitive(data.value, name) : [];
  return {
    name,
    exists: data.exists,
    validJson: data.exists ? !data.error : null,
    error: data.error,
    sensitive,
  };
});

const summary = {
  root,
  mode,
  cacheDir: path.relative(root, cacheDir),
  cacheIgnored: gitignoreAllowsCache(),
  caches,
  normalizedInput: parsePrompt(readInput()),
  rules: {
    defaultChannel: "cli/cache before mcp",
    mcpOnlyWhen: ["tela-nao-mapeada", "seletor-ambiguo", "estado-real-incerto", "falha-nao-explicada-pelo-cli"],
    neverCache: ["senha", "cookies", "tokens", "storageState", "nomes-reais", "usuarios", "documentos", "emails", "telefones"],
  },
};

const hasCacheFiles = caches.some((cache) => cache.exists);
const hasErrors = caches.some((cache) => cache.error || cache.sensitive.length)
  || (hasCacheFiles && !summary.cacheIgnored);

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Modo: ${mode}`);
  console.log(`Cache: ${summary.cacheDir}`);
  console.log(`Cache ignorado pelo Git: ${summary.cacheIgnored ? "sim" : "nao"}`);
  for (const cache of caches) {
    const status = cache.exists ? (cache.validJson ? "ok" : "json-invalido") : "ausente";
    const sensitive = cache.sensitive.length ? `, sensivel=${cache.sensitive.length}` : "";
    console.log(`${cache.name}: ${status}${sensitive}`);
  }
}

process.exitCode = hasErrors ? 1 : 0;
