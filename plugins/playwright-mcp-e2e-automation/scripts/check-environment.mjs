#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2] || process.cwd());
const args = process.argv.slice(3);
const jsonOutput = args.includes("--json");
const smokeBrowser = args.includes("--smoke-browser") || args.includes("--headed-smoke");
const headedSmoke = args.includes("--headed") || args.includes("--headed-smoke");
const rootPackageJson = path.join(root, "package.json");

function commandOk(command) {
  const result = spawnSync(`${command} --version`, {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function oneLine(value) {
  return String(value || "").split(/\r?\n/).filter(Boolean)[0] || "";
}

function resolveFromRoot(packageName) {
  try {
    const requireFromRoot = createRequire(rootPackageJson);
    return requireFromRoot.resolve(packageName);
  } catch {
    return null;
  }
}

function packageInfo(packageName) {
  try {
    const requireFromRoot = createRequire(rootPackageJson);
    const packageJsonPath = requireFromRoot.resolve(`${packageName}/package.json`);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return {
      ok: true,
      packageJsonPath,
      version: packageJson.version || null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      packageJsonPath: null,
      version: null,
      error: oneLine(error?.message || error),
    };
  }
}

function chromiumStatus(playwrightInfo) {
  if (!playwrightInfo.ok) {
    return {
      ok: false,
      executablePath: null,
      reason: "playwright-test-missing",
      packageJsonPath: null,
      version: null,
      message: playwrightInfo.error,
    };
  }

  try {
    const requireFromRoot = createRequire(rootPackageJson);
    const { chromium } = requireFromRoot("@playwright/test");
    const executablePath = chromium.executablePath();
    const installed = fs.existsSync(executablePath);
    return {
      ok: installed,
      executablePath,
      reason: installed ? null : "chromium-executable-missing",
      packageJsonPath: playwrightInfo.packageJsonPath,
      version: playwrightInfo.version,
      message: null,
    };
  } catch (error) {
    return {
      ok: false,
      executablePath: null,
      reason: "chromium-resolution-failed",
      packageJsonPath: playwrightInfo.packageJsonPath,
      version: playwrightInfo.version,
      message: oneLine(error?.message || error),
    };
  }
}

async function smokeBrowserStatus() {
  if (!smokeBrowser) {
    return { requested: false, ok: null, headed: headedSmoke, reason: null, message: null };
  }
  let browser;
  try {
    const requireFromRoot = createRequire(rootPackageJson);
    const { chromium } = requireFromRoot("@playwright/test");
    browser = await chromium.launch({
      headless: !headedSmoke,
      timeout: 8000,
      args: headedSmoke ? ["--start-maximized"] : [],
    });
    let maximized = false;
    if (headedSmoke) {
      const page = await browser.newPage({ viewport: null });
      const session = await page.context().newCDPSession(page);
      try {
        const { windowId } = await session.send("Browser.getWindowForTarget");
        await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "maximized" } });
        maximized = true;
      } finally {
        await session.detach();
      }
    }
    return { requested: true, ok: true, headed: headedSmoke, maximized, reason: null, message: null };
  } catch (error) {
    const message = String(error?.message || error);
    const reason = /executable doesn't exist|browser.*not found|install/i.test(message)
      ? "browser-missing"
      : (/operation not permitted|not allowed|sandbox|permission|quarantine/i.test(message)
        ? "sandbox-or-permission"
        : (/display|headless|headed|window/i.test(message) ? "headed-not-available" : "launch-failed"));
    return { requested: true, ok: false, headed: headedSmoke, maximized: false, reason, message: oneLine(message) };
  } finally {
    await browser?.close().catch(() => {});
  }
}

const playwrightInfo = packageInfo("@playwright/test");
const dotenvInfo = packageInfo("dotenv");

const checks = {
  node: commandOk("node"),
  npm: commandOk("npm"),
  npx: commandOk("npx"),
  git: commandOk("git"),
  playwrightTest: playwrightInfo.ok,
  dotenv: dotenvInfo.ok || Boolean(resolveFromRoot("dotenv")),
};

const chromium = chromiumStatus(playwrightInfo);
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
  chromiumInstalled: "Chromium esperado pelo @playwright/test do projeto",
  chromiumSmoke: "Chromium headed executavel neste ambiente",
};

function installCommandsFor(platform) {
  const commands = [];
  const needsNode = missing.some((item) => ["node", "npm", "npx"].includes(item));
  const needsGit = missing.includes("git");
  const needsProjectDeps = missing.some((item) => ["playwrightTest", "dotenv"].includes(item));
  const needsChromium = missing.includes("chromiumInstalled");
  const npmCommand = platform === "windows" ? "npm.cmd" : "npm";

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

  if (needsProjectDeps) commands.push(`${npmCommand} install -D @playwright/test dotenv`);
  if (needsChromium) commands.push(`${npmCommand} exec -- playwright install chromium`);

  return commands;
}

const diagnostics = [];
if (!checks.playwrightTest) {
  diagnostics.push("Instale @playwright/test no projeto antes de instalar o Chromium; o plugin valida a revisao do Playwright local.");
} else if (!checks.chromiumInstalled) {
  const version = chromium.version ? ` ${chromium.version}` : "";
  const location = chromium.executablePath ? ` em ${chromium.executablePath}` : "";
  diagnostics.push(`Chromium esperado pelo @playwright/test${version} do projeto nao foi encontrado${location}. Rode o instalador a partir da raiz do projeto.`);
}
if (process.platform === "win32" && missing.some((item) => ["npm", "npx", "playwrightTest", "chromiumInstalled"].includes(item))) {
  diagnostics.push("No PowerShell, se a Execution Policy bloquear npm.ps1 ou npx.ps1, use npm.cmd/npx.cmd ou abra o Prompt de Comando.");
}

const result = {
  root,
  ok: missing.length === 0,
  checks,
  playwright: {
    installed: playwrightInfo.ok,
    packageJsonPath: playwrightInfo.packageJsonPath,
    version: playwrightInfo.version,
    error: playwrightInfo.error,
  },
  dotenv: {
    installed: checks.dotenv,
    packageJsonPath: dotenvInfo.packageJsonPath,
    version: dotenvInfo.version,
  },
  chromium,
  chromiumExecutablePath: chromium.executablePath,
  browserSmoke: smoke,
  missing,
  diagnostics,
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
  for (const diagnostic of diagnostics) console.log(`Nota: ${diagnostic}`);
  if (diagnostics.length) console.log("");
  for (const [platform, commands] of Object.entries(result.commands)) {
    if (!commands.length) continue;
    const title = platform === "macos" ? "macOS" : platform === "linux" ? "Linux" : "Windows";
    console.log(`${title}:`);
    for (const command of commands) console.log(command);
    console.log("");
  }
  if (missing.some((item) => ["node", "npm", "npx", "git"].includes(item))) {
    console.log("Depois de instalar Node.js ou Git, feche e abra o terminal/Codex novamente.");
  }
  if (smoke.requested && !smoke.ok && smoke.reason === "sandbox-or-permission") {
    console.log("Smoke do browser falhou por permissao/sandbox. Reabra o Codex/terminal com permissao adequada ou rode o teste headed fora do sandbox.");
  }
}

process.exitCode = result.ok ? 0 : 1;
