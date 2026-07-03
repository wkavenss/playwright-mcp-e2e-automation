#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const rootArg = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : process.cwd();
const root = path.resolve(rootArg);
const args = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.slice(1) : rawArgs;
const jsonOutput = args.includes("--json");
const probesOutput = args.includes("--probes");
const inputIndex = args.indexOf("--input");
const readStdin = args.includes("--stdin");

function compact(text, limit = 120) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function readInput() {
  if (inputIndex >= 0 && args[inputIndex + 1]) {
    const file = path.resolve(root, args[inputIndex + 1]);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  }
  if (readStdin) return fs.readFileSync(0, "utf8");
  return "";
}

function attrs(tag) {
  const values = {};
  for (const match of tag.matchAll(/\s([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(["'])(.*?)\2/gs)) {
    values[match[1].toLowerCase()] = match[3];
  }
  return values;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function controls(html) {
  const matches = [...html.matchAll(/<(input|select|textarea|button)\b[^>]*>/gi)];
  return uniqueBy(matches.map((match) => {
    const data = attrs(match[0]);
    return {
      tag: match[1].toLowerCase(),
      id: data.id || null,
      name: data.name || null,
      type: data.type || null,
      value: data.value || null,
      title: data.title || null,
      alt: data.alt || null,
    };
  }), (item) => [item.tag, item.id, item.name, item.value, item.title, item.alt].join("|")).slice(0, 80);
}

function links(html) {
  const matches = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)];
  return uniqueBy(matches.map((match) => {
    const open = match[0].match(/<a\b[^>]*>/i)?.[0] || "";
    const data = attrs(open);
    return {
      text: compact(match[0]),
      href: data.href || null,
      title: data.title || null,
      target: data.target || null,
      onclick: data.onclick ? compact(data.onclick) : null,
      hasImageOnly: /<img\b/i.test(match[0]) && !compact(match[0].replace(/<img\b[^>]*>/gi, "")),
    };
  }), (item) => [item.text, item.href, item.title, item.target, item.onclick].join("|")).slice(0, 80);
}

function signals(html) {
  return {
    jsfcljs: /jsfcljs\s*\(/i.test(html),
    setTab: /setAba\s*\(|setTab\s*\(/i.test(html),
    blankTarget: /target\s*=\s*["']_blank["']/i.test(html),
    formPopup: /<form\b[\s\S]{0,800}target\s*=\s*["']_blank["']/i.test(html),
    imageLinks: /<a\b[\s\S]*?<img\b/i.test(html),
  };
}

function probesFromMap(map) {
  return [
    ...map.controls.flatMap((item) => [
      item.id ? { type: "css", selector: `[id="${item.id}"]`, expect: "attached" } : null,
      item.name ? { type: "css", selector: `[name="${item.name}"]`, expect: "attached" } : null,
    ]),
    ...map.links.flatMap((item) => [
      item.text ? { type: "text", text: item.text, expect: "attached" } : null,
      item.title ? { type: "css", selector: `[title="${item.title}"]`, expect: "attached" } : null,
    ]),
  ].filter(Boolean).slice(0, 80);
}

const html = readInput();
const map = {
  ok: Boolean(html.trim()),
  signals: signals(html),
  controls: controls(html),
  links: links(html),
};
const result = probesOutput ? { probes: probesFromMap(map), source: map } : map;

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Controles: ${map.controls.length}`);
  console.log(`Links: ${map.links.length}`);
  console.log(`Sinais: ${Object.entries(map.signals).filter(([, value]) => value).map(([key]) => key).join(", ") || "nenhum"}`);
}

process.exitCode = map.ok ? 0 : 1;
