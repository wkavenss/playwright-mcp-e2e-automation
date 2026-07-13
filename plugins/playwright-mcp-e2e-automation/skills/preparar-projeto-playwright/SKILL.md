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
6. Instalar Chromium somente quando necessario, apos as dependencias do projeto, usando o CLI local (`npm exec -- playwright install chromium`; no Windows PowerShell, usar `npm.cmd exec -- playwright install chromium` se `.ps1` for bloqueado).
7. Manter `.env` fora do versionamento e deixar `.env.example` sem valores secretos.
8. Gerar/usar `tests/utils/authProfiles.js` para que cada spec declare seu perfil funcional com `getAuthProfile(profileName)`.
9. Gerar/usar `tests/utils/testData.js` para `runId`, textos neutros e datas dinamicas.
10. Gerar/usar `tests/utils/clientConfig.js`, `config/defaults.json` e `config/clientes/referencia.json` para perfis de massa validados por spec.
11. Gerar/usar `tests/utils/legacyForm.js` para radio/checkbox por label de campo + label de opcao, com unicidade e sem indice cego.
12. Manter `.playwright-e2e/cache/`, `.playwright-e2e/private-domain/` e manifestos locais fora do versionamento para mapas/contexto local sanitizados.
13. Executar `../../scripts/quality-gate.mjs <raiz-do-projeto> --changed`; se nao houver Git, usar `--files <arquivos>` ou `--manifest .playwright-e2e/changed-files.json`.
14. Informar arquivos criados, dependencias instaladas e comandos disponiveis.

## Padrao Gerado

- JavaScript e Playwright Test.
- `tests/e2e` para specs, `tests/pages/BasePage.js` para helper minimo de Page Objects, `tests/utils/authProfiles.js` para perfis de autenticacao, `tests/utils/testData.js` para massa dinamica e `tests/utils/legacyForm.js` para formularios legados.
- Chromium headed e maximizado por padrao, com `viewport: null`, `--start-maximized` e fixture CDP.
- `workers: 1` por padrao, com override por `E2E_WORKERS`, para evitar conflito de sessao quando perfis locais usam a mesma conta.
- `trace: 'retain-on-first-failure'`, `screenshot: 'only-on-failure'` e `video: 'off'` por padrao.
- Scripts `test:e2e` e `test:e2e:headed`.
- Variaveis `BASE_URL`, `E2E_CLIENT_PROFILE`, `E2E_WORKERS` e credenciais por perfil, como `E2E_EXAMPLE_USERNAME`/`E2E_EXAMPLE_PASSWORD`.
- `.playwright-e2e/cache/`, `.playwright-e2e/private-domain/`, `.playwright-e2e/changed-files.json` e `.playwright-e2e/error-context.md` ignorados para dados locais sanitizados.

Nao criar teste de exemplo ou README. O scaffolder e nao destrutivo, nao sobrescreve arquivos existentes e guarda trace/screenshot somente quando houver falha.
