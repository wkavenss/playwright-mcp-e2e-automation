#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const args = process.argv.slice(3);
const jsonOutput = args.includes("--json");
const readStdin = args.includes("--stdin");
const inputIndex = args.indexOf("--input");
const modeIndex = args.indexOf("--mode");
const requestedMode = modeIndex >= 0 ? args[modeIndex + 1] : "padrao";
const privateDomainDir = path.join(root, ".playwright-e2e", "private-domain");
const privateDomainFiles = ["glossary.json", "legacy-patterns.json", "flow-hints.md", "selector-recipes.md"];
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

function isReadablePath(value, expectedType) {
  if (!value) return false;
  try {
    const target = path.resolve(root, value);
    fs.accessSync(target, fs.constants.R_OK);
    const stat = fs.statSync(target);
    return expectedType === "file" ? stat.isFile() : stat.isDirectory();
  } catch {
    return false;
  }
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
  if (/\b\d{5,12}\b/.test(text)) reasons.push("identificador-institucional");
  if (/\b[A-Z]{1,3}\d{5,9}\b/i.test(text)) reasons.push("identificador-documental");
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
  const preferredScript = ["test:headed", "test", "test:e2e:headed", "test:e2e"].find((name) => scripts[name]);
  const specArg = specFiles.length === 1 ? ` ${specFiles[0]}` : "";
  if (preferredScript) return `npm run ${preferredScript}${specArg ? ` --${specArg}` : ""}`;
  return `npx playwright test${specArg} --headed --reporter=line`;
}

function gitignoreAllowsPrivateDomain() {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return false;
  return fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".playwright-e2e/private-domain/" || line === ".playwright-e2e/" || line === ".playwright-e2e/private-domain");
}

function readInput() {
  if (inputIndex >= 0 && args[inputIndex + 1]) {
    const file = path.resolve(root, args[inputIndex + 1]);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  }
  if (readStdin) return fs.readFileSync(0, "utf8");
  return "";
}

function cleanPromptValue(value) {
  return String(value)
    .replace(/\s+#\s*opcional.*$/i, "")
    .replace(/^[-*]\s+/, "")
    .trim();
}

function isPromptFieldHeader(line) {
  const normalized = normalizeText(line);
  return /^(?:modo|url(?:\s+base)?|caso de uso(?:\s+\d+)?|operacao|caminho|passo a passo|perfil|usuario|user|senha|password|massa e pre-condicoes|dados especificos|resultado esperado|observacoes|fontes de (?:referencia|evidencia)|agents\.md(?:\s+do\s+modulo)?|codigo-fonte|credenciais|casos de uso|guia de navegacao|abrangencia|secoes\/casos|secoes|casos)\s*:/.test(normalized);
}

function promptFieldValue(lines, regex) {
  const index = lines.findIndex((line) => regex.test(normalizeText(line)));
  if (index < 0) return "";
  const inline = cleanPromptValue(lines[index].slice(lines[index].indexOf(":") + 1));
  if (inline) return inline;
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (isPromptFieldHeader(lines[cursor])) break;
    const candidate = cleanPromptValue(lines[cursor]);
    if (candidate && !candidate.startsWith("#")) return candidate;
  }
  return "";
}

function parseNumberedUseCases(lines) {
  const headers = lines
    .map((line, index) => {
      const match = normalizeText(line).match(/^caso de uso\s+(\d+)\s*:/);
      return match ? { index, number: Number(match[1]) } : null;
    })
    .filter(Boolean);
  const hasUnnumberedHeader = lines.some((line) => /^caso de uso\s*:/.test(normalizeText(line)));
  const numberingValid = headers.length > 0
    && !hasUnnumberedHeader
    && headers.every((header, index) => header.number === index + 1);

  const cases = headers.map((header, index) => {
    const end = headers[index + 1]?.index ?? lines.length;
    const block = lines.slice(header.index + 1, end);
    return {
      number: header.number,
      operation: promptFieldValue(block, /^operacao\s*:/),
      path: promptFieldValue(block, /^(?:caminho|passo a passo)\s*:/),
      profile: promptFieldValue(block, /^perfil\s*:/),
      username: promptFieldValue(block, /^(?:usuario|user)\s*:/),
      password: promptFieldValue(block, /^(?:senha|password)\s*:/),
      mass: promptFieldValue(block, /^massa e pre-condicoes\s*:/),
      specificData: promptFieldValue(block, /^dados especificos\s*:/),
      expectedResult: promptFieldValue(block, /^resultado esperado\s*:/),
      observations: promptFieldValue(block, /^observacoes\s*:/),
      blockers: [],
      duplicateOf: null,
    };
  });

  for (const useCase of cases) {
    if (!useCase.operation) useCase.blockers.push("operacao-ausente");
    if (!useCase.path) useCase.blockers.push("caminho-ausente");
    if (!useCase.profile) useCase.blockers.push("perfil-ausente");
    if (!useCase.username) useCase.blockers.push("usuario-ausente");
    if (!useCase.password) useCase.blockers.push("senha-ausente");
    if (!numberingValid) useCase.blockers.push("numeracao-invalida");
  }

  const byProfile = new Map();
  for (const useCase of cases.filter((item) => item.profile)) {
    const key = normalizeText(useCase.profile).replace(/[^a-z0-9]+/g, "-");
    const current = byProfile.get(key) || [];
    current.push(useCase);
    byProfile.set(key, current);
  }
  const inconsistentProfileCaseNumbers = [];
  for (const profileCases of byProfile.values()) {
    const credentialSignatures = new Set(
      profileCases
        .filter((item) => item.username && item.password)
        .map((item) => `${item.username}\u0000${item.password}`),
    );
    if (credentialSignatures.size <= 1) continue;
    for (const useCase of profileCases) {
      useCase.blockers.push("credenciais-conflitantes");
      inconsistentProfileCaseNumbers.push(useCase.number);
    }
  }

  const seen = new Map();
  for (const useCase of cases) {
    if (!useCase.operation || !useCase.path || !useCase.profile) continue;
    const key = [useCase.operation, useCase.path, useCase.profile]
      .map((value) => normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim())
      .join("|");
    if (seen.has(key)) {
      useCase.duplicateOf = seen.get(key);
      useCase.blockers.push("caso-duplicado");
    } else {
      seen.set(key, useCase.number);
    }
  }

  const summaries = cases.map((useCase) => ({
    number: useCase.number,
    hasOperation: Boolean(useCase.operation),
    hasPath: Boolean(useCase.path),
    hasProfile: Boolean(useCase.profile),
    hasUsername: Boolean(useCase.username),
    hasPassword: Boolean(useCase.password),
    hasMass: Boolean(useCase.mass),
    hasSpecificData: Boolean(useCase.specificData),
    hasExpectedResult: Boolean(useCase.expectedResult),
    hasObservations: Boolean(useCase.observations),
    duplicateOf: useCase.duplicateOf,
    blockers: unique(useCase.blockers),
    ready: useCase.blockers.length === 0,
  }));

  return {
    headers,
    hasUnnumberedHeader,
    numberingValid,
    cases,
    summaries,
    inconsistentProfileCaseNumbers: unique(inconsistentProfileCaseNumbers),
  };
}

function parsePrompt(text) {
  if (!text.trim()) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedText = normalizeText(text);
  const parsedCases = parseNumberedUseCases(lines);
  const firstUseCaseHeaderIndex = lines.findIndex((line) => /^caso de uso(?:\s+\d+)?\s*:/.test(normalizeText(line)));
  const firstCaseIndex = firstUseCaseHeaderIndex >= 0 ? firstUseCaseHeaderIndex : lines.length;
  const preamble = lines.slice(0, firstCaseIndex);
  const url = promptFieldValue(lines, /^url(?:\s+base)?\s*:/);
  const agents = promptFieldValue(lines, /^agents\.md(?:\s+do\s+modulo)?\s*:/);
  const source = promptFieldValue(lines, /^codigo-fonte\s*:/);
  const agentsReadable = isReadablePath(agents, "file");
  const sourceReadable = isReadablePath(source, "directory");
  const user = promptFieldValue(preamble, /^(?:usuario|user)\s*:/);
  const password = promptFieldValue(preamble, /^(?:senha|password)\s*:/);
  const pathValue = promptFieldValue(preamble, /^(?:caminho|passo a passo)\s*:/);
  const guideFieldsPresent = lines.some((line) => /^(?:guia de navegacao|abrangencia|secoes\/casos|secoes|casos)\s*:/.test(normalizeText(line)));
  const separateSectionsPresent = lines.some((line) => /^(?:credenciais|casos de uso)\s*:/.test(normalizeText(line)));
  const hasNumberedCases = parsedCases.headers.length > 0 || parsedCases.hasUnnumberedHeader;
  const hasMassMode = /modo\s*:\s*geracao de massa de dados/.test(normalizedText);
  const hasImplementationMode = /modo\s*:\s*implantacao/.test(normalizedText);
  const functionalMode = hasMassMode && hasImplementationMode
    ? "contraditorio"
    : (hasMassMode ? "massa" : (hasImplementationMode ? "implantacao" : "ausente"));
  const quantityLine = lines.find((line) => /^quantidade\s*:/i.test(line));
  const quantityMatch = quantityLine?.match(/:\s*(\d+)/);
  const quantity = quantityLine ? (quantityMatch ? Number(quantityMatch[1]) : null) : 1;
  const quantityValid = Number.isInteger(quantity) && quantity >= 1;
  const hasPath = Boolean(pathValue);
  const mixedFormats = hasNumberedCases && hasPath;
  const requestKind = guideFieldsPresent
    ? "guia-removido"
    : (separateSectionsPresent
      ? "secoes-separadas"
      : (mixedFormats
        ? "misto"
        : (hasNumberedCases ? "lote" : (hasPath ? "individual" : "ausente"))));
  const readyCases = parsedCases.summaries.filter((item) => item.ready);
  const blockedCases = parsedCases.summaries.filter((item) => !item.ready);
  const routeComplete = requestKind === "individual"
    || (requestKind === "lote" && parsedCases.numberingValid && readyCases.length > 0);
  const commonCredentialsComplete = Boolean(url && user && password);
  const globalImplementationComplete = Boolean(url && agentsReadable && sourceReadable);
  const rawSteps = requestKind === "lote"
    ? []
    : lines
      .filter((line) => /^(\d+[\).:-]|\-|\*)\s+/.test(line))
      .map((line) => line.replace(/^(\d+[\).:-]|\-|\*)\s+/, ""));
  return {
    functionalMode,
    hasBaseUrl: Boolean(url),
    hasUsername: requestKind === "lote" ? parsedCases.summaries.every((item) => item.hasUsername) : Boolean(user),
    hasPassword: requestKind === "lote" ? parsedCases.summaries.every((item) => item.hasPassword) : Boolean(password),
    hasPath: requestKind === "lote" ? parsedCases.summaries.every((item) => item.hasPath) : hasPath,
    guideFieldsPresent,
    separateSectionsPresent,
    mixedFormats,
    requestKind,
    routeComplete,
    hasAgents: Boolean(agents),
    hasSource: Boolean(source),
    agentsReadable,
    sourceReadable,
    useCaseCount: parsedCases.summaries.length,
    numberingValid: parsedCases.numberingValid,
    readyUseCaseCount: readyCases.length,
    blockedUseCaseCount: blockedCases.length,
    readyUseCaseNumbers: readyCases.map((item) => item.number),
    blockedUseCases: blockedCases.map((item) => ({ number: item.number, reasons: item.blockers })),
    duplicateUseCases: parsedCases.summaries
      .filter((item) => item.duplicateOf != null)
      .map((item) => ({ number: item.number, duplicateOf: item.duplicateOf })),
    inconsistentProfileCaseNumbers: parsedCases.inconsistentProfileCaseNumbers,
    useCases: parsedCases.summaries,
    allUseCasesComplete: requestKind === "lote" && blockedCases.length === 0,
    quantity,
    quantityValid,
    contractComplete: functionalMode === "massa"
      ? commonCredentialsComplete && hasPath && quantityValid
      : (functionalMode === "implantacao"
        && globalImplementationComplete
        && routeComplete
        && (requestKind !== "individual" || commonCredentialsComplete)),
    stepCount: rawSteps.length,
    steps: rawSteps.map((step, index) => ({
      id: index + 1,
      text: sanitizePromptLine(step),
      suggestedChannel: classifyStep(step),
    })),
  };
}

function sanitizePromptLine(line) {
  return String(line)
    .replace(/(senha|password|passwd)\s*[:=]\s*\S+/gi, "$1:<redacted>")
    .replace(/(usuario|usuário|username|user)\s*[:=]\s*\S+/gi, "$1:<redacted>")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "<documento>")
    .replace(/\b[A-Z]{1,3}\d{5,9}\b/gi, "<identificador-documental>")
    .replace(/\b\d{5,12}\b/g, "<identificador-institucional>")
    .replace(/\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g, "<telefone>")
    .replace(/\b[A-Z][A-Za-z]{2,}(?:\s+(?:de|da|do|dos|das|e))?\s+[A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,4}\b/g, (match) => (
      hasLikelyPersonName(match) ? "<nome-provavel>" : match
    ));
}

function extractQuotedTerms(line) {
  return [...line.matchAll(/["'`“”‘’]([^"'`“”‘’]{2,80})["'`“”‘’]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function extractCriteriaLabels(line) {
  const labels = [
    ["titulo", /\bt[ií]tulo\b/i],
    ["autor", /\bautor(?:a|es|as)?\b/i],
    ["nome", /\bnome\b/i],
    ["documento", /\b(?:cpf|cnpj|documento|matr[ií]cula)\b/i],
    ["data", /\bdata\b/i],
    ["periodo", /\b(?:per[ií]odo|semestre|ano)\b/i],
    ["status", /\bstatus\b/i],
    ["tipo", /\btipo\b/i],
  ];
  return labels.filter(([, regex]) => regex.test(line)).map(([label]) => label);
}

function extractRequiredUserCriteria(text) {
  if (!text.trim()) return [];
  const criteriaLines = text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /(buscar|busca|filtro|filtrar|validar|crit[eé]rio|deve|selecionar|localizar|pesquisar|com\b|por\b)/i.test(line))
    .filter((line) => !/(senha|password|passwd|token|cookie)/i.test(line));

  return criteriaLines.map((line) => {
    const safeLine = sanitizePromptLine(line);
    const terms = unique([
      ...extractCriteriaLabels(line),
      ...extractQuotedTerms(safeLine).map((term) => sanitizePromptLine(term)),
    ]).slice(0, 8);
    return terms.length ? { line: safeLine.slice(0, 180), terms } : null;
  }).filter(Boolean).slice(0, 10);
}

function buildCriteriaWarnings(criteria) {
  const warnings = [];
  if (criteria.some((item) => item.terms.length > 1)) {
    warnings.push("preservar-todos-os-criterios-informados");
  }
  if (criteria.some((item) => /\bou\b|alternativa|parecido|similar/i.test(item.line))) {
    warnings.push("confirmar-criterio-alternativo-antes-de-simplificar");
  }
  return unique(warnings);
}

function classifyStep(step) {
  const text = normalizeText(step);
  if (/(instalar|dependencia|scaffold|executar|rodar teste|validar teste|lint|typecheck|relatorio|trace)/.test(text)) return "cli";
  if (/(dom completo|html completo|screenshot sem necessidade|log completo|readme sem pedido)/.test(text)) return "remover";
  if (/(tela|campo|botao|menu|modal|autocomplete|tabela|mensagem|permissao|estado visual|seletor)/.test(text)) return "mcp";
  return "cli";
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
    hasClientConfig: Boolean(existingFile("tests/utils/clientConfig.js")),
    hasClientProfiles: existingDirectory("config/clientes"),
    hasTestData: Boolean(existingFile("tests/utils/testData.js")),
    hasEnvExample: Boolean(existingFile(".env.example")),
    hasGenerationCache: existingDirectory(".playwright-e2e/cache"),
    isPlaywrightProject: hasPlaywrightDependency || hasPlaywrightConfig || hasE2eDirectory || pageObjectFiles.length > 0,
    specCount: specFiles.length,
    pageObjectCount: pageObjectFiles.length,
    firstSpecFiles: specFiles.slice(0, 3),
    firstPageObjectFiles: pageObjectFiles.slice(0, 3),
  };
}

function detectPrivateDomainStatus() {
  const files = privateDomainFiles.map((name) => {
    const file = path.join(privateDomainDir, name);
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    let validJson = null;
    let error = null;
    let keys = [];
    if (exists && name.endsWith(".json")) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        validJson = true;
        keys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 12) : [];
      } catch (parseError) {
        validJson = false;
        error = parseError.message;
      }
    }
    return { name, exists, validJson, error, keys };
  });
  return {
    exists: fs.existsSync(privateDomainDir),
    ignoredByGit: gitignoreAllowsPrivateDomain(),
    foundFiles: files.filter((file) => file.exists).map((file) => file.name),
    missingFiles: files.filter((file) => !file.exists).map((file) => file.name),
    invalidJson: files.filter((file) => file.validJson === false).map((file) => ({ name: file.name, error: file.error })),
    files,
  };
}

function likelyFilesToRead(shape) {
  return unique([
    shape.hasPackageJson ? "package.json" : null,
    shape.playwrightConfigFile,
    shape.hasAuthProfiles ? "tests/utils/authProfiles.js" : null,
    shape.hasClientConfig ? "tests/utils/clientConfig.js" : null,
    shape.hasClientProfiles ? "config/defaults.json" : null,
    shape.hasTestData ? "tests/utils/testData.js" : null,
    ...shape.firstSpecFiles,
    ...shape.firstPageObjectFiles,
    ...privateDomainFiles
      .map((name) => path.join(".playwright-e2e/private-domain", name))
      .filter((file) => fs.existsSync(path.join(root, file))),
  ]).slice(0, 10);
}

function buildRiskFlags({ shape, privateDomainStatus, normalizedInput, rawInput, criteriaWarnings }) {
  const riskFlags = [];
  if (shape.hasGenerationCache) riskFlags.push("generation-cache-in-project");
  if (privateDomainStatus.exists && !privateDomainStatus.ignoredByGit) riskFlags.push("private-domain-not-ignored");
  if (privateDomainStatus.foundFiles.length) riskFlags.push("private-domain-available");
  if (privateDomainStatus.invalidJson.length) riskFlags.push("private-domain-invalid-json");
  if (shape.isPlaywrightProject && !shape.hasPlaywrightConfig) riskFlags.push("missing-playwright-config");
  if (shape.isPlaywrightProject && !shape.hasPlaywrightDependency) riskFlags.push("missing-playwright-dependency");
  if (shape.specCount > 0 && !shape.hasPageObjects) riskFlags.push("specs-without-page-objects");
  if (shape.specCount > 0 && !shape.hasAuthProfiles) riskFlags.push("missing-auth-profiles");
  if (shape.specCount > 0 && !shape.hasTestData) riskFlags.push("missing-test-data-helper");
  if (normalizedInput && !normalizedInput.contractComplete) {
    riskFlags.push("missing-minimum-contract");
  }
  if (normalizedInput?.hasAgents && !normalizedInput.agentsReadable) riskFlags.push("agents-source-unreadable");
  if (normalizedInput?.hasSource && !normalizedInput.sourceReadable) riskFlags.push("code-source-unreadable");
  if (normalizedInput?.functionalMode === "ausente") riskFlags.push("functional-mode-missing");
  if (normalizedInput?.functionalMode === "contraditorio") riskFlags.push("functional-mode-contradictory");
  if (normalizedInput?.requestKind === "guia-removido") riskFlags.push("guide-mode-removed");
  if (normalizedInput?.requestKind === "secoes-separadas") riskFlags.push("separate-batch-sections-not-allowed");
  if (normalizedInput?.requestKind === "misto") riskFlags.push("mixed-use-case-formats");
  if (normalizedInput?.requestKind === "lote" && !normalizedInput.numberingValid) riskFlags.push("use-case-numbering-invalid");
  if (normalizedInput?.requestKind === "lote" && normalizedInput.blockedUseCaseCount) riskFlags.push("blocked-use-cases");
  if (normalizedInput?.requestKind === "lote" && normalizedInput.duplicateUseCases.length) riskFlags.push("duplicate-use-cases");
  if (normalizedInput?.requestKind === "lote" && normalizedInput.inconsistentProfileCaseNumbers.length) riskFlags.push("credential-profile-conflict");
  if (normalizedInput?.requestKind === "lote" && normalizedInput.readyUseCaseCount === 0) riskFlags.push("no-ready-use-cases");
  if (shape.hasClientProfiles || shape.hasClientConfig) riskFlags.push("legacy-client-profile-config");
  if (normalizedInput?.steps?.some((step) => step.suggestedChannel === "mcp")) {
    riskFlags.push("mcp-may-be-needed");
  }
  if (scanSensitive(rawInput).length) riskFlags.push("input-has-sensitive-data");
  if (criteriaWarnings.length) riskFlags.push("preserve-user-criteria");
  return unique(riskFlags);
}

function chooseRecommendedMode(mode, riskFlags) {
  if (mode && mode !== "padrao") return mode;
  if (riskFlags.includes("mcp-may-be-needed")) return "padrao";
  if (riskFlags.length === 1 && riskFlags[0] === "input-has-sensitive-data") return "cli-only";
  if (!riskFlags.length) return "cli-only";
  return "padrao";
}

function chooseNextAction({ shape, riskFlags }) {
  if (riskFlags.includes("functional-mode-missing") || riskFlags.includes("functional-mode-contradictory")) return "pedir-modo-funcional";
  if (riskFlags.includes("guide-mode-removed")) return "converter-guia-em-casos-de-uso";
  if (riskFlags.includes("separate-batch-sections-not-allowed")) return "juntar-credenciais-em-cada-caso";
  if (riskFlags.includes("mixed-use-case-formats")) return "escolher-formato-individual-ou-numerado";
  if (riskFlags.includes("use-case-numbering-invalid")) return "corrigir-numeracao-dos-casos";
  if (riskFlags.includes("credential-profile-conflict")) return "corrigir-credenciais-conflitantes";
  if (riskFlags.includes("agents-source-unreadable") || riskFlags.includes("code-source-unreadable")) return "corrigir-fontes-de-evidencia";
  if (riskFlags.includes("no-ready-use-cases")) return "corrigir-casos-bloqueados";
  if (riskFlags.includes("missing-minimum-contract")) return "pedir-contrato-minimo";
  if (!shape.isPlaywrightProject || riskFlags.includes("missing-playwright-config")) return "preparar-projeto-ou-rodar-scaffold";
  if (riskFlags.includes("generation-cache-in-project")) return "remover-infraestrutura-de-tentativas-do-projeto";
  if (riskFlags.includes("missing-playwright-dependency")) return "instalar-ou-confirmar-dependencias-playwright";
  if (riskFlags.includes("blocked-use-cases")) return "processar-casos-prontos-e-relatar-bloqueados";
  if (riskFlags.includes("mcp-may-be-needed")) return "usar-mcp-so-no-proximo-passo-incerto";
  return "usar-cli-e-gerar-incremental";
}

const rawInput = readInput();
const normalizedInput = parsePrompt(rawInput);
const requiredUserCriteria = extractRequiredUserCriteria(rawInput);
const criteriaWarnings = buildCriteriaWarnings(requiredUserCriteria);
const packageJson = readPackageJson();
const projectShape = detectProjectShape(packageJson);
const privateDomainStatus = detectPrivateDomainStatus();
const riskFlags = buildRiskFlags({ shape: projectShape, privateDomainStatus, normalizedInput, rawInput, criteriaWarnings });
const recommendedMode = chooseRecommendedMode(requestedMode, riskFlags);
const command = recommendedCommand(packageJson, projectShape.firstSpecFiles);

const summary = {
  root,
  mode: requestedMode,
  recommendedMode,
  recommendedCommand: command,
  privateDomainStatus,
  projectShape,
  likelyFilesToRead: likelyFilesToRead(projectShape),
  riskFlags,
  requiredUserCriteria,
  criteriaWarnings,
  nextAction: chooseNextAction({ shape: projectShape, riskFlags }),
  normalizedInput,
  rules: {
    defaultChannel: "cli before mcp",
    mcpOnlyWhen: ["tela-nao-mapeada", "seletor-ambiguo", "estado-real-incerto", "falha-nao-explicada-pelo-cli"],
    projectCache: "nao criar; remover cache legado depois de extrair somente contexto seguro indispensavel",
    privateDomain: "usar apenas quando existir localmente; nao copiar valores privados para arquivos versionados",
  },
};

const hasErrors = projectShape.hasGenerationCache
  || privateDomainStatus.invalidJson.length
  || (privateDomainStatus.exists && !privateDomainStatus.ignoredByGit);

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Modo: ${requestedMode} -> ${recommendedMode}`);
  console.log(`Projeto Playwright: ${projectShape.isPlaywrightProject ? "sim" : "nao"}`);
  console.log(`Comando sugerido: ${summary.recommendedCommand}`);
  console.log(`Riscos: ${riskFlags.length ? riskFlags.join(", ") : "nenhum"}`);
  console.log(`Proximo passo: ${summary.nextAction}`);
}

process.exitCode = hasErrors ? 1 : 0;
