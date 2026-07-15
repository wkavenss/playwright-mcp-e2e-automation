const { expect } = require('@playwright/test');

const chaveSensivel = /password|senha|secret|token|cookie|credential|credencial|cpf|matricula|telefone|email|docente|servidor/i;

function valoresSecretos() {
  return Object.entries(process.env)
    .filter(([chave, valor]) => valor && /(?:USERNAME|PASSWORD|SECRET|TOKEN|COOKIE)$/i.test(chave))
    .map(([, valor]) => String(valor));
}

function validarConteudoSeguro(valor, caminho = 'evidencia') {
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => validarConteudoSeguro(item, `${caminho}[${indice}]`));
    return;
  }
  if (valor && typeof valor === 'object') {
    for (const [chave, conteudo] of Object.entries(valor)) {
      if (chaveSensivel.test(chave)) throw new Error(`A evidencia de QA contem chave sensivel em ${caminho}.${chave}.`);
      validarConteudoSeguro(conteudo, `${caminho}.${chave}`);
    }
    return;
  }
  if (typeof valor !== 'string') return;
  for (const secreto of valoresSecretos()) {
    if (valor === secreto || (secreto.length >= 8 && valor.includes(secreto))) {
      throw new Error(`A evidencia de QA contem valor sensivel em ${caminho}.`);
    }
  }
}

function slug(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function anexarEvidenciaQa(testInfo, { casoUso, operacao, alvo, verificacoes, mascarar = [] }) {
  if (!casoUso || !operacao || !alvo?.locator) {
    throw new Error('Informe casoUso, operacao e alvo.locator para anexar a evidencia de QA.');
  }
  await expect(alvo.locator, `Checkpoint visual do ${casoUso}`).toBeVisible();
  if (!Array.isArray(verificacoes) || !verificacoes.length || verificacoes.some(({ ok }) => ok !== true)) {
    throw new Error(`${casoUso} deve anexar verificacoes concluidas com ok=true.`);
  }
  const { locator, ...alvoSeguro } = alvo;
  const evidencia = {
    schemaVersion: 1,
    casoUso,
    operacao,
    resultado: 'PASSOU',
    alvo: alvoSeguro,
    verificacoes,
  };
  validarConteudoSeguro(evidencia);
  const nome = `qa-${slug(casoUso)}-${slug(operacao)}`;
  await testInfo.attach(`${nome}.json`, {
    body: Buffer.from(`${JSON.stringify(evidencia, null, 2)}\n`, 'utf8'),
    contentType: 'application/json',
  });
  await testInfo.attach(`${nome}.png`, {
    body: await locator.screenshot({ mask: mascarar }),
    contentType: 'image/png',
  });
}

module.exports = { anexarEvidenciaQa, validarConteudoSeguro };
