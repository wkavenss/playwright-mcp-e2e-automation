---
name: preparar-projeto-playwright
description: Configurar a estrutura minima de Playwright Test em um projeto que ainda nao possui configuracao E2E. Use para iniciar Playwright, criar scripts, playwright.config, diretorios de specs e Page Objects, .env.example e protecao do .env. Nao usar para automatizar um fluxo, corrigir teste ou revisar uma suite existente.
---

# Preparar Projeto Playwright

Preparar somente a infraestrutura minima, preservando o package manager e as convencoes do repositorio.

## Fluxo

1. Confirmar que nao existe configuracao Playwright equivalente. Se existir, ajustar somente o que estiver faltando.
2. Detectar o package manager pelo lockfile; nao criar lockfile concorrente.
3. Executar `../../scripts/scaffold-playwright.mjs <raiz-do-projeto>` a partir desta skill.
4. Instalar `@playwright/test` e `dotenv` como dependencias de desenvolvimento somente quando ausentes e com autorizacao de rede.
5. Instalar Chromium somente quando necessario e com autorizacao de rede.
6. Manter `.env` fora do versionamento e deixar `.env.example` sem valores secretos.
7. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto>` a partir desta skill.
8. Informar arquivos criados, dependencias instaladas e comandos disponiveis.

## Padrao Gerado

- JavaScript e Playwright Test.
- `tests/e2e` para specs e `tests/pages` para Page Objects.
- Chromium headed por padrao.
- `trace`, `screenshot` e `video` desligados por padrao.
- Scripts `test:e2e` e `test:e2e:headed`.
- Variaveis `BASE_URL`, `E2E_USERNAME` e `E2E_PASSWORD`.

Nao criar teste de exemplo, README, trace, screenshot ou video. O scaffolder e nao destrutivo e nao sobrescreve arquivos existentes.
