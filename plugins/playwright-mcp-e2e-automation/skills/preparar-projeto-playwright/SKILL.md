---
name: preparar-projeto-playwright
description: Configurar a estrutura minima de Playwright Test em um projeto que ainda nao possui configuracao E2E. Use para iniciar Playwright, criar scripts, playwright.config, diretorios de specs e Page Objects, .env.example e protecao do .env. Nao usar para automatizar um fluxo, corrigir teste ou revisar uma suite existente.
---

# Preparar Projeto Playwright

Preparar somente a infraestrutura minima, preservando o package manager e as convencoes do repositorio.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a preparacao.

## Fluxo

1. Confirmar que nao existe configuracao Playwright equivalente. Se existir, ajustar somente o que estiver faltando.
2. Executar `node ../../scripts/check-environment.mjs <raiz-do-projeto>`; se `node` nao existir, informar o bootstrap (`winget install OpenJS.NodeJS.LTS`, `brew install node` ou NodeSource/apt). Se faltar outro requisito, interromper e devolver os comandos exibidos pelo script.
3. Detectar o package manager pelo lockfile; nao criar lockfile concorrente.
4. Executar `../../scripts/scaffold-playwright.mjs <raiz-do-projeto>` a partir desta skill.
5. Instalar `@playwright/test` e `dotenv` como dependencias de desenvolvimento somente quando ausentes e com autorizacao de rede.
6. Instalar Chromium somente quando necessario e com autorizacao de rede.
7. Manter `.env` fora do versionamento e deixar `.env.example` sem valores secretos.
8. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto> --changed` a partir desta skill.
9. Informar arquivos criados, dependencias instaladas e comandos disponiveis.

## Padrao Gerado

- JavaScript e Playwright Test.
- `tests/e2e` para specs e `tests/pages` para Page Objects.
- Chromium headed por padrao.
- `trace`, `screenshot` e `video` desligados por padrao.
- Scripts `test:e2e` e `test:e2e:headed`.
- Variaveis `BASE_URL`, `E2E_USERNAME` e `E2E_PASSWORD`.

Nao criar teste de exemplo, README, trace, screenshot ou video. O scaffolder e nao destrutivo e nao sobrescreve arquivos existentes.
