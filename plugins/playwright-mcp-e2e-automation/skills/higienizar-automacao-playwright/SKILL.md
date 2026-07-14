---
name: higienizar-automacao-playwright
description: Limpar e endurecer uma automacao Playwright existente sem recriar fluxo. Use quando o usuario pedir melhoria de codigo, higiene, refatoracao pontual, remocao de lixo de codegen, eliminacao de dados hardcoded, reducao de seletores frageis, reprodutibilidade ou preparo do codigo para review senior. Nao usar para criar fluxo novo, revisar sem alterar ou corrigir falha funcional ampla.
---

# Higienizar Automacao Playwright

Melhorar codigo Playwright existente com baixo consumo de tokens, usando auditoria local e edicoes objetivas. Nao reexplorar telas, nao recriar specs e nao chamar MCP por padrao.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a higiene.

## Fluxo

1. Identificar a raiz do projeto e os arquivos afetados: specs, Page Objects, dados, fixtures e utils.
2. Executar `node ../../scripts/quality-gate.mjs <raiz-do-projeto> --changed` a partir desta skill. Se o usuario pedir a suite inteira, omitir `--changed`; usar `--verbose` somente quando o resumo por regra nao explicar a correcao.
3. Ler somente o primeiro exemplo de cada regra do gate e os arquivos claramente relacionados ao fluxo. Quando houver achados repetidos, corrigir por tipo de problema e usar busca pontual para cobrir as demais ocorrencias.
4. Corrigir apenas achados objetivos e proximos do escopo.
5. Nao abrir MCP, salvo quando codigo e logs nao explicarem seletor, tela ou estado real indispensavel.
6. Executar novamente o quality gate no mesmo escopo.
7. Quando houver comando claro e barato, executar o menor teste CLI afetado.
8. Responder curto: arquivos alterados, tipos de achado tratados, comando executado, resultado e pendencias. Nao colar a saida completa do quality gate.

## Corrigir

- Remover `console.log`, `debugger`, `TODO/FIXME`, codigo comentado e sobra de codegen.
- Remover erro bruto, stack trace, timeout ou texto transitorio copiado para string, comentario, fixture ou assert.
- Substituir nomes reais, usuarios, documentos, emails, telefones e identificadores por `.env`, fixture local ignorada ou massa neutra.
- Mover contexto privado recorrente para `.playwright-e2e/private-domain/` quando for local ao projeto e garantir que nao seja versionado.
- Substituir datas, anos, periodos, semestres e prazos fixos por geradores dinamicos ou parametro local quando a regra exigir valor oficial.
- Mover seletores e interacoes diretas da spec para Page Objects quando houver acoplamento claro.
- Trocar metodos genericos como `clickButton1`, `fillInput2` e `goNext` por nomes funcionais.
- Em projeto em portugues, usar portugues natural sem acentos nos identificadores de dominio, preservando APIs e palavras reservadas do framework/linguagem.
- Trocar pares posicionais de validacao por objetos com propriedades nomeadas quando isso tornar a leitura imediata.
- Em spec extensa, achatar a sequencia, mover interacoes para Page Objects e comentar apenas linhas-chave: massa, sessao, restauracao, recuperacao e persistencia.
- Remover comentario que apenas repete a instrucao seguinte, mas preservar explicacoes uteis para leitores iniciantes.
- Remover helper generico usado uma unica vez quando a logica ficar mais clara diretamente na fase funcional.
- Remover `BasePage` que apenas guarde `page` ou encapsule `page.locator`; declarar locators diretamente no Page Object.
- Remover fabrica que apenas chama `new`, metodo/exportacao sem consumidor e utilitario criado preventivamente.
- Consolidar listas, mapas e `switch` paralelos de campos em uma unica colecao declarativa no Page Object, com propriedades nomeadas e sem callbacks. A spec deve obter essa colecao por metodo sem repetir locators e valores.
- Compactar colecoes extensas com um objeto nomeado completo por linha quando legivel, quebrando apenas descritores longos. Nao criar factory posicional nem mover a colecao para outro arquivo apenas para diminuir o Page Object.
- Manter a sequencia funcional e a barreira de persistencia na spec. Remover acoplamento de Page Object com `testInfo` e desfazer metodo monolitico `executarSmokeCompleto`.
- Nao criar camada `flows` para apenas deslocar o excesso da spec; preferir operacoes semanticas no Page Object da tela.
- Incorporar wrapper interno curto usado uma unica vez quando ele apenas encadear uma ou duas chamadas. Preservar API consumida pela spec e metodos que concentrem assertions ou protecao transacional.
- Reutilizar o clique com recuperacao de overlay dentro do clique com confirmacao; remover caminhos paralelos que repetem `try/catch`, aceite e nova tentativa.
- Nao dividir Page Object ou criar helper generico de select somente para reduzir contagem de linhas. Exigir responsabilidade independente ou reuso comprovado.
- Nao usar meta percentual de linhas como criterio de aceite. Confirmar que cada reducao remove duplicacao, wrapper interno ou responsabilidade sem consumidor, sem apenas comprimir ou deslocar codigo.
- Remover `test.describe` de arquivo com um unico teste quando nao houver configuracao, hook ou contexto adicional; incorporar o modulo ao titulo do `test`.
- Achatar `if/else` encadeados em fases sequenciais. Remover estados manuais como `fluxoAcessivel` e `cadastroConcluido` quando apenas repetirem o resultado das assertions.
- Em smoke de implantacao, usar falha imediata em acesso, navegacao, botoes e conclusao. Usar `expect.soft` nas evidencias recuperaveis de obrigatoriedade e uma unica consulta a `testInfo.errors` antes da persistencia positiva.
- Remover `test.step`, annotations, `RelatorioValidacoes`, plano manual, Markdown e `try/finally` da spec quando somente duplicarem erros e evidencias que o Playwright ja registra.
- Em specs originadas de um lote, remover numero/status do caso, mapas de credenciais, listas de casos e qualquer orquestracao do prompt. Cada arquivo deve continuar parecendo uma automacao individual.
- Identificar cada obrigatorio pela mensagem da assertion no Page Object, mantendo um unico loop na spec.
- Separar submissao e resultado: clique em um metodo e mensagem de sucesso em outro. Remover `concluirCadastro()` que apenas combina essas duas operacoes.
- Quando os descritores planejados ainda nao possuem massa, usar `camposPlanejados`; reservar `camposObrigatorios` para os descritores completos. Nao sobrescrever a mesma colecao com dois significados.
- Remover locators e metodos sem consumidor comprovado.
- Reduzir `.nth()`, `.first()` sem filtragem explicita de candidato valido, XPath sem justificativa, ID gerado e seletor estrutural fragil.
- Corrigir indice escondido em `evaluate`, ID JSF gerado, ID JSF estavel com escape manual e `waitForTimeout` sem anotacao padronizada. Aceitar `[id="form:campo"]` direto no Page Object.
- Remover timeout local redundante de `click`, `fill`, `check` e `selectOption` quando `actionTimeout` ja fornecer o limite. Preservar limite local somente para condicao funcional documentada.
- Mover `test.setTimeout` repetido nas specs para `timeout: 180_000` no `playwright.config`. Para operacao excepcionalmente longa, preferir `test.slow()`; manter valor local somente quando houver limite exato comprovado e comentado.
- Reduzir para ate `2_000` ms a procura inicial por consentimento opcional quando houver recuperacao tardia; clientes sem banner nao devem pagar uma espera longa em cada login.
- Trocar `isVisible()` imediato usado para decidir se o fluxo terminou por espera curta em campo estavel, especialmente depois de submissao ou navegacao JSF.
- Preservar todos os criterios informados pelo usuario; nao simplificar filtro/assert sem confirmacao.
- Preservar uma unica sessao de navegador por fluxo; permitir reentrada controlada apos Voltar/Cancelar, mas nao abrir novo browser ou repetir login.
- Em remocao ou transicao irreversivel, manter visiveis na spec a criacao do alvo atual, a persistencia e unicidade pelo `runId`, a acao escopada e a validacao final. Remover selecao por primeira linha, prefixo generico, registro preexistente ou massa de outra spec.
- Nao adicionar limpeza automatica para uma falha destrutiva ocorrida depois da criacao. Preservar o alvo identificado para diagnostico e impedir repeticao cega.
- Em smoke de implantacao, remover testes negativos de tipo/formato e tratar dependencias apenas como preparacao do preenchimento.
- Em submissao negativa de obrigatoriedade, manter um campo-sentinela obrigatorio vazio, validar o alvo com `expect.soft`, proteger a sentinela com assertion normal e restaurar ambos em `finally`. Bloquear o cadastro positivo quando `testInfo.errors` contiver qualquer falha.
- Trocar valores institucionais fixos por primeira opcao valida somente em listas de cadastros anteriores; manter valores intencionais em campos de dominio.
- Tratar `config/clientes`, `defaults.json`, `clientConfig` e `E2E_CLIENT_PROFILE` como legado. Remover apenas quando nao houver mais consumidor; caso contrario, registrar a migracao pendente.
- Fortalecer assertions fracas para validar efeito funcional quando houver sinal estavel no codigo.

## Nao Fazer

- Nao criar automacao nova.
- Nao navegar por funcionalidades vizinhas.
- Nao trocar falha real por assert mais fraco.
- Nao inventar massa funcional que altere regra de negocio.
- Nao instalar dependencias nem baixar navegador sem autorizacao.
- Nao reformatar ou reescrever arquivos sem relacao com a higiene solicitada.
- Nao copiar conteudo do overlay privado para README, codigo, fixtures versionadas ou resposta final.

Ao higienizar legibilidade, carregar `../../references/legibilidade-codigo.md`.

## Saida

```text
Higiene aplicada:
Arquivos alterados:
Achados tratados:
Comando executado:
Resultado:
Pendencias/Bloqueios:
```
