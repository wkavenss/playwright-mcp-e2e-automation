const { expect } = require('@playwright/test');

function textoExato(valor) {
  const escapado = String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escapado}\\s*$`, 'i');
}

async function containerDoCampo(formulario, rotuloCampo) {
  const candidatos = formulario.locator(
    'tr, li, fieldset, section, div',
    { hasText: textoExato(rotuloCampo) },
  );
  await expect(candidatos, `Campo "${rotuloCampo}" deve ter container único`).toHaveCount(1);
  return candidatos;
}

async function controlePorRotulo(formulario, rotuloCampo, rotuloOpcao, tipo) {
  const campo = await containerDoCampo(formulario, rotuloCampo);
  const opcao = textoExato(rotuloOpcao);
  const acessivel = campo.getByLabel(opcao);
  if (await acessivel.count() === 1) return acessivel;

  const containerOpcao = campo.locator('label, td, th, span, div', { hasText: opcao });
  await expect(
    containerOpcao,
    `Opção "${rotuloOpcao}" do campo "${rotuloCampo}" deve ser única`,
  ).toHaveCount(1);

  const controleInterno = containerOpcao.locator(`input[type="${tipo}"]`);
  if (await controleInterno.count() === 1) return controleInterno;

  const idRelacionado = await containerOpcao.getAttribute('for');
  if (idRelacionado) {
    const controle = campo.locator(`input[type="${tipo}"][id="${idRelacionado}"]`);
    await expect(controle).toHaveCount(1);
    return controle;
  }
  throw new Error(`Não foi possível localizar ${tipo} "${rotuloOpcao}" sem índice cego.`);
}

async function radioPorRotulo(formulario, rotuloCampo, rotuloOpcao) {
  return controlePorRotulo(formulario, rotuloCampo, rotuloOpcao, 'radio');
}

async function checkboxPorRotulo(formulario, rotuloCampo, rotuloOpcao) {
  return controlePorRotulo(formulario, rotuloCampo, rotuloOpcao, 'checkbox');
}

module.exports = { checkboxPorRotulo, radioPorRotulo };
