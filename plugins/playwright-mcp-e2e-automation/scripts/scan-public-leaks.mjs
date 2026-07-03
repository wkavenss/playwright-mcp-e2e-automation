#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");
const ignoredDirs = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const extensions = new Set([".md", ".js", ".mjs", ".cjs", ".json", ".yaml", ".yml"]);
const blockedTerms = [
  ["S", "I", "G", "A", "A"].join(""),
  ["S", "I", "P", "A", "C"].join(""),
  ["S", "I", "G", "R", "H"].join(""),
  ["S", "I", "G", "A", "d", "m", "i", "n"].join(""),
  ["S", "I", "G", "A", "D", "M", "I", "N"].join(""),
  ["S", "I", "G", "E", "v", "e", "n", "t", "o", "s"].join(""),
  ["S", "I", "G", "E", "l", "e", "i", "c", "a", "o"].join(""),
  ["S", "I", "G", "P", "S"].join(""),
];

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

const findings = [];
for (const file of walk(root).filter((item) => extensions.has(path.extname(item)))) {
  const rel = relative(file);
  if (/(?:^|[/\\])\.playwright-e2e[/\\]private-domain(?:[/\\]|$)/.test(rel)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const term of blockedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    const match = regex.exec(content);
    if (match) {
      findings.push({
        file: rel,
        line: lineNumber(content, match.index),
        term,
        message: "Termo explicito de dominio privado encontrado em arquivo publico.",
      });
    }
  }
}

const summary = {
  root,
  ok: findings.length === 0,
  findings,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else if (summary.ok) {
  console.log("OK: nenhum termo privado explicito em arquivos publicos.");
} else {
  for (const item of findings) {
    console.log(`ERROR private-domain-leak ${item.file}:${item.line} - ${item.message}`);
  }
}

process.exitCode = summary.ok ? 0 : 1;
