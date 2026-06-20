---
name: revisar-automacao-playwright
description: Revisar codigo Playwright existente quanto a corretude, Page Objects, seletores, sincronizacao, seguranca de credenciais, assertions, isolamento e manutencao. Use em pedidos de review, auditoria, avaliacao de boas praticas ou qualidade de uma suite Playwright. Nao usar para implementar fluxo novo, corrigir automaticamente uma falha ou configurar projeto do zero.
---

# Revisar Automacao Playwright

Atuar em postura de code review. Priorizar bugs, riscos de regressao, fragilidade e lacunas de teste; nao modificar arquivos salvo pedido explicito.

## Fluxo

1. Identificar specs, Page Objects, fixtures, dados, configuracao e scripts de execucao.
2. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto>` a partir desta skill.
3. Ler apenas os arquivos necessarios para confirmar ou descartar os achados.
4. Avaliar resultado funcional, isolamento, massa, sincronizacao, seletores, segredos e manutencao.
5. Quando util e seguro, executar o menor teste relevante; nao navegar por funcionalidades nao solicitadas.
6. Apresentar achados primeiro, por severidade, com arquivo e linha. Depois registrar duvidas e risco residual.

## Criterios

- Specs devem orquestrar a historia funcional; seletores e interacoes pertencem aos Page Objects.
- Locators semanticos e escopados devem prevalecer sobre CSS estrutural e XPath.
- Assertions devem comprovar o efeito funcional, nao somente a presenca de um elemento.
- `waitForTimeout`, retries excessivos e esperas globais podem mascarar sincronizacao incorreta.
- Credenciais devem vir de `.env`, que precisa estar ignorado; `.env.example` nao deve conter segredos.
- Testes devem evitar dependencia de ordem, dados compartilhados imprevisiveis e efeitos destrutivos sem controle.
- Configuracao padrao do plugin deve usar Chromium headed e evidencias minimas, salvo decisao explicita do projeto.

Se nao houver achados, declarar isso e mencionar testes nao executados ou riscos que permaneceram.
