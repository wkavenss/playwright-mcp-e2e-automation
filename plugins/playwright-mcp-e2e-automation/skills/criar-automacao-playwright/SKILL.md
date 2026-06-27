---
name: criar-automacao-playwright
description: Criar uma nova automacao Playwright E2E ou ampliar um fluxo existente a partir de URL, usuario, senha e passo a passo. Use para transformar um procedimento web em codigo Playwright com Page Objects, .env, Playwright MCP e validacao funcional em Chromium headed, mesmo quando o usuario nao pedir explicitamente para gerar codigo. Nao usar para apenas corrigir falha, revisar codigo ou somente configurar o projeto.
---

# Criar Automacao Playwright

Criar ou atualizar automacoes E2E com Playwright Test, JavaScript e Playwright MCP. Sempre implementar codigo Playwright, sem perguntar se o usuario quer gerar codigo. Se o usuario informar URL, usuario, senha e passo a passo, interpretar que o trabalho e navegar, entender o fluxo e entregar codigo Playwright. Por padrao, validar em Chromium headed.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a criacao.

O plugin inclui configuracao de Playwright MCP em `.mcp.json`; usar esse servidor quando estiver disponivel. Em primeira execucao, o MCP pode exigir rede para baixar `@playwright/mcp@latest` via `npx`.

## Contrato Minimo

Antes de agir, exigir apenas:

- URL base;
- usuario;
- senha;
- passo a passo.

Se faltar algo, interromper e responder em uma linha: `Faltam: ...`. Nao criar projeto, instalar dependencias, explorar tela nem executar teste ate receber esses dados.

Dados opcionais: ambiente, objetivo, caminho, acao final, massa, validacoes, evidencias e restricoes.

Quando houver credenciais no chat, gravar em `.env`, proteger no `.gitignore`, criar `.env.example` seguro e usar `process.env`. Nunca repetir segredos no codigo, README, logs ou resposta final.

## Padroes

- Implementar codigo Playwright: obrigatorio sempre, sem perguntar ao usuario.
- Mesmo que o usuario apenas descreva o fluxo, gerar a automacao Playwright quando houver contrato minimo.
- Nao encerrar com apenas navegacao, diagnostico, relato de tela ou instrucoes manuais.
- So nao gerar codigo se faltar dado minimo, houver bloqueio de escrita/tecnico ou o usuario disser explicitamente que nao quer codigo.
- Execucao no navegador: assumir Chromium `headed` quando nao informado.
- Trabalho: sempre rapido, com baixo consumo de tokens.
- Evidencias: assumir `minimo` quando nao informado.
- Campos obrigatorios: descobrir na tela; quando houver estrela azul e legenda, tratar esses campos como obrigatorios.
- Projeto existente: preservar estrutura e padroes locais.
- Projeto novo: criar somente estrutura minima necessaria.
- Page Objects: usar por padrao para toda implementacao Playwright; a spec deve orquestrar o fluxo e nao concentrar seletores/interacoes.
- Estrutura: usar `tests/e2e`, `tests/pages`, `tests/fixtures`, `tests/data` e `tests/utils` somente quando fizer sentido; nao criar arquivos vazios desnecessarios.

## Saida Obrigatoria

A entrega principal sempre e codigo Playwright no workspace: spec, Page Objects e suporte minimo de `.env`/config quando necessario. Navegar pela aplicacao com Playwright MCP e apenas descoberta ou validacao; nunca encerrar entregando somente navegacao, diagnostico ou relato de telas.

Se nao conseguir criar ou alterar arquivos, declarar bloqueio de escrita. Nao substituir a automacao por execucao manual no navegador.

## Escopo Rigido

Seguir somente a URL, credenciais e passo a passo informados pelo usuario. Nao abrir casos de uso vizinhos, menus parecidos, telas alternativas ou funcionalidades nao citadas. Se o caminho informado nao aparecer, parar no ponto exato, relatar o item ausente e manter o codigo estruturado ate onde foi possivel.

Quando o usuario pedir para preencher campos com dados aleatorios, gerar massa de teste rastreavel e preencher apenas os campos exigidos pela tela ou necessarios para concluir o passo solicitado.

## Inferencia Controlada

O usuario normalmente informa apenas os dados principais do fluxo. Usar Playwright MCP para descobrir campos obrigatorios secundarios e preencher valores neutros e validos quando eles nao alterarem a regra testada.

Pedir informacao somente quando o dado obrigatorio impactar diretamente objetivo, resultado esperado, perfil, status, tipo, modalidade, permissao, periodo ou regra de negocio. Nao inventar regras nem escolher automaticamente uma opcao que mude o comportamento do cenario.

Registrar no resumo, de forma curta, quais dados obrigatorios foram inferidos.

## Execucao Rapida

Usar sempre o caminho mais curto que preserve boas praticas:

- caminho principal informado pelo usuario;
- Page Objects minimos para telas ou areas tocadas;
- seletores mapeados sob demanda;
- uma validacao funcional forte;
- uma tentativa objetiva de correcao por falha;
- resumo curto.

Nao explorar menus, telas ou campos fora do passo a passo, salvo para desbloquear o fluxo ou entender uma falha.

## Evidencias

- `minimo` (padrao): sem README, trace, screenshot, video ou diagnostico detalhado. Usar `trace: 'off'`, `screenshot: 'off'` e `video: 'off'`.
- `falha`: gerar artefatos somente em falha ou quando forem indispensaveis para explicar bloqueio.
- `completo`: gerar README, traces, screenshots/videos quando util e diagnostico detalhado; usar somente quando o usuario pedir.

Mesmo em `minimo`, o terminal pode emitir saida. Nao copiar logs longos; resumir resultado, erro principal e proximo passo.

## Fluxo Principal

1. Validar contrato minimo.
2. Identificar execucao no navegador e nivel de evidencias.
3. Detectar se ja existe Playwright no repositorio antes de instalar ou criar arquivos. Se nao existir, executar diretamente `../../scripts/scaffold-playwright.mjs <raiz-do-projeto>` a partir desta skill.
4. Explorar com Playwright MCP somente o caminho necessario, com uma leitura por tela e sem inventario completo.
5. Mapear sob demanda apenas campos/acoes do proximo passo e uma validacao funcional.
6. Implementar ou atualizar spec, Page Objects, dados, fixtures e utilitarios na menor superficie possivel.
7. Configurar `.env`, `.env.example`, `.gitignore`, scripts e Playwright apenas quando necessario.
8. Executar validacao final em Chromium headed, salvo pedido contrario.
9. Corrigir uma falha objetiva quando houver causa clara; se exigir investigacao ampla, resumir bloqueio e pedir direcionamento.
10. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto> --changed` a partir desta skill. Auditar somente arquivos modificados e corrigir erros dentro do escopo solicitado.
11. Responder com resumo compacto.

## Regras Essenciais

- Usar Playwright MCP antes de codar ou alterar teste.
- Nao assumir nomes de menus, botoes, campos, mensagens ou fluxos sem observar a interface.
- Priorizar: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` escopado, `getByTestId`, CSS semantico relativo e XPath so em ultimo caso.
- Nao mapear todos os campos/botoes; escolher o menor conjunto para executar o passo atual e validar o resultado.
- Em tabelas, localizar a linha por texto unico e so entao a acao dentro da linha.
- Manter seletores e interacoes dentro de Page Objects; specs devem conter passos funcionais, dados e assertions de alto nivel.
- Validar resultado funcional: mensagem, registro, detalhe persistido, estado final, download, protocolo ou bloqueio esperado.
- Evitar `waitForTimeout`; preferir waits automaticos e assertions do Playwright.
- Pedir autorizacao para rede, instalacao, navegador, credenciais, escrita sensivel, ambiente externo ou sandbox.
- Nao gerar README, traces, screenshots, videos ou diagnostico detalhado por padrao; usar o nivel de evidencias solicitado.
- Nao automatizar captcha, burlar MFA, commitar segredos, usar dados reais sensiveis ou executar acao destrutiva em ambiente real sem confirmacao explicita.
- Em falha, classificar causa principal antes de responder: seletor, navegacao, autenticacao, massa, permissao, regra funcional, ambiente, captcha/MFA ou sincronizacao.

## Codigo E Boas Praticas

Codigo Playwright so fica pronto com Page Objects para telas ou areas tocadas. Excecao: projeto existente com arquitetura diferente; preservar o padrao local e justificar.

Evitar seletores, cliques e fills na spec. A spec conta a historia; Page Objects expõem metodos como `realizarLogin`, `preencherDadosObrigatorios`, `submeterFluxo` e `validarResultado`.

Em fluxos simples, criar Page Objects minimos e evoluir somente em falha ou duplicacao real.

A spec deve conter cenario, passos principais, validacoes e chamadas para Page Objects/helpers. Usar `test.step` em fluxos medios ou longos. Nomear testes no padrao `deve [comportamento esperado] quando [condicao]`.

Evitar codigo com aparencia de gravacao linear de cliques. Manter funcoes pequenas, nomes claros, pouca duplicacao e comentarios apenas para decisoes importantes, seletores frageis ou suposicoes relevantes.

## Referencias Sob Demanda

Carregar estes arquivos apenas quando necessario:

- `references/exploracao-mcp.md`: carregar quando a tela for complexa ou quando a exploracao inicial nao bastar.
- `references/seletores-page-objects.md`: carregar somente ao refatorar muitos Page Objects, lidar com tabelas/listagens complexas ou apos falha por seletor fragil.
- `references/configuracao-playwright.md`: carregar para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias e templates.
- `references/diagnostico-e-evidencias.md`: carregar em falhas, bloqueios, ambientes instaveis ou quando precisar de diagnostico detalhado.

Nao carregar referencias se o fluxo puder ser implementado com o nucleo acima.

## Saida E Documentacao

Com `evidencias: minimo`, responder curto e nao criar/atualizar README. Com `evidencias: falha`, documentar somente limitacoes necessarias. Com `evidencias: completo`, usar `references/configuracao-playwright.md` e `references/diagnostico-e-evidencias.md` para README e evidencias completas.

Resumo final padrao:

```text
Codigo Playwright implementado: Sim
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes:
Dados principais:
Dados obrigatorios inferidos:
Como executar:
Execucao realizada:
Modo de execucao:
Evidencias:
Resultado:
Pendencias/Bloqueios:
```
