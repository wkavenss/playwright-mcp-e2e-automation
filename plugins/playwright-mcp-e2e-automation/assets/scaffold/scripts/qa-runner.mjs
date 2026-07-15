#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const raiz = process.cwd();
const contratoPath = path.resolve(raiz, process.env.E2E_QA_CONTRACT || 'tests/qa/implantation-contract.json');
const contrato = JSON.parse(fs.readFileSync(contratoPath, 'utf8'));
const idLote = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const diretorioLote = path.resolve(raiz, 'test-results', 'qa-batches', idLote);
const blobs = path.join(diretorioLote, 'blobs');
const html = path.resolve(raiz, 'test-results', 'html');
const cli = path.resolve(raiz, 'node_modules', '@playwright', 'test', 'cli.js');
fs.mkdirSync(blobs, { recursive: true });

function executar(programa, args, env = {}) {
  const resultado = spawnSync(programa, args, { cwd: raiz, env: { ...process.env, ...env }, stdio: 'inherit' });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status || 1);
}
const executarPlaywright = (args, env) => executar(process.execPath, [cli, ...args], env);
const executarNode = (args, env) => executar(process.execPath, args, env);

const quantidadeOperacoes = contrato.specs.reduce((total, spec) => total + spec.operations.length, 0);
if (!contrato.expectedTests || contrato.specs.length !== contrato.expectedTests) {
  throw new Error('Preencha expectedTests e todas as specs no contrato de implantacao.');
}
if (!contrato.expectedOperations || quantidadeOperacoes !== contrato.expectedOperations) {
  throw new Error('Preencha expectedOperations e todas as operacoes no contrato de implantacao.');
}

for (const [indice, spec] of contrato.specs.entries()) {
  const blob = path.join(blobs, `${String(indice + 1).padStart(2, '0')}-${spec.id}.zip`);
  const artefatos = path.join(diretorioLote, 'playwright', spec.id);
  executarPlaywright(['test', spec.file, '--headed', '--workers=1', `--output=${artefatos}`, '--reporter=line,blob'], {
    E2E_AUTH_SPEC_IDS: spec.id,
    PLAYWRIGHT_BLOB_OUTPUT_FILE: blob,
  });
  if (!fs.existsSync(blob)) throw new Error(`A spec ${spec.id} nao produziu blob individual.`);
}
executarPlaywright(['merge-reports', '--reporter=html', blobs], {
  PLAYWRIGHT_HTML_OUTPUT_DIR: html,
  PLAYWRIGHT_HTML_OPEN: 'never',
});
executarNode([path.resolve(raiz, 'scripts', 'scan-sensitive-artifacts.mjs'), '--dir', diretorioLote]);
executarNode([
  path.resolve(raiz, 'scripts', 'scan-sensitive-artifacts.mjs'),
  '--dir', html,
  '--contract', contratoPath,
  '--require-complete',
]);
console.log(`Lote QA concluido: ${contrato.expectedTests} testes, ${contrato.expectedOperations} operacoes e ${contrato.expectedOperations * 2} anexos.`);
