#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2] || process.cwd());
const args = process.argv.slice(3);
const jsonOutput = args.includes("--json");
const smokeBrowser = args.includes("--smoke-browser");
const headedSmoke = args.includes("--headed") || args.includes("--headed-smoke");

function commandOk(command) {
  const result = spawnSync(`${command} --version`, {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function resolveFromRoot(packageName) {
  try {
    const requireFromRoot = createRequire(path.join(root, "package.json"));
    return requireFromRoot.resolve(packageName);
  } catch {
    return null;
  }
}

function chromiumStatus() {
  try {
    const requireFromRoot = createRequire(path.join(root, "package.json"));
    const { chromium } = requireFromRoot("@playwright/test");
    const executablePath = chromium.executablePath();
    return {
      ok: fs.existsSync(executablePath),
      executablePath,
    };
  } catch {
    return {
      ok: false,
      executablePath: null,
    };
  }
}

async function smokeBrowserStatus() {
  if (!smokeBrowser) {
    return { requested: false, ok: null, headed: headedSmoke, reason: null, message: null };
  }
  try {
    const requireFromRoot = createRequire(path.join(root, "package.json"));
    const { chromium } = requireFromRoot("@playwright/test");
    const browser = await chromium.launch({ headless: !headedSmoke, timeout: 8000 });
    await browser.close();
    return { requested: true, ok: true, headed: headedSmoke, reason: null, message: null };
  } catch (error) {
    const message = String(error?.message || error);
    const reason = /executable doesn't exist|browser.*not found|install/i.test(message)
      ? "browser-missing"
      : (/operation not permitted|not allowed|sandbox|permission|quarantine/i.test(message)
        ? "sandbox-or-permission"
        : (/display|headless|headed|window/i.test(message) ? "headed-not-available" : "launch-failed"));
    return { requested: true, ok: false, headed: headedSmoke, reason, message: message.split(/\r?\n/).slice(0, 3).join(" ") };
  }
}

const checks = {
  node: commandOk("node"),
  npm: commandOk("npm"),
  npx: commandOk("npx"),
  git: commandOk("git"),
  playwrightTest: Boolean(resolveFromRoot("@playwright/test")),
  dotenv: Boolean(resolveFromRoot("dotenv")),
};

const chromium = chromiumStatus();
const smoke = await smokeBrowserStatus();
checks.chromiumInstalled = chromium.ok;
if (smoke.requested) checks.chromiumSmoke = smoke.ok;

const missing = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const labels = {
  node: "Node.js",
  npm: "npm",
  npx: "npx",
  git: "Git",
  playwrightTest: "@playwright/test",
  dotenv: "dotenv",
  chromiumInstalled: "Chromium do Playwright",
  chromiumSmoke: "Chromium headed executavel neste ambiente",
};

function installCommandsFor(platform) {
  const commands = [];
  const needsNode = missing.some((item) => ["node", "npm", "npx"].includes(item));
  const needsGit = missing.includes("git");
  const needsProjectDeps = missing.some((item) => ["playwrightTest", "dotenv"].includes(item));
  const needsChromium = missing.includes("chromiumInstalled");

  if (platform === "windows") {
    if (needsNode) commands.push("winget install OpenJS.NodeJS.LTS");
    if (needsGit) commands.push("winget install --id Git.Git -e --source winget");
  }

  if (platform === "macos") {
    if (needsNode || needsGit) {
      const packages = [needsNode ? "node" : null, needsGit ? "git" : null].filter(Boolean).join(" ");
      commands.push(`brew install ${packages}`);
    }
  }

  if (platform === "linux") {
    if (needsNode) commands.push("curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -");
    if (needsNode || needsGit) {
      const packages = [needsNode ? "nodejs" : null, needsGit ? "git" : null].filter(Boolean).join(" ");
      commands.push(`sudo apt-get install -y ${packages}`);
    }
  }

  if (needsProjectDeps) commands.push("npm install -D @playwright/test dotenv");
  if (needsChromium) commands.push("npx playwright install chromium");

  return commands;
}

const result = {
  root,
  ok: missing.length === 0,
  checks,
  chromiumExecutablePath: chromium.executablePath,
  browserSmoke: smoke,
  missing,
  commands: {
    windows: installCommandsFor("windows"),
    macos: installCommandsFor("macos"),
    linux: installCommandsFor("linux"),
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log("Ambiente pronto para automacoes Playwright.");
} else {
  const missingLabels = missing.map((item) => labels[item]).join(", ");
  console.log(`Ambiente incompleto: faltam ${missingLabels}.`);
  console.log("");
  for (const [platform, commands] of Object.entries(result.commands)) {
    if (!commands.length) continue;
    const title = platform === "macos" ? "macOS" : platform === "linux" ? "Linux" : "Windows";
    console.log(`${title}:`);
    for (const command of commands) console.log(command);
    console.log("");
  }
  console.log("Depois de instalar Node.js, Git ou Codex CLI, feche e abra o terminal/Codex novamente.");
  if (smoke.requested && !smoke.ok && smoke.reason === "sandbox-or-permission") {
    console.log("Smoke do browser falhou por permissao/sandbox. Reabra o Codex/terminal com permissao adequada ou rode o teste headed fora do sandbox.");
  }
}

process.exitCode = result.ok ? 0 : 1;
