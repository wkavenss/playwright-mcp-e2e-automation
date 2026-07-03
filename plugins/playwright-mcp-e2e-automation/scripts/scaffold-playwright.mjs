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
  `const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests/e2e',
  reporter: 'line',
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1,
  use: {
    baseURL: process.env.BASE_URL,
    headless: false,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
`,
);
writeIfMissing(".env.example", "BASE_URL=\nE2E_WORKERS=1\nE2E_EXAMPLE_USERNAME=\nE2E_EXAMPLE_PASSWORD=\n");
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
