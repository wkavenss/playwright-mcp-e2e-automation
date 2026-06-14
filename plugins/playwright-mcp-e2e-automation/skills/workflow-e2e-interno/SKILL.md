---
name: workflow-e2e-interno
description: Workflow interno do plugin para criar ou atualizar automacoes de testes E2E para aplicacoes web. Use quando este workflow interno for acionado pelo plugin para automatizar fluxo web, validar fluxo funcional em navegador, transformar passo a passo manual em teste automatizado, estruturar testes com Page Objects, melhorar ou corrigir automacao existente, a partir de URL, objetivo do teste, dados obrigatorios e validacoes esperadas.
---

# Automacao E2E com Playwright MCP

Criar ou atualizar automacoes de testes E2E para aplicacoes web usando Playwright Test, JavaScript e Playwright MCP.

Usar esta skill quando o usuario pedir para criar automacao E2E com Playwright, criar projeto Playwright do zero, automatizar fluxo web, validar fluxo funcional em navegador, criar testes usando Playwright MCP, transformar passo a passo manual em teste automatizado, estruturar testes com Page Objects ou melhorar/corrigir automacao Playwright existente.

## Escopo De Escrita

Criar e alterar arquivos sempre no workspace ou repositorio ativo do usuario. Nunca criar projetos, testes, dependencias, documentacao ou arquivos de automacao dentro da pasta da skill/plugin, salvo se o usuario pedir explicitamente para editar a propria skill.

## Entrada Esperada

Aceitar os dados disponiveis do fluxo, sem exigir que todos estejam presentes:

- URL base;
- ambiente;
- objetivo do teste;
- caminho funcional conhecido;
- acao final permitida;
- massa externa obrigatoria;
- variaveis de ambiente;
- passo a passo real das telas;
- dados obrigatorios;
- validacoes esperadas;
- observacoes ou restricoes do ambiente.

Quando uma informacao nao for fornecida, usar Playwright MCP para explorar a interface e identificar o que for possivel. Quando uma regra funcional nao puder ser inferida pela tela, registrar como pendencia, sem inventar regra de negocio.

Sempre que possivel, obter do usuario ambiente, URL base, objetivo do teste, caminho funcional, acao final permitida, dados obrigatorios, massa externa e validacoes esperadas. Essas informacoes reduzem o risco de executar a acao errada, submeter dados indevidos ou validar resultado incompleto.

## Modelo Para Chamadas Futuras

Usar este modelo apenas como referencia para o usuario informar um fluxo:

```text
Use o plugin Playwright MCP E2E.

URL base:
Ambiente:
Objetivo do teste:
Caminho funcional conhecido:
Acao final permitida:
Massa externa obrigatoria:

Variaveis de ambiente:
-

Passo a passo real das telas:
1.
2.
3.

Dados obrigatorios:
-

Validacoes esperadas:
-

Observacoes:
-
```

## Fluxo De Trabalho

1. Ler os dados informados pelo usuario.
2. Identificar o objetivo funcional do teste.
3. Verificar se ja existe projeto Playwright no repositorio.
4. Criar ou ajustar a estrutura do projeto.
5. Configurar JavaScript, Playwright Test e variaveis de ambiente.
6. Usar Playwright MCP para explorar a aplicacao antes de implementar ou alterar testes.
7. Confirmar telas, campos, botoes, links, mensagens e caminhos reais pela interface.
8. Mapear as telas em Page Objects.
9. Criar ou atualizar dados de teste separados do fluxo.
10. Implementar o teste E2E principal.
11. Adicionar validacoes funcionais.
12. Executar o teste quando o ambiente permitir.
13. Corrigir falhas possiveis de seletor, navegacao, sincronizacao ou validacao.
14. Atualizar a documentacao.
15. Responder ao final com o resumo padronizado.

## Exploracao Com Playwright MCP

Antes de implementar ou alterar testes, registrar evidencias minimas da exploracao:

- URL acessada e ambiente usado;
- telas, rotas e caminhos visitados;
- campos, botoes, links, mensagens e estados reais confirmados;
- seletores semanticos candidatos e motivo da escolha;
- validacoes funcionais observaveis;
- bloqueios, permissoes ausentes, captcha, MFA, instabilidade ou massa indisponivel.

## Navegacao E Telas

- Confirmar no ambiente real a pagina inicial do fluxo, a navegacao necessaria, as telas intermediarias e o resultado esperado.
- Nao assumir nomes de menus, botoes, campos, mensagens ou rotas sem validar na interface.
- Preferir navegacao pela interface quando o objetivo for validar o fluxo do usuario.
- Usar URL direta somente quando o fluxo exigir uma URL especifica ou quando isso estiver alinhado ao objetivo do teste.
- Validar cada mudanca de tela por titulo, cabecalho, texto principal, formulario, tabela, rota, estado visual ou outro sinal confiavel.
- Quando houver menu com hover, usar interacao apropriada do Playwright para exibir o submenu antes do clique.
- Se o caminho esperado nao aparecer, verificar estado da sessao, permissao, configuracao do ambiente, massa de dados e possivel indisponibilidade antes de registrar bloqueio.

## Formularios, Campos E Etapas

- Mapear labels, inputs, textareas, selects, combos, radios, checkboxes, campos de data, campos de busca, uploads, editores ricos e mensagens de validacao.
- Campos obrigatorios podem ser indicados por atributo HTML, asterisco, legenda visual, mensagem de validacao ou regra da tela. Nao depender apenas do atributo `required`.
- Quando apropriado, submeter formulario incompleto durante exploracao para observar mensagens de validacao e descobrir obrigatoriedades.
- Nao preencher aleatoriamente campos funcionais sensiveis. Preferir dados informados pelo usuario ou dados de teste claramente artificiais.
- Diferenciar acoes intermediarias de acoes finais, como salvar rascunho, gravar parcialmente, enviar, confirmar definitivamente, cancelar ou excluir.
- Nao clicar em acoes finais se isso nao estiver explicitamente no objetivo do teste ou na acao final permitida.
- Antes de confirmacao final, validar que a tela de revisao apresenta os principais dados preenchidos quando essa tela existir.
- Apos cada etapa, validar que a aplicacao avancou para o estado correto.

## Mensagens, Tabelas E Registros

- Procurar mensagens de sucesso, erro e alerta apos cada submissao relevante.
- Registrar a mensagem exata quando houver falha funcional, permissao insuficiente, sessao expirada, regra de negocio nao atendida ou indisponibilidade do ambiente.
- Em tabelas/listagens, localizar primeiro a linha pelo texto unico do registro e depois clicar no icone, link ou botao dentro da mesma linha.
- Nao clicar no primeiro icone da pagina sem associar a acao ao registro correto.
- Quando icones tiverem `alt`, `title`, `aria-label` ou texto acessivel, usar esses atributos.
- Se nao houver nome acessivel, usar seletor relativo ao container correto e justificar no codigo.
- Quando houver paginacao, filtro ou busca, usar o mecanismo da tela para encontrar o registro criado.
- Validar que o registro encontrado corresponde exatamente ao dado da execucao atual.

## Dados E Massa De Teste

- Para cadastros, gerar dados unicos com prefixo rastreavel, como `AUTOMACAO_E2E`, `TESTE_QA` ou `PLAYWRIGHT_MCP`, combinado com timestamp.
- Nao usar dados reais sensiveis em massa de teste, incluindo documentos pessoais, e-mail pessoal, telefone, enderecos, dados financeiros, tokens ou credenciais reais.
- Quando o fluxo exigir massa externa, preferir dados informados pelo usuario.
- Para datas, valores, documentos, identificadores ou formatos especificos, validar o formato aceito pela tela antes de preencher.
- Nao usar dados vencidos, invalidos ou fora do periodo permitido sem validacao previa.
- Para campos longos, usar textos neutros e rastreaveis.
- Para editor rico, validar se o preenchimento exige interacao especial.

## Sessao E Autenticacao

- Detectar redirecionamento inesperado para login e registrar como falha de ambiente, sincronizacao ou autenticacao, conforme o caso.
- Usar fixture de login reutilizavel quando houver login.
- Validar usuario logado ou estado autenticado quando a tela exibir essa informacao.
- Realizar logout ao final apenas se isso nao prejudicar a coleta de evidencias.
- Se houver aviso de sessao, pop-up, banner ou modal, tratar de forma controlada e documentar.

## Regras Obrigatorias

- Usar Playwright MCP para explorar as telas antes de implementar ou alterar testes.
- Nao assumir nomes de menus, botoes, campos, mensagens ou fluxos sem validar na interface.
- Nao hardcodear usuario, senha, token, e-mail, documento, cookie ou qualquer dado sensivel.
- Usar variaveis de ambiente para URL, credenciais e configuracoes sensiveis.
- Priorizar seletores estaveis e semanticos: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByTestId` quando existir, ou seletores semanticos equivalentes.
- Priorizar roles e nomes acessiveis reais.
- Quando a interface nao expuser seletores estaveis, registrar a limitacao e sugerir melhoria como `data-testid` estavel.
- Evitar XPath absoluto, CSS fragil, classes geradas automaticamente ou seletores dependentes de layout.
- Usar XPath ou CSS fragil somente em ultimo caso e justificar no codigo.
- Usar Page Object Model ou estrutura equivalente bem organizada.
- Separar testes, paginas, fixtures, dados e utilitarios.
- Criar dados unicos quando houver cadastro, usando timestamp ou identificador dinamico.
- Validar resultado funcional, nao apenas cliques ou navegacao.
- Validar mensagens, registros em listagem, estados persistidos, redirecionamentos, dados salvos ou outro indicio confiavel.
- Evitar `waitForTimeout`, salvo em ultimo caso justificado.
- Usar os waits automaticos do Playwright sempre que possivel.
- Registrar bloqueios como captcha, MFA, ambiente indisponivel, permissao insuficiente, instabilidade, regra de negocio ambigua ou ausencia de massa de dados.
- Criar ou atualizar `README.md` com instrucoes de instalacao, configuracao, execucao e limitacoes.
- Criar ou atualizar `.env.example`.
- Criar ou atualizar `.gitignore`.
- Criar ou atualizar scripts uteis no `package.json`.
- Antes de instalar dependencias, alterar configuracao do projeto ou executar testes, verificar o gerenciador de pacotes e os padroes ja usados no repositorio.
- Detectar `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package.json` e scripts existentes antes de escolher comandos.
- Quando a acao exigir rede, instalacao de pacotes, credenciais, acesso a ambiente externo ou aprovacao do sandbox, solicitar autorizacao de forma explicita.
- Garantir que arquivos reais de segredo, como `.env`, fiquem no `.gitignore`; versionar apenas exemplos seguros, como `.env.example`.
- Para fluxos com login pesado, usar `storageState` somente quando permitido pelo ambiente e sem versionar estado autenticado, tokens, cookies ou credenciais reais.
- Para fluxos destrutivos, como exclusao, cancelamento, envio definitivo ou alteracao irreversivel, preferir ambiente de teste, usar dados unicos e pedir confirmacao quando houver risco de impacto real.
- Em producao, evitar criacao, alteracao, submissao, exclusao, aprovacao ou qualquer acao irreversivel em dados reais. Se o fluxo for destrutivo ou irreversivel, interromper antes da acao final e registrar orientacao, salvo autorizacao explicita do usuario.
- Executar o teste ao final quando o ambiente permitir e corrigir falhas possiveis.

## Projeto Novo Ou Existente

- Em projeto novo, criar a estrutura minima completa com Playwright Test, JavaScript, Page Objects, dados, fixtures, utilitarios, `README.md`, `.env.example`, `.gitignore`, `package.json` e `playwright.config.js`.
- Em projeto existente, preservar padroes ja usados, reaproveitar configuracao, scripts, fixtures, helpers e convencoes locais.
- Evitar reestruturacoes amplas ou renomeacoes que nao sejam necessarias para automatizar o fluxo pedido.
- Se houver testes Playwright existentes, seguir o estilo de imports, nomes, organizacao de diretorios, fixtures e comandos ja adotados.

## Estrutura Recomendada

Para projeto novo, usar uma estrutura semelhante a esta, ajustando nomes conforme a aplicacao e o fluxo:

```text
tests/
  e2e/
    fluxo-principal.spec.js
pages/
  LoginPage.js
  HomePage.js
  [DemaisPageObjects].js
fixtures/
  test.js
data/
  fluxo.data.js
utils/
  unique.js
playwright.config.js
package.json
.env.example
.gitignore
README.md
```

Criar ou manter estes arquivos principais:

- `playwright.config.js`;
- `package.json`;
- `.env.example`;
- `.gitignore`;
- `README.md`;
- testes em `tests/e2e`;
- Page Objects em `pages`;
- dados de teste em `data`;
- fixtures em `fixtures`;
- utilitarios em `utils`.

## Padrao De Nomes

- Usar kebab-case para specs, massas e arquivos utilitarios, como `fluxo-principal.spec.js`, `cadastro-completo.data.js` e `unique-id.js`.
- Usar PascalCase para Page Objects, como `LoginPage.js`, `HomePage.js` e `CadastroPage.js`.
- Nomear testes com descricoes funcionais quando o projeto nao tiver outro padrao estabelecido.
- Em projeto existente, seguir o padrao local mesmo que ele seja diferente.

## Configuracao Minima

Configurar `package.json` com, no minimo:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  }
}
```

Configurar `playwright.config.js` em JavaScript com evidencias uteis em falha:

- `trace: 'on-first-retry'`;
- `screenshot: 'only-on-failure'`;
- `video: 'retain-on-failure'`;
- reporter HTML.

Relatar no `README.md` e no resumo final onde consultar relatorio HTML, traces, screenshots e videos gerados em falhas.

Criar `.env.example` com nomes genericos e ajustaveis ao fluxo informado:

```text
BASE_URL=
E2E_USER=
E2E_PASSWORD=
```

Se o usuario informar nomes especificos de variaveis de ambiente, usar os nomes informados.

## Organizacao Do Codigo

Fazer o teste principal contar a historia do fluxo de forma legivel:

```javascript
test('deve concluir o fluxo principal com sucesso', async ({ page }) => {
  await loginPage.realizarLogin();
  await homePage.acessarFuncionalidade();
  await fluxoPage.preencherDadosObrigatorios();
  await fluxoPage.submeterFluxo();
  await fluxoPage.validarResultado();
});
```

Fazer os metodos dos Page Objects representarem acoes de negocio ou passos funcionais, nao cliques genericos.

Bons exemplos:

- `realizarLogin()`;
- `acessarFuncionalidade()`;
- `preencherDadosObrigatorios()`;
- `avancarEtapa()`;
- `confirmarOperacao()`;
- `submeterFluxo()`;
- `validarMensagemSucesso()`;
- `validarRegistroNaListagem()`;
- `validarResultado()`;
- `sairDaAplicacao()`.

Evitar nomes como:

- `clickButton1()`;
- `fillInput2()`;
- `goNext()`;
- `clicarAqui()`;
- `preencherCampo()`.

Separar responsabilidades:

- test spec: orquestrar o cenario;
- Page Object: interagir com a tela;
- data: guardar massas de teste;
- fixtures: preparar recursos reutilizaveis;
- utils: gerar dados unicos, datas e helpers.

Em manutencoes futuras, corrigir preferencialmente Page Objects, dados, fixtures ou utilitarios compartilhados antes de duplicar logica diretamente no spec. Criar novos helpers somente quando reduzirem duplicacao real ou deixarem o fluxo mais claro.

## Bloqueios E Limites

Se houver captcha, MFA, bloqueio de automacao, indisponibilidade do ambiente, permissao insuficiente ou regra de negocio ambigua, nao inventar alternativa insegura. Registrar o bloqueio e estruturar a automacao ate o ponto possivel.

Quando houver bloqueio, registrar tela onde ocorreu, mensagem exibida, estado da sessao, acao tentada, evidencia gerada pelo Playwright, possivel causa e informacao necessaria para prosseguir.

## Nao Fazer

- Nao automatizar captcha nem burlar MFA, bloqueios de automacao, permissoes ou controles de seguranca.
- Nao commitar `.env`, tokens, cookies, `storageState` real, videos, traces, screenshots ou relatorios com dados sensiveis.
- Nao criar sleeps arbitrarios com `waitForTimeout` sem justificativa.
- Nao inventar regra de negocio, mensagem, permissao ou massa de dados.
- Nao depender de seletores frageis quando houver alternativa semantica.
- Nao executar acoes destrutivas em ambiente real sem confirmacao explicita.
- Nao ocultar falhas funcionais como se fossem apenas problemas de seletor.

## README

Garantir que o `README.md` contenha:

- objetivo da automacao;
- aplicacao testada;
- URL base;
- ambiente;
- caminho funcional;
- fluxo coberto;
- evidencias da exploracao com Playwright MCP;
- massa externa necessaria;
- dados dinamicos gerados;
- pre-requisitos;
- como instalar dependencias;
- como configurar variaveis de ambiente;
- como executar em modo normal;
- como executar em modo headed;
- como executar em modo UI;
- como abrir relatorio;
- como visualizar traces;
- limitacoes ou bloqueios encontrados;
- pendencias funcionais, se existirem.

## Criterios De Pronto

Considerar a automacao pronta somente quando:

- o fluxo principal estiver implementado em teste E2E legivel;
- os Page Objects representarem acoes funcionais;
- os dados sensiveis estiverem fora do codigo e representados no `.env.example`;
- o `.gitignore` proteger `.env`, relatorios, traces, screenshots, videos e dependencias geradas;
- o `README.md` explicar instalacao, configuracao, execucao, evidencias, limitacoes e pendencias;
- as validacoes funcionais cobrirem o resultado esperado do fluxo;
- a execucao do teste tiver sido realizada ou, se nao for possivel, o motivo estiver documentado como bloqueio.

## Resumo Final

Ao final de cada execucao da skill, responder com:

```text
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes implementadas:
Como executar:
Evidencias geradas:
Execucao realizada:
Resultado dos testes:
Pendencias:
Bloqueios encontrados:
```
