---
name: corrigir-automacao-playwright
description: Diagnosticar e corrigir uma automacao Playwright existente que falha, e instavel ou deixou de localizar elementos. Use quando o usuario apresentar teste falhando, erro, seletor quebrado, flakiness, timeout ou regressao em codigo Playwright existente. Nao usar para criar um fluxo novo, revisar toda a suite ou configurar Playwright do zero.
---

# Corrigir Automacao Playwright

Corrigir somente a falha observada, preservando arquitetura, escopo funcional e padroes locais.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a correcao.

## Fluxo

1. Localizar o teste afetado, Page Objects relacionados e comando de execucao.
2. Consultar cache local sanitizado e executar somente o menor cenario que reproduza a falha.
3. Classificar a causa: seletor, navegacao, sincronizacao, autenticacao, massa, permissao, regra funcional, ambiente ou captcha/MFA.
4. Se a primeira falha for locator/strict/hidden/attached/timeout/menu JSF, executar `../../scripts/parse-error-context.mjs <raiz-do-projeto> --input <error-context.md|log> --json`; se couber probe, validar locators com `../../scripts/repair-probe.mjs <raiz-do-projeto> --manifest <probes.json> --json` ou na pagina MCP preservada antes de repetir a spec inteira.
5. Usar Playwright MCP apenas na tela necessaria para confirmar estado real e seletor; em JSF/RichFaces, manter a mesma sessao/pagina e nao usar varios `node -e` independentes por tela/seletor.
6. Alterar a menor superficie possivel, mantendo seletores e interacoes nos Page Objects.
7. Executar novamente apenas o cenario afetado em Chromium headed, salvo pedido contrario, e somente depois de uma correcao objetiva.
8. Executar `../../scripts/quality-gate.mjs <raiz-do-projeto> --changed` a partir desta skill; se nao houver Git, usar `--files <arquivos>` ou `--manifest .playwright-e2e/changed-files.json`.
9. Ler somente o primeiro exemplo de cada regra relevante; se houver repeticoes, cobrir as demais por busca pontual com `rg`, sem abrir todos os arquivos. Usar `--verbose` apenas quando o agrupamento nao explicar a correcao.
10. Resumir causa, criterios preservados, arquivos alterados e resultado sem copiar logs longos.

## Regras

- Nao refazer o projeto, explorar funcionalidades vizinhas nem reescrever testes saudaveis.
- Nao substituir uma validacao funcional por mera verificacao de visibilidade.
- Nao trocar criterio informado pelo usuario por outro mais fraco sem confirmacao explicita; se a alternativa preservar so parte do criterio, parar e pedir confirmacao.
- Preferir locators semanticos e assertions com espera automatica.
- Evitar `waitForTimeout`; corrigir a condicao de sincronizacao.
- Preservar `.env`, `.gitignore`, Page Objects e convencoes existentes.
- Nao corrigir falha copiando erro cru, stack trace, timeout, texto de `body` inteiro ou mensagem transitoria para comentario, fixture, constante ou assert.
- Nao hardcodar nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails ou telefones observados na tela.
- Nao corrigir falha temporal trocando uma data vencida por outra data fixa; substituir por gerador dinamico ou parametro local quando a regra exigir data oficial.
- Nao reexecutar submissao que cria/altera dado persistente sem antes verificar se a tentativa anterior ja criou registro. Reutilizar ou limpar somente quando for seguro e autorizado.
- Manter o cenario afetado em uma unica sessao de navegador quando as telas dependem do mesmo estado; nao quebrar uma correcao em um teste por tela.
- Preservar reprodutibilidade por CLI: nao corrigir usando sessao local ja autenticada, perfil persistente, `storageState` manual, caminhos absolutos, `test.only/skip` ou massa escondida fora do projeto.
- Cache local pode orientar a correcao, mas nao substituir confirmacao real quando seletor, tela ou estado estiverem incertos.
- Fazer uma tentativa objetiva de correcao. Se a causa exigir investigacao ampla ou dados ausentes, parar e pedir somente o que falta.
- Gerar trace, screenshot ou video apenas quando solicitado ou indispensavel para diagnosticar a falha.

## Saida

Informar teste corrigido, causa principal, arquivos alterados, comando executado, resultado e eventual bloqueio.
