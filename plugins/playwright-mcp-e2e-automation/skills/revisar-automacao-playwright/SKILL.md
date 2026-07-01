---
name: revisar-automacao-playwright
description: Revisar codigo Playwright existente quanto a corretude, Page Objects, seletores, sincronizacao, seguranca de credenciais, assertions, isolamento e manutencao. Use em pedidos de review, auditoria, avaliacao de boas praticas ou qualidade de uma suite Playwright. Nao usar para implementar fluxo novo, corrigir automaticamente uma falha ou configurar projeto do zero.
---

# Revisar Automacao Playwright

Atuar em postura de code review. Priorizar bugs, riscos de regressao, fragilidade e lacunas de teste; nao modificar arquivos salvo pedido explicito.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a revisao.

## Fluxo

1. Identificar specs, Page Objects, fixtures, dados, configuracao e scripts de execucao.
2. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto>` a partir desta skill para realizar a auditoria completa.
3. Ler apenas os arquivos necessarios para confirmar ou descartar os achados.
4. Avaliar resultado funcional, isolamento, massa, sincronizacao, seletores, segredos, dados sensiveis hardcoded, higiene de codigo e manutencao.
5. Quando util e seguro, executar o menor teste relevante; nao navegar por funcionalidades nao solicitadas.
6. Apresentar achados primeiro, por severidade, com arquivo e linha. Depois registrar duvidas e risco residual.

## Criterios

- Specs devem orquestrar a historia funcional; seletores e interacoes pertencem aos Page Objects.
- Locators semanticos e escopados devem prevalecer sobre CSS estrutural e XPath.
- Assertions devem comprovar o efeito funcional, nao somente a presenca de um elemento.
- `waitForTimeout`, retries excessivos e esperas globais podem mascarar sincronizacao incorreta.
- Credenciais devem vir de `.env`, que precisa estar ignorado; `.env.example` nao deve conter segredos.
- Nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails, telefones e identificadores pessoais nao devem aparecer hardcoded em specs, Page Objects, fixtures, asserts, comentarios ou logs.
- Erro cru, stack trace, timeout, texto de `body` inteiro, `console.log`, codigo comentado, `TODO/FIXME` e sobras de codegen devem ser tratados como sujeira de automacao.
- Fluxos de negocio que atravessam varias telas devem preservar uma unica sessao de navegador dentro do mesmo `test`; dividir cada tela em um teste independente ou abrir/fechar navegador manualmente aumenta fragilidade e pode gerar dados duplicados.
- A suite deve ser reprodutivel por outra pessoa com o mesmo perfil funcional e `.env` preenchido; dependencias de sessao local, perfil persistente, `storageState` manual, caminhos absolutos, `test.only/skip` ou massa escondida fora do projeto sao defeitos.
- Testes devem evitar dependencia de ordem, dados compartilhados imprevisiveis e efeitos destrutivos sem controle.
- Configuracao padrao do plugin deve usar Chromium headed e evidencias minimas, salvo decisao explicita do projeto.

Se nao houver achados, declarar isso e mencionar testes nao executados ou riscos que permaneceram.
