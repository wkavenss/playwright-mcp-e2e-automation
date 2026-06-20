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
writeIfMissing(".env.example", "BASE_URL=\nE2E_USERNAME=\nE2E_PASSWORD=\n");
ensureLines(".gitignore", [".env", "test-results/", "playwright-report/"]);
writeIfMissing("tests/e2e/.gitkeep", "");
writeIfMissing("tests/pages/.gitkeep", "");

console.log(JSON.stringify({ root, created, preserved }, null, 2));
