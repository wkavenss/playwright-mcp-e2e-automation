#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");

function valueOf(flag, fallback = "") {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : fallback;
}

function compact(value, limit = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function readManifest(file) {
  if (!file) return null;
  const absolute = path.resolve(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Manifesto nao encontrado: ${file}`);
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.probes)) return parsed.probes;
  throw new Error("Manifesto deve ser JSON array ou objeto com probes.");
}

function singleProbeFromArgs() {
  const selector = valueOf("--selector");
  const text = valueOf("--text");
  const label = valueOf("--label");
  const testId = valueOf("--test-id");
  const role = valueOf("--role");
  const name = valueOf("--name");
  if (selector) return { type: "css", selector };
  if (label) return { type: "label", label };
  if (testId) return { type: "test-id", testId };
  if (role) return { type: "role", role, name };
  if (text) return { type: "text", text };
  return null;
}

async function loadPlaywright() {
  const requireFromRoot = createRequire(path.join(root, "package.json"));
  try {
    return requireFromRoot("@playwright/test");
  } catch {
    return import("@playwright/test");
  }
}

function locatorFor(page, probe) {
  const type = probe.type || (probe.selector ? "css" : "text");
  if (type === "css") return page.locator(probe.selector);
  if (type === "label") return page.getByLabel(probe.label);
  if (type === "test-id") return page.getByTestId(probe.testId);
  if (type === "role") return page.getByRole(probe.role, probe.name ? { name: probe.name } : undefined);
  if (type === "text") return page.getByText(probe.text);
  throw new Error(`Tipo de probe nao suportado: ${type}`);
}

async function inspectLocator(locator, probe, timeout) {
  const expected = probe.expect || "attached";
  try {
    await locator.waitFor({ state: "attached", timeout });
  } catch {
    return {
      ok: false,
      status: "missing",
      count: 0,
      attached: false,
      visible: false,
    };
  }

  const count = await locator.count();
  const visible = count > 0 ? await locator.isVisible().catch(() => false) : false;
  const status = count > 1
    ? "duplicate"
    : (!visible && expected === "visible" ? "hidden-attached" : "found");

  return {
    ok: status === "found",
    status,
    count,
    attached: count > 0,
    visible,
  };
}

async function maximizeChromiumPage(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "maximized" } });
  } finally {
    await session.detach();
  }
}

async function run() {
  const manifest = valueOf("--manifest");
  const probes = manifest ? readManifest(manifest) : [singleProbeFromArgs()].filter(Boolean);
  const url = valueOf("--url");
  const timeout = Number(valueOf("--timeout", "4000"));
  const headed = args.includes("--headed");

  if (!probes.length) {
    return { ok: false, errorType: "missing-probe", message: "Informe --selector, --text, --label, --role ou --manifest." };
  }
  if (!url) {
    return { ok: false, errorType: "missing-target", message: "Informe --url para probe independente; para estado JSF reaproveite sessao MCP/pagina preservada." };
  }

  let playwright;
  try {
    playwright = await loadPlaywright();
  } catch (error) {
    return { ok: false, errorType: "missing-playwright", message: compact(error.message) };
  }

  const browser = await playwright.chromium.launch({
    headless: !headed,
    args: headed ? ["--start-maximized"] : [],
  });
  const page = await browser.newPage(headed ? { viewport: null } : undefined);
  if (headed) await maximizeChromiumPage(page);
  const results = [];
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: Math.max(timeout, 5000) });
    for (const probe of probes) {
      try {
        const result = await inspectLocator(locatorFor(page, probe), probe, timeout);
        results.push({ probe, ...result });
      } catch (error) {
        results.push({ probe, ok: false, status: "error", message: compact(error.message) });
      }
    }
  } finally {
    await browser.close();
  }

  return {
    ok: results.every((item) => item.ok),
    url: page.url(),
    timeout,
    maximized: headed,
    probes: results,
  };
}

const summary = await run();

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else if (!summary.probes) {
  console.log(`${summary.errorType || "error"}: ${summary.message || "probe falhou"}`);
} else {
  for (const item of summary.probes) {
    console.log(`${item.status}: ${item.count ?? 0} ocorrencia(s), visible=${Boolean(item.visible)}`);
  }
}

process.exitCode = summary.ok ? 0 : 1;
