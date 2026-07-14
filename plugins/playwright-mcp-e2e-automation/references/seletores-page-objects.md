# Seletores E Page Objects

Use este arquivo somente ao refatorar muitos Page Objects, quando houver seletores frageis, tabelas/listagens complexas, falha por seletor ou automacao existente fora do padrao.

## Seletores

Escolher localizadores nesta ordem:

1. `getByRole` com nome acessivel real.
2. `getByLabel`.
3. `getByPlaceholder`.
4. `getByText` estavel e escopado.
5. `getByTestId` quando existir no projeto.
6. CSS semantico relativo ao formulario, tabela, linha ou container correto.
7. XPath somente em ultimo caso.

Nunca usar indice global, "primeiro botao da pagina", classe gerada ou seletor de layout quando houver contexto funcional. Se nao houver nome acessivel, informar o bloqueio de manutencao e sugerir `data-testid` estavel quando isso desbloquear a automacao.

Em tabelas/listagens, localizar primeiro a tabela por role e caption/nome acessivel, ou por ID estavel do container quando a marcacao legada nao expuser acessibilidade. Dentro dela, preferir `getByRole('row').filter({ hasText: dadoUnico })`. Evitar cadeias estruturais como `table.listagem tbody tr`; se forem inevitaveis, escopar no container estavel e registrar `fallback legado sem role acessivel` junto ao seletor.

Antes de remover ou aplicar transicao irreversivel, filtrar a linha pelo identificador completo da execucao atual e exigir `toHaveCount(1)`. Nunca usar `.first()`, `.nth()`, prefixo generico como `E2E` ou registro de execucao anterior para escolher o alvo destrutivo.

Mapear seletores sob demanda: identificar o seletor no momento em que o passo precisa dele, gravar no Page Object e seguir. Nao criar inventario de todos os campos/botoes antes de implementar o fluxo.

Nao usar nomes reais de pessoas, usuarios, servidores/funcionarios, emails, documentos, matriculas ou telefones observados na tela como seletor, `hasText`, assert ou fixture versionada. Em tabelas/listagens, preferir registro criado pela propria automacao com `runId`, texto neutro fornecido pelo usuario ou variavel local nao versionada. Quando um dado real for inevitavel para localizar um registro preexistente, encapsular em parametro generico e nao repetir o valor em comentarios ou logs.

Nao usar `.nth()`, indice numerico, posicao visual ou `.first()` sem filtro. Para listas de cadastros anteriores, a filtragem valida deve excluir item oculto, desabilitado, vazio e placeholder antes de escolher o primeiro candidato. Para outras colecoes, filtrar por escopo funcional, linha, label, cabecalho, role, `hasText` sanitizado ou dado de teste gerado.

## Primeira Opcao Valida

Concentrar no Page Object um metodo reutilizado pela tela. Em `<select>`, ler as opcoes, normalizar texto/valor, remover marcadores decorativos das extremidades (por exemplo, `-- SELECIONE --`), ignorar `disabled`, `hidden`, valor vazio e labels iniciadas por `Selecione`/`Escolha`, selecionar o primeiro candidato restante e confirmar o valor final. Nao excluir valor `0` ou `-1` isoladamente quando o texto nao indicar placeholder.

Em lista dependente, aguardar que um candidato valido apareca depois da selecao do campo pai. Em autocomplete, abrir a lista e escolher o primeiro item visivel somente quando isso nao exigir termo institucional especifico. Se nenhum candidato surgir, falhar com o rotulo do campo; nao inventar busca nem tentar a segunda opcao do campo pai.

Essa regra vale somente para massa de `cadastro-anterior`. Situacao, Status, Modalidade e outros campos de dominio continuam com valor intencional.

## JSF E Sistemas Legados

Nao usar IDs gerados como `j_id`, `j_id_jsp`, `j_idt` ou `javax.faces` como seletor principal. Esses valores mudam entre builds, sessoes ou telas e deixam a automacao fragil.

Nao converter tudo cegamente para `getByRole/getByLabel`: em JSF/RichFaces legado, muitos elementos nao possuem acessibilidade confiavel. IDs JSF estaveis, como `form:campo`, podem ser o melhor contrato quando declarados diretamente e nomeados no Page Object.

Elemento JSF `attached` e `hidden` nao e automaticamente erro: menus, submenus e componentes RichFaces podem existir ocultos no DOM ate o acionamento correto. Use `toBeAttached` somente para contrato tecnico de menu/markup e mantenha `toBeVisible` para campos interativos, mensagem final, registro e resultado funcional.

Se `getByText` gerar duplicidade, nao troque o criterio por outro mais fraco. Escopar por formulario, menu, tabela, linha, cabecalho ou criterio composto informado pelo usuario. Se uma alternativa preservar apenas parte do criterio, pedir confirmacao antes de alterar.

Quando houver snapshot/HTML de tela legada, usar `legacy-jsf-map.mjs` para extrair controles, links, sinais `jsfcljs`, troca de aba, `_blank`, popup por formulario e links por icone. Gerar um unico manifest de probes por tela em vez de validar um seletor por processo.

## Overlays Opcionais Tardios

Quando a aplicacao possuir um consentimento conhecido, como `Ciente` para cookies, procura-lo com espera curta na abertura. Se aparecer, aceita-lo e confirmar que desapareceu antes de preencher usuario e senha; se nao aparecer, continuar sem reprovar o cliente.

Cookie, modal, dialogo ou overlay que surge depois do carregamento ainda pode interceptar um clique mesmo quando a verificacao proativa nao o encontrou. Para uma acao critica, tentar o clique com timeout curto, recuperar apenas quando o overlay estiver visivel, fecha-lo, confirmar que desapareceu e repetir a acao uma vez. Relancar o erro original quando o overlay nao for a causa; nunca transformar a recuperacao em `catch` generico que oculta falhas.

Para campos em formularios tabulares ou telas legadas:

- Preferir `getByLabel`, `getByRole` e `getByText` escopado quando houver nome acessivel.
- Quando a label for apenas visual, localizar a linha ou container pelo texto da label e entao buscar `input`, `textarea` ou `select` dentro dele.
- Quando so houver ID parcialmente estavel, usar sufixo escopado, como `textarea[id$=":justificativa-objetivos"]`, dentro da secao correta.
- Para radios/checkboxes em formulario legado, preferir helper por label de campo + label de opcao: `radioByFieldLabel(form, 'Titulo', 'Contem')`. O helper deve validar unicidade e evitar `radios[1]`, `children[2]` ou ID gerado.
- Para ID JSF estavel inevitavel, evitar escape e declarar o locator diretamente no Page Object:

```javascript
this.nome = page.locator('[id="cadastroCurso:nome"]');
```

- Para textareas ocultos por editor JSF, centralizar sufixos estaveis:

```javascript
byTextareaIdSuffix(suffix) {
  return this.conteudo.locator(`textarea[id$="${suffix}"]`);
}
```

- Nao criar `byId`, `localizarPorId` ou helper generico que apenas encapsule `page.locator`.
- Criar getters/metodos semanticos, como `localCursoInput`, `objetivosTextarea` e `preencherObjetivosImportancia`.
- Se usar sufixo `id$` em campo critico, validar unicidade antes de preencher: `await expect(campo).toHaveCount(1)`.
- Em autocomplete de cadastro anterior, excluir mensagens vazias/sem resultado e itens desabilitados antes de `.first()`; quando a escolha representar dominio, filtrar pelo texto intencional.
- Depois de clicar em sugestao de autocomplete, preferir o valor real do input via `await campo.inputValue()` em vez do texto completo da linha.
- Para campos visiveis, usar `await expect(campo).toBeEditable()` e `fill`; reservar `evaluate`/eventos para editor JSF oculto com comentario curto.
- Ao preencher editor JSF oculto via setter nativo, disparar `input` e `change` com `{ bubbles: true }`, e finalizar com `toHaveValue`.
- Para JSF/AJAX, substituir `waitForLoadState` generico por assert do efeito esperado: campo habilitado, opcao carregada, texto da proxima etapa ou mensagem.
- Para mensagens obrigatorias, tentar containers de erro/alerta e fazer fallback para o conteudo principal, evitando `body` inteiro.
- Em `select`, buscar opcoes com `textContent || ''`, `trim`, normalizacao de espacos e uppercase antes de comparar.
- Se `selectOption` no placeholder disparar AJAX JSF e recolocar imediatamente a primeira opcao, usar `locator.evaluate` apenas na validacao negativa para definir o valor do placeholder sem disparar `change`. Comentar o fallback, confirmar com `toHaveValue` e submeter logo depois; preencher primeiro a sentinela e deixar esse select como ultima alteracao.

Exemplos preferidos:

```javascript
this.localCursoInput = page
  .locator('tr', { hasText: /^Local/ })
  .locator('input, textarea, select');

this.objetivosTextarea = page
  .locator('fieldset, table, form', { hasText: 'Objetivos e Importancia' })
  .locator('textarea[id$=":justificativa-objetivos"]');
```

Usar ID completo gerado somente como ultimo recurso e deixar comentario curto no codigo explicando que nao havia label, role, texto contextual ou sufixo estavel suficiente.

## Tabelas E Listagens

- Localizar primeiro a linha pelo texto unico do registro.
- Clicar em icone, link ou botao dentro da mesma linha.
- Preferir `alt`, `title`, `aria-label` ou texto acessivel quando existir.
- Para links e botoes, tentar `getByRole` com nome acessivel antes de procurar `img[title]` interno.
- Se a acao nao tiver nome acessivel, usar seletor relativo ao container correto e justificar no codigo.
- Se a linha for de pessoa ou usuario real, nao gravar o nome literal no codigo; receber o valor por variavel local ou usar registro de teste rastreavel.

## Estrutura De Codigo

Em projeto novo, usar estrutura minima:

```text
tests/e2e/
tests/pages/
tests/fixtures/
tests/data/
tests/utils/
playwright.config.js
package.json
.env.example
.gitignore
```

Preservar a estrutura existente quando houver Playwright no repositorio. Criar `fixtures`, `data` e `utils` somente quando o fluxo exigir reuso ou massa maior; nao criar arquivos vazios por padrao.

Usar kebab-case para specs/dados/utils e PascalCase para Page Objects. Criar pelo menos um Page Object por tela ou area funcional tocada pelo fluxo, mas com metodos minimos para o caminho solicitado. O teste principal deve contar o fluxo:

```javascript
test('deve cadastrar projeto quando dados obrigatorios forem validos', async ({ page }) => {
  await loginPage.realizarLogin();
  await cadastroPage.preencherDadosObrigatorios(dadosProjeto);
  await cadastroPage.salvar();
  await cadastroPage.validarMensagemSucesso();
});
```

Page Objects devem representar acoes funcionais, como `realizarLogin`, `acessarFuncionalidade`, `obterCamposObrigatorios`, `preencherDadosObrigatorios`, `validarObrigatoriedade`, `avancarEtapa`, `confirmarOperacao`, `validarMensagemSucesso` e `validarRegistroNaListagem`.

Em smoke com muitos campos, a colecao campo-locator-valor pertence ao Page Object. A spec recebe os descritores para manter o loop visivel, mas nao acessa `controle` diretamente. O Page Object pode usar o descritor para preencher e restaurar; nao deve conhecer o runner nem executar o smoke inteiro.

Um fluxo de negocio atravessando varias telas deve ficar em um unico `test`, com chamadas sequenciais e nomes funcionais. Nao criar um `test` por tela quando as telas dependem da mesma sessao, do mesmo cadastro ou do mesmo estado transacional.

Obrigatorios e botoes da mesma operacao tambem ficam nesse unico `test`. Usar um loop de obrigatorios por tela e, em cada submissao negativa, manter vazio um campo-sentinela com validacao conhecida. O Page Object confirma a evidencia atribuivel ao alvo com `expect.soft` e restaura alvo e sentinela em `finally`. A sentinela continua protegida por assertion normal, pois uma regra quebrada no alvo nao pode transformar o teste negativo em cadastro real. Testes negativos de tipo/formato nao pertencem ao smoke de implantacao.

O cadastro positivo so pode ser submetido quando nenhuma obrigatoriedade suave falhou. A spec consulta `testInfo.errors` uma unica vez depois do loop; se houver erro, retorna antes da persistencia, sem novo login ou reentrada.

O teste deve ser reprodutivel por outra pessoa com o mesmo perfil funcional: iniciar pela URL/configuracao do projeto, autenticar com variaveis de ambiente, criar ou localizar massa controlada, e validar o efeito funcional sem depender de estado de execucoes anteriores.

Apos submissao ou navegacao JSF, um metodo como `formularioEstaVisivel` deve aguardar um campo estavel com `waitFor({ state: 'visible' })` e timeout curto. `isVisible()` consulta apenas o instante atual e pode confundir a troca temporaria do DOM com saida real do fluxo.

Evitar metodos como `clickButton1`, `fillInput2`, `goNext` ou seletores complexos direto no spec. A spec nao deve usar `page.locator`, `getByRole`, `getByLabel` ou seletores CSS/XPath diretamente, salvo em asserts muito simples e justificados pelo padrao local.

## Page Objects

Cada Page Object deve conter locators da tela, acoes reutilizaveis, metodos com nomes claros e pequenas validacoes ligadas aquela tela quando fizer sentido. Preferir locators no `constructor` ou getters simples; evitar objetos gigantes ou genericos demais.

Exemplo de formato:

```javascript
class LoginPage {
  constructor(page) {
    this.page = page;
    this.usuarioInput = page.getByLabel('Usuario');
    this.senhaInput = page.getByLabel('Senha');
    this.entrarButton = page.getByRole('button', { name: 'Entrar' });
  }

  async acessar() {
    await this.page.goto('/');
  }

  async realizarLogin(usuario, senha) {
    await this.usuarioInput.fill(usuario);
    await this.senhaInput.fill(senha);
    await this.entrarButton.click();
  }
}
```

Manter dados variaveis fora do Page Object, recebidos por parametro. O Page Object conhece a tela; a spec conhece o cenario.
