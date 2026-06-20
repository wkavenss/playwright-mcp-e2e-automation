---
name: corrigir-automacao-playwright
description: Diagnosticar e corrigir uma automacao Playwright existente que falha, e instavel ou deixou de localizar elementos. Use quando o usuario apresentar teste falhando, erro, seletor quebrado, flakiness, timeout ou regressao em codigo Playwright existente. Nao usar para criar um fluxo novo, revisar toda a suite ou configurar Playwright do zero.
---

# Corrigir Automacao Playwright

Corrigir somente a falha observada, preservando arquitetura, escopo funcional e padroes locais.

## Fluxo

1. Localizar o teste afetado, Page Objects relacionados e comando de execucao.
2. Executar somente o menor cenario que reproduza a falha.
3. Classificar a causa: seletor, navegacao, sincronizacao, autenticacao, massa, permissao, regra funcional, ambiente ou captcha/MFA.
4. Usar Playwright MCP apenas na tela necessaria para confirmar o estado real e o seletor seguinte.
5. Alterar a menor superficie possivel, mantendo seletores e interacoes nos Page Objects.
6. Executar novamente apenas o cenario afetado em Chromium headed, salvo pedido contrario.
7. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto>` a partir desta skill e corrigir apenas erros relacionados a mudanca.
8. Resumir causa, arquivos alterados e resultado sem copiar logs longos.

## Regras

- Nao refazer o projeto, explorar funcionalidades vizinhas nem reescrever testes saudaveis.
- Nao substituir uma validacao funcional por mera verificacao de visibilidade.
- Preferir locators semanticos e assertions com espera automatica.
- Evitar `waitForTimeout`; corrigir a condicao de sincronizacao.
- Preservar `.env`, `.gitignore`, Page Objects e convencoes existentes.
- Fazer uma tentativa objetiva de correcao. Se a causa exigir investigacao ampla ou dados ausentes, parar e pedir somente o que falta.
- Gerar trace, screenshot ou video apenas quando solicitado ou indispensavel para diagnosticar a falha.

## Saida

Informar teste corrigido, causa principal, arquivos alterados, comando executado, resultado e eventual bloqueio.
