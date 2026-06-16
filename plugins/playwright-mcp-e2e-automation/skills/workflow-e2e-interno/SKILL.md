---
name: workflow-e2e-interno
description: Workflow interno do plugin para criar ou atualizar automacoes Playwright E2E em aplicacoes web. Use quando o plugin for acionado para automatizar fluxo web, validar fluxo funcional em navegador, transformar passo a passo manual em teste, estruturar testes com Page Objects, melhorar ou corrigir automacao existente a partir de URL, credenciais, passo a passo e validacoes esperadas.
---

# Automacao E2E com Playwright MCP

Criar ou atualizar automacoes E2E com Playwright Test, JavaScript e Playwright MCP. Por padrao, implementar codigo Playwright e executar validacao em Chromium headed. So usar modo sem codigo quando o usuario pedir explicitamente diagnostico/execucao sem implementar.

## Contrato Minimo

Antes de agir, exigir apenas:

- URL base;
- usuario;
- senha;
- passo a passo.

Se faltar algo, interromper e responder em uma linha: `Faltam: ...`. Nao criar projeto, instalar dependencias, explorar tela nem executar teste ate receber esses dados.

Dados opcionais: ambiente, objetivo, caminho conhecido, acao final permitida, massa externa, validacoes esperadas, modo de execucao (`headed`, `headless`, `ui`), modo de trabalho (`rapido`, `padrao`, `profundo`), evidencias (`minimo`, `falha`, `completo`) e restricoes.

Quando o usuario informar credenciais no chat, gravar em `.env` local, proteger `.env` no `.gitignore`, criar `.env.example` seguro e usar apenas `process.env` no codigo. Nunca repetir segredos no codigo, README, logs ou resposta final.

## Padroes

- Implementar codigo Playwright: assumir `Sim` quando nao informado.
- Modo de execucao: assumir Chromium `headed` quando nao informado.
- Modo de trabalho: assumir `padrao` quando nao informado.
- Evidencias: assumir `minimo` quando nao informado.
- Campos obrigatorios: descobrir na tela; quando houver estrela azul e legenda, tratar esses campos como obrigatorios.
- Projeto existente: preservar estrutura, scripts, fixtures, helpers e padroes locais.
- Projeto novo: criar somente estrutura minima necessaria.
- Page Objects: usar por padrao para toda implementacao Playwright; a spec deve orquestrar o fluxo e nao concentrar seletores/interacoes.
- Fluxo simples: aceitar `modo rapido` para reduzir exploracao, correcao, documentacao e evidencias.

## Modos De Trabalho

- `rapido`: seguir caminho principal, Page Objects minimos, 1 validacao funcional, 1 ciclo de correcao, resumo curto.
- `padrao`: explorar apenas telas do passo a passo, reaproveitar mapa de telas, Page Objects suficientes, executar uma vez em headed e fazer ate 2 ciclos de correcao.
- `profundo`: carregar referencias detalhadas, mapear formularios/modais/abas com mais rigor, ampliar evidencias, atualizar README completo e sugerir melhorias de acessibilidade quando util.

Nao explorar menus, telas ou campos fora do passo a passo, salvo para desbloquear o fluxo.

## Evidencias

- `minimo` (padrao): nao criar/atualizar README, trace, screenshot, video ou diagnostico detalhado. Usar `trace: 'off'`, `screenshot: 'off'` e `video: 'off'` quando configurar Playwright.
- `falha`: gerar artefatos somente em falha ou quando forem indispensaveis para explicar bloqueio.
- `completo`: gerar README, traces, screenshots/videos quando util e diagnostico detalhado; usar com modo `profundo` ou quando o usuario pedir.

Mesmo em `minimo`, a saida normal do terminal pode existir. Evitar copiar logs longos para a resposta; resumir apenas resultado, erro principal e proximo passo.

## Fluxo Principal

1. Validar contrato minimo.
2. Detectar se o usuario pediu explicitamente para nao implementar codigo.
3. Identificar modo de trabalho, modo de execucao e nivel de evidencias.
4. Detectar se ja existe Playwright no repositorio antes de instalar ou criar arquivos.
5. Explorar com Playwright MCP somente o caminho necessario.
6. Mapear para cada tela: identificacao da tela, campos obrigatorios, acao principal, mensagem/estado esperado e proxima acao.
7. Implementar ou atualizar spec, Page Objects, dados, fixtures e utilitarios na menor superficie possivel.
8. Configurar `.env`, `.env.example`, `.gitignore`, scripts e Playwright apenas quando necessario.
9. Executar validacao final em Chromium headed, salvo pedido contrario.
10. Corrigir falhas dentro do limite do modo de trabalho.
11. Responder com resumo compacto.

Se o usuario pedir explicitamente execucao sem codigo, usar Playwright MCP de forma interativa, nao alterar arquivos e informar isso no resumo.

## Regras Essenciais

- Usar Playwright MCP antes de codar ou alterar teste.
- Nao assumir nomes de menus, botoes, campos, mensagens ou fluxos sem observar a interface.
- Priorizar seletores: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` escopado, `getByTestId`, CSS semantico relativo e XPath so em ultimo caso.
- Em tabelas, localizar a linha por texto unico e so entao a acao dentro da linha.
- Manter seletores e interacoes dentro de Page Objects; specs devem conter passos funcionais, dados e assertions de alto nivel.
- Validar resultado funcional: mensagem, registro, detalhe persistido, estado final, download, protocolo ou bloqueio esperado.
- Evitar `waitForTimeout`; preferir waits automaticos e assertions do Playwright.
- Pedir autorizacao quando houver rede, instalacao, navegador, credenciais, escrita sensivel, ambiente externo ou sandbox.
- Nao gerar README, traces, screenshots, videos ou diagnostico detalhado por padrao; usar o nivel de evidencias solicitado.
- Nao automatizar captcha, burlar MFA, commitar segredos, usar dados reais sensiveis ou executar acao destrutiva em ambiente real sem confirmacao explicita.
- Em falha, classificar causa principal antes de responder: seletor, navegacao, autenticacao, massa, permissao, regra funcional, ambiente, captcha/MFA ou sincronizacao.

## Codigo E Boas Praticas

Quando implementar codigo Playwright, a automacao so esta pronta se usar Page Objects para telas ou areas funcionais tocadas pelo fluxo. Excecao: projeto existente com arquitetura diferente e padrao claro; nesse caso, preservar o padrao local e justificar no resumo.

Evitar seletores, cliques e preenchimentos diretamente na spec. A spec deve ficar legivel como historia do usuario; Page Objects devem ter metodos funcionais como `realizarLogin`, `acessarFuncionalidade`, `preencherDadosObrigatorios`, `submeterFluxo` e `validarResultado`.

## Referencias Sob Demanda

Carregar estes arquivos apenas quando necessario:

- `references/exploracao-mcp.md`: carregar no modo `profundo`, quando a tela for complexa ou quando a exploracao inicial nao bastar.
- `references/seletores-page-objects.md`: carregar ao criar/refatorar Page Objects, lidar com tabelas/listagens complexas ou seletores frageis.
- `references/configuracao-playwright.md`: carregar para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias e templates.
- `references/diagnostico-e-evidencias.md`: carregar em falhas, bloqueios, ambientes instaveis ou quando precisar de diagnostico detalhado.

No modo `rapido` ou `padrao`, nao carregar referencias se o fluxo puder ser implementado com o nucleo acima.

## Saida E Documentacao

No modo `rapido` ou com `evidencias: minimo`, responder curto e nao criar/atualizar README. No modo `padrao` com `evidencias: falha`, documentar somente limitacoes necessarias. No modo `profundo` ou com `evidencias: completo`, usar `references/configuracao-playwright.md` e `references/diagnostico-e-evidencias.md` para README e evidencias completas.

Resumo final padrao:

```text
Codigo Playwright implementado: Sim/Nao
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes:
Como executar:
Execucao realizada:
Modo de execucao:
Evidencias:
Resultado:
Pendencias/Bloqueios:
```
