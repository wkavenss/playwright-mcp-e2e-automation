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

Nunca usar indice global, "primeiro botao da pagina", classe gerada ou seletor de layout quando houver contexto funcional. Se nao houver nome acessivel, registrar a limitacao e sugerir `data-testid` estavel quando isso desbloquear a automacao.

Mapear seletores sob demanda: identificar o seletor no momento em que o passo precisa dele, gravar no Page Object e seguir. Nao criar inventario de todos os campos/botoes antes de implementar o fluxo.

Nao usar nomes reais de pessoas, usuarios, servidores/funcionarios, emails, documentos, matriculas ou telefones observados na tela como seletor, `hasText`, assert ou fixture versionada. Em tabelas/listagens, preferir registro criado pela propria automacao com `runId`, texto neutro fornecido pelo usuario ou variavel local nao versionada. Quando um dado real for inevitavel para localizar um registro preexistente, encapsular em parametro generico e nao repetir o valor em comentarios ou logs.

Nao usar `.nth()`, indice numerico, posicao visual ou `.first()` sem filtro por texto/atributo estavel. Quando uma colecao exigir escolha, filtrar primeiro por escopo funcional, linha, label, cabecalho, role, `hasText` sanitizado ou dado de teste gerado pela propria automacao.

## JSF E Sistemas Legados

Nao usar IDs gerados como `j_id`, `j_id_jsp`, `j_idt` ou `javax.faces` como seletor principal. Esses valores mudam entre builds, sessoes ou telas e deixam a automacao fragil.

Nao converter tudo cegamente para `getByRole/getByLabel`: em JSF/RichFaces legado, muitos elementos nao possuem acessibilidade confiavel. IDs JSF estaveis, como `form:campo`, podem ser o melhor contrato quando centralizados em helper e nomeados por getter funcional.

Elemento JSF `attached` e `hidden` nao e automaticamente erro: menus, submenus e componentes RichFaces podem existir ocultos no DOM ate o acionamento correto. Use `toBeAttached` somente para contrato tecnico de menu/markup e mantenha `toBeVisible` para campos interativos, mensagem final, registro e resultado funcional.

Se `getByText` gerar duplicidade, nao troque o criterio por outro mais fraco. Escopar por formulario, menu, tabela, linha, cabecalho ou criterio composto informado pelo usuario. Se uma alternativa preservar apenas parte do criterio, pedir confirmacao antes de alterar.

Quando houver snapshot/HTML de tela legada, usar `legacy-jsf-map.mjs` para extrair controles, links, sinais `jsfcljs`, troca de aba, `_blank`, popup por formulario e links por icone. Gerar um unico manifest de probes por tela em vez de validar um seletor por processo.

Para campos em formularios tabulares ou telas legadas:

- Preferir `getByLabel`, `getByRole` e `getByText` escopado quando houver nome acessivel.
- Quando a label for apenas visual, localizar a linha ou container pelo texto da label e entao buscar `input`, `textarea` ou `select` dentro dele.
- Quando so houver ID parcialmente estavel, usar sufixo escopado, como `textarea[id$=":justificativa-objetivos"]`, dentro da secao correta.
- Para radios/checkboxes em formulario legado, preferir helper por label de campo + label de opcao: `radioByFieldLabel(form, 'Titulo', 'Contem')`. O helper deve validar unicidade e evitar `radios[1]`, `children[2]` ou ID gerado.
- Para ID JSF estavel inevitavel, preferir helper legivel a escape manual repetido:

```javascript
byId(id) {
  return this.page.locator(`[id="${id}"]`);
}
```

- Para textareas ocultos por editor JSF, centralizar sufixos estaveis:

```javascript
byTextareaIdSuffix(suffix) {
  return this.conteudo.locator(`textarea[id$="${suffix}"]`);
}
```

- Evitar helpers genericos que recebem IDs internos crus, como `campo(id)` e `preencherValor(id, valor)`, quando isso esconder seletores frageis.
- Criar getters/metodos semanticos, como `localCursoInput`, `objetivosTextarea` e `preencherObjetivosImportancia`.
- Se usar sufixo `id$` em campo critico, validar unicidade antes de preencher: `await expect(campo).toHaveCount(1)`.
- Em autocomplete, filtrar sugestoes pelo texto esperado antes de `.first()`; nao selecionar a primeira linha cegamente.
- Depois de clicar em sugestao de autocomplete, preferir o valor real do input via `await campo.inputValue()` em vez do texto completo da linha.
- Para campos visiveis, usar `await expect(campo).toBeEditable()` e `fill`; reservar `evaluate`/eventos para editor JSF oculto com comentario curto.
- Ao preencher editor JSF oculto via setter nativo, disparar `input` e `change` com `{ bubbles: true }`, e finalizar com `toHaveValue`.
- Para JSF/AJAX, substituir `waitForLoadState` generico por assert do efeito esperado: campo habilitado, opcao carregada, texto da proxima etapa ou mensagem.
- Para mensagens obrigatorias, tentar containers de erro/alerta e fazer fallback para o conteudo principal, evitando `body` inteiro.
- Em `select`, buscar opcoes com `textContent || ''`, `trim`, normalizacao de espacos e uppercase antes de comparar.

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
  await test.step('Realizar login', async () => {
    await loginPage.realizarLogin();
  });

  await test.step('Preencher dados obrigatorios', async () => {
    await cadastroPage.preencherDadosObrigatorios(dadosProjeto);
  });

  await test.step('Salvar e validar cadastro', async () => {
    await cadastroPage.salvar();
    await cadastroPage.validarMensagemSucesso();
  });
});
```

Page Objects devem representar acoes funcionais, como `realizarLogin`, `acessarFuncionalidade`, `preencherDadosObrigatorios`, `avancarEtapa`, `confirmarOperacao`, `validarMensagemSucesso` e `validarRegistroNaListagem`.

Um fluxo de negocio atravessando varias telas deve ficar em um unico `test`, com `test.step` para as etapas internas. Nao criar um `test` por tela quando as telas dependem da mesma sessao, do mesmo cadastro ou do mesmo estado transacional.

O teste deve ser reprodutivel por outra pessoa com o mesmo perfil funcional: iniciar pela URL/configuracao do projeto, autenticar com variaveis de ambiente, criar ou localizar massa controlada, e validar o efeito funcional sem depender de estado de execucoes anteriores.

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
