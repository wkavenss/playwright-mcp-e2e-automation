function obterCredenciais(nomePerfil) {
  if (!nomePerfil) throw new Error('Informe o perfil de autenticação da spec.');

  const prefixo = String(nomePerfil)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const chaveUsuario = `E2E_${prefixo}_USERNAME`;
  const chaveSenha = `E2E_${prefixo}_PASSWORD`;
  const username = process.env[chaveUsuario];
  const password = process.env[chaveSenha];

  if (!username) throw new Error(`Informe ${chaveUsuario} no .env.`);
  if (!password) throw new Error(`Informe ${chaveSenha} no .env.`);
  return { username, password };
}

module.exports = { obterCredenciais };
