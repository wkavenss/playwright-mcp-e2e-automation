---
name: criar-automacao-playwright
description: Criar uma nova automacao Playwright E2E ou ampliar um fluxo existente a partir de URL, usuario, senha e passo a passo. Use para transformar um procedimento web em codigo Playwright com Page Objects, .env, Playwright CLI, MCP sob demanda e validacao funcional em Chromium headed, mesmo quando o usuario nao pedir explicitamente para gerar codigo. Nao usar para apenas corrigir falha, revisar codigo ou somente configurar o projeto.
---

# Criar Automacao Playwright

Criar ou ampliar automacoes E2E com Playwright Test, JavaScript, Page Objects, `.env`, Playwright CLI-first e Playwright MCP sob demanda. Ao receber URL, usuario, senha e passo a passo, sempre entregar codigo Playwright no workspace; nao encerrar apenas com navegacao, diagnostico ou relato de telas.

Conduzir a solicitacao somente com esta skill. Nao carregar outra skill do plugin durante a criacao.

## Contrato Minimo

Exigir apenas URL base, usuario, senha e passo a passo. Se faltar algo, responder em uma linha: `Faltam: ...`.

Quando houver credenciais no chat, gravar valores reais somente em `.env`, garantir `.env` no `.gitignore`, criar `.env.example` seguro e usar `getAuthProfile(profileName)` com variaveis por perfil. Nunca repetir segredos em codigo, README, logs, traces, screenshots ou resposta final.

## Guardrails De Qualidade

Economizar tokens por roteiro compacto, leitura seletiva, cache sanitizado, scripts deterministicos, CLI no menor escopo e MCP sob demanda. Nunca economizar por teste mais fraco, seletor fragil, assert superficial, dado hardcoded, menos isolamento ou menos reprodutibilidade.

- Codigo: specs contam o fluxo; Page Objects concentram seletores e interacoes; metodos devem ter nomes funcionais.
- Execucao: usar Playwright CLI para ambiente, scaffold, validacao, auditoria e repair; usar Chromium headed por padrao.
- MCP: abrir somente para incerteza visual real: tela desconhecida, seletor ambiguo, menu, modal, autocomplete, tabela complexa ou falha que cache/codigo/log do CLI nao expliquem.
- Sessao: manter uma sessao unica/continua de navegador por fluxo; nao fechar/reabrir browser por tela, nao usar varios `node -e` independentes por seletor/tela e nao dividir fluxo transacional em um teste por tela.
- dados sensiveis: nao hardcodar nomes reais, usuarios, servidores/funcionarios, emails, telefones, documentos, matriculas, identificadores pessoais, erros crus ou valores especificos vistos na tela.
- Datas: gerar datas dinamicas, periodos, anos, semestres, prazos e vencimentos em runtime ou parametrizar localmente quando a regra exigir valor oficial.
- Reprodutibilidade: a spec deve rodar por CLI em outra maquina com Node, Playwright, Chromium, projeto versionado e `.env` preenchido, sem depender de sessao MCP, perfil local, `storageState` manual ou caminho absoluto.
- Cache: consultar `.playwright-e2e/cache/` antes do MCP, mas tratar cache sanitizado como sugestao; confirmar via MCP quando houver falha, mudanca visual, seletor ambiguo, permissao diferente ou cache inseguro.
- seletores estaveis: priorizar `getByRole`, `getByLabel`, `getByPlaceholder`, texto escopado, `getByTestId`, ID estavel centralizado ou CSS semantico relativo; XPath so em ultimo caso.
- Fragilidade proibida: evitar indice, posicao visual, classe gerada, ID JSF gerado, `.nth()` e `.first()` sem filtro estavel.
- Obrigatoriedade: campos com estrela/asterisco azul na label sao obrigatorios; nao submeter formulario vazio apenas para descobrir obrigatoriedade.
- Validacao funcional: validar mensagem, registro persistido, estado final, download, protocolo ou bloqueio esperado; nao trocar por mera visibilidade quando houver efeito observavel.
- Criterio do usuario: nao trocar criterio informado por outro mais fraco sem confirmacao explicita; exemplo proibido: `Titulo + Autor` virar apenas `Titulo`.
- Higiene: remover `console.log`, `debugger`, `TODO/FIXME`, codigo comentado, sobras de codegen, erro bruto, leitura ampla de `body`, dados reais e imports/constantes sem uso.
- Evidencias: usar `minimo` por padrao (`trace`, `screenshot` e `video` desligados); liberar diagnostico detalhado apenas quando solicitado ou quando falha real exigir.

## Fluxo Principal

1. Validar contrato minimo, modo (`padrao` se ausente) e evidencias (`minimo` se ausente).
2. Normalizar o pedido em roteiro compacto: objetivo, perfil, passos, dados, telas, acoes, validacoes e restricoes.
3. Executar `node ../../scripts/check-environment.mjs <raiz-do-projeto>`; se faltar requisito, parar e devolver os comandos objetivos do script.
4. Executar `node ../../scripts/optimize-context.mjs <raiz-do-projeto> --mode <modo> --json --stdin` com roteiro sanitizado; usar `projectShape`, `cacheStatus`, `recommendedCommand`, `likelyFilesToRead`, `riskFlags`, `requiredUserCriteria`, `criteriaWarnings` e `nextAction` para ler menos sem ignorar riscos.
5. Se o projeto nao tiver Playwright equivalente, executar `../../scripts/scaffold-playwright.mjs <raiz-do-projeto>`; o scaffolder e deterministico e nao deve sobrescrever arquivos existentes.
6. Classificar cada passo como `cache`, `cli`, `mcp` ou `remover`. Nao chamar MCP para item coberto por cache confiavel, codigo existente ou CLI deterministica.
7. Quando MCP for necessario, mapear somente o proximo passo e uma validacao funcional, mantendo a mesma pagina/sessao do fluxo; em JSF/RichFaces, avancar uma vez ate o estado e executar probes/confirmacoes ali, sem reiniciar por locator.
8. Antes de acao persistente, confirmar campos obrigatorios, massa dinamica/rastreavel e validacao final para evitar registros parciais ou lixo funcional.
9. Implementar a menor superficie: spec, Page Objects, utilitarios, dados e configuracao estritamente necessarios.
10. Validar pelo menor comando CLI util, preferindo scripts locais ou `npx playwright test --headed --reporter=line`.
11. Se o CLI falhar por locator/strict/hidden/attached/timeout/menu JSF, executar `../../scripts/parse-error-context.mjs <raiz-do-projeto> --input <error-context.md|log> --json` e, quando houver alvo, `../../scripts/repair-probe.mjs <raiz-do-projeto> --manifest <probes.json> --json` ou confirmar na pagina MCP preservada antes de repetir a spec inteira. Repetir o menor CLI so depois de correcao objetiva.
12. Executar `../../scripts/quality-gate.mjs <raiz-do-projeto> --changed`; se nao houver Git, usar `--files <arquivos>` ou `--manifest .playwright-e2e/changed-files.json`. Usar o resumo agrupado, ler so o primeiro exemplo de cada regra e tratar repeticoes com busca pontual (`rg`). Usar `--verbose` apenas quando o agrupamento nao explicar a correcao.
13. Antes da resposta final, conferir reprodutibilidade, dados dinamicos, ausencia de segredos/lixo de codigo e validacao funcional.

## Modos

- `padrao`: roteiro compacto, cache primeiro, MCP sob demanda, CLI para validar e resposta curta.
- `discovery`: mapear somente tela, seletor e validacao necessarios; nao gerar teste salvo pedido explicito.
- `repair`: corrigir falha com CLI primeiro e MCP apenas quando houver incerteza real.
- `cli-only`: usar CLI/cache quando nao existe duvida visual; interromper para MCP se surgir incerteza.
- `debug`: detalhar diagnostico sem segredos, DOM completo ou logs extensos.
- `full`: recriar estrutura ou fluxo inteiro somente quando o usuario pedir explicitamente.

## Referencias Sob Demanda

Carregar referencias somente quando o resumo, o risco ou a falha exigir:

- `references/otimizacao-tokens.md`: risco de consumo alto, cache, modos, MCP sob demanda ou reuso de seletores/dados.
- `references/configuracao-playwright.md`: projeto novo, instalacao/configuracao, `.env`, scripts, evidencias ou templates.
- `references/seletores-page-objects.md`: seletor fragil, Page Objects grandes, JSF/legado, tabelas/listagens, autocomplete ou falha por locator.
- `references/exploracao-mcp.md`: tela complexa ou exploracao visual inicial insuficiente.
- `references/diagnostico-e-evidencias.md`: falhas, bloqueios, ambiente instavel ou diagnostico detalhado.

## Saida

No modo normal, responder curto e nao colar logs completos, DOM, stack trace, saida completa do gate ou diagnostico longo.

```text
Codigo Playwright implementado: Sim
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes:
Dados obrigatorios inferidos:
Reprodutibilidade:
Comandos executados:
Resultado:
Pendencias/Bloqueios:
```
