#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const changedOnly = process.argv.includes("--changed");
const jsonOutput = process.argv.includes("--json");
const verboseOutput = process.argv.includes("--verbose");
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const nodeCheckExtensions = new Set([".js", ".cjs", ".mjs"]);
const tsExtensions = new Set([".ts", ".tsx"]);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const auditScript = path.join(scriptDir, "audit-playwright.mjs");

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

function changedFiles() {
  try {
    const files = new Set([
      ...gitPaths(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
      ...gitPaths(["ls-files", "--others", "--exclude-standard"]),
    ]);
    return [...files]
      .map((file) => path.join(root, file))
      .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  } catch {
    return walk(root);
  }
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

const files = changedOnly ? changedFiles() : walk(root);
const audit = runAudit();
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
const failed = !audit.ok || (audit.summary.errors || 0) > 0 || syntaxFailures.length > 0 || jsonFailures.length > 0;

const auditSummary = {
  ok: audit.ok,
  errors: audit.summary.errors || 0,
  warnings: audit.summary.warnings || 0,
  scannedFiles: audit.summary.scannedFiles || 0,
  stderr: audit.stderr,
  groupedFindings,
};
if (verboseOutput) {
  auditSummary.topFindings = topFindings;
}

const summary = {
  root,
  mode: changedOnly ? "changed" : "full",
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
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Quality gate (${summary.mode}): ${summary.ok ? "ok" : "falhou"}`);
  console.log(`Audit: ${summary.audit.errors} erro(s), ${summary.audit.warnings} alerta(s), ${summary.audit.scannedFiles} arquivo(s).`);
  console.log(`Node --check: ${summary.syntax.checked} arquivo(s), ${summary.syntax.failed.length} falha(s).`);
  console.log(`JSON: ${summary.json.checked} arquivo(s), ${summary.json.failed.length} falha(s).`);
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
}

process.exitCode = failed ? 1 : 0;
