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
const requestedMode = modeIndex >= 0 ? args[modeIndex + 1] : "padrao";
const cacheDir = path.join(root, ".playwright-e2e", "cache");
const cacheFiles = ["screens.json", "flows.json", "auth.json"];
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const codeExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".tsx"]);
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

function relative(file) {
  return path.relative(root, file) || ".";
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function existingFile(relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) && fs.statSync(target).isFile() ? target : null;
}

function existingDirectory(relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
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

function readPackageJson() {
  const file = path.join(root, "package.json");
  const data = readJsonIfExists(file);
  return data.exists && !data.error ? data.value : null;
}

function packageHasPlaywright(packageJson) {
  if (!packageJson) return false;
  return ["dependencies", "devDependencies", "optionalDependencies"].some((section) => {
    const dependencies = packageJson[section] || {};
    return Boolean(dependencies["@playwright/test"] || dependencies.playwright);
  });
}

function recommendedCommand(packageJson, specFiles) {
  const scripts = packageJson?.scripts || {};
  const preferredScript = ["test:e2e:headed", "test:headed", "test:e2e", "test"].find((name) => scripts[name]);
  const specArg = specFiles.length === 1 ? ` ${specFiles[0]}` : "";
  if (preferredScript) return `npm run ${preferredScript}${specArg ? ` --${specArg}` : ""}`;
  return `npx playwright test${specArg} --headed --reporter=line`;
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

function detectProjectShape(packageJson) {
  const configFiles = [
    "playwright.config.js",
    "playwright.config.cjs",
    "playwright.config.mjs",
    "playwright.config.ts",
  ].map(existingFile);
  const specFiles = unique([
    ...walk(path.join(root, "tests/e2e")),
    ...walk(path.join(root, "test/e2e")),
    ...walk(path.join(root, "e2e")),
  ])
    .filter((file) => /(?:\.spec|\.test)\.[cm]?[jt]sx?$/.test(file))
    .map(relative)
    .sort();
  const pageObjectFiles = unique([
    ...walk(path.join(root, "tests/pages")),
    ...walk(path.join(root, "tests/page-objects")),
    ...walk(path.join(root, "test/pages")),
    ...walk(path.join(root, "page-objects")),
  ])
    .filter((file) => codeExtensions.has(path.extname(file)))
    .map(relative)
    .sort();
  const hasE2eDirectory = ["tests/e2e", "test/e2e", "e2e", "playwright"].some(existingDirectory);
  const hasPlaywrightDependency = packageHasPlaywright(packageJson);
  const configFile = configFiles.find(Boolean);
  const hasPlaywrightConfig = Boolean(configFile);
  return {
    hasPackageJson: Boolean(packageJson),
    hasPlaywrightDependency,
    hasPlaywrightConfig,
    playwrightConfigFile: configFile ? relative(configFile) : null,
    hasE2eDirectory,
    hasPageObjects: pageObjectFiles.length > 0,
    hasAuthProfiles: Boolean(existingFile("tests/utils/authProfiles.js")),
    hasTestData: Boolean(existingFile("tests/utils/testData.js")),
    hasEnvExample: Boolean(existingFile(".env.example")),
    hasCacheDir: fs.existsSync(cacheDir),
    isPlaywrightProject: hasPlaywrightDependency || hasPlaywrightConfig || hasE2eDirectory || pageObjectFiles.length > 0 || fs.existsSync(cacheDir),
    specCount: specFiles.length,
    pageObjectCount: pageObjectFiles.length,
    firstSpecFiles: specFiles.slice(0, 3),
    firstPageObjectFiles: pageObjectFiles.slice(0, 3),
  };
}

function detectCacheStatus(caches, cacheIgnored) {
  const existing = caches.filter((cache) => cache.exists);
  const invalid = caches.filter((cache) => cache.error);
  const sensitive = caches.filter((cache) => cache.sensitive.length);
  const status = !existing.length
    ? "ausente"
    : (invalid.length || sensitive.length || !cacheIgnored ? "risco" : "ok");
  return {
    status,
    files: existing.length,
    ignoredByGit: cacheIgnored,
    invalidJson: invalid.length,
    sensitiveFindings: sensitive.reduce((total, cache) => total + cache.sensitive.length, 0),
  };
}

function likelyFilesToRead(shape) {
  return unique([
    shape.hasPackageJson ? "package.json" : null,
    shape.playwrightConfigFile,
    shape.hasAuthProfiles ? "tests/utils/authProfiles.js" : null,
    shape.hasTestData ? "tests/utils/testData.js" : null,
    ...shape.firstSpecFiles,
    ...shape.firstPageObjectFiles,
    ...cacheFiles
      .map((name) => path.join(".playwright-e2e/cache", name))
      .filter((file) => fs.existsSync(path.join(root, file))),
  ]).slice(0, 10);
}

function buildRiskFlags({ shape, caches, cacheStatus, normalizedInput, rawInput }) {
  const riskFlags = [];
  if (cacheStatus.files && !cacheStatus.ignoredByGit) riskFlags.push("cache-not-ignored");
  if (cacheStatus.invalidJson) riskFlags.push("cache-invalid-json");
  if (cacheStatus.sensitiveFindings) riskFlags.push("cache-sensitive-data");
  if (shape.isPlaywrightProject && !shape.hasPlaywrightConfig) riskFlags.push("missing-playwright-config");
  if (shape.isPlaywrightProject && !shape.hasPlaywrightDependency) riskFlags.push("missing-playwright-dependency");
  if (shape.specCount > 0 && !shape.hasPageObjects) riskFlags.push("specs-without-page-objects");
  if (shape.specCount > 0 && !shape.hasAuthProfiles) riskFlags.push("missing-auth-profiles");
  if (shape.specCount > 0 && !shape.hasTestData) riskFlags.push("missing-test-data-helper");
  if (normalizedInput && (!normalizedInput.hasBaseUrl || !normalizedInput.hasUsername || !normalizedInput.hasPassword || !normalizedInput.stepCount)) {
    riskFlags.push("missing-minimum-contract");
  }
  if (normalizedInput?.steps?.some((step) => step.suggestedChannel === "mcp")) {
    riskFlags.push("mcp-may-be-needed");
  }
  if (scanSensitive(rawInput).length) riskFlags.push("input-has-sensitive-data");
  if (caches.some((cache) => cache.error || cache.sensitive.length)) riskFlags.push("ignore-or-sanitize-cache");
  return unique(riskFlags);
}

function chooseRecommendedMode(mode, riskFlags) {
  if (mode && mode !== "padrao") return mode;
  if (riskFlags.includes("mcp-may-be-needed")) return "padrao";
  if (riskFlags.length === 1 && riskFlags[0] === "input-has-sensitive-data") return "cli-only";
  if (!riskFlags.length) return "cli-only";
  return "padrao";
}

function chooseNextAction({ shape, cacheStatus, riskFlags }) {
  if (riskFlags.includes("missing-minimum-contract")) return "pedir-contrato-minimo";
  if (!shape.isPlaywrightProject || riskFlags.includes("missing-playwright-config")) return "preparar-projeto-ou-rodar-scaffold";
  if (cacheStatus.status === "risco") return "sanitizar-ou-ignorar-cache-antes-do-mcp";
  if (riskFlags.includes("missing-playwright-dependency")) return "instalar-ou-confirmar-dependencias-playwright";
  if (riskFlags.includes("mcp-may-be-needed")) return "usar-mcp-so-no-proximo-passo-incerto";
  return "usar-cli-cache-e-gerar-incremental";
}

if (initCache) ensureCache();

const rawInput = readInput();
const normalizedInput = parsePrompt(rawInput);
const packageJson = readPackageJson();
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
const projectShape = detectProjectShape(packageJson);
const cacheIgnored = gitignoreAllowsCache();
const cacheStatus = detectCacheStatus(caches, cacheIgnored);
const riskFlags = buildRiskFlags({ shape: projectShape, caches, cacheStatus, normalizedInput, rawInput });
const recommendedMode = chooseRecommendedMode(requestedMode, riskFlags);
const command = recommendedCommand(packageJson, projectShape.firstSpecFiles);

const summary = {
  root,
  mode: requestedMode,
  recommendedMode,
  recommendedCommand: command,
  cacheDir: path.relative(root, cacheDir),
  cacheIgnored,
  cacheStatus,
  caches,
  projectShape,
  likelyFilesToRead: likelyFilesToRead(projectShape),
  riskFlags,
  nextAction: chooseNextAction({ shape: projectShape, cacheStatus, riskFlags }),
  normalizedInput,
  rules: {
    defaultChannel: "cli/cache before mcp",
    mcpOnlyWhen: ["tela-nao-mapeada", "seletor-ambiguo", "estado-real-incerto", "falha-nao-explicada-pelo-cli"],
    neverCache: ["senha", "cookies", "tokens", "storageState", "nomes-reais", "usuarios", "documentos", "emails", "telefones"],
  },
};

const hasErrors = caches.some((cache) => cache.error || cache.sensitive.length)
  || (cacheStatus.files > 0 && !cacheIgnored);

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Modo: ${requestedMode} -> ${recommendedMode}`);
  console.log(`Projeto Playwright: ${projectShape.isPlaywrightProject ? "sim" : "nao"}`);
  console.log(`Comando sugerido: ${summary.recommendedCommand}`);
  console.log(`Cache: ${summary.cacheStatus.status} (${summary.cacheDir})`);
  console.log(`Riscos: ${riskFlags.length ? riskFlags.join(", ") : "nenhum"}`);
  console.log(`Proximo passo: ${summary.nextAction}`);
}

process.exitCode = hasErrors ? 1 : 0;
