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

## JSF E Sistemas Legados

Nao usar IDs gerados como `j_id`, `j_id_jsp`, `j_idt` ou `javax.faces` como seletor principal. Esses valores mudam entre builds, sessoes ou telas e deixam a automacao fragil.

Para campos em formularios tabulares ou telas legadas:

- Preferir `getByLabel`, `getByRole` e `getByText` escopado quando houver nome acessivel.
- Quando a label for apenas visual, localizar a linha ou container pelo texto da label e entao buscar `input`, `textarea` ou `select` dentro dele.
- Quando so houver ID parcialmente estavel, usar sufixo escopado, como `textarea[id$=":justificativa-objetivos"]`, dentro da secao correta.
- Para ID JSF estavel inevitavel, preferir helper legivel a escape manual repetido:

```javascript
byId(id) {
  return this.page.locator(`[id="${id}"]`);
}
```

- Evitar helpers genericos que recebem IDs internos crus, como `campo(id)` e `preencherValor(id, valor)`, quando isso esconder seletores frageis.
- Criar getters/metodos semanticos, como `localCursoInput`, `objetivosTextarea` e `preencherObjetivosImportancia`.
- Se usar sufixo `id$` em campo critico, validar unicidade antes de preencher: `await expect(campo).toHaveCount(1)`.
- Em autocomplete, filtrar sugestoes pelo texto esperado antes de `.first()`; nao selecionar a primeira linha cegamente.
- Para campos visiveis, usar `await expect(campo).toBeEditable()` e `fill`; reservar `evaluate`/eventos para editor JSF oculto com comentario curto.
- Para JSF/AJAX, substituir `waitForLoadState` generico por assert do efeito esperado: campo habilitado, opcao carregada, texto da proxima etapa ou mensagem.

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
