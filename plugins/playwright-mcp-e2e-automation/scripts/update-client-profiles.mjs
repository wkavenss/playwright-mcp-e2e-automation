#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`JSON deve conter objeto: ${file}`);
    return value;
  } catch (error) {
    fail(`JSON invalido: ${file} (${error.message})`);
  }
}

function parseJson(value, label) {
  if (value === undefined) fail(`Informe ${label}.`);
  try {
    return JSON.parse(value);
  } catch (error) {
    fail(`${label} deve ser JSON valido (${error.message}).`);
  }
}

function logicalSegments(value) {
  const segments = String(value || "").split(".").filter(Boolean);
  if (!segments.length || segments.some((segment) => (
    !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(segment)
    || ["__proto__", "prototype", "constructor"].includes(segment)
  ))) {
    fail(`Caminho de configuracao invalido: ${value}`);
  }
  return segments;
}

function hasSensitiveData(value, key = "") {
  if (["__proto__", "prototype", "constructor"].includes(key)
    || /(?:password|senha|passwd|token|cookie|secret|storage|session|username|cpf|cnpj|matricula|email|telefone)/i.test(key)
    || /^(?:usuario|user|login)$/i.test(key)) return true;
  if (typeof value === "string") {
    return /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(value)
      || /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(value)
      || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
      || /(?:bearer\s+|set-cookie|connect\.sid|localStorage|sessionStorage)/i.test(value);
  }
  if (Array.isArray(value)) return value.some((item) => hasSensitiveData(item));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([nestedKey, nested]) => hasSensitiveData(nested, nestedKey));
  }
  return false;
}

function setPath(target, segments, value, { replaceNull = false } = {}) {
  let cursor = target;
  for (const segment of segments.slice(0, -1)) {
    if (cursor[segment] == null) cursor[segment] = {};
    if (typeof cursor[segment] !== "object" || Array.isArray(cursor[segment])) {
      fail(`Nao e possivel criar ${segments.join(".")}: ${segment} nao e objeto.`);
    }
    cursor = cursor[segment];
  }
  const leaf = segments.at(-1);
  if (Object.hasOwn(cursor, leaf) && !(replaceNull && cursor[leaf] == null)) return false;
  cursor[leaf] = value;
  return true;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const classification = flag("--classification");
const logicalPath = flag("--path");
const segments = logicalSegments(logicalPath);
const referenceProfile = flag("--reference-profile") || "referencia";
if (!/^[a-z0-9][a-z0-9-]*$/.test(referenceProfile)) fail(`Perfil de referencia invalido: ${referenceProfile}`);
if (!["generated", "default", "client"].includes(classification)) {
  fail("Use --classification generated, default ou client.");
}

const changed = [];
const preserved = [];

if (classification === "generated") {
  console.log(JSON.stringify({ root, classification, path: logicalPath, changed, preserved }, null, 2));
  process.exit(0);
}

if (classification === "default") {
  const value = parseJson(flag("--value-json"), "--value-json");
  if (hasSensitiveData(value, segments.at(-1))) fail("Dados sensiveis nao podem ser gravados em defaults.json.");
  const file = path.join(root, "config/defaults.json");
  const data = readJson(file);
  if (setPath(data, segments, value)) {
    writeJson(file, data);
    changed.push(path.relative(root, file));
  } else preserved.push(path.relative(root, file));
}

if (classification === "client") {
  const value = parseJson(flag("--reference-value-json"), "--reference-value-json");
  if (hasSensitiveData(value, segments.at(-1))) fail("Dados sensiveis nao podem ser gravados em perfil de cliente.");
  const clientsDir = path.join(root, "config/clientes");
  fs.mkdirSync(clientsDir, { recursive: true });
  const referenceFile = path.join(clientsDir, `${referenceProfile}.json`);
  if (!fs.existsSync(referenceFile)) writeJson(referenceFile, {});
  const files = fs.readdirSync(clientsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(clientsDir, name))
    .sort();

  for (const file of files) {
    const data = readJson(file);
    const isReference = file === referenceFile;
    const didChange = setPath(data, segments, isReference ? value : null, { replaceNull: isReference });
    if (didChange) {
      writeJson(file, data);
      changed.push(path.relative(root, file));
    } else preserved.push(path.relative(root, file));
  }
}

console.log(JSON.stringify({ root, classification, path: logicalPath, changed, preserved }, null, 2));
