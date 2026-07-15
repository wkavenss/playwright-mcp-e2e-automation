#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { lerEntradasZip } from './lib/readZip.mjs';

const raiz = process.cwd();
const argumentos = process.argv.slice(2);
const valorFlag = (flag, padrao) => {
  const indice = argumentos.indexOf(flag);
  return indice >= 0 ? argumentos[indice + 1] : padrao;
};
const diretorio = path.resolve(raiz, valorFlag('--dir', 'test-results'));
const contratoPath = path.resolve(raiz, valorFlag('--contract', 'tests/qa/implantation-contract.json'));
const exigirCompleto = argumentos.includes('--require-complete');
const contratoCompleto = exigirCompleto ? JSON.parse(fs.readFileSync(contratoPath, 'utf8')) : null;
const achados = [];
const anexosQa = new Set();
const testesQa = new Set();

function lerSegredos() {
  const arquivo = path.resolve(raiz, '.env');
  if (!fs.existsSync(arquivo)) return [];
  return fs.readFileSync(arquivo, 'utf8').split(/\r?\n/).flatMap((linha) => {
    const correspondencia = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linha);
    if (!correspondencia) return [];
    const chave = correspondencia[1];
    const valor = correspondencia[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!valor || !/(?:USER(?:NAME)?|PASSWORD|SENHA|SECRET|TOKEN|COOKIE)$/i.test(chave)) return [];
    return [{ chave, valor }];
  });
}
const segredos = lerSegredos();

function registrar(variavel, origem, contexto) {
  achados.push({ variavel, origem, contexto });
}

function inspecionarObjeto(objeto, origem) {
  if (!objeto || typeof objeto !== 'object') return;
  const metodo = String(objeto.method || objeto.apiName || objeto.action || objeto.title || '');
  const parametros = `${metodo} ${JSON.stringify(objeto.params ?? objeto.parameters ?? objeto.value ?? '')}`;
  if (/fill|type|pressSequentially|insertText|login|authenticate/i.test(metodo)) {
    for (const segredo of segredos) {
      if (parametros.includes(segredo.valor)) registrar(segredo.chave, origem, 'parametros-de-acao');
    }
  }
  for (const [chave, valor] of Object.entries(objeto)) {
    if (/cookie|authorization|bearer|access.?token|refresh.?token|password|senha|secret/i.test(chave) && valor) {
      registrar(chave, origem, 'campo-sensivel');
    }
    if (typeof valor === 'string' && /stdout|stderr|log|attachment|body|content|snippet|error/i.test(chave)) {
      for (const segredo of segredos) {
        if (valor.includes(segredo.valor)) registrar(segredo.chave, origem, 'log-ou-anexo');
      }
    }
    inspecionarObjeto(valor, origem);
  }
  const nome = objeto.name || objeto.nome || objeto.path;
  if (typeof nome === 'string' && /^qa-.*\.(json|png)$/i.test(path.basename(nome))) anexosQa.add(path.basename(nome));
  const arquivoTeste = objeto.location?.file || objeto.file;
  if (contratoCompleto && arquivoTeste && objeto.title) {
    const arquivo = String(arquivoTeste).replaceAll('\\', '/');
    const spec = contratoCompleto.specs.find((item) => {
      const declarado = item.file.replaceAll('\\', '/');
      return arquivo.endsWith(declarado) || path.basename(arquivo) === path.basename(declarado);
    });
    if (spec) testesQa.add(spec.id);
  }
}

function inspecionarTexto(texto, origem) {
  for (const linha of texto.split(/\r?\n/)) {
    const aparada = linha.trim();
    if (!aparada) continue;
    try {
      inspecionarObjeto(JSON.parse(aparada), origem);
    } catch {
      if (/fill|type|pressSequentially|stdout|stderr|attachment|password|senha|token|cookie|secret/i.test(aparada)) {
        for (const segredo of segredos) {
          if (aparada.includes(segredo.valor)) registrar(segredo.chave, origem, 'texto-contextual');
        }
      }
    }
    for (const nome of aparada.match(/qa-[a-z0-9-]+\.(?:json|png)/gi) || []) anexosQa.add(nome);
  }
}

function pareceTexto(nome, buffer) {
  if (/\.(json|jsonl|txt|log|md|xml|html|htm|js|css)$/i.test(nome)) return true;
  return !buffer.subarray(0, Math.min(buffer.length, 512)).includes(0);
}

function inspecionarZip(buffer, origem, profundidade = 0) {
  if (profundidade > 3) throw new Error(`ZIP aninhado excedeu o limite em ${origem}.`);
  for (const entrada of lerEntradasZip(buffer)) {
    const destino = `${origem}!${entrada.nome}`;
    if ((entrada.conteudo.length >= 4 && entrada.conteudo.readUInt32LE(0) === 0x04034b50) || /\.zip$/i.test(entrada.nome)) {
      inspecionarZip(entrada.conteudo, destino, profundidade + 1);
    } else if (pareceTexto(entrada.nome, entrada.conteudo)) {
      inspecionarTexto(entrada.conteudo.toString('utf8'), destino);
    }
  }
}

function listar(entrada) {
  if (!fs.existsSync(entrada)) return [];
  if (fs.statSync(entrada).isFile()) return [entrada];
  return fs.readdirSync(entrada, { withFileTypes: true }).flatMap((item) => {
    if (item.isDirectory() && item.name === 'auth') return [];
    const destino = path.join(entrada, item.name);
    return item.isDirectory() ? listar(destino) : [destino];
  });
}

for (const arquivo of listar(diretorio)) {
  if (!/\.(html?|zip|jsonl?|txt|log|md|xml)$/i.test(arquivo)) continue;
  const relativo = path.relative(raiz, arquivo);
  const buffer = fs.readFileSync(arquivo);
  if (/\.zip$/i.test(arquivo)) {
    inspecionarZip(buffer, relativo);
    continue;
  }
  const texto = buffer.toString('utf8');
  if (/\.html?$/i.test(arquivo)) {
    for (const correspondencia of texto.matchAll(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/g)) {
      inspecionarZip(Buffer.from(correspondencia[1], 'base64'), `${relativo}!relatorio-embutido.zip`);
    }
  }
  inspecionarTexto(texto, relativo);
}

if (exigirCompleto) {
  const quantidadeEsperada = contratoCompleto.expectedOperations * 2;
  if (anexosQa.size !== quantidadeEsperada) registrar('QA_ATTACHMENT_COUNT', path.relative(raiz, diretorio), `${anexosQa.size}/${quantidadeEsperada}`);
  if (testesQa.size !== contratoCompleto.expectedTests) registrar('QA_TEST_COUNT', path.relative(raiz, diretorio), `${testesQa.size}/${contratoCompleto.expectedTests}`);
  for (const spec of contratoCompleto.specs) {
    for (const operacao of spec.operations) {
      if (!operacao.evidenceBase) continue;
      for (const extensao of ['json', 'png']) {
        const nome = `${operacao.evidenceBase}.${extensao}`;
        if (!anexosQa.has(nome)) registrar('QA_ATTACHMENTS', path.relative(raiz, diretorio), `ausente:${nome}`);
      }
    }
  }
}

const unicos = [...new Map(achados.map((item) => [`${item.variavel}|${item.origem}|${item.contexto}`, item])).values()];
if (unicos.length) {
  for (const achado of unicos) console.error(`[sensivel] ${achado.variavel} em ${achado.origem} (${achado.contexto})`);
  process.exit(1);
}
console.log(`Scanner concluido: zero achados; ${anexosQa.size} anexos QA identificados.`);
