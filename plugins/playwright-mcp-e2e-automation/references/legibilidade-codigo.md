# Legibilidade Do Codigo Gerado

Use esta referencia ao criar ou refatorar automacoes para leitores com pouca experiencia em Playwright.

## Principio

A spec conta a historia funcional. O Page Object conhece a tela. O Playwright registra o resultado.

Uma spec de implantacao deve ser uma sequencia direta de chamadas. Usar `test.step` apenas para operacoes de negocio distintas que compartilham a mesma massa e precisam aparecer separadamente no HTML, como criar, visualizar, emitir e remover. Nao criar etapa para clique, preenchimento, espera, campo individual ou botao isolado; nao aninhar etapas. Nao criar estado manual, annotations ou relatorio particular.

Quando o prompt contiver varios casos, agrupar os que formarem uma jornada natural sobre a mesma entidade, `runId` e massa principal, mesmo com perfis diferentes em contextos separados. A spec recebe apenas a historia funcional da jornada. Numero do caso, status do lote, credenciais dos outros casos, bloqueios e inventario nunca entram no codigo.

Operacoes independentes podem usar testes separados. Casos dependentes da mesma entidade ficam em um unico `test`, mesmo com perfis diferentes, usando contextos autenticados separados. Nunca usar `test.describe.serial`, project dependencies, variavel global ou `beforeAll` funcional para fazer uma spec depender da massa de outra.

## Responsabilidades

Na spec:

- autenticar e chamar as operacoes na ordem do usuario;
- percorrer os obrigatorios em um unico loop;
- consultar `testInfo.errors` uma vez antes da persistencia positiva;
- manter visiveis o clique final, a mensagem de sucesso e a consulta do registro;
- verificar ausencia de erro impeditivo depois da abertura e da conclusao.
- nao declarar `RelatorioValidacoes`, `verificacoesPlanejadas`, `fluxoAcessivel` ou outra replica do runner.

No Page Object:

- declarar locators diretamente;
- fornecer uma colecao unica de descritores com propriedades nomeadas;
- preencher, limpar, submeter, validar efeitos e restaurar campos;
- restaurar em `finally` cada validacao de obrigatoriedade.

Quando houver muitos descritores, usar um objeto completo por linha quando ele continuar legivel; quebrar somente o descritor que realmente precisar de comentario ou propriedade longa. Manter `campo`, `rotulo`, `controle`, `tipo` e `valorValido` visiveis; nao trocar propriedades nomeadas por factory posicional apenas para reduzir linhas.

Nao criar `BasePage`, camada `flows`, fabrica trivial, helper de ID, Page Object acoplado ao runner ou metodo `executarSmokeCompleto`.

Recuperacao usada pelo Codex enquanto gera a automacao nao pertence ao projeto. Nao criar `localizarTentativa`, `retomarTentativa`, `removerTentativa`, ledger, lock, cache, fixture, setup, teardown ou spec tecnica de limpeza. Um metodo `removerRegistro` permanece valido quando Remover for caso de uso real.

## Fluxo De Falhas

- Acesso, navegacao, botoes e conclusao usam assertions normais e interrompem na primeira falha.
- Evidencias atribuiveis ao obrigatorio usam `expect.soft` para que os demais campos sejam verificados na mesma sessao.
- A sentinela vazia, o formulario ainda acessivel e a ausencia de sucesso usam assertions normais para impedir persistencia acidental.
- Depois do loop, `testInfo.errors` bloqueia somente o cadastro positivo; nao criar `fluxoAcessivel`, `cadastroConcluido` ou acumuladores paralelos.

Exemplo:

```javascript
await acessoPage.realizarLogin(credenciais);
await cursoPage.abrirFormularioCadastro();
await cursoPage.preencherCamposObrigatorios(camposObrigatorios);

for (const campo of camposObrigatorios) {
  await cursoPage.validarObrigatoriedade(campo, camposObrigatorios);
}

// Uma falha suave ja reprova o teste; esta barreira apenas impede persistencia.
if (testInfo.errors.length > 0) return;

await cursoPage.clicarCadastrar();
await cursoPage.validarMensagemSucesso();
await cursoPage.confirmarPersistencia(dadosCurso.nome);
```

Uma spec destrutiva continua com a historia visivel: criar o alvo da execucao, confirmar a persistencia, cancelar a remocao e comprovar permanencia quando essa opcao existir, confirmar a remocao e validar ausencia ou novo estado. Nao esconder essa sequencia em `executarRemocaoCompleta()` nem duplicar o resultado em relatorio particular.

## Estrutura

- Em arquivo com um teste, colocar o modulo no titulo e evitar `test.describe` sem ganho real.
- Separar blocos por linhas em branco; usar comentarios somente para decisoes nao obvias.
- Evitar arvore de `if/else`, callbacks em descritores, colecoes posicionais e mapas paralelos.
- Extrair funcao somente quando representar operacao funcional reutilizada ou eliminar repeticao real.
- Incorporar ao consumidor um wrapper interno curto usado uma unica vez, especialmente quando ele apenas encadear uma ou duas chamadas de navegacao. Preservar metodos semanticos que contenham assertions, recuperacao transacional ou sejam chamados pela spec.
- Na validacao de obrigatoriedade, manter a escolha curta da sentinela junto da operacao quando nao houver outro consumidor; nao criar metodo apenas para uma busca de poucas linhas.
- Reutilizar o mesmo caminho de clique com recuperacao de overlay ao adicionar confirmacao de dialogo. Nao duplicar `try/catch`, aceite de cookies e nova tentativa em dois metodos paralelos.
- Centralizar timeouts de acao na configuracao. Nao espalhar limites menores em `click` ou `selectOption`; manter timeout local apenas para uma condicao funcional especifica e explicada, como `expect.poll` de lista dinamica.
- Centralizar tambem o limite total em `timeout: 180_000` no `playwright.config`. Em spec excepcionalmente grande, preferir `test.slow()`; nao repetir `test.setTimeout` sem necessidade exata comprovada e comentada.
- Em consentimento opcional com recuperacao tardia, limitar a procura inicial a `2_000` ms para nao atrasar clientes que nao exibem o banner.
- Separar acao e comprovacao em metodos semanticos distintos. A spec deve mostrar `submeter()`, `validarMensagemSucesso()` e `validarPersistencia()`; em consulta, `buscar()` e `validarResultados()`.
- Remover locator, metodo, exportacao, `.gitkeep` redundante ou utilitario sem consumidor.
- Nao dividir um Page Object apenas pela quantidade de linhas. Separar quando houver responsabilidade independente ou reuso real, como wizard e listagem; nao criar objeto por etapa nem facade apenas para manter a spec igual.
- Nao extrair helper generico de select somente para reduzir dois blocos semelhantes. A extracao passa a valer quando houver reuso recorrente ou uma regra compartilhada que precise de uma unica fonte de verdade.
- Nao perseguir percentual de reducao de linhas. Medir simplificacao por responsabilidades removidas, consumidores preservados e quantidade de lugares alterados por regra; compactar comandos ou deslocar codigo para outro arquivo nao reduz complexidade.
- Usar reporters `line` e `html`; o HTML deve mostrar diretamente specs aprovadas e reprovadas.
- Manter trace e screenshot somente em falhas e nao gerar Markdown proprio.
- Em operacao destrutiva, manter `runId`, criacao do alvo, prova de unicidade e validacao final proximos na spec. O Page Object conhece os seletores e cliques, mas nao decide qual registro preexistente pode ser removido.

## Linguagem E Comentarios

- Seguir o idioma do projeto em variaveis, metodos de dominio, titulos e comentarios.
- Preservar APIs e termos do Playwright/JavaScript, como `test`, `expect`, `page`, `try` e `finally`.
- Nao usar acentos em identificadores. Manter acentos em comentarios, titulos e mensagens visiveis.
- Preferir nomes objetivos, como `dadosCurso`, `cursoPage`, `camposObrigatorios` e `testInfo`.
- Comentar origem da massa, uso de sentinela, restauracao de campos volateis, recuperacao de overlay e barreira de persistencia quando essas decisoes nao forem evidentes.
- Nao comentar uma operacao evidente apenas para traduzir a linha seguinte.
