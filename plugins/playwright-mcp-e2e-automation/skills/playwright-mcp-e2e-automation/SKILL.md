---
name: playwright-mcp-e2e-automation
description: Use esta skill para criar ou atualizar automações de testes E2E em sistemas web acadêmicos, administrativos, institucionais, legados ou customizados, com Playwright, JavaScript e Playwright MCP. Use quando o usuário pedir para automatizar fluxo web, criar projeto Playwright do zero, validar fluxo funcional em navegador, transformar passo a passo manual em teste automatizado, estruturar testes com Page Objects, usar Playwright MCP, melhorar ou corrigir automação Playwright existente, a partir de URL, perfil/vínculo/portal/módulo, objetivo do teste, dados obrigatórios e validações esperadas.
---

# Automação E2E em Sistemas Web Institucionais com Playwright MCP

Criar ou atualizar automações de testes E2E para sistemas web acadêmicos, administrativos, institucionais, legados ou customizados usando Playwright Test, JavaScript e Playwright MCP. Considerar sistemas com arquitetura modular, portais por perfil, vínculos, unidades, menus, permissões, formulários em etapas, consultas e listagens com ações por linha.

Usar esta skill quando o usuário pedir para criar automação E2E com Playwright, criar projeto Playwright do zero, automatizar fluxo web institucional, validar fluxo funcional em navegador, criar testes usando Playwright MCP, transformar passo a passo manual em teste automatizado, estruturar testes com Page Objects ou melhorar/corrigir automação Playwright existente.

## Escopo De Escrita

Criar e alterar arquivos sempre no workspace ou repositório ativo do usuário. Nunca criar projetos, testes, dependências, documentação ou arquivos de automação dentro da pasta global da skill, como `~/.agents/skills/playwright-mcp-e2e-automation`, salvo se o usuário pedir explicitamente para editar a própria skill.

## Entrada Esperada

Aceitar os dados disponíveis do fluxo, sem exigir que todos estejam presentes:

- sistema alvo;
- URL base;
- ambiente;
- perfil de acesso;
- vínculo esperado após login;
- portal esperado;
- módulo;
- objetivo do teste;
- caminho de menu conhecido;
- ação final permitida;
- massa externa obrigatória;
- variáveis de ambiente;
- passo a passo real das telas;
- dados obrigatórios;
- validações esperadas;
- observações ou restrições do ambiente.

Quando uma informação não for fornecida, usar Playwright MCP para explorar a interface e identificar o que for possível. Quando uma regra funcional não puder ser inferida pela tela, registrar como pendência, sem inventar regra de negócio.

Sempre que possível, obter do usuário sistema alvo, ambiente, URL base, perfil, vínculo esperado, portal, módulo, caminho de menu, ação final permitida, dados obrigatórios, massa externa e validações esperadas. Essas informações reduzem o risco de selecionar vínculo incorreto, acessar portal errado, usar módulo indevido, submeter ação final não desejada ou preencher dados inválidos.

## Modelo Para Chamadas Futuras

Usar este modelo apenas como referência para o usuário informar um fluxo:

```text
Use a skill playwright-mcp-e2e-automation.

Sistema:
URL base:
Ambiente:
Perfil de acesso:
Vínculo esperado após login:
Portal esperado:
Módulo:
Objetivo do teste:
Caminho de menu conhecido:
Ação final permitida:
Massa externa obrigatória:

Variáveis de ambiente:
-

Passo a passo real das telas:
1.
2.
3.

Dados obrigatórios:
-

Validações esperadas:
-

Observações:
-
```

## Fluxo De Trabalho

1. Ler os dados informados pelo usuário.
2. Identificar o objetivo funcional do teste.
3. Verificar se já existe projeto Playwright no repositório.
4. Criar ou ajustar a estrutura do projeto.
5. Configurar JavaScript, Playwright Test e variáveis de ambiente.
6. Usar Playwright MCP para explorar o sistema antes de implementar ou alterar testes.
7. Confirmar menus, telas, campos, botões, mensagens e caminhos reais pela interface.
8. Mapear as telas em Page Objects.
9. Criar ou atualizar dados de teste separados do fluxo.
10. Implementar o teste E2E principal.
11. Adicionar validações funcionais.
12. Executar o teste quando o ambiente permitir.
13. Corrigir falhas possíveis de seletor, navegação, sincronização ou validação.
14. Atualizar a documentação.
15. Responder ao final com o resumo padronizado.

## Exploração Com Playwright MCP

Antes de implementar ou alterar testes, registrar evidências mínimas da exploração:

- URL acessada e ambiente usado;
- telas, menus e rotas visitadas;
- campos, botões, links, mensagens e estados reais confirmados;
- seletores semânticos candidatos e motivo da escolha;
- validações funcionais observáveis;
- bloqueios, permissões ausentes, captcha, MFA, instabilidade ou massa indisponível.

## Conhecimento Específico De Portais Institucionais

- Confirmar no ambiente real o sistema acessado, portal atual, módulo atual, perfil ativo, vínculo selecionado, unidade selecionada, caminho real do menu, tela inicial do fluxo e permissões disponíveis.
- Não assumir que todos os ambientes possuem os mesmos módulos, nomes de menu, permissões ou comportamentos. O mesmo fluxo pode variar conforme instituição, sistema, versão, customização, perfil, vínculo, unidade, período vigente ou parametrização.
- Em fluxos acadêmicos, considerar domínios como ensino, pesquisa, extensão, turmas, discentes, docentes, projetos, matrículas e atividades acadêmicas.
- Em fluxos administrativos, considerar domínios como patrimônio, contratos, requisições, almoxarifado, protocolo, compras, orçamento e processos administrativos.
- Em fluxos de gestão de pessoas, considerar domínios como férias, dados funcionais, frequência, capacitação, avaliação, dimensionamento, consultas e processos de RH.
- Em fluxos técnicos ou de administração do sistema, considerar permissões, comunicação, parâmetros, configuração, perfis e regras de acesso.
- Para qualquer sistema, seguir a interface real observada com Playwright MCP, sem transportar nomes fixos de menu, módulo ou regra de outro sistema.

## Login, Vínculos, Perfis E Portais

- Não assumir que o login sempre termina na mesma tela. Após autenticar, verificar se há seleção de vínculo, perfil, unidade, papel, sistema, portal ou módulo.
- Quando houver mais de um vínculo, selecionar o vínculo informado pelo usuário. Se houver apenas uma opção, selecionar essa opção. Se houver múltiplas opções e o usuário não indicar qual usar, registrar pendência em vez de escolher aleatoriamente.
- Após selecionar vínculo, validar que o portal, módulo ou sistema esperado foi carregado.
- Validar explicitamente o perfil correto antes de iniciar fluxo dependente de perfil.
- Se aparecer painel de módulos ou seleção de sistema, acessar o sistema, módulo ou portal indicado no passo a passo do usuário.
- Não acessar URLs internas diretamente como primeira opção. Preferir navegação pela interface, menus e módulos, salvo quando o fluxo exigir uma URL específica.
- Portais comuns podem incluir Portal do Docente, Portal do Discente, Portal do Servidor, Portal Administrativo, Portal da Chefia, Portal do Coordenador, Portal Público, Portal de Módulos e Portal de Administração.

## Navegação, Menus E Telas

- Sistemas institucionais podem organizar funcionalidades por menus superiores, menus laterais, painéis de módulo, submenus, breadcrumbs, páginas de consulta, formulários em etapas e listagens com ações por linha.
- Não assumir caminhos como `Pesquisa > Projetos`, `Requisições > Material` ou `Férias > Solicitação` sem validar no ambiente.
- Quando houver menu com hover, usar interação apropriada do Playwright para exibir o submenu antes do clique.
- Validar cada mudança de tela por título, cabeçalho, breadcrumb, texto principal, formulário, campos ou tabela esperada.
- Se o menu esperado não aparecer, verificar sistema acessado, portal atual, vínculo, perfil, módulo, unidade, permissão, período, edital ou parametrização antes de registrar bloqueio.
- Não contornar ausência de permissão usando URL direta.

## Formulários, Campos E Etapas

- Mapear labels, inputs, textareas, selects, combos, radios, checkboxes, campos de data, campos de busca e mensagens de validação.
- Campos obrigatórios podem ser indicados por estrela azul, asterisco, legenda visual, mensagem de validação ou regra de tela. Não depender apenas do atributo HTML `required`.
- Quando apropriado, submeter formulário incompleto durante exploração para observar mensagens de validação e descobrir obrigatoriedades.
- Não preencher aleatoriamente campos funcionais sensíveis, como unidade, curso, servidor, discente, docente, processo, contrato, projeto, edital, centro de custo, material, setor ou grupo.
- Diferenciar ações intermediárias de ações finais, como salvar rascunho, gravar parcialmente, enviar, submeter, confirmar definitivamente, cancelar ou excluir.
- Não clicar em ações finais como `Enviar`, `Submeter`, `Finalizar`, `Excluir` ou `Cancelar` se isso não estiver explicitamente no objetivo do teste ou na ação final permitida.
- Antes de confirmação final, validar que a tela de revisão apresenta os principais dados preenchidos. Após cada etapa, validar que o sistema avançou para a tela correta.

## Mensagens, Tabelas E Registros

- Procurar mensagens de sucesso, erro e alerta após cada submissão relevante. Registrar a mensagem exata quando houver regra de negócio não atendida, usuário sem permissão, vínculo inválido, perfil sem autorização, sessão expirada ou período indisponível.
- Em tabelas/listagens, localizar primeiro a linha pelo texto único do registro e depois clicar no ícone, link ou botão dentro da mesma linha.
- Não clicar no primeiro ícone da página sem associar a ação ao registro correto.
- Quando ícones tiverem `alt`, `title`, `aria-label` ou texto acessível, usar esses atributos. Se não houver nome acessível, usar seletor relativo à linha da tabela e justificar no código.
- Quando houver paginação, filtro ou busca, usar o mecanismo de consulta da tela para encontrar o registro criado.
- Validar que o registro encontrado corresponde exatamente ao dado da execução atual.

## Dados, Datas E Massa Institucional

- Para cadastros, gerar dados únicos com prefixo rastreável, como `AUTOMACAO_E2E`, `TESTE_QA` ou `PLAYWRIGHT_MCP`, combinado com timestamp.
- Não usar dados reais sensíveis em massa de teste, incluindo CPF, matrícula, e-mail pessoal, telefone, documento, número de processo real ou dados financeiros reais.
- Quando o fluxo exigir massa externa, como discente, docente, servidor, unidade, processo, contrato, edital, curso, setor, material, projeto ou autorização, preferir dados informados pelo usuário.
- Considerar formatos brasileiros, especialmente datas em `DD/MM/AAAA`, e validar o formato aceito pela tela antes de preencher.
- Para períodos, cronogramas, vigências, solicitações, afastamentos, férias, contratos ou projetos, garantir que as datas façam sentido para a regra da tela.
- Não usar datas vencidas ou fora do período permitido sem validação prévia.
- Para campos longos, usar textos neutros e rastreáveis. Para editor rico, validar se o preenchimento exige interação especial.

## Sessão E Comunicados

- Detectar redirecionamento inesperado para login e registrar como falha de ambiente, sincronização ou autenticação, conforme o caso.
- Usar fixture de login reutilizável quando houver login.
- Validar usuário logado, perfil ativo, vínculo ou unidade quando a tela exibir essa informação.
- Realizar logout ao final apenas se isso não prejudicar a coleta de evidências.
- Se houver aviso de sessão, pop-up, mensagem institucional ou comunicado, tratar de forma controlada e documentar.

## Regras Obrigatórias

- Usar Playwright MCP para explorar as telas antes de implementar ou alterar testes.
- Não assumir nomes de menus, botões, campos, mensagens ou fluxos sem validar na interface.
- Não hardcodear usuário, senha, token, CPF, e-mail, matrícula ou qualquer dado sensível.
- Usar variáveis de ambiente para URL, credenciais e configurações sensíveis.
- Priorizar seletores estáveis e semânticos: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByTestId` quando existir, ou seletores semânticos equivalentes.
- Priorizar roles e nomes acessíveis reais. Quando a interface não expuser seletores estáveis, registrar a limitação e sugerir melhoria como `data-testid` estável ao time do sistema.
- Evitar XPath absoluto, CSS frágil, classes geradas automaticamente ou seletores dependentes de layout.
- Usar XPath ou CSS frágil somente em último caso e justificar no código.
- Usar Page Object Model ou estrutura equivalente bem organizada.
- Separar testes, páginas, fixtures, dados e utilitários.
- Criar dados únicos quando houver cadastro, usando timestamp ou identificador dinâmico.
- Validar resultado funcional, não apenas cliques ou navegação.
- Validar mensagens de sucesso, registros em listagem, vínculos, status, redirecionamentos, dados persistidos ou outro indício confiável.
- Evitar `waitForTimeout`, salvo em último caso justificado.
- Usar os waits automáticos do Playwright sempre que possível.
- Registrar bloqueios como captcha, MFA, ambiente indisponível, usuário sem permissão, perfil incorreto, instabilidade, regra de negócio ambígua ou ausência de massa de dados.
- Criar ou atualizar `README.md` com instruções de instalação, configuração, execução e limitações.
- Criar ou atualizar `.env.example`.
- Criar ou atualizar `.gitignore`.
- Criar ou atualizar scripts úteis no `package.json`.
- Antes de instalar dependências, alterar configuração do projeto ou executar testes, verificar o gerenciador de pacotes e os padrões já usados no repositório. Detectar `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package.json` e scripts existentes antes de escolher comandos.
- Quando a ação exigir rede, instalação de pacotes, credenciais, acesso a ambiente externo ou aprovação do sandbox, solicitar autorização de forma explícita.
- Garantir que arquivos reais de segredo, como `.env`, fiquem no `.gitignore`; versionar apenas exemplos seguros, como `.env.example`.
- Para fluxos com login pesado, usar `storageState` somente quando permitido pelo ambiente e sem versionar estado autenticado, tokens, cookies ou credenciais reais.
- Para fluxos destrutivos, como exclusão, cancelamento, envio definitivo ou alteração irreversível, preferir ambiente de homologação, usar dados únicos e pedir confirmação quando houver risco de impacto real.
- Em produção, evitar criação, alteração, submissão, exclusão, homologação ou aprovação de dados reais. Se o fluxo for destrutivo ou irreversível, interromper antes da ação final e registrar orientação, salvo autorização explícita do usuário.
- Executar o teste ao final quando o ambiente permitir e corrigir falhas possíveis.

## Projeto Novo Ou Existente

- Em projeto novo, criar a estrutura mínima completa com Playwright Test, JavaScript, Page Objects, dados, fixtures, utilitários, `README.md`, `.env.example`, `.gitignore`, `package.json` e `playwright.config.js`.
- Em projeto existente, preservar padrões já usados, reaproveitar configuração, scripts, fixtures, helpers e convenções locais. Evitar reestruturações amplas ou renomeações que não sejam necessárias para automatizar o fluxo pedido.
- Se houver testes Playwright existentes, seguir o estilo de imports, nomes, organização de diretórios, fixtures e comandos já adotados.

## Estrutura Recomendada

Para projeto novo, usar uma estrutura semelhante a esta, ajustando nomes conforme o sistema e o fluxo:

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
- utilitários em `utils`.

## Padrão De Nomes

- Usar kebab-case para specs, massas e arquivos utilitários, como `fluxo-principal.spec.js`, `cadastro-completo.data.js` e `unique-id.js`.
- Usar PascalCase para Page Objects, como `LoginPage.js`, `HomePage.js` e `CadastroPage.js`.
- Nomear testes com descrições funcionais em português quando o projeto não tiver outro padrão estabelecido.
- Em projeto existente, seguir o padrão local mesmo que ele seja diferente.

## Configuração Mínima

Configurar `package.json` com, no mínimo:

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

Configurar `playwright.config.js` em JavaScript com evidências úteis em falha:

- `trace: 'on-first-retry'`;
- `screenshot: 'only-on-failure'`;
- `video: 'retain-on-failure'`;
- reporter HTML.

Relatar no `README.md` e no resumo final onde consultar relatório HTML, traces, screenshots e vídeos gerados em falhas.

Criar `.env.example` com nomes genéricos e ajustáveis ao sistema informado:

```text
BASE_URL=
E2E_USER=
E2E_PASSWORD=
```

Se o usuário informar nomes específicos de variáveis de ambiente, usar os nomes informados.

## Organização Do Código

Fazer o teste principal contar a história do fluxo de negócio de forma legível para QA:

```javascript
test('deve criar um cadastro completo com sucesso', async ({ page }) => {
  await loginPage.realizarLogin();
  await homePage.acessarModulo();
  await cadastroPage.preencherDadosObrigatorios();
  await cadastroPage.submeterCadastro();
  await cadastroPage.validarCadastroRealizado();
});
```

Fazer os métodos dos Page Objects representarem ações de negócio, não cliques genéricos.

Bons exemplos:

- `realizarLogin()`;
- `selecionarSistema()`;
- `selecionarVinculo()`;
- `acessarPortal()`;
- `acessarModulo()`;
- `acessarFuncionalidade()`;
- `acessarCadastro()`;
- `preencherDadosObrigatorios()`;
- `avancarEtapa()`;
- `confirmarOperacao()`;
- `submeterCadastro()`;
- `validarCadastroRealizado()`;
- `vincularRegistroCriado()`;
- `consultarRegistroCriado()`;
- `validarMensagemSucesso()`;
- `validarRegistroNaListagem()`;
- `validarStatus()`;
- `sairDoSistema()`.

Evitar nomes como:

- `clickButton1()`;
- `fillInput2()`;
- `goNext()`;
- `clicarAqui()`;
- `preencherCampo()`.

Separar responsabilidades:

- test spec: orquestrar o cenário;
- Page Object: interagir com a tela;
- data: guardar massas de teste;
- fixtures: preparar recursos reutilizáveis;
- utils: gerar dados únicos, datas e helpers.

Em manutenções futuras, corrigir preferencialmente Page Objects, dados, fixtures ou utilitários compartilhados antes de duplicar lógica diretamente no spec. Criar novos helpers somente quando reduzirem duplicação real ou deixarem o fluxo mais claro.

## Dados, Login E Perfis

- Manter dados de teste separados da lógica do teste.
- Criar identificadores dinâmicos quando possível, como título com timestamp, nome com sufixo único, descrição com identificador da execução ou e-mail fake único quando aplicável e permitido.
- Evitar dependência de dados criados manualmente quando for possível criar ou localizar esses dados durante a execução.
- Documentar no `README.md` qualquer dependência de massa externa.
- Quando o fluxo exigir login, usar variáveis de ambiente para credenciais.
- Quando o sistema tiver múltiplos perfis, vínculos, unidades ou papéis após o login, selecionar o perfil informado pelo usuário ou registrar pendência caso não seja possível identificar o perfil correto.

## Bloqueios E Limites

Se houver captcha, MFA, bloqueio de automação, indisponibilidade do ambiente, permissão insuficiente, perfil incorreto ou regra de negócio ambígua, não inventar alternativa insegura. Registrar o bloqueio e estruturar a automação até o ponto possível.

Quando houver bloqueio no sistema alvo, registrar tela onde ocorreu, mensagem exibida, perfil/vínculo ativo, ação tentada, evidência gerada pelo Playwright, possível causa e informação necessária para prosseguir.

## Não Fazer

- Não automatizar captcha nem burlar MFA, bloqueios de automação, permissões ou controles de segurança.
- Não commitar `.env`, tokens, cookies, `storageState` real, vídeos, traces, screenshots ou relatórios com dados sensíveis.
- Não criar sleeps arbitrários com `waitForTimeout` sem justificativa.
- Não inventar regra de negócio, mensagem, perfil, vínculo, permissão ou massa de dados.
- Não depender de seletores frágeis quando houver alternativa semântica.
- Não executar ações destrutivas em ambiente real sem confirmação explícita.
- Não ocultar falhas funcionais como se fossem apenas problemas de seletor.

## README

Garantir que o `README.md` contenha:

- objetivo da automação;
- sistema web testado;
- URL base;
- ambiente;
- perfil utilizado;
- vínculo selecionado;
- portal/módulo utilizado;
- caminho de menu;
- fluxo coberto;
- evidências da exploração com Playwright MCP;
- massa externa necessária;
- dados dinâmicos gerados;
- pré-requisitos;
- como instalar dependências;
- como configurar variáveis de ambiente;
- como executar em modo normal;
- como executar em modo headed;
- como executar em modo UI;
- como abrir relatório;
- como visualizar traces;
- limitações ou bloqueios encontrados;
- pendências funcionais, se existirem.

## Critérios De Pronto

Considerar a automação pronta somente quando:

- o fluxo principal estiver implementado em teste E2E legível para QA;
- os Page Objects representarem ações de negócio;
- os dados sensíveis estiverem fora do código e representados no `.env.example`;
- o `.gitignore` proteger `.env`, relatórios, traces, screenshots, vídeos e dependências geradas;
- o `README.md` explicar instalação, configuração, execução, evidências, limitações e pendências;
- as validações funcionais cobrirem o resultado esperado do fluxo;
- a execução do teste tiver sido realizada ou, se não for possível, o motivo estiver documentado como bloqueio.

## Resumo Final

Ao final de cada execução da skill, responder com:

```text
Arquivos criados/alterados:
Fluxo automatizado:
Validações implementadas:
Como executar:
Evidências geradas:
Execução realizada:
Resultado dos testes:
Pendências:
Bloqueios encontrados:
```
