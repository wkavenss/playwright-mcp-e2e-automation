#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const changedOnly = args.includes("--changed");
const jsonOutput = args.includes("--json");
const verboseOutput = args.includes("--verbose");
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const nodeCheckExtensions = new Set([".js", ".cjs", ".mjs"]);
const tsExtensions = new Set([".ts", ".tsx"]);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const auditScript = path.join(scriptDir, "audit-playwright.mjs");
const leakScript = path.join(scriptDir, "scan-public-leaks.mjs");
const defaultChangedManifest = ".playwright-e2e/changed-files.json";
let scopeError = "";

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
    scopeError = `manifesto nao encontrado: ${path.relative(root, absolute) || file}`;
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
    const values = Array.isArray(parsed) ? parsed : parsed.files;
    if (!Array.isArray(values)) {
      scopeError = "manifesto deve ser JSON array ou objeto com files.";
      return [];
    }
    return values.map(scopedFile).filter(Boolean);
  } catch (error) {
    scopeError = `manifesto invalido: ${error.message}`;
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
  const files = flagValues("--files").map(scopedFile).filter(Boolean);
  const manifest = selectedManifest();
  return [...new Set([...files, ...manifestFiles(manifest)])];
}

function changedFiles() {
  if (!isGitRepository()) {
    scopeError = "use --files ou --manifest com --changed fora de um repositorio Git.";
    return [];
  }
  const files = new Set([
    ...gitPaths(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
    ...gitPaths(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...files]
    .map((file) => path.join(root, file))
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
}

function relative(file) {
  return path.relative(root, file) || ".";
}

function compact(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

function runAudit() {
  const args = [auditScript, root];
  if (explicitFiles.length) args.push("--files", ...explicitFiles.map(relative));
  if (manifestArg || autoManifestArg) args.push("--manifest", manifestArg || autoManifestArg);
  if (changedOnly) args.push("--changed");
  args.push("--json");
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  try {
    return {
      ok: true,
      status: result.status ?? 0,
      summary: JSON.parse(result.stdout || "{}"),
      stderr: compact(result.stderr),
    };
  } catch {
    return {
      ok: false,
      status: 1,
      summary: { errors: 1, warnings: 0, scannedFiles: 0, findings: [] },
      stderr: compact(result.stderr || result.stdout || "Falha ao ler JSON do auditor."),
    };
  }
}

function runLeakCheck() {
  if (!fs.existsSync(path.join(root, ".codex-plugin", "plugin.json"))) {
    return { checked: false, ok: true, findings: [], stderr: "" };
  }
  const result = spawnSync(process.execPath, [leakScript, root, "--json"], { encoding: "utf8" });
  try {
    const summary = JSON.parse(result.stdout || "{}");
    return {
      checked: true,
      ok: Boolean(summary.ok),
      findings: summary.findings || [],
      stderr: compact(result.stderr),
    };
  } catch {
    return {
      checked: true,
      ok: false,
      findings: [],
      stderr: compact(result.stderr || result.stdout || "Falha ao ler JSON do scanner publico."),
    };
  }
}

function checkNodeSyntax(files) {
  return files
    .filter((file) => nodeCheckExtensions.has(path.extname(file)))
    .map((file) => {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      return {
        file: relative(file),
        ok: result.status === 0,
        message: compact(result.stderr || result.stdout),
      };
    });
}

function checkJson(files) {
  return files
    .filter((file) => path.extname(file) === ".json")
    .map((file) => {
      try {
        JSON.parse(fs.readFileSync(file, "utf8"));
        return { file: relative(file), ok: true, message: "" };
      } catch (error) {
        return { file: relative(file), ok: false, message: error.message };
      }
    });
}

function groupFindings(items) {
  const groups = new Map();
  for (const item of items) {
    const severity = item.severity || "warning";
    const rule = item.rule || "unknown";
    const key = `${severity}\0${rule}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.files.add(item.file);
      continue;
    }
    groups.set(key, {
      severity,
      rule,
      count: 1,
      files: new Set([item.file]),
      first: {
        file: item.file,
        line: item.line,
        message: item.message,
      },
    });
  }
  const severityOrder = { error: 0, warning: 1 };
  return [...groups.values()]
    .map((group) => ({
      severity: group.severity,
      rule: group.rule,
      count: group.count,
      files: group.files.size,
      first: group.first,
    }))
    .sort((a, b) => (
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
      || b.count - a.count
      || a.rule.localeCompare(b.rule)
    ));
}

const manifestArg = flagValues("--manifest")[0];
const explicitFiles = explicitScopeFiles();
const autoManifestArg = selectedManifest();
const hasExplicitScope = flagValues("--files").length > 0 || Boolean(manifestArg || autoManifestArg);
const files = explicitFiles.length ? explicitFiles : (hasExplicitScope ? [] : (changedOnly ? changedFiles() : walk(root)));
const audit = runAudit();
const leaks = runLeakCheck();
const syntax = checkNodeSyntax(files);
const json = checkJson(files);
const skippedTs = files.filter((file) => tsExtensions.has(path.extname(file))).map(relative);
const syntaxFailures = syntax.filter((item) => !item.ok);
const jsonFailures = json.filter((item) => !item.ok);
const findings = audit.summary.findings || [];
const groupedFindings = groupFindings(findings);
const topFindings = findings.slice(0, 15).map((item) => ({
  severity: item.severity,
  rule: item.rule,
  file: item.file,
  line: item.line,
  message: item.message,
}));
const failed = Boolean(scopeError) || !audit.ok || !leaks.ok || (audit.summary.errors || 0) > 0 || syntaxFailures.length > 0 || jsonFailures.length > 0;

const auditSummary = {
  ok: audit.ok,
  errors: audit.summary.errors || 0,
  warnings: audit.summary.warnings || 0,
  scannedFiles: audit.summary.scannedFiles || 0,
  stderr: scopeError || audit.stderr,
  groupedFindings,
};
if (verboseOutput) {
  auditSummary.topFindings = topFindings;
}

const summary = {
  root,
  mode: explicitFiles.length ? "files" : (changedOnly ? "changed" : "full"),
  ok: !failed,
  audit: auditSummary,
  syntax: {
    checked: syntax.length,
    failed: syntaxFailures,
    skippedTs,
  },
  json: {
    checked: json.length,
    failed: jsonFailures,
  },
  publicLeaks: {
    checked: leaks.checked,
    failed: leaks.findings,
    stderr: leaks.stderr,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Quality gate (${summary.mode}): ${summary.ok ? "ok" : "falhou"}`);
  console.log(`Audit: ${summary.audit.errors} erro(s), ${summary.audit.warnings} alerta(s), ${summary.audit.scannedFiles} arquivo(s).`);
  console.log(`Node --check: ${summary.syntax.checked} arquivo(s), ${summary.syntax.failed.length} falha(s).`);
  console.log(`JSON: ${summary.json.checked} arquivo(s), ${summary.json.failed.length} falha(s).`);
  if (summary.publicLeaks.checked) {
    console.log(`Vazamento publico: ${summary.publicLeaks.failed.length} achado(s).`);
  }
  if (summary.syntax.skippedTs.length) {
    console.log(`TS sem node --check: ${summary.syntax.skippedTs.length} arquivo(s).`);
  }
  if (summary.audit.stderr) {
    console.log(`Auditor: ${summary.audit.stderr}`);
  }
  if (summary.audit.groupedFindings.length) {
    console.log("Achados por regra:");
  }
  for (const item of summary.audit.groupedFindings.slice(0, 15)) {
    const first = item.first || {};
    console.log(`${String(item.severity).toUpperCase()} ${item.rule}: ${item.count} ocorrencia(s), ${item.files} arquivo(s), primeiro em ${first.file}:${first.line} - ${first.message}`);
  }
  if (summary.audit.groupedFindings.length > 15) {
    console.log(`... ${summary.audit.groupedFindings.length - 15} regra(s) omitida(s); use --verbose para detalhar.`);
  }
  if (verboseOutput && topFindings.length) {
    console.log("Detalhes:");
    for (const item of topFindings) {
      console.log(`${String(item.severity).toUpperCase()} ${item.rule} ${item.file}:${item.line} - ${item.message}`);
    }
  }
  for (const item of syntaxFailures) {
    console.log(`ERROR node-check ${item.file} - ${item.message}`);
  }
  for (const item of jsonFailures) {
    console.log(`ERROR json ${item.file} - ${item.message}`);
  }
  for (const item of summary.publicLeaks.failed) {
    console.log(`ERROR private-domain-leak ${item.file}:${item.line} - ${item.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
