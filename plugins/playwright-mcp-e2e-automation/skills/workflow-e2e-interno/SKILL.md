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

Dados opcionais: ambiente, objetivo, caminho conhecido, acao final permitida, massa externa, validacoes esperadas, modo de execucao (`headed`, `headless`, `ui`), modo de trabalho (`rapido`, `padrao`, `profundo`) e restricoes.

Quando o usuario informar credenciais no chat, gravar em `.env` local, proteger `.env` no `.gitignore`, criar `.env.example` seguro e usar apenas `process.env` no codigo. Nunca repetir segredos no codigo, README, logs ou resposta final.

## Padroes

- Implementar codigo Playwright: assumir `Sim` quando nao informado.
- Modo de execucao: assumir Chromium `headed` quando nao informado.
- Modo de trabalho: assumir `padrao` quando nao informado.
- Campos obrigatorios: descobrir na tela; quando houver estrela azul e legenda, tratar esses campos como obrigatorios.
- Projeto existente: preservar estrutura, scripts, fixtures, helpers e padroes locais.
- Projeto novo: criar somente estrutura minima necessaria.
- Fluxo simples: aceitar `modo rapido` para reduzir exploracao, correcao, documentacao e evidencias.

## Modos De Trabalho

- `rapido`: seguir caminho principal, Page Objects minimos, 1 validacao funcional, 1 ciclo de correcao, resumo curto.
- `padrao`: explorar apenas telas do passo a passo, reaproveitar mapa de telas, Page Objects suficientes, executar uma vez em headed, ate 2 ciclos de correcao, README minimo.
- `profundo`: carregar referencias detalhadas, mapear formularios/modais/abas com mais rigor, ampliar evidencias, atualizar README completo e sugerir melhorias de acessibilidade quando util.

Nao explorar menus, telas ou campos fora do passo a passo, salvo para desbloquear o fluxo.

## Fluxo Principal

1. Validar contrato minimo.
2. Detectar se o usuario pediu explicitamente para nao implementar codigo.
3. Identificar modo de trabalho e modo de execucao.
4. Detectar se ja existe Playwright no repositorio antes de instalar ou criar arquivos.
5. Explorar com Playwright MCP somente o caminho necessario.
6. Mapear para cada tela: identificacao da tela, campos obrigatorios, acao principal, mensagem/estado esperado e proxima acao.
7. Implementar ou atualizar teste, Page Objects, dados, fixtures e utilitarios na menor superficie possivel.
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
- Validar resultado funcional: mensagem, registro, detalhe persistido, estado final, download, protocolo ou bloqueio esperado.
- Evitar `waitForTimeout`; preferir waits automaticos e assertions do Playwright.
- Pedir autorizacao quando houver rede, instalacao, navegador, credenciais, escrita sensivel, ambiente externo ou sandbox.
- No modo `padrao`, gerar evidencia apenas de sucesso final ou falha; traces, videos e diagnostico detalhado ficam para falha ou modo `profundo`.
- Nao automatizar captcha, burlar MFA, commitar segredos, usar dados reais sensiveis ou executar acao destrutiva em ambiente real sem confirmacao explicita.
- Em falha, classificar causa principal antes de responder: seletor, navegacao, autenticacao, massa, permissao, regra funcional, ambiente, captcha/MFA ou sincronizacao.

## Referencias Sob Demanda

Carregar estes arquivos apenas quando necessario:

- `references/exploracao-mcp.md`: carregar no modo `profundo`, quando a tela for complexa ou quando a exploracao inicial nao bastar.
- `references/seletores-page-objects.md`: carregar ao criar/refatorar muitos Page Objects, lidar com tabelas/listagens complexas ou seletores frageis.
- `references/configuracao-playwright.md`: carregar para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias e templates.
- `references/diagnostico-e-evidencias.md`: carregar em falhas, bloqueios, ambientes instaveis ou quando precisar de diagnostico detalhado.

No modo `rapido` ou `padrao`, nao carregar referencias se o fluxo puder ser implementado com o nucleo acima.

## Saida E Documentacao

No modo `rapido`, responder curto e documentar apenas pendencias importantes. No modo `padrao`, manter README minimo com objetivo, variaveis, comandos, validacoes e limitacoes. No modo `profundo`, usar `references/configuracao-playwright.md` e `references/diagnostico-e-evidencias.md` para README e evidencias completas.

Resumo final padrao:

```text
Codigo Playwright implementado: Sim/Nao
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes:
Como executar:
Execucao realizada:
Modo de execucao:
Resultado:
Pendencias/Bloqueios:
```
