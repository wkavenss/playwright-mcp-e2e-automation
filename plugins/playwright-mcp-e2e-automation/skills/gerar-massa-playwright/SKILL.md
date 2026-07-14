---
name: gerar-massa-playwright
description: "Gerar massa sintetica em sistemas web com Playwright quando o pedido declarar `MODO: Geracao de massa de dados`, solicitar criacao de um ou varios registros, carga funcional ou preenchimento do caminho informado ate a persistencia. Use para gerar dados, nao para validar obrigatoriedade, formatos ou regras de implantacao. Nao usar quando o pedido declarar `MODO: Implantacao`, citar AGENTS.md/codigo-fonte para descobrir regras ou exigir testes negativos."
---

# Gerar Massa Playwright

Gerar registros sinteticos pelo caminho funcional informado, confirmar sucesso e persistencia e entregar codigo Playwright reproduzivel.

Conduzir a solicitacao somente com esta skill. Nao carregar outra skill do plugin durante a geracao.

## Contrato

Exigir `MODO: Geracao de massa de dados`, URL, usuario, senha e caminho. Usar quantidade `1` quando omitida e exigir inteiro positivo quando informada. Se o modo estiver ausente, contiver tambem `Implantacao` ou o pedido exigir testes negativos, parar antes de criar arquivos e pedir a escolha do modo.

Gravar credenciais reais somente em `.env`, manter `.env` ignorado e criar `.env.example` sem segredos. Nunca repetir segredos em codigo, logs, evidencias ou resposta final.

## Fluxo

1. Inspecionar a estrutura Playwright existente e preservar linguagem, package manager, Page Objects e convencoes.
2. Executar `node ../../scripts/check-environment.mjs <raiz-do-projeto>` e `node ../../scripts/optimize-context.mjs <raiz-do-projeto> --mode padrao --json --stdin` com pedido sanitizado.
3. Se necessario, executar `node ../../scripts/scaffold-playwright.mjs <raiz-do-projeto> --mode massa` sem sobrescrever arquivos existentes. Criar depois somente o gerador de dados exigido pela operacao real.
4. Navegar pelo caminho informado e identificar os campos obrigatorios pela tela real; consultar codigo apenas quando ja estiver no escopo do projeto e for indispensavel para completar o fluxo.
5. Gerar dados sinteticos, unicos e rastreaveis em runtime. Nao usar dados pessoais reais.
6. Para cada registro, preencher obrigatorios, concluir a operacao, validar mensagem de sucesso e localizar o registro na listagem ou consulta correspondente.
7. Nao criar cenarios de campo ausente, formato invalido, permissao ou outras regras negativas.
8. Para lista alimentada por cadastros anteriores, selecionar a primeira opcao valida: normalizar marcadores como `-- SELECIONE --`, ignorar item desabilitado, oculto, vazio ou placeholder e confirmar a selecao. Nao inventar termo para autocomplete nem tentar candidatos sucessivos.
9. Quando houver consentimento conhecido de cookies, procura-lo por no maximo `2_000` ms, aceita-lo quando presente e manter recuperacao para aparicao tardia.
10. Manter valores intencionais para campos de dominio que alterem situacao, status, modalidade, tipo ou resultado; nunca aplicar a primeira opcao cegamente nesses campos.
11. Se uma lista dinamica nao apresentar candidato valido, parar o registro atual e informar exatamente o campo sem massa disponivel.
12. Executar o menor comando em Chromium headed maximizado. Em falha de locator/sincronizacao, usar `parse-error-context.mjs` e a pagina MCP preservada; usar `repair-probe.mjs` somente quando nao reabrir um fluxo transacional.
13. Executar `node ../../scripts/quality-gate.mjs <raiz-do-projeto> --changed`, com `--files` ou `--manifest` fora de Git.

## Regras

- Specs orquestram quantidade, fases e resultado; Page Objects concentram seletores, descritores dos campos e interacoes. Nao declarar na spec uma lista extensa repetindo campo, locator e valor.
- Quando varios obrigatorios compartilharem a mesma mecanica, fazer o Page Object fornecer a colecao e os metodos de preenchimento/restauracao; manter na spec somente o percurso funcional por registro.
- Quando a colecao possuir muitos campos, usar um objeto nomeado completo por linha quando legivel. Nao criar factory posicional, wrapper de uma chamada ou arquivo auxiliar apenas para reduzir o Page Object.
- Priorizar `getByRole`, `getByLabel`, texto escopado e IDs JSF estaveis declarados diretamente no Page Object como `[id="form:campo"]`.
- Concentrar a selecao da primeira opcao valida em metodo reutilizado do Page Object, sem criar utilitario generico separado.
- Nao criar camada `flows`, `BasePage`, helper de ID, relatorio de implantacao, perfil de cliente ou formulario legado sem uso comprovado.
- Reutilizar o caminho existente de recuperacao de overlay em cliques com confirmacao e incorporar wrappers internos curtos usados uma unica vez, sem alterar a API funcional da spec.
- Respeitar o `actionTimeout` central em cliques e selects. Nao adicionar timeout local menor sem requisito funcional; `expect.poll` pode ter limite explicito para aguardar lista dinamica.
- Manter `timeout: 180_000` central no `playwright.config`; para spec excepcionalmente grande, preferir `test.slow()` e reservar `test.setTimeout` para limite exato comprovado.
- Nao perseguir percentual de reducao de linhas; remover somente duplicacao e responsabilidade sem consumidor, sem comprimir ou deslocar o mesmo comportamento.
- Evitar `.nth()`, posicao, XPath e IDs JSF dinamicos.
- Manter uma sessao continua por registro, navegador maximizado e `workers: 1` por padrao.
- Nao remover nem alterar dados preexistentes.
- Antes de repetir submissao persistente, verificar se a tentativa anterior ja criou o registro.
- Considerar concluido somente quando a quantidade solicitada estiver persistida no ambiente real.

Carregar `../../references/configuracao-playwright.md`, `../../references/seletores-page-objects.md` ou `../../references/diagnostico-e-evidencias.md` somente quando o risco correspondente surgir.

## Saida

Informar arquivos, quantidade solicitada/criada, caminho automatizado, validacoes de sucesso/persistencia, comando headed, resultado e bloqueios.
