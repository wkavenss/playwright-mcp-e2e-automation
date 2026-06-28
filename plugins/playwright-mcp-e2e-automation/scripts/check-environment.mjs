#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2] || process.cwd());
const jsonOutput = process.argv.includes("--json");

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

const checks = {
  node: commandOk("node"),
  npm: commandOk("npm"),
  npx: commandOk("npx"),
  git: commandOk("git"),
  playwrightTest: Boolean(resolveFromRoot("@playwright/test")),
  dotenv: Boolean(resolveFromRoot("dotenv")),
};

const chromium = chromiumStatus();
checks.chromium = chromium.ok;

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
  chromium: "Chromium do Playwright",
};

function installCommandsFor(platform) {
  const commands = [];
  const needsNode = missing.some((item) => ["node", "npm", "npx"].includes(item));
  const needsGit = missing.includes("git");
  const needsProjectDeps = missing.some((item) => ["playwrightTest", "dotenv"].includes(item));
  const needsChromium = missing.includes("chromium");

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
}

process.exitCode = result.ok ? 0 : 1;
