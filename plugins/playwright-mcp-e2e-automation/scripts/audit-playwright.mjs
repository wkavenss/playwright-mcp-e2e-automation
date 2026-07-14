#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");
const changedOnly = args.includes("--changed");
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const codeExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".tsx"]);
const defaultChangedManifest = ".playwright-e2e/changed-files.json";
const commonSurnames = new Set([
  "almeida", "alves", "araujo", "barbosa", "batista", "carvalho", "costa", "dias",
  "ferreira", "gomes", "lima", "martins", "nascimento", "oliveira", "pereira",
  "ribeiro", "rocha", "rodrigues", "santos", "silva", "sousa", "souza",
]);
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

function gitPaths(args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split(/\r?\n/)
    .filter(Boolean);
}

function isGitRepository() {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "true";
  } catch {
    return false;
  }
}

function flagValues(flag) {
  const index = args.indexOf(flag);
  if (index < 0) return [];
  const values = [];
  for (let cursor = index + 1; cursor < args.length; cursor += 1) {
    if (args[cursor].startsWith("--")) break;
    values.push(args[cursor]);
  }
  return values;
}

function scopedFile(file) {
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) return null;
  return fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? absolute : null;
}

function manifestFiles(file) {
  if (!file) return [];
  const absolute = path.resolve(root, file);
  if (!fs.existsSync(absolute)) {
    add("error", "invalid-scope-manifest", ".", 1, `Manifesto nao encontrado: ${path.relative(root, absolute) || file}.`);
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
    const values = Array.isArray(parsed) ? parsed : parsed.files;
    if (!Array.isArray(values)) {
      add("error", "invalid-scope-manifest", relative(absolute), 1, "Manifesto deve ser JSON array ou objeto com files.");
      return [];
    }
    return values.map(scopedFile).filter(Boolean);
  } catch (error) {
    add("error", "invalid-scope-manifest", relative(absolute), 1, `Manifesto invalido: ${error.message}.`);
    return [];
  }
}

function selectedManifest() {
  const explicit = flagValues("--manifest")[0];
  if (explicit) return explicit;
  if (!changedOnly || flagValues("--files").length) return "";
  if (isGitRepository()) return "";
  return fs.existsSync(path.join(root, defaultChangedManifest)) ? defaultChangedManifest : "";
}

function explicitScopeFiles() {
  return [...new Set([
    ...flagValues("--files").map(scopedFile).filter(Boolean),
    ...manifestFiles(selectedManifest()),
  ])];
}

function changedFiles() {
  if (!isGitRepository()) {
    add("error", "changed-scope-required", ".", 1, "Use --files ou --manifest com --changed fora de um repositorio Git.");
    return [];
  }
  const paths = new Set([
    ...gitPaths(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
    ...gitPaths(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...paths]
    .map((file) => path.join(root, file))
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
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

function matches(content, regex) {
  regex.lastIndex = 0;
  return [...content.matchAll(regex)];
}

function methodBlock(content, methodName) {
  const startMatch = firstMatch(
    content,
    new RegExp(`\\b(?:async\\s+)?${methodName}\\s*\\([^)]*\\)\\s*\\{`, "g"),
  );
  if (!startMatch) return null;

  const openBrace = startMatch.index + startMatch[0].lastIndexOf("{");
  let depth = 0;
  for (let index = openBrace; index < content.length; index += 1) {
    if (content[index] === "{") depth += 1;
    if (content[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) {
      return { index: startMatch.index, text: content.slice(startMatch.index, index + 1) };
    }
  }
  return { index: startMatch.index, text: content.slice(startMatch.index) };
}

function maskStringsAndComments(content) {
  let state = "code";
  let masked = "";

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
        masked += "\n";
      } else {
        masked += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        masked += "  ";
        index += 1;
        state = "code";
      } else {
        masked += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state !== "code") {
      if (character === "\\") {
        masked += " ";
        if (next !== undefined) {
          masked += next === "\n" ? "\n" : " ";
          index += 1;
        }
        continue;
      }
      const closing = state === "single" ? "'" : (state === "double" ? '"' : "`");
      masked += character === "\n" ? "\n" : " ";
      if (character === closing) state = "code";
      continue;
    }

    if (character === "/" && next === "/") {
      masked += "  ";
      index += 1;
      state = "line-comment";
      continue;
    }
    if (character === "/" && next === "*") {
      masked += "  ";
      index += 1;
      state = "block-comment";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      masked += " ";
      state = character === "'" ? "single" : (character === '"' ? "double" : "template");
      continue;
    }
    masked += character;
  }

  return masked;
}

function maxDecisionDepth(content) {
  const code = maskStringsAndComments(content);
  const blockStack = [];
  let parenDepth = 0;
  let decisionConditionDepth = null;
  let waitingForCondition = false;
  let pendingDecisionBlock = false;
  let decisionDepth = 0;
  let maximum = 0;

  for (let index = 0; index < code.length; index += 1) {
    const character = code[index];

    if (/[A-Za-z_$]/.test(character)) {
      const wordMatch = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(code.slice(index));
      const word = wordMatch?.[0] || "";
      if (word === "if") waitingForCondition = true;
      if (word === "else") {
        const remainder = code.slice(index + word.length);
        pendingDecisionBlock = !/^\s*if\b/.test(remainder);
      }
      index += Math.max(0, word.length - 1);
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      if (waitingForCondition) {
        decisionConditionDepth = parenDepth;
        waitingForCondition = false;
      }
      continue;
    }

    if (character === ")") {
      if (decisionConditionDepth === parenDepth) {
        pendingDecisionBlock = true;
        decisionConditionDepth = null;
      }
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (character === "{") {
      blockStack.push(pendingDecisionBlock);
      if (pendingDecisionBlock) {
        decisionDepth += 1;
        maximum = Math.max(maximum, decisionDepth);
      }
      pendingDecisionBlock = false;
      continue;
    }

    if (character === "}") {
      if (blockStack.pop()) decisionDepth = Math.max(0, decisionDepth - 1);
      continue;
    }

    if (pendingDecisionBlock && !/\s/.test(character)) pendingDecisionBlock = false;
  }

  return maximum;
}

function hasNearby(content, index, pattern, radius = 180) {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return pattern.test(content.slice(start, end));
}

function hasAllowedWaitComment(content, index) {
  const start = Math.max(0, index - 180);
  const before = content.slice(start, index);
  return /playwright-e2e-allow-wait:\s*requisito-explicito-do-usuario\b|Requisito explicito do roteiro/i.test(before);
}

function hasFunctionalWaitGuard(content, index) {
  const start = Math.max(0, index - 500);
  const end = Math.min(content.length, index + 500);
  return /\bexpect\s*\(|\btoHave(?:Text|URL|Value|Count|Attribute|Title)\s*\(|\bvalidar[A-Za-z0-9_]*\s*\(|\bwaitForEvent\s*\(\s*["'`]download/.test(content.slice(start, end));
}

function evaluateBlocks(content) {
  const blocks = [];
  const regex = /\b(?:evaluate|evaluateHandle)\s*\(/g;
  for (const match of matches(content, regex)) {
    blocks.push({
      index: match.index,
      text: content.slice(match.index, Math.min(content.length, match.index + 900)),
    });
  }
  return blocks;
}

function isAutomationFile(relativePath) {
  return /(?:^|[/\\])(?:tests?|e2e|specs?|pages?|page-objects?|fixtures|data|utils)(?:[/\\])|playwright\.config\./i.test(relativePath);
}

function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function namedCalls(content) {
  return matches(content, /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)
    .map((match) => ({ name: match[1], normalizedName: normalizeText(match[1]), index: match.index }));
}

function isDestructiveMethodName(name) {
  const normalized = normalizeText(name);
  if (/^(?:validar|confirmar)(?:ausencia|estado|status|persistencia|permanencia|existencia|registro)/.test(normalized)) return false;
  return /(?:remover|excluir|apagar|deletar|aprovar|rejeitar|inativar|arquivar|cancelardefinitivamente|confirmar.*(?:remocao|exclusao|cancelamentodefinitivo))/.test(normalized);
}

function stringLiterals(content) {
  return [
    /"((?:\\.|[^"\\\r\n]){4,160})"/g,
    /'((?:\\.|[^'\\\r\n]){4,160})'/g,
    /`((?:\\.|[^`\\\r\n]){4,160})`/g,
  ].flatMap((regex) => {
    regex.lastIndex = 0;
    return [...content.matchAll(regex)].map((match) => ({ value: match[1], index: match.index }));
  });
}

function words(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function hasLikelyPersonName(value) {
  const candidates = [
    ...value.matchAll(/\b[A-Z][A-Za-z]{2,}(?:\s+(?:de|da|do|dos|das|e))?\s+[A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,4}\b/g),
    ...value.matchAll(/\b[A-Z]{3,}(?:\s+(?:DE|DA|DO|DOS|DAS|E))?\s+[A-Z]{3,}(?:\s+[A-Z]{3,}){0,4}\b/g),
  ];
  return candidates.some((match) => {
    const tokens = words(match[0]).filter((token) => !["de", "da", "do", "dos", "das", "e"].includes(token));
    return tokens.length >= 2 && tokens.some((token) => commonSurnames.has(token));
  });
}

function hasSensitiveLiteral(value) {
  return /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(value)
    || /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(value)
    || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    || /\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/.test(value)
    || hasLikelyPersonName(value);
}

function isTemporalPlaceholder(value) {
  const text = String(value).trim();
  return /^(?:DD[/-]MM[/-]YYYY|YYYY[/-]MM[/-]DD|MM[/-]DD[/-]YYYY)$/i.test(text)
    || /^<[^>]+>$/.test(text)
    || /^(?:example|change-me|data-exemplo|yyyy|yyyy\.[12])$/i.test(text);
}

function hasFixedDateLiteral(value) {
  const text = String(value);
  if (isTemporalPlaceholder(text)) return false;
  return /\b(?:0[1-9]|[12]\d|3[01])[/-](?:0[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/.test(text)
    || /\b(?:19|20)\d{2}[/-](?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])\b/.test(text);
}

function hasFixedTemporalScalar(value) {
  const text = String(value).trim();
  if (isTemporalPlaceholder(text)) return false;
  return hasFixedDateLiteral(text)
    || /^(?:19|20)\d{2}(?:[./-][12])?$/.test(text);
}

function isTemporalKey(value) {
  return /(?:data|date|inicio|fim|termino|vencimento|prazo|validade|ano|year|semestre|periodo|period|letivo|deadline|start|end)/i.test(value);
}

function sensitiveCacheReasons(value, key = "") {
  const reasons = [];
  if (typeof value === "string" || typeof value === "number") {
    if (hasSensitiveLiteral(String(value))) reasons.push("dado-pessoal");
    if (/(bearer\s+|set-cookie|connect\.sid|localStorage|sessionStorage)/i.test(String(value))) reasons.push("estado-autenticado");
  }
  if (/(password|senha|passwd|token|cookie|secret|storage|session|usuario|username)/i.test(key)) reasons.push("chave-sensivel");
  return [...new Set(reasons)];
}

function scanTemporalCacheValue(value, location = "$", findings = []) {
  if (value == null) return findings;
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    if (hasFixedDateLiteral(text) || (isTemporalKey(location) && hasFixedTemporalScalar(text))) {
      findings.push({ location, value: text });
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanTemporalCacheValue(item, `${location}[${index}]`, findings));
    return findings;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      scanTemporalCacheValue(nested, `${location}.${key}`, findings);
    }
  }
  return findings;
}

function scanCacheValue(value, location = "$", findings = []) {
  if (value == null) return findings;
  if (typeof value === "string" || typeof value === "number") {
    const reasons = sensitiveCacheReasons(value);
    if (reasons.length) findings.push({ location, reasons });
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanCacheValue(item, `${location}[${index}]`, findings));
    return findings;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const keyReasons = sensitiveCacheReasons("", key);
      if (keyReasons.length) findings.push({ location: `${location}.${key}`, reasons: keyReasons });
      scanCacheValue(nested, `${location}.${key}`, findings);
    }
  }
  return findings;
}

function scanClientProfileValue(value, location = "$", findings = []) {
  if (value == null) return findings;
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    const reasons = [];
    if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text)) reasons.push("cpf");
    if (/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(text)) reasons.push("cnpj");
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) reasons.push("email");
    if (/(bearer\s+|set-cookie|connect\.sid|localStorage|sessionStorage)/i.test(text)) reasons.push("estado-autenticado");
    if (reasons.length) findings.push({ location, reasons });
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanClientProfileValue(item, `${location}[${index}]`, findings));
    return findings;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)
        || /(password|senha|passwd|token|cookie|secret|storage|session|username|cpf|cnpj|matricula|email|telefone)/i.test(key)
        || /^(?:usuario|user|login)$/i.test(key)) {
        findings.push({ location: `${location}.${key}`, reasons: ["chave-sensivel"] });
      }
      scanClientProfileValue(nested, `${location}.${key}`, findings);
    }
  }
  return findings;
}

function isCacheIgnored() {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return false;
  return fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".playwright-e2e/cache/" || line === ".playwright-e2e/" || line === ".playwright-e2e/cache");
}

function hasPlaywrightDependency() {
  const packagePath = path.join(root, "package.json");
  if (!fs.existsSync(packagePath)) return false;
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    return ["dependencies", "devDependencies", "optionalDependencies"].some((section) => {
      const dependencies = packageJson[section] || {};
      return Boolean(dependencies["@playwright/test"] || dependencies.playwright);
    });
  } catch {
    return false;
  }
}

function hasDirectory(relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

const scopedFiles = explicitScopeFiles();
const hasExplicitScope = flagValues("--files").length > 0 || Boolean(flagValues("--manifest")[0] || selectedManifest());
const files = scopedFiles.length ? scopedFiles : (hasExplicitScope ? [] : (changedOnly ? changedFiles() : walk(root)));
const codeFiles = files.filter((file) => codeExtensions.has(path.extname(file)));
const specFiles = codeFiles.filter((file) => /(?:\.spec|\.test)\.[cm]?[jt]sx?$/.test(file));
const changedPageObjectFiles = codeFiles.filter((file) => /(?:^|[/\\])(?:pages?|page-objects?)(?:[/\\])/i.test(file));
const conventionalPageObjectFiles = ["tests/pages", "tests/page-objects", "test/pages", "page-objects"]
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((file) => codeExtensions.has(path.extname(file)));
const pageObjectFiles = [...new Set([...changedPageObjectFiles, ...conventionalPageObjectFiles])];

for (const file of files.filter((item) => path.basename(item) === ".gitkeep")) {
  const outrosArquivos = fs.readdirSync(path.dirname(file)).filter((item) => item !== ".gitkeep");
  if (outrosArquivos.length) {
    add("warning", "redundant-gitkeep", relative(file), 1, ".gitkeep e desnecessario em diretorio que ja possui arquivos; remova o marcador.");
  }
}

if (specFiles.length && !pageObjectFiles.length) {
  add("error", "page-objects-required", ".", 1, "Specs encontradas sem Page Objects em diretorio pages/page-objects.");
}

for (const file of codeFiles) {
  const content = fs.readFileSync(file, "utf8");
  const rel = relative(file);
  const automationFile = isAutomationFile(rel);
  const trivialFactory = firstMatch(content, /function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*return\s+new\s+[A-Za-z_$][\w$]*\s*\([^;]*\);?\s*\}/gs);
  if (automationFile && trivialFactory) {
    add("warning", "trivial-factory", rel, lineNumber(content, trivialFactory.index), "Fabrica que apenas chama new adiciona uma camada sem ganho; instancie a classe diretamente.");
  }
  const wait = firstMatch(content, /\bwaitForTimeout\s*\(/g);
  if (wait && !(hasAllowedWaitComment(content, wait.index) && hasFunctionalWaitGuard(content, wait.index))) {
    add("warning", "fixed-timeout", rel, lineNumber(content, wait.index), "Evite waitForTimeout; espere uma condicao observavel ou anote requisito explicito do usuario.");
  }

  const perSpecTimeout = specFiles.includes(file)
    ? firstMatch(content, /\btest\.setTimeout\s*\(\s*[0-9_]+\s*\)/g)
    : null;
  if (
    perSpecTimeout
    && !hasNearby(content, perSpecTimeout.index, /excecao comprovada|exceção comprovada|limite especifico|limite específico|operacao comprovadamente|operação comprovadamente|playwright-e2e-allow-test-timeout/i, 260)
  ) {
    add("warning", "redundant-per-spec-timeout", rel, lineNumber(content, perSpecTimeout.index), "Centralize o limite total no playwright.config; prefira test.slow() para fluxo excepcional e use test.setTimeout somente quando um valor exato for comprovado e comentado.");
  }

  const localActionTimeouts = matches(
    content,
    /\.(click|fill|check|uncheck|selectOption)\s*\([^;]{0,300}?\btimeout\s*:\s*([0-9_]+)/g,
  );
  for (const timeout of localActionTimeouts) {
    if (hasNearby(content, timeout.index, /timeout local|limite funcional|requisito explicito|requisito explícito|playwright-e2e-allow-action-timeout/i, 260)) continue;
    add("warning", "redundant-local-action-timeout", rel, lineNumber(content, timeout.index), `Timeout local em ${timeout[1]} duplica ou reduz o actionTimeout central; remova-o ou documente o requisito funcional.`);
  }

  const loadState = firstMatch(content, /\bwaitForLoadState\s*\(\s*["'`](?:domcontentloaded|load|networkidle)["'`]/g);
  if (loadState) {
    add("warning", "generic-load-state", rel, lineNumber(content, loadState.index), "Evite waitForLoadState generico; espere o efeito observavel da UI.");
  }

  const forceAction = firstMatch(content, /\b(?:fill|click|check|uncheck|selectOption|press)\s*\([^)]*\{[^}]*force\s*:\s*true/gs);
  if (forceAction) {
    add("warning", "force-true-action", rel, lineNumber(content, forceAction.index), "Evite force: true amplo; prefira elemento editavel/visivel ou fallback JSF isolado e comentado.");
  }

  const bodyInnerText = firstMatch(content, /locator\s*\(\s*["'`]body["'`]\s*\)\s*\.\s*innerText\s*\(/g);
  if (bodyInnerText) {
    add("warning", "body-inner-text", rel, lineNumber(content, bodyInnerText.index), "Evite ler body inteiro para mensagens; prefira container de erro/alerta quando existir.");
  }

  const nthSelector = firstMatch(content, /\.nth\s*\(\s*\d+\s*\)/g);
  if (nthSelector) {
    add("warning", "nth-selector", rel, lineNumber(content, nthSelector.index), "Evite .nth() como seletor principal; filtre por label, role, linha, texto estavel ou dado gerado.");
  }

  const unfilteredFirst = firstMatch(content, /\.first\s*\(\s*\)/g);
  if (unfilteredFirst && !hasNearby(content, unfilteredFirst.index, /\.filter\s*\(|hasText|has\s*:/, 360)) {
    add("warning", "unfiltered-first", rel, lineNumber(content, unfilteredFirst.index), "Evite .first() sem filtro estavel; escopo e criterio funcional devem ficar claros.");
  }

  const xpathSelector = firstMatch(content, /(?:locator\s*\(\s*["'`]xpath=|locator\s*\(\s*["'`]\/\/)/g);
  if (xpathSelector && !hasNearby(content, xpathSelector.index, /XPath|xpath|ultimo recurso|último recurso|sem acessibilidade|fallback/i, 220)) {
    add("warning", "xpath-without-justification", rel, lineNumber(content, xpathSelector.index), "XPath deve ser ultimo recurso e ter justificativa curta no Page Object.");
  }

  const structuralTableSelector = firstMatch(content, /locator\s*\(\s*["'`][^"'`]*\btable\b[^"'`]*\b(?:tbody\s+tr|thead\s+tr|tr\s+td)\b[^"'`]*["'`]/gi);
  if (structuralTableSelector && !hasNearby(content, structuralTableSelector.index, /sem (?:role|acessibilidade)|fallback legado|estrutura legada justificada/i, 240)) {
    add("warning", "structural-table-selector", rel, lineNumber(content, structuralTableSelector.index), "Evite acoplar linhas a table/tbody/tr; localize a tabela por role/nome ou ID estavel e filtre getByRole('row').");
  }

  const optionalOverlayRace = firstMatch(content, /if\s*\(\s*await\s+[A-Za-z0-9_.$]*(?:cookie|consent|modal|dialog|overlay)[A-Za-z0-9_.$]*\.isVisible\s*\(\s*\)\s*\)\s*(?:\{\s*)?await\s+[A-Za-z0-9_.$]+\.click\s*\(/gi);
  if (optionalOverlayRace) {
    add("warning", "optional-overlay-race", rel, lineNumber(content, optionalOverlayRace.index), "isVisible() retorna imediatamente; para overlay tardio, recupere o clique interceptado, feche o overlay e repita uma vez, relancando erros nao relacionados.");
  }

  const knownConsent = firstMatch(
    content,
    /getByRole\s*\(\s*["']button["'][\s\S]{0,120}?(?:Ciente|Aceitar cookies)|(?:aviso|consentimento|botao)[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*/i,
  );
  if (knownConsent) {
    const consentWaits = matches(
      content,
      /\bthis\.(?:botaoCiente|[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*)[\s\S]{0,80}?\.waitFor\s*\(\s*\{[^}]{0,180}?\btimeout\s*:\s*([0-9_]+)/gi,
    );
    for (const consentWait of consentWaits) {
      const timeout = Number(consentWait[1].replaceAll("_", ""));
      if (timeout > 2_000) {
        add("warning", "long-optional-consent-wait", rel, lineNumber(content, consentWait.index), "Consentimento opcional com recuperacao tardia deve usar procura inicial de ate 2000 ms para nao atrasar clientes sem banner.");
      }
    }

    const login = methodBlock(content, "realizarLogin");
    const proactiveNames = content.match(
      /\b(?:aceitar|fechar|confirmar|accept|dismiss)[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*\b/gi,
    ) || [];
    const hasCalledProactiveConsent = proactiveNames.some((name) => (
      content.match(new RegExp(`\\b${name}\\b`, "g")) || []
    ).length >= 2);
    const inlineConsentWait = login?.text.search(
      /\bthis\.(?:botaoCiente|[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*)\s*\.\s*waitFor\s*\(/i,
    ) ?? -1;
    const inlineConsentClick = login?.text.search(
      /\bthis\.(?:botaoCiente|[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*)\s*\.\s*click\s*\(/i,
    ) ?? -1;
    const hasInlineProactiveConsent = inlineConsentWait >= 0 && inlineConsentClick >= inlineConsentWait;
    if (!hasCalledProactiveConsent && !hasInlineProactiveConsent) {
      add("warning", "known-consent-not-proactive", rel, lineNumber(content, knownConsent.index), "Consentimento conhecido deve ser tratado proativamente na abertura confirmada pela tela, sem remover a recuperacao tardia.");
    }

    if (login) {
      const preenchimentoCredencial = login.text.search(
        /\.fill\s*\(\s*(?:username|usuario|password|senha)\b/i,
      );
      const proactiveMethodCall = login.text.search(
        /\b(?:aceitar|fechar|confirmar|accept|dismiss)[A-Za-z0-9_]*(?:Cookie|Consent)[A-Za-z0-9_]*\s*\(/i,
      );
      const aceiteConsentimento = [proactiveMethodCall, inlineConsentClick]
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0] ?? -1;
      if (preenchimentoCredencial >= 0
        && (aceiteConsentimento < 0 || aceiteConsentimento > preenchimentoCredencial)) {
        add("error", "consent-after-credentials", rel, lineNumber(content, login.index), "Procure e trate o consentimento antes de preencher usuario ou senha; a ausencia pode continuar sem falhar.");
      }
    }
  }

  const imageTitleLink = firstMatch(content, /locator\s*\([^)]*["'`][^"'`]*img\[title=/gs);
  if (imageTitleLink) {
    add("warning", "image-title-link-selector", rel, lineNumber(content, imageTitleLink.index), "Evite acoplar link/botao a img[title]; tente getByRole ou seletor acessivel antes.");
  }

  const idSuffixSelector = firstMatch(content, /\[\s*id\$\s*=/g);
  if (idSuffixSelector && !/toHaveCount\s*\(\s*1\s*\)/.test(content)) {
    add("warning", "id-suffix-without-uniqueness", rel, lineNumber(content, idSuffixSelector.index), "Se usar id$ em campo critico, escopo e unicidade devem ficar evidentes.");
  }

  const generatedJsfId = firstMatch(content, /(?:j_id(?:_jsp)?_?\d+|j_idt_?\d+|javax\.faces)/gi);
  if (generatedJsfId) {
    add("warning", "generated-jsf-id", rel, lineNumber(content, generatedJsfId.index), "Evite ID JSF gerado; prefira locator semantico ou ID estavel declarado diretamente no Page Object.");
  }

  const fullGeneratedJsfSelector = firstMatch(content, /(?:#|id=["'`]|id\\=|\\#)(?:j_id(?:_jsp)?_?\d+|j_idt_?\d+)/gi);
  if (fullGeneratedJsfSelector) {
    add("warning", "generated-jsf-css-selector", rel, lineNumber(content, fullGeneratedJsfSelector.index), "Seletor CSS com ID JSF gerado e fragil; use locator semantico ou sufixo estavel.");
  }

  const directStableJsfCss = firstMatch(content, /locator\s*\(\s*["'`]#[A-Za-z][\w-]*(?:\\)+:[^"'`]+["'`]\s*\)/g);
  if (directStableJsfCss) {
    add("warning", "stable-jsf-id-escaped", rel, lineNumber(content, directStableJsfCss.index), "Evite escape manual de ID JSF; declare o locator como [id=\"form:campo\"] diretamente no Page Object.");
  }

  const documentGetById = firstMatch(content, /\bdocument\.getElementById\s*\(/g);
  if (documentGetById) {
    add("warning", "dom-get-element-by-id", rel, lineNumber(content, documentGetById.index), "Evite document.getElementById em page.evaluate; prefira locator Playwright observavel.");
  }

  const evaluateIndex = evaluateBlocks(content).find((block) => (
    /(?:querySelectorAll|getElementsBy(?:Name|ClassName|TagName)|children|childNodes)\s*\([^)]*\)?\s*\[\s*\d+\s*\]/s.test(block.text)
    || /(?:children|childNodes)\s*\[\s*\d+\s*\]/s.test(block.text)
    || /\b[A-Za-z_$][\w$]*(?:Radios|radios|Opcoes|opcoes|Options|options|Contem|contem|Linhas|linhas|Rows|rows)\s*\[\s*\d+\s*\]/s.test(block.text)
  ));
  if (evaluateIndex) {
    add("warning", "evaluate-index-selector", rel, lineNumber(content, evaluateIndex.index), "Indice dentro de evaluate e seletor fragil; filtre por label/opcao/linha e valide unicidade.");
  }

  const directValueMutation = firstMatch(content, /\.(?:value|checked)\s*=|dispatchEvent\s*\(/g);
  if (directValueMutation && !hasNearby(content, directValueMutation.index, /JSF|RichFaces|Oculto|oculto|setter nativo|HTMLTextAreaElement/)) {
    add("warning", "direct-dom-mutation", rel, lineNumber(content, directValueMutation.index), "Evite alterar DOM diretamente; use fill/selectOption/check ou justifique fallback JSF inevitavel.");
  }

  const secret = firstMatch(content, /\b(?:password|senha|passwd|username|usuario)\s*[:=]\s*["'`]([^"'`\n]{3,})["'`]/gi);
  if (secret && !secret[0].includes("process.env")) {
    add("error", "hardcoded-credential", rel, lineNumber(content, secret.index), "Possivel credencial fixa; use process.env.");
  }

  if (automationFile) {
    const consoleCall = firstMatch(content, /\bconsole\.(?:log|debug|info|warn|error)\s*\(/g);
    if (consoleCall) {
      add("warning", "debug-log", rel, lineNumber(content, consoleCall.index), "Remova logs permanentes; deixe diagnostico no resumo ou em evidencia solicitada.");
    }

    const debuggerStatement = firstMatch(content, /\bdebugger\s*;/g);
    if (debuggerStatement) {
      add("warning", "debugger-statement", rel, lineNumber(content, debuggerStatement.index), "Remova debugger antes de finalizar a automacao.");
    }

    const debugComment = firstMatch(
      content,
      /(?:\/\/|\/\*)[^\n]*(?:TODO|FIXME|DEBUG|[Tt]emporario|[Ee]rro|[Ff]alhou|[Ss]tack|[Cc]opiado|[Cc]odegen)/g,
    );
    if (debugComment) {
      add("warning", "debug-comment", rel, lineNumber(content, debugComment.index), "Evite comentarios de debug, TODO/FIXME ou erro copiado no codigo final.");
    }

    const rawErrorLiteral = firstMatch(content, /["'`][^"'`\n]*(?:TimeoutError|strict mode violation|locator\(|waiting for|Error:|Target page|Execution context was destroyed|Cannot read properties|net::ERR|stack trace)[^"'`\n]*["'`]/gi);
    if (rawErrorLiteral) {
      add("warning", "raw-error-literal", rel, lineNumber(content, rawErrorLiteral.index), "Nao copie erro bruto/stack trace para string, assert, comentario ou fixture.");
    }

    const sensitiveLiterals = stringLiterals(content).filter((literal) => hasSensitiveLiteral(literal.value)).slice(0, 3);
    for (const sensitiveLiteral of sensitiveLiterals) {
      add("warning", "possible-sensitive-literal", rel, lineNumber(content, sensitiveLiteral.index), "Possivel dado pessoal/institucional hardcoded; use massa neutra, process.env ou fixture local ignorada.");
    }

    const literalFills = matches(content, /\.fill\s*\(\s*["'`]([^"'`\n]{3,})["'`]/g)
      .filter((match) => !/^(?:example|change-me|placeholder|valor|texto|teste)$/i.test(match[1] || ""))
      .slice(0, 3);
    for (const literalFill of literalFills) {
      add("warning", "literal-fill-value", rel, lineNumber(content, literalFill.index), "fill com literal fixo; prefira massa gerada, parametro do Page Object, process.env ou fixture local.");
    }

    const fixedDateLiterals = stringLiterals(content).filter((literal) => hasFixedDateLiteral(literal.value)).slice(0, 3);
    for (const fixedDateLiteral of fixedDateLiterals) {
      add("warning", "fixed-date-literal", rel, lineNumber(content, fixedDateLiteral.index), "Evite data fixa; gere dinamicamente com helper relativo a data de execucao ou parametro local quando a regra exigir.");
    }

    const fixedTemporalValues = matches(content, /\b(?:data[A-Za-z0-9_]*|date[A-Za-z0-9_]*|inicio|fim|termino|vencimento|prazo|validade|ano|year|semestre|periodo[A-Za-z0-9_]*|period[A-Za-z0-9_]*|letivo|deadline|start|end)\s*[:=]\s*["'`]?(?:\d{2}[/-]\d{2}[/-](?:19|20)\d{2}|(?:19|20)\d{2}[/-]\d{2}[/-]\d{2}|(?:19|20)\d{2}(?:[./-][12])?)["'`]?/gi).slice(0, 5);
    for (const fixedTemporalValue of fixedTemporalValues) {
      add("warning", "fixed-temporal-value", rel, lineNumber(content, fixedTemporalValue.index), "Valor temporal fixo em data/ano/periodo; derive em runtime ou use .env/fixture local quando a regra exigir.");
    }

    const absolutePathLiteral = stringLiterals(content).find((literal) => /(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)/.test(literal.value));
    if (absolutePathLiteral) {
      add("warning", "local-absolute-path", rel, lineNumber(content, absolutePathLiteral.index), "Evite caminho absoluto local; use caminho relativo ao projeto ou variavel de ambiente.");
    }

    const hardcodedGotoUrl = firstMatch(content, /\bgoto\s*\(\s*["'`]https?:\/\//g);
    if (hardcodedGotoUrl) {
      add("warning", "hardcoded-base-url", rel, lineNumber(content, hardcodedGotoUrl.index), "Evite URL base hardcoded em goto; use baseURL/BASE_URL via process.env.");
    }

    const persistentBrowserState = firstMatch(content, /\b(?:launchPersistentContext|userDataDir)\b|\bstorageState\s*:\s*["'`][^"'`]+["'`]/g);
    if (persistentBrowserState) {
      add("warning", "persistent-browser-state", rel, lineNumber(content, persistentBrowserState.index), "Evite depender de perfil/storageState manual; o fluxo deve autenticar ou gerar estado reprodutivel.");
    }

    const storageStateWrite = firstMatch(content, /\bstorageState\s*\(\s*\{[^}]*path\s*:/gs);
    if (storageStateWrite) {
      add("warning", "storage-state-path", rel, lineNumber(content, storageStateWrite.index), "storageState gravado em arquivo deve ser ignorado, reprodutivel e nao usado como atalho para passar teste.");
    }
  }
}

for (const file of specFiles) {
  const content = fs.readFileSync(file, "utf8");
  const globalCredential = firstMatch(content, /process\.env\.E2E_(?:USERNAME|PASSWORD)\b/g);
  if (globalCredential) {
    add("error", "global-auth-credential", relative(file), lineNumber(content, globalCredential.index), "Declare perfil funcional por spec com obterCredenciais(nomePerfil); nao use E2E_USERNAME/E2E_PASSWORD globais.");
  }

  const directLocator = firstMatch(content, /\bpage\s*\.\s*(?:locator|getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)\s*\(/g);
  if (directLocator) {
    add("error", "selector-in-spec", relative(file), lineNumber(content, directLocator.index), "Mova seletores e interacoes da spec para um Page Object.");
  }

  const directActions = matches(content, /\bpage\s*\.\s*(?:click|fill|selectOption|check|uncheck|press|type)\s*\(/g);
  if (directActions.length >= 2) {
    add("warning", "linear-actions-in-spec", relative(file), lineNumber(content, directActions[0].index), "Spec com muitas acoes diretas em page; mova interacoes para Page Objects.");
  }
  if (directActions.length >= 5) {
    add("warning", "excessive-actions-in-spec", relative(file), lineNumber(content, directActions[0].index), "Spec concentra acoes demais; Page Objects devem conter as interacoes do fluxo.");
  }

  const visibilityAssertion = firstMatch(content, /\bexpect\s*\([\s\S]{0,200}?\)\s*\.\s*(?:toBeVisible|toBeHidden|toBeAttached)\s*\(/g);
  const hasFunctionalAssertion = /\b(?:toHaveText|toContainText|toHaveURL|toHaveValue|toHaveAttribute|toHaveTitle|toHaveCount)\s*\(|waitForEvent\s*\(\s*["'`]download|\bvalidar[A-Za-z0-9_]*\s*\(/i.test(content);
  if (visibilityAssertion && !hasFunctionalAssertion) {
    add("warning", "weak-visibility-assertion", relative(file), lineNumber(content, visibilityAssertion.index), "Assertion parece validar apenas visibilidade; prefira efeito funcional estavel quando houver.");
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim()).length;
  if (lines > 140) {
    add("warning", "long-spec", relative(file), 1, "Spec extensa; mantenha nela apenas a sequencia funcional e mova campos, seletores e interacoes para Page Objects.");
  }

  const createsData = /\b(?:cadastr\w*|criar\w*|inclu\w*|registr\w*|salvar\w*|submet\w*|gerar\w*|adicionar\w*|novo\w*)\s*\(/i.test(content)
    || /\btest\s*\(\s*["'`][^"'`]*(?:cadastr|criar|incluir|registrar|adicionar|gerar)[^"'`]*["'`]/i.test(content);
  const hasRunId = /\b(?:runId|idExecucao)\b|(?:createRunId|criarIdExecucao)|Date\.now|randomUUID|crypto\.randomUUID|timestamp/i.test(content);
  const evitaColisaoComConsulta = /\bcriarDados[A-Za-z0-9_]*\s*\(\s*[A-Za-z0-9_]*(?:Existentes|Ocupados|Disponiveis)\s*\)/i.test(content);
  if (createsData && !hasRunId && !evitaColisaoComConsulta) {
    add("warning", "created-data-without-run-id", relative(file), 1, "Fluxo parece criar dados sem runId/massa rastreavel; use helper de massa para evitar duplicidade e lixo funcional.");
  }

  const genericName = firstMatch(content, /\btest\s*\(\s*["'`](?:teste\s*\d+|validar cadastro|fluxo completo|automacao tela|automação tela)["'`]/gi);
  if (genericName) {
    add("warning", "generic-test-name", relative(file), lineNumber(content, genericName.index), "Use nome de teste no padrao: deve [comportamento] quando [condicao].");
  }

  const focusedTest = firstMatch(content, /\b(?:test|describe)\.only\s*\(/g);
  if (focusedTest) {
    add("warning", "focused-test", relative(file), lineNumber(content, focusedTest.index), "Remova .only; a spec deve ser reprodutivel pelo comando padrao.");
  }

  const skippedTest = firstMatch(content, /\btest\.skip\s*\(/g);
  if (skippedTest) {
    add("warning", "skipped-test", relative(file), lineNumber(content, skippedTest.index), "Nao deixe test.skip permanente no codigo final.");
  }

  const manualBrowserLifecycle = firstMatch(content, /\b(?:chromium|firefox|webkit)\s*\.\s*launch\s*\(|\bbrowser\s*\.\s*(?:newPage|newContext|close)\s*\(|\bpage\s*\.\s*close\s*\(/g);
  if (manualBrowserLifecycle) {
    add("warning", "manual-browser-lifecycle", relative(file), lineNumber(content, manualBrowserLifecycle.index), "Evite abrir/fechar navegador manualmente na spec; use a fixture page e mantenha o fluxo na mesma sessao.");
  }

  const usaPreflight = /\b(?:requireSpecData|obterDadosDaSpec)\s*\(/.test(content);
  if (usaPreflight) {
    add("warning", "legacy-client-data-profile", relative(file), 1, "Preflight por perfil de cliente pertence ao contrato anterior; migre listas de cadastros anteriores para primeira opcao valida quando o fluxo permitir.");
  }

  const testNames = matches(content, /\btest\s*\(\s*["'`]([^"'`]{3,120})["'`]/g);
  const testDefinitions = matches(content, /\btest\s*\(/g);
  const technicalStepTitle = testNames.find((match) => (
    /^(?:botao\s+)?(?:avancar|voltar|confirmar|cancelar)$/.test(normalizeText(match[1]).trim())
  ));
  if (technicalStepTitle) {
    add("error", "technical-step-as-spec", relative(file), lineNumber(content, technicalStepTitle.index), "Avancar, Voltar, Confirmar e Cancelar sao etapas do fluxo; nao crie uma spec independente sem objetivo de negocio proprio.");
  }
  const implantationSpec = /(?:obrigatori|implantacao|implantação|smoke|obterCredenciais|validarObrigatoriedade|testInfo\.errors)/i.test(content)
    && /\btest\s*\(/.test(content);
  const functionalSteps = matches(content, /\btest\.step\s*\(/g);
  if (implantationSpec && functionalSteps.length) {
    add("error", "implantation-test-step-noise", relative(file), lineNumber(content, functionalSteps[0].index), "Remova test.step da spec de implantacao; nomes semanticos, ordem direta e assertions ja explicam o smoke e mantem o HTML enxuto.");
  }
  const annotation = firstMatch(content, /\b(?:testInfo|test\.info\s*\(\s*\))\.annotations\.push\s*\(/g);
  if (implantationSpec && annotation) {
    add("error", "implantation-annotation-noise", relative(file), lineNumber(content, annotation.index), "Remova annotations da spec de implantacao; acoes inseguras ficam fora do smoke e nao precisam virar documentacao no relatorio.");
  }
  const describeBlock = firstMatch(content, /\btest\.describe\s*\(/g);
  if (describeBlock && testDefinitions.length === 1) {
    add("warning", "single-test-describe", relative(file), lineNumber(content, describeBlock.index), "Remova test.describe sem ganho organizacional; coloque o modulo no titulo do unico test.");
  }
  if (implantationSpec && maxDecisionDepth(content) >= 4) {
    add("warning", "deeply-nested-implantation-flow", relative(file), 1, "Achate o smoke em fases sequenciais; condicionais profundamente aninhadas escondem a historia funcional e o ponto de persistencia.");
  }
  const negativeFormatTest = firstMatch(
    content,
    /tipo\s*:\s*["'`]formato["'`]|\b(?:valor|data|entrada)[A-Za-z0-9_]*(?:Invalida|Invalido)\b|\bcriarDataImpossivel\b|\bvalidarMensagemFormato/i,
  );
  if (implantationSpec && negativeFormatTest) {
    add("error", "implantation-negative-format-test", relative(file), lineNumber(content, negativeFormatTest.index), "Smoke de implantacao nao deve gerar teste negativo de tipo/formato; mantenha somente o preenchimento valido.");
  }
  const hasButtonCoverage = /\b(?:clicar|cancelar|voltar|abrir)[A-Za-z0-9_]*(?:Reabrir)?\s*\(/i.test(content);
  if (implantationSpec && !hasButtonCoverage) {
    add("error", "missing-smoke-button-coverage", relative(file), 1, "Smoke de implantacao deve executar e validar os botoes seguros do formulario.");
  }

  const commentLines = content.split(/\r?\n/).filter((line) => /^\s*(?:\/\/|\/\*|\*)/.test(line)).length;
  const codeLines = content.split(/\r?\n/).filter((line) => line.trim() && !/^\s*(?:\/\/|\/\*|\*|\*\/)/.test(line)).length;
  if (implantationSpec && commentLines === 0) {
    add("warning", "implantation-without-explanatory-comments", relative(file), 1, "Comente linhas-chave para explicar massa, sessao, restauracao, botoes e persistencia.");
  }
  if (commentLines >= 12 && commentLines > codeLines * 0.45) {
    add("warning", "excessive-comments", relative(file), 1, "Comentarios ocupam grande parte da spec; remova explicacoes que apenas repetem comandos evidentes.");
  }
  const obviousComment = firstMatch(content, /\/\/\s*(?:clica|clicar|preenche|preencher|seleciona|selecionar|digita|digitar|abre|abrir|fecha|fechar)\b[^\n]*\n\s*await\s+[^\n]*\.(?:click|fill|selectOption|type)\s*\(/gi);
  if (obviousComment) {
    add("warning", "obvious-action-comment", relative(file), lineNumber(content, obviousComment.index), "Evite comentario que apenas repete a acao seguinte; explique intencao, causa ou efeito nao obvio.");
  }

  const genericVariables = matches(content, /\b(?:const|let|var)\s+(?:data|access|success|planned|result|item)\b/g);
  if (implantationSpec && genericVariables.length >= 3) {
    add("warning", "generic-variable-names", relative(file), lineNumber(content, genericVariables[0].index), "Use nomes de dominio naturais, como dadosCurso, acessoFormulario e camposObrigatorios.");
  }

  const genericHelper = firstMatch(content, /\b(?:async\s+)?function\s+(helper|processar|executarFluxo|runFlow|executeFlow)\s*\(/g);
  if (genericHelper) {
    const helperName = genericHelper[1];
    const uses = matches(content, new RegExp(`\\b${helperName}\\b`, "g"));
    if (uses.length <= 2) {
      add("warning", "single-use-generic-helper", relative(file), lineNumber(content, genericHelper.index), "Helper generico usado uma unica vez pode esconder a narrativa; mantenha a logica na fase funcional ou use nome de dominio claro.");
    }
  }

  const requiredArray = firstMatch(content, /\b(?:REQUIRED|OBRIGATOR|CAMPOS?_OBRIGATOR|VALIDATION_CASES)[A-Za-z0-9_]*\s*=\s*\[[\s\S]{0,7000}?\n\s*\];/gi);
  if (implantationSpec && requiredArray) {
    const tuples = matches(requiredArray[0], /\[\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]\s*\]/g);
    if (tuples.length) {
      add("warning", "positional-validation-cases", relative(file), lineNumber(content, requiredArray.index + tuples[0].index), "Troque pares posicionais por objetos nomeados, como { campo, rotulo }, para facilitar a leitura.");
    }
    if (/=>\s*/.test(requiredArray[0])) {
      add("warning", "callback-field-descriptors", relative(file), lineNumber(content, requiredArray.index), "Descritores de campo devem conter dados nomeados, nao callbacks que escondem limpeza ou restauracao.");
    }
    if (/\b(?:restauracoes|restorers|camposTexto|textFields)\s*=\s*\{/.test(content) || /switch\s*\(\s*campo\s*\)/.test(content)) {
      add("warning", "duplicated-field-sources", relative(file), lineNumber(content, requiredArray.index), "A relacao de campos aparece em estruturas paralelas; derive preenchimento, limpeza e restauracao da mesma colecao declarativa.");
    }
    const labels = new Map();
    for (const tuple of tuples) {
      const field = tuple[1];
      const label = tuple[2];
      if (labels.has(label) && labels.get(label) !== field) {
        add("error", "shared-required-message", relative(file), lineNumber(content, requiredArray.index + tuple.index), "Campos diferentes nao podem compartilhar a mesma mensagem como prova de obrigatoriedade; classifique dependencias separadamente.");
        break;
      }
      labels.set(label, field);
    }
  }
  const fieldContractInSpec = firstMatch(
    content,
    /\b(?:const|let)\s+camposObrigatorios\s*=\s*\[[\s\S]{0,12000}?\n\s*\];/gi,
  );
  if (implantationSpec && fieldContractInSpec && /\bcontrole\s*:/.test(fieldContractInSpec[0])) {
    add("error", "required-field-contract-in-spec", relative(file), lineNumber(content, fieldContractInSpec.index), "Mova a colecao campo-locator-valor para o Page Object e mantenha na spec somente as fases e o loop funcional.");
  }
  const mutableRequiredCollection = firstMatch(
    content,
    /\blet\s+(camposObrigatorios|requiredFields)\s*=\s*[^;]+;/g,
  );
  if (implantationSpec && mutableRequiredCollection) {
    const collectionName = mutableRequiredCollection[1];
    const reassignment = firstMatch(
      content.slice(mutableRequiredCollection.index + mutableRequiredCollection[0].length),
      new RegExp(`^\\s*${collectionName}\\s*=`, "gm"),
    );
    if (reassignment) {
      add("warning", "recreated-required-collection", relative(file), lineNumber(content, mutableRequiredCollection.index), "Nao reutilize a mesma variavel para o plano e os campos executaveis; use camposPlanejados e camposObrigatorios.");
    }
  }
  const executaObrigatoriedade = /\bvalidarObrigatoriedade\s*\(/.test(content);
  const conclusaoPositiva = firstMatch(
    content,
    /\b(?:concluirCadastro|confirmarOperacao|salvarCadastro|clicarCadastrar|clicarConfirmar)\s*\(/gi,
  );
  const relatorioCustomizado = firstMatch(
    content,
    /\b(?:RelatorioValidacoes|ValidationReport|createValidationReport|validationReport)\b/gi,
  );
  if (relatorioCustomizado) {
    add("error", "custom-validation-report", relative(file), lineNumber(content, relatorioCustomizado.index), "Use os reporters nativos do Playwright; nao mantenha relatorio customizado nem controle paralelo de resultados na spec.");
  }
  const inventarioManual = firstMatch(
    content,
    /\b(?:verificacoesPlanejadas|validacoesPlanejadas|planoDeValidacoes|verificationPlan)\b/gi,
  );
  if (inventarioManual) {
    add("error", "manual-verification-inventory", relative(file), lineNumber(content, inventarioManual.index), "Remova o inventario manual da spec; nomes de testes, assertions e reporter nativo ja registram os resultados.");
  }
  const estadoManualDoFluxo = firstMatch(
    content,
    /\b(?:let|var)\s+(?:fluxoAcessivel|cadastroConcluido|validacoesBloqueantesAprovadas)\b/gi,
  );
  if (estadoManualDoFluxo) {
    add("error", "manual-implantation-flow-state", relative(file), lineNumber(content, estadoManualDoFluxo.index), "Deixe navegacao e botoes falharem naturalmente; use testInfo.errors somente para impedir a persistencia depois de falhas soft de obrigatoriedade.");
  }
  const metadadosDoLote = firstMatch(
    content,
    /\b(?:casoDeUso|casosProntos|casosBloqueados|statusDoLote|resultadoDoLote|credenciaisPorCaso|perfilDoCaso|numeroDoCaso)\b/gi,
  );
  if (metadadosDoLote) {
    add("error", "batch-orchestration-in-spec", relative(file), lineNumber(content, metadadosDoLote.index), "O lote pertence ao processamento do prompt; cada spec deve conter somente a historia funcional de um caso de uso.");
  }
  const guardaFalhasSoft = firstMatch(
    content,
    /\b(?:testInfo|test\.info\s*\(\s*\))\.errors(?:\.length)?\b/gi,
  );
  if (
    implantationSpec
    && executaObrigatoriedade
    && conclusaoPositiva
    && (!guardaFalhasSoft || guardaFalhasSoft.index > conclusaoPositiva.index)
  ) {
    add("error", "unsafe-positive-after-soft-required-failure", relative(file), lineNumber(content, conclusaoPositiva.index), "Antes da conclusao positiva, interrompa a spec quando testInfo.errors contiver falha soft de obrigatoriedade.");
  }
  if (implantationSpec && testDefinitions.length > 1) {
    add("error", "fragmented-implantation-flow", relative(file), lineNumber(content, testDefinitions[1].index), "Mantenha uma unica definicao test para a operacao de implantacao; use uma sequencia direta e expect.soft sem repetir login ou navegador.");
  }
  const sharedCaseSetup = firstMatch(
    content,
    /\btest\.beforeAll\s*\([\s\S]{0,1800}?\b(?:realizarLogin|autenticar|criar|cadastrar|registrar|salvar|submeter)[A-Za-z0-9_]*\s*\(/gi,
  );
  if (sharedCaseSetup) {
    add("error", "shared-use-case-state", relative(file), lineNumber(content, sharedCaseSetup.index), "Cada spec deve criar login, sessao e massa proprios; nao prepare estado funcional compartilhado em beforeAll.");
  }
  const repeatedLoginHook = firstMatch(content, /\btest\.beforeEach\s*\([\s\S]{0,1200}?\b(?:login|autenticar|realizarLogin|openCreateForm|abrirFormularioCadastro|acessarFluxo)\s*\(/gi);
  if (implantationSpec && repeatedLoginHook) {
    add("error", "repeated-login-per-validation", relative(file), lineNumber(content, repeatedLoginHook.index), "Nao autentique/reentre no fluxo em beforeEach para validacoes da mesma operacao; use uma unica sessao no teste completo.");
  }
  const flowEntries = matches(content, /\b(?:openCreateForm|abrirFormularioCadastro|acessarFluxo|abrirFluxo|entrarNoFluxo)\s*\(/gi);
  const controlledReentry = /(?:reentr|cancelar|voltar|botao|botão)/i.test(content);
  if (implantationSpec && flowEntries.length > 1 && !controlledReentry) {
    add("warning", "unexplained-flow-reentry", relative(file), lineNumber(content, flowEntries[1].index), "Reentrada no fluxo deve existir somente para validar Voltar/Cancelar na mesma sessao e antes de persistencia.");
  }
  const fragmentedNames = testNames.filter((match) => /(?:tela|passo|etapa|screen|pagina|page)\s*\d?/i.test(match[1] || ""));
  if (testNames.length >= 2 && fragmentedNames.length >= 2) {
    add("warning", "fragmented-flow-tests", relative(file), lineNumber(content, fragmentedNames[0].index), "Fluxo parece dividido por telas/passos; prefira um unico test sequencial para manter sessao e evitar dados duplicados.");
  }

  const calls = namedCalls(content);
  const destructiveCall = calls.find((call) => isDestructiveMethodName(call.name));
  if (destructiveCall) {
    const creationCall = calls.find((call) => (
      call.index < destructiveCall.index
      && /^(?:criar|cadastrar|incluir|preparar)/.test(call.normalizedName)
      && !/(?:idexecucao|runid|dados|data)/.test(call.normalizedName)
    ));
    const persistenceCall = calls.find((call) => (
      call.index < destructiveCall.index
      && /(?:confirmar|validar|localizar).*(?:persistencia|persistido|existencia|registro|alvo)/.test(call.normalizedName)
    ));
    const finalStateCall = calls.find((call) => (
      call.index > destructiveCall.index
      && /(?:confirmar|validar).*(?:ausencia|estadofinal|statusfinal|remocao|exclusao|inativo|aprovado|rejeitado|cancelado)/.test(call.normalizedName)
    ));
    const cancelCall = calls.find((call) => (
      call.index < destructiveCall.index
      && /cancelar.*(?:remocao|exclusao|transicao)/.test(call.normalizedName)
    ));
    const permanenceAfterCancel = cancelCall && calls.find((call) => (
      call.index > cancelCall.index
      && call.index < destructiveCall.index
      && /(?:confirmar|validar).*(?:permanencia|persistencia|existencia)/.test(call.normalizedName)
    ));
    const sharedTarget = firstMatch(content, /\btest\.beforeAll\s*\(|\b(?:dados|registro|alvo)(?:Compartilhado|Shared)\b|process\.env\.[A-Z0-9_]*(?:RECORD|REGISTRO|ALVO|TARGET)_?ID\b/gi);

    if (!hasRunId) {
      add("error", "unsafe-destructive-without-run-id", relative(file), lineNumber(content, destructiveCall.index), "Acao destrutiva exige runId exclusivo da execucao atual para comprovar propriedade do alvo.");
    }
    if (!creationCall) {
      add("error", "unsafe-destructive-without-created-target", relative(file), lineNumber(content, destructiveCall.index), "A propria spec deve criar pela interface o alvo destrutivo antes da acao.");
    }
    if (!persistenceCall) {
      add("error", "unsafe-destructive-without-persistence-proof", relative(file), lineNumber(content, destructiveCall.index), "Comprove persistencia e localizacao unica do alvo antes da acao destrutiva.");
    }
    if (!finalStateCall) {
      add("error", "unsafe-destructive-without-final-state", relative(file), lineNumber(content, destructiveCall.index), "Valide ausencia ou novo estado depois da acao destrutiva.");
    }
    if (cancelCall && !permanenceAfterCancel) {
      add("error", "destructive-cancel-without-permanence-proof", relative(file), lineNumber(content, cancelCall.index), "Depois de cancelar a acao destrutiva, comprove que o alvo permanece antes de reabrir e confirmar.");
    }
    if (sharedTarget) {
      add("error", "destructive-shared-target", relative(file), lineNumber(content, sharedTarget.index), "Spec destrutiva nao pode depender de alvo preparado por hook, ambiente ou outra spec.");
    }
  }
}

for (const file of pageObjectFiles) {
  const content = fs.readFileSync(file, "utf8");
  const methodCount = matches(content, /^\s*(?:async\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/gm)
    .filter((match) => !/constructor\s*\(/.test(match[0]))
    .length;
  if (methodCount > 35) {
    add("warning", "bloated-page-object", relative(file), 1, "Page Object acumula muitos metodos; verifique responsabilidades misturadas e metodos sem consumidor, sem usar apenas quantidade de linhas como criterio.");
  }

  const requiredDescriptors = methodBlock(content, "obterCamposObrigatorios");
  if (requiredDescriptors) {
    const descriptorCount = matches(requiredDescriptors.text, /\{\s*campo\s*:/g).length;
    const descriptorLines = requiredDescriptors.text.split(/\r?\n/).filter((line) => line.trim()).length;
    if (descriptorCount >= 8 && descriptorLines > descriptorCount * 5) {
      add("warning", "verbose-required-descriptors", relative(file), lineNumber(content, requiredDescriptors.index), "Colecao de obrigatorios excessivamente vertical; mantenha propriedades nomeadas, mas use um objeto completo por linha quando ele continuar legivel.");
    }
  }

  const sentinelWrapper = methodBlock(content, "obterCampoSentinela");
  if (sentinelWrapper) {
    const sentinelUses = matches(content, /\b(?:this\.)?obterCampoSentinela\s*\(/g).length;
    if (sentinelUses === 2 && sentinelWrapper.text.split(/\r?\n/).filter((line) => line.trim()).length <= 10) {
      add("warning", "single-use-sentinel-wrapper", relative(file), lineNumber(content, sentinelWrapper.index), "Escolha curta da sentinela usada somente por validarObrigatoriedade deve ficar junto da operacao, sem metodo intermediario.");
    }
  }

  const duplicatedConfirmation = methodBlock(content, "clicarComConfirmacao");
  if (duplicatedConfirmation && /\bthis\.clicarConfirmandoUmaVez\s*\(/.test(duplicatedConfirmation.text)) {
    add("warning", "duplicated-confirmation-recovery", relative(file), lineNumber(content, duplicatedConfirmation.index), "Clique com confirmacao deve registrar o dialogo e reutilizar clicarComRecuperacaoDeCookies, sem manter outro fluxo de aceite e repeticao.");
  }

  const reentryWrappers = matches(content, /\basync\s+(reabrir[A-Z][A-Za-z0-9_]*)\s*\(/g);
  for (const wrapper of reentryWrappers) {
    const methodName = wrapper[1];
    const internalCalls = matches(content, new RegExp(`\\bthis\\.${methodName}\\s*\\(`, "g")).length;
    const allUses = codeFiles.reduce((total, codeFile) => {
      const code = fs.readFileSync(codeFile, "utf8");
      return total + matches(code, new RegExp(`\\b${methodName}\\s*\\(`, "g")).length;
    }, 0);
    const block = methodBlock(content, methodName);
    const blockLines = block?.text.split(/\r?\n/).filter((line) => line.trim()).length || 0;
    if (internalCalls === 1 && allUses === 2 && blockLines <= 10) {
      add("warning", "single-use-navigation-wrapper", relative(file), lineNumber(content, wrapper.index), `Metodo ${methodName} apenas encadeia navegacao para um unico consumidor interno; incorpore-o sem alterar a API usada pela spec.`);
    }
  }

  const reportCoupling = firstMatch(content, /\b(?:RelatorioValidacoes|ValidationReport|testInfo|test\.step)\b/g);
  if (reportCoupling) {
    add("error", "page-object-runner-coupling", relative(file), lineNumber(content, reportCoupling.index), "Page Object nao deve conhecer relatorio customizado, testInfo ou test.step; mantenha a orquestracao na spec.");
  }

  const hiddenScenario = firstMatch(
    content,
    /\b(?:async\s+)?(?:executar|realizar|validar)(?:Smoke(?:Completo)?|FluxoCompleto|CenarioCompleto)\s*\(/gi,
  );
  if (hiddenScenario) {
    add("error", "hidden-complete-scenario", relative(file), lineNumber(content, hiddenScenario.index), "Nao esconda todo o smoke em um metodo do Page Object; exponha operacoes por fase e mantenha a historia funcional na spec.");
  }

  const immediateFlowVisibility = firstMatch(
    content,
    /\basync\s+(?:formulario|tela)[A-Za-z0-9_]*EstaVisivel\s*\([^)]*\)\s*\{[\s\S]{0,500}?\.isVisible\s*\(\s*\)\s*\.catch/gi,
  );
  if (immediateFlowVisibility) {
    add("warning", "immediate-flow-visibility", relative(file), lineNumber(content, immediateFlowVisibility.index), "Depois de submissao ou navegacao, aguarde um campo estavel com waitFor; isVisible() imediato pode confundir atualizacao temporaria do DOM com saida do fluxo.");
  }

  const requiredValidation = methodBlock(content, "validarObrigatoriedade");
  if (requiredValidation) {
    const enviaFormulario = /\b(?:submeter|salvar|confirmar|cadastrar|clicarCadastrar|clicarConfirmar)\s*\(/i.test(requiredValidation.text);
    const usaSentinela = /\b(?:sentinela|barreiraPersistencia|protecaoTransacional)\b/i.test(requiredValidation.text);
    const restauraSempre = /\bfinally\s*\{/.test(requiredValidation.text);
    const usaAssertionSoft = /\bexpect\.soft\s*\(|\bsoftExpect\s*\(/.test(requiredValidation.text);
    if (enviaFormulario && !usaSentinela) {
      add("error", "unsafe-required-submission", relative(file), lineNumber(content, requiredValidation.index), "Validacao negativa que submete o formulario deve manter um campo-sentinela obrigatorio vazio para impedir persistencia acidental.");
    }
    if (enviaFormulario && !restauraSempre) {
      add("error", "required-validation-without-finally", relative(file), lineNumber(content, requiredValidation.index), "Restaure alvo, sentinela e campos volateis em finally, inclusive quando a mensagem esperada estiver ausente.");
    }
    if (enviaFormulario && !usaAssertionSoft) {
      add("error", "required-validation-without-soft-assertion", relative(file), lineNumber(content, requiredValidation.index), "Use expect.soft nas evidencias atribuiveis ao campo para continuar os demais obrigatorios; mantenha hard assertions apenas nas protecoes de fluxo e persistencia.");
    }
  }

  for (const methodName of ["concluirCadastro", "salvarEValidar", "confirmarEValidar", "cadastrarEValidar"]) {
    const combinedMethod = methodBlock(content, methodName);
    if (!combinedMethod) continue;
    const submits = /\b(?:submeter|salvar|confirmar|cadastrar|clicarCadastrar|clicarConfirmar)\s*\(/i.test(combinedMethod.text);
    const validatesSuccess = /\bvalidarMensagemSucesso\s*\(/.test(combinedMethod.text);
    if (submits && validatesSuccess) {
      add("error", "combined-submit-success", relative(file), lineNumber(content, combinedMethod.index), "Separe a submissao da validacao da mensagem; a spec deve mostrar claramente a acao e o resultado observado.");
      break;
    }
  }

  const locatorDeclarations = matches(
    content,
    /\bthis\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:this\.page|page)\s*\.\s*(?:locator|getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)\s*\(/g,
  );
  for (const declaration of locatorDeclarations) {
    const name = declaration[1];
    const uses = matches(content, new RegExp(`\\bthis\\.${name}\\b`, "g"));
    if (uses.length === 1) {
      add("warning", "unused-page-object-locator", relative(file), lineNumber(content, declaration.index), `Locator ${name} foi declarado, mas nao possui consumidor no Page Object.`);
    }
  }

  const genericMethod = firstMatch(content, /\b(?:async\s+)?(?:clickButton\d*|fillInput\d*|goNext)\s*\(/g);
  if (genericMethod) {
    add("warning", "generic-page-object-method", relative(file), lineNumber(content, genericMethod.index), "Use metodos funcionais no Page Object, como realizarLogin, salvar ou validarMensagemSucesso.");
  }

  const rawIdHelper = firstMatch(content, /\b(?:campo|field|input|preencherValor|fillValue)\s*\(\s*id\b/g);
  if (rawIdHelper) {
    add("warning", "raw-id-helper", relative(file), lineNumber(content, rawIdHelper.index), "Evite helper generico baseado em id cru; crie getters/metodos semanticos para cada campo relevante.");
  }

  const genericIdHelper = firstMatch(content, /\b(?:byId|localizarPorId|locatorById)\s*\(\s*id\s*\)\s*\{/g);
  if (genericIdHelper) {
    add("warning", "generic-id-helper", relative(file), lineNumber(content, genericIdHelper.index), "Declare [id=\"form:campo\"] diretamente no Page Object; nao esconda page.locator em helper de ID.");
  }

  const trivialBasePage = firstMatch(content, /class\s+BasePage\b[\s\S]{0,800}?module\.exports/gi);
  if (trivialBasePage && methodCount <= 2) {
    add("warning", "trivial-base-page", relative(file), lineNumber(content, trivialBasePage.index), "BasePage com apenas page/helper de locator cria heranca sem responsabilidade compartilhada real.");
  }

  const institutionalLocation = firstMatch(content, /(?:estado|municipio|state|city)[\s\S]{0,160}?selectOption\s*\(\s*\{\s*label\s*:\s*["'`][^"'`]+["'`]/gi);
  if (institutionalLocation) {
    add("warning", "institutional-location-hardcoded", relative(file), lineNumber(content, institutionalLocation.index), "Estado ou municipio fixo reduz portabilidade; quando vier de cadastro anterior, selecione o primeiro candidato valido.");
  }

  const blindFirstOption = firstMatch(content, /selectOption\s*\(\s*\{\s*index\s*:\s*0\s*\}/g);
  if (blindFirstOption) {
    add("error", "blind-first-option", relative(file), lineNumber(content, blindFirstOption.index), "Nao selecione index 0: filtre vazio, placeholder, oculto e desabilitado antes de escolher o primeiro candidato valido.");
  }

  const destructiveMethods = matches(content, /^\s*(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/gm)
    .filter((match) => isDestructiveMethodName(match[1]));
  for (const method of destructiveMethods) {
    const block = methodBlock(content, method[1]);
    if (!block) continue;
    const positionalTarget = firstMatch(block.text, /\.(?:first|nth)\s*\(/g);
    if (positionalTarget) {
      add("error", "unsafe-destructive-row-scope", relative(file), lineNumber(content, block.index + positionalTarget.index), `Metodo destrutivo ${method[1]} nao pode escolher alvo por first/nth; filtre pelo runId completo e comprove uma unica linha.`);
    }
  }

  const escapedStableJsfId = firstMatch(content, /locator\s*\(\s*["'`]#[A-Za-z0-9_]+\\\\:/g);
  if (escapedStableJsfId) {
    add("warning", "escaped-jsf-id", relative(file), lineNumber(content, escapedStableJsfId.index), "Troque o ID JSF escapado por locator direto [id=\"form:campo\"] no Page Object.");
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\.first\s*\(\s*\)/.test(lines[index])) continue;
    const windowText = lines.slice(Math.max(0, index - 4), index + 1).join("\n");
    const looksLikeCollection = /sugest|suggest|autocomplete|op[cç][aã]o|option|linha|row|table|lista|list/i.test(windowText);
    const hasSafeFilter = /\.filter\s*\(|hasText|:not\s*\(\s*\[disabled\]|disabled|hidden|placeholder|selecione|escolha|candidat|op[cç][aã]o\s+v[aá]lida/i.test(windowText);
    if (looksLikeCollection && !hasSafeFilter) {
      add("warning", "unfiltered-first-collection", relative(file), index + 1, "Antes de .first(), filtre candidatos por texto intencional ou exclua vazio, placeholder, oculto e desabilitado.");
      break;
    }
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

const clientProfilesDir = path.join(root, "config", "clientes");
if (fs.existsSync(clientProfilesDir)) {
  add("warning", "legacy-client-profiles", "config/clientes", 1, "Perfis por cliente pertencem ao contrato anterior. Preserve enquanto houver consumidor e migre de forma controlada para primeira opcao valida.");
  const profileFiles = [path.join(root, "config", "defaults.json"), ...walk(clientProfilesDir)]
    .filter((file) => path.extname(file) === ".json" && fs.existsSync(file));
  for (const file of profileFiles) {
    const rel = relative(file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      add("error", "invalid-client-profile-json", rel, 1, "Perfil/defaults deve ser JSON valido.");
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      add("error", "invalid-client-profile-root", rel, 1, "Perfil/defaults deve conter objeto JSON.");
      continue;
    }
    if (scanClientProfileValue(parsed, rel).length) {
      add("error", "sensitive-client-profile-data", rel, 1, "Perfil de cliente contem segredo, dado pessoal ou estado autenticado proibido.");
    }
  }
}

const cacheDir = path.join(root, ".playwright-e2e", "cache");
const hasPlaywrightProjectShape = specFiles.length > 0
  || pageObjectFiles.length > 0
  || fs.existsSync(cacheDir)
  || hasPlaywrightDependency()
  || ["tests/e2e", "test/e2e", "e2e", "playwright"].some(hasDirectory);

if (fs.existsSync(cacheDir)) {
  if (!isCacheIgnored()) {
    add("error", "cache-not-ignored", ".gitignore", 1, ".playwright-e2e/cache/ existe, mas nao esta ignorado.");
  }
  for (const file of walk(cacheDir).filter((item) => path.extname(item) === ".json")) {
    const rel = relative(file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      add("error", "invalid-cache-json", rel, 1, "Cache local deve ser JSON valido.");
      continue;
    }
    const sensitive = scanCacheValue(parsed, rel);
    if (sensitive.length) {
      add("error", "sensitive-cache-data", rel, 1, "Cache local contem dado sensivel ou chave sensivel; remova/sanitize antes de reutilizar.");
    }
    const temporal = scanTemporalCacheValue(parsed, rel);
    if (temporal.length) {
      add("warning", "fixed-temporal-cache-data", rel, 1, "Cache local contem data/periodo concreto; guarde somente a estrategia dinamica de massa.");
    }
  }
}

const configFile = files.find((file) => /playwright\.config\.[cm]?[jt]s$/.test(file))
  || ["playwright.config.js", "playwright.config.cjs", "playwright.config.mjs", "playwright.config.ts"]
    .map((file) => path.join(root, file))
    .find((file) => fs.existsSync(file));
if (!configFile) {
  if (hasPlaywrightProjectShape) {
    add("warning", "missing-config", ".", 1, "playwright.config nao encontrado.");
  }
} else {
  const config = fs.readFileSync(configFile, "utf8");
  const rel = relative(configFile);
  if (!/^\s*timeout\s*:\s*[0-9_]+\s*,?/m.test(config)) {
    add("warning", "missing-central-test-timeout", rel, 1, "Configure o limite total central em timeout no playwright.config; o padrao do plugin e 180_000 ms.");
  }
  if (!/\bactionTimeout\s*:\s*[0-9_]+/.test(config)) {
    add("warning", "missing-central-action-timeout", rel, 1, "Configure actionTimeout central no playwright.config; o padrao do plugin e 15_000 ms.");
  }
  if (!/headless\s*:\s*false/.test(config)) add("warning", "headed-default", rel, 1, "O padrao do plugin e Chromium headed (headless: false).");
  if (!/viewport\s*:\s*null/.test(config)) add("error", "native-maximized-viewport", rel, 1, "Use viewport: null para que o viewport acompanhe a janela Chromium maximizada.");
  if (!/--start-maximized/.test(config)) add("error", "maximized-launch", rel, 1, "Inclua --start-maximized em launchOptions para execucao headed.");
  const arquivosDeFixture = walk(path.join(root, "tests", "fixtures"))
    .filter((file) => codeExtensions.has(path.extname(file)));
  const hasCdpMaximize = [...new Set([...codeFiles, ...arquivosDeFixture])]
    .some((file) => /Browser\.setWindowBounds[\s\S]{0,200}?maximized/.test(fs.readFileSync(file, "utf8")));
  if (!hasCdpMaximize) add("error", "missing-cdp-maximize", rel, 1, "Adicione fixture/helper CDP com Browser.setWindowBounds=maximized para estabilizar a maximização entre sistemas operacionais.");
  if (!/trace\s*:\s*["'](?:retain-on-first-failure|retain-on-failure)["']/.test(config)) {
    add("error", "failure-trace-required", rel, 1, "Use trace: 'retain-on-first-failure' ou 'retain-on-failure' para diagnosticar falhas sem guardar artefatos de sucesso.");
  }
  if (!/screenshot\s*:\s*["'](?:only-on-failure|on-first-failure)["']/.test(config)) {
    add("error", "failure-screenshot-required", rel, 1, "Use screenshot: 'only-on-failure' ou 'on-first-failure'.");
  }
  if (!/video\s*:\s*["']off["']/.test(config)) {
    add("warning", "video-default", rel, 1, "Mantenha video: 'off' por padrao; habilite somente quando indispensavel.");
  }
  if (!/reporter\s*:\s*["']html["']|\[\s*["']html["']/.test(config)) {
    add("error", "missing-html-reporter", rel, 1, "Configure o reporter HTML nativo do Playwright para mostrar diretamente specs aprovadas e reprovadas.");
  }
}

const summary = {
  root,
  mode: scopedFiles.length ? "files" : (changedOnly ? "changed" : "full"),
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
