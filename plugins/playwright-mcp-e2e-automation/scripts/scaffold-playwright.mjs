#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const created = [];
const preserved = [];

function writeIfMissing(relativePath, content) {
  const target = path.join(root, relativePath);
  if (fs.existsSync(target)) {
    preserved.push(relativePath);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  created.push(relativePath);
}

function ensureLines(relativePath, lines) {
  const target = path.join(root, relativePath);
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const existing = new Set(current.split(/\r?\n/));
  const missing = lines.filter((line) => !existing.has(line));
  if (!missing.length) {
    preserved.push(relativePath);
    return;
  }

  const prefix = current && !current.endsWith("\n") ? "\n" : "";
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${prefix}${missing.join("\n")}\n`, "utf8");
  created.push(relativePath);
}

function ensureEnvExample(relativePath, entries) {
  const target = path.join(root, relativePath);
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const existingKeys = new Set(current.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1]).filter(Boolean));
  const missing = entries.filter(([key]) => !existingKeys.has(key));
  if (!missing.length) {
    preserved.push(relativePath);
    return;
  }

  const prefix = current && !current.endsWith("\n") ? "\n" : "";
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${prefix}${missing.map(([key, value]) => `${key}=${value}`).join("\n")}\n`, "utf8");
  created.push(relativePath);
}

function updatePackageJson() {
  const relativePath = "package.json";
  const target = path.join(root, relativePath);
  let packageJson = { private: true };

  if (fs.existsSync(target)) {
    packageJson = JSON.parse(fs.readFileSync(target, "utf8"));
  }

  packageJson.scripts ||= {};
  let changed = false;
  for (const [name, command] of Object.entries({
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
  })) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      changed = true;
    }
  }

  if (!fs.existsSync(target) || changed) {
    fs.writeFileSync(target, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
    created.push(relativePath);
  } else {
    preserved.push(relativePath);
  }
}

fs.mkdirSync(root, { recursive: true });
updatePackageJson();
writeIfMissing(
  "playwright.config.js",
  `const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests/e2e',
  reporter: 'line',
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1,
  use: {
    baseURL: process.env.BASE_URL,
    headless: false,
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
`,
);
ensureEnvExample(".env.example", [
  ["BASE_URL", ""],
  ["E2E_CLIENT_PROFILE", "referencia"],
  ["E2E_WORKERS", "1"],
  ["E2E_EXAMPLE_USERNAME", ""],
  ["E2E_EXAMPLE_PASSWORD", ""],
]);
writeIfMissing("config/defaults.json", "{}\n");
writeIfMissing("config/clientes/referencia.json", "{}\n");
writeIfMissing(
  "tests/utils/authProfiles.js",
  `const { expect } = require('@playwright/test');

function profileToEnvPrefix(profileName) {
  expect(profileName, 'Informe o perfil de autenticacao da spec').toBeTruthy();

  return String(profileName)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function getAuthProfile(profileName) {
  const prefix = profileToEnvPrefix(profileName);
  const usernameKey = \`E2E_\${prefix}_USERNAME\`;
  const passwordKey = \`E2E_\${prefix}_PASSWORD\`;
  const username = process.env[usernameKey];
  const password = process.env[passwordKey];

  expect(username, \`Informe \${usernameKey} no .env\`).toBeTruthy();
  expect(password, \`Informe \${passwordKey} no .env\`).toBeTruthy();

  return { username, password };
}

module.exports = { getAuthProfile, profileToEnvPrefix };
`,
);
writeIfMissing(
  "tests/pages/BasePage.js",
  `class BasePage {
  constructor(page) {
    this.page = page;
  }

  byId(id) {
    return this.page.locator(\`[id="\${id}"]\`);
  }
}

module.exports = { BasePage };
`,
);
writeIfMissing(
  "tests/fixtures/maximizedTest.js",
  `const base = require('@playwright/test');

async function maximizeChromiumPage(page, browserName = 'chromium') {
  if (browserName !== 'chromium') return;
  const session = await page.context().newCDPSession(page);
  try {
    const { windowId } = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'maximized' },
    });
  } finally {
    await session.detach();
  }
}

const test = base.test.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    if (testInfo.project.use.headless === false) {
      await maximizeChromiumPage(page, browserName);
    }
    await use(page);
  },
});

module.exports = {
  expect: base.expect,
  maximizeChromiumPage,
  test,
};
`,
);
writeIfMissing(
  "tests/utils/validationReport.js",
  `const fs = require('node:fs');
const path = require('node:path');

const STATUS = {
  PASSED: 'passou',
  FAILED: 'falhou',
  BLOCKED: 'nao-executado',
  PENDING: 'pendente',
};

function sanitize(value) {
  return String(value || '')
    .replace(/\\u001b\\[[0-?]*[ -/]*[@-~]/g, '')
    .split(/\\r?\\n|Call log:/)[0]
    .replace(/(senha|password|passwd|token|cookie|secret)\\s*[:=]\\s*\\S+/gi, '$1=<redacted>')
    .replace(/(usuario|usuário|username|user|login)\\s*[:=]\\s*\\S+/gi, '$1=<redacted>')
    .replace(/\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/gi, '<email>')
    .replace(/\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b/g, '<documento>')
    .replace(/\\b\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}\\b/g, '<documento>')
    .replace(/\\b(?:\\(?\\d{2}\\)?\\s*)?\\d{4,5}-?\\d{4}\\b/g, '<telefone>')
    .replace(/(?:bearer\\s+|set-cookie|connect\\.sid|localStorage|sessionStorage)\\S*/gi, '<estado-autenticado>')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function markdown(value) {
  return sanitize(value).replace(/([*_{}\\[\\]<>])/g, '\\\\$1');
}

function slug(value) {
  return String(value || 'spec')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'spec';
}

function normalizeCheck(check) {
  if (!check || !check.id) throw new Error('Cada validacao planejada deve possuir id unico.');
  return {
    id: String(check.id),
    screen: sanitize(check.screen || 'Fluxo'),
    kind: sanitize(check.kind || 'validacao'),
    field: sanitize(check.field || check.id),
    status: STATUS.PENDING,
    detail: '',
  };
}

class ValidationReport {
  constructor({ spec, runId, planned = [], projectRoot = process.cwd() } = {}) {
    if (!spec || !runId) throw new Error('Informe spec e runId para o relatorio de validacao.');
    this.spec = sanitize(spec);
    this.runId = sanitize(runId);
    this.projectRoot = path.resolve(projectRoot);
    this.checks = new Map();
    planned.forEach((check) => this.register(check));
  }

  register(check) {
    const normalized = normalizeCheck(check);
    if (this.checks.has(normalized.id)) throw new Error(\`Validacao duplicada: \${normalized.id}\`);
    this.checks.set(normalized.id, normalized);
    return normalized.id;
  }

  item(id) {
    const item = this.checks.get(String(id));
    if (!item) throw new Error(\`Validacao nao planejada: \${id}\`);
    return item;
  }

  mark(id, status, detail = '') {
    const item = this.item(id);
    item.status = status;
    item.detail = sanitize(detail);
    return item;
  }

  async check(id, action) {
    try {
      await action();
      this.mark(id, STATUS.PASSED);
      return { ok: true, item: this.item(id) };
    } catch (error) {
      this.mark(id, STATUS.FAILED, error?.message || error);
      return { ok: false, error, item: this.item(id) };
    }
  }

  pass(id, detail = '') {
    return this.mark(id, STATUS.PASSED, detail);
  }

  fail(id, detail) {
    return this.mark(id, STATUS.FAILED, detail);
  }

  blockPending({ screen, reason = 'Validacao impossivel no estado atual.' } = {}) {
    for (const item of this.checks.values()) {
      if (item.status !== STATUS.PENDING) continue;
      if (screen && item.screen !== sanitize(screen)) continue;
      this.mark(item.id, STATUS.BLOCKED, reason);
    }
  }

  summary() {
    const items = [...this.checks.values()];
    return {
      total: items.length,
      passed: items.filter((item) => item.status === STATUS.PASSED).length,
      failed: items.filter((item) => item.status === STATUS.FAILED).length,
      blocked: items.filter((item) => item.status === STATUS.BLOCKED || item.status === STATUS.PENDING).length,
    };
  }

  write() {
    this.blockPending({ reason: 'A spec terminou antes desta validacao.' });
    const summary = this.summary();
    const outputDir = path.join(this.projectRoot, 'test-results', 'implantacao');
    const outputFile = path.join(outputDir, \`\${slug(this.spec)}-\${slug(this.runId)}.md\`);
    const sections = [
      [STATUS.PASSED, 'Passou'],
      [STATUS.FAILED, 'Falhou'],
      [STATUS.BLOCKED, 'Nao executado'],
    ];
    const lines = [
      \`# Relatorio de implantacao - \${markdown(this.spec)}\`,
      '',
      \`- Run ID: \${markdown(this.runId)}\`,
      \`- Resultado: \${summary.failed || summary.blocked ? 'FALHOU' : 'PASSOU'}\`,
      \`- Total: \${summary.total}\`,
      \`- Passou: \${summary.passed}\`,
      \`- Falhou: \${summary.failed}\`,
      \`- Nao executado: \${summary.blocked}\`,
    ];

    for (const [status, title] of sections) {
      const items = [...this.checks.values()].filter((item) => item.status === status);
      if (!items.length) continue;
      lines.push('', \`## \${title}\`, '');
      for (const item of items) {
        lines.push(\`- [\${markdown(item.screen)}] \${markdown(item.kind)} - \${markdown(item.field)}\`);
        if (item.detail) lines.push(\`  - Detalhe: \${markdown(item.detail)}\`);
      }
    }

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, \`\${lines.join('\\n')}\\n\`, 'utf8');
    return outputFile;
  }

  assertSuccessful() {
    const summary = this.summary();
    if (summary.failed || summary.blocked) {
      throw new Error(\`Validacoes de implantacao com problema: \${summary.failed} falha(s), \${summary.blocked} nao executada(s).\`);
    }
  }
}

function createValidationReport(options) {
  return new ValidationReport(options);
}

module.exports = {
  STATUS,
  ValidationReport,
  createValidationReport,
  sanitize,
};
`,
);
writeIfMissing(
  "tests/utils/clientConfig.js",
  `const fs = require('node:fs');
const path = require('node:path');

const SAFE_PROFILE = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_SEGMENT = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const FORBIDDEN_KEY = /(?:password|senha|passwd|token|cookie|secret|storage|session|username|cpf|cnpj|matricula|email|telefone)/i;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readJson(file, label) {
  if (!fs.existsSync(file)) throw new Error(\`\${label} nao encontrado: \${file}\`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(\`\${label} invalido: \${file} (\${error.message})\`);
  }
  if (!isPlainObject(parsed)) throw new Error(\`\${label} deve conter um objeto JSON: \${file}\`);
  return parsed;
}

function deepMerge(...sources) {
  const result = {};
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (DANGEROUS_KEYS.has(key)) throw new Error(\`Chave estrutural proibida: \${key}\`);
      result[key] = isPlainObject(value) && isPlainObject(result[key])
        ? deepMerge(result[key], value)
        : value;
    }
  }
  return result;
}

function sensitiveValue(value) {
  if (typeof value !== 'string') return false;
  return /\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b/.test(value)
    || /\\b\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}\\b/.test(value)
    || /\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/i.test(value)
    || /(?:bearer\\s+|set-cookie|connect\\.sid|localStorage|sessionStorage)/i.test(value);
}

function sensitiveKey(key) {
  return DANGEROUS_KEYS.has(key) || FORBIDDEN_KEY.test(key) || /^(?:usuario|user|login)$/i.test(key);
}

function assertSafeConfig(value, location = '$') {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number') {
    if (sensitiveValue(value)) throw new Error(\`Dado sensivel proibido em \${location}\`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeConfig(item, \`\${location}[\${index}]\`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (sensitiveKey(key)) throw new Error(\`Chave sensivel proibida em \${location}.\${key}\`);
      assertSafeConfig(nested, \`\${location}.\${key}\`);
    }
  }
}

function validateLogicalPath(logicalPath) {
  const segments = String(logicalPath || '').split('.').filter(Boolean);
  if (!segments.length || segments.some((segment) => !SAFE_SEGMENT.test(segment) || DANGEROUS_KEYS.has(segment))) {
    throw new Error(\`Caminho de configuracao invalido: \${logicalPath}\`);
  }
  return segments;
}

function valueAt(data, logicalPath) {
  return validateLogicalPath(logicalPath).reduce((value, segment) => (
    value == null ? undefined : value[segment]
  ), data);
}

function normalizeRequirement(requirement) {
  if (typeof requirement === 'string') return { path: requirement, type: null };
  if (isPlainObject(requirement) && requirement.path) {
    return { path: requirement.path, type: requirement.type || null };
  }
  throw new Error('Requisito de massa deve ser caminho ou objeto { path, type }.');
}

function isMissing(value) {
  return value == null
    || (typeof value === 'string' && !value.trim())
    || (Array.isArray(value) && value.length === 0)
    || (isPlainObject(value) && Object.keys(value).length === 0);
}

function matchesType(value, expected) {
  if (!expected) return true;
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return isPlainObject(value);
  return typeof value === expected;
}

function loadClientConfig({ projectRoot = process.cwd(), profile = process.env.E2E_CLIENT_PROFILE } = {}) {
  if (!profile) throw new Error('Informe E2E_CLIENT_PROFILE no .env');
  if (!SAFE_PROFILE.test(profile)) throw new Error(\`Perfil de cliente invalido: \${profile}\`);

  const defaultsFile = path.resolve(projectRoot, 'config/defaults.json');
  const clientsDir = path.resolve(projectRoot, 'config/clientes');
  const profileFile = path.resolve(clientsDir, \`\${profile}.json\`);
  if (path.dirname(profileFile) !== clientsDir) throw new Error(\`Perfil de cliente invalido: \${profile}\`);

  const defaults = readJson(defaultsFile, 'Defaults da implantacao');
  const client = readJson(profileFile, 'Perfil do cliente');
  assertSafeConfig(defaults, 'defaults');
  assertSafeConfig(client, \`clientes.\${profile}\`);

  return { profile, profileFile, data: deepMerge(defaults, client) };
}

function requireSpecData({ spec, required = [], runtime = {}, projectRoot, profile } = {}) {
  if (!spec || !String(spec).trim()) throw new Error('Informe o identificador funcional da spec');
  const loaded = loadClientConfig({ projectRoot, profile });
  const data = deepMerge(loaded.data, runtime);
  const requirements = required.map(normalizeRequirement);
  const missing = [];
  const invalid = [];

  for (const requirement of requirements) {
    const value = valueAt(data, requirement.path);
    if (isMissing(value)) missing.push(requirement.path);
    else if (!matchesType(value, requirement.type)) invalid.push(\`\${requirement.path} (esperado: \${requirement.type})\`);
  }

  if (missing.length || invalid.length) {
    const details = [
      missing.length ? \`Propriedade ausente:\\n\${missing.join('\\n')}\` : '',
      invalid.length ? \`Propriedade com tipo incompativel:\\n\${invalid.join('\\n')}\` : '',
    ].filter(Boolean).join('\\n\\n');
    throw new Error([
      'Massa especifica indisponivel para a spec:',
      String(spec),
      '',
      details,
      '',
      'Perfil:',
      loaded.profile,
      '',
      'Arquivo:',
      loaded.profileFile,
    ].join('\\n'));
  }

  return data;
}

module.exports = {
  deepMerge,
  loadClientConfig,
  requireSpecData,
  valueAt,
};
`,
);
writeIfMissing(
  "tests/utils/testData.js",
  `function pad(value) {
  return String(value).padStart(2, '0');
}

function localDateParts(date) {
  return {
    day: pad(date.getDate()),
    month: pad(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

function formatDatePtBr(date) {
  const parts = localDateParts(date);
  return \`\${parts.day}/\${parts.month}/\${parts.year}\`;
}

function formatDateIso(date) {
  const parts = localDateParts(date);
  return \`\${parts.year}-\${parts.month}-\${parts.day}\`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days));
  return next;
}

function createRunId(prefix = 'E2E') {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return \`\${prefix}_\${stamp}_\${suffix}\`;
}

function neutralText(prefix = 'AUTOMACAO_E2E') {
  return \`\${prefix} \${createRunId('RUN')}\`;
}

function dateRangeFromToday({ startOffsetDays = 0, durationDays = 30 } = {}) {
  const start = addDays(new Date(), startOffsetDays);
  const end = addDays(start, durationDays);

  return {
    start,
    end,
    startIso: formatDateIso(start),
    endIso: formatDateIso(end),
    startPtBr: formatDatePtBr(start),
    endPtBr: formatDatePtBr(end),
  };
}

module.exports = {
  addDays,
  createRunId,
  dateRangeFromToday,
  formatDateIso,
  formatDatePtBr,
  neutralText,
};
`,
);
writeIfMissing(
  "tests/utils/legacyForm.js",
  `const { expect } = require('@playwright/test');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
}

function exactText(value) {
  return new RegExp(\`^\\\\s*\${escapeRegExp(value)}\\\\s*$\`, 'i');
}

async function fieldContainerByLabel(form, fieldLabel) {
  const labelText = exactText(fieldLabel);
  const candidates = form.locator('tr, li, fieldset, section, div', { hasText: labelText });
  await expect(candidates, \`Campo "\${fieldLabel}" deve ter container unico\`).toHaveCount(1);
  return candidates;
}

async function controlByFieldLabel(form, fieldLabel, optionLabel, type) {
  const field = await fieldContainerByLabel(form, fieldLabel);
  const optionText = exactText(optionLabel);
  const accessible = field.getByLabel(optionText);
  if (await accessible.count() === 1) return accessible;

  const optionContainer = field.locator('label, td, th, span, div', { hasText: optionText });
  await expect(optionContainer, \`Opcao "\${optionLabel}" do campo "\${fieldLabel}" deve ser unica\`).toHaveCount(1);

  const nested = optionContainer.locator(\`input[type="\${type}"]\`);
  if (await nested.count() === 1) return nested;

  const forId = await optionContainer.getAttribute('for');
  if (forId) {
    const byFor = field.locator(\`input[type="\${type}"][id="\${forId}"]\`);
    await expect(byFor, \`Controle "\${optionLabel}" deve apontar para id unico\`).toHaveCount(1);
    return byFor;
  }

  throw new Error(\`Nao foi possivel localizar \${type} "\${optionLabel}" no campo "\${fieldLabel}" sem indice cego.\`);
}

async function radioByFieldLabel(form, fieldLabel, optionLabel) {
  return controlByFieldLabel(form, fieldLabel, optionLabel, 'radio');
}

async function checkboxByFieldLabel(form, fieldLabel, optionLabel) {
  return controlByFieldLabel(form, fieldLabel, optionLabel, 'checkbox');
}

module.exports = {
  checkboxByFieldLabel,
  fieldContainerByLabel,
  radioByFieldLabel,
};
`,
);
ensureLines(".gitignore", [
  ".env",
  ".playwright-e2e/cache/",
  ".playwright-e2e/private-domain/",
  ".playwright-e2e/changed-files.json",
  ".playwright-e2e/error-context.md",
  "test-results/",
  "playwright-report/",
]);
writeIfMissing("tests/e2e/.gitkeep", "");
writeIfMissing("tests/pages/.gitkeep", "");

console.log(JSON.stringify({ root, created, preserved }, null, 2));
