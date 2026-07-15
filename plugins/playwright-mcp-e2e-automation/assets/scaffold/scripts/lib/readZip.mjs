import { inflateRawSync } from 'node:zlib';

function localizarEocd(buffer) {
  const inicio = Math.max(0, buffer.length - 65_557);
  for (let indice = buffer.length - 22; indice >= inicio; indice -= 1) {
    if (buffer.readUInt32LE(indice) === 0x06054b50) return indice;
  }
  throw new Error('ZIP invalido: diretorio central nao encontrado.');
}

export function lerEntradasZip(buffer) {
  const eocd = localizarEocd(buffer);
  const quantidade = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entradas = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error(`ZIP invalido na entrada ${indice}.`);
    const metodo = buffer.readUInt16LE(cursor + 10);
    const tamanhoComprimido = buffer.readUInt32LE(cursor + 20);
    const tamanhoOriginal = buffer.readUInt32LE(cursor + 24);
    const tamanhoNome = buffer.readUInt16LE(cursor + 28);
    const tamanhoExtra = buffer.readUInt16LE(cursor + 30);
    const tamanhoComentario = buffer.readUInt16LE(cursor + 32);
    const deslocamentoLocal = buffer.readUInt32LE(cursor + 42);
    const nome = buffer.subarray(cursor + 46, cursor + 46 + tamanhoNome).toString('utf8');
    if (buffer.readUInt32LE(deslocamentoLocal) !== 0x04034b50) throw new Error(`ZIP invalido em ${nome}.`);
    const nomeLocal = buffer.readUInt16LE(deslocamentoLocal + 26);
    const extraLocal = buffer.readUInt16LE(deslocamentoLocal + 28);
    const inicioDados = deslocamentoLocal + 30 + nomeLocal + extraLocal;
    const comprimido = buffer.subarray(inicioDados, inicioDados + tamanhoComprimido);
    const conteudo = metodo === 0 ? Buffer.from(comprimido) : (metodo === 8 ? inflateRawSync(comprimido) : null);
    if (!conteudo) throw new Error(`Metodo ZIP nao suportado (${metodo}) em ${nome}.`);
    if (conteudo.length !== tamanhoOriginal) throw new Error(`Tamanho ZIP divergente em ${nome}.`);
    entradas.push({ nome, conteudo });
    cursor += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return entradas;
}
