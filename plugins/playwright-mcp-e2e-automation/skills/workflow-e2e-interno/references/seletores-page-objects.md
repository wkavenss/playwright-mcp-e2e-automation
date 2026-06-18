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

Nunca usar indice global, "primeiro botao da pagina", classe gerada ou seletor de layout quando houver contexto funcional. Se nao houver nome acessivel, registrar a limitacao e sugerir `data-testid` estavel quando isso desbloquear a automacao ou no modo `profundo`.

Mapear seletores sob demanda: identificar o seletor no momento em que o passo precisa dele, gravar no Page Object e seguir. Nao criar inventario de todos os campos/botoes antes de implementar o fluxo.

## Tabelas E Listagens

- Localizar primeiro a linha pelo texto unico do registro.
- Clicar em icone, link ou botao dentro da mesma linha.
- Preferir `alt`, `title`, `aria-label` ou texto acessivel quando existir.
- Se a acao nao tiver nome acessivel, usar seletor relativo ao container correto e justificar no codigo.

## Estrutura De Codigo

Em projeto novo, usar estrutura minima:

```text
tests/e2e/
pages/
fixtures/
data/
utils/
playwright.config.js
package.json
.env.example
.gitignore
```

Preservar a estrutura existente quando houver Playwright no repositorio.

Usar kebab-case para specs/dados/utils e PascalCase para Page Objects. Criar pelo menos um Page Object por tela ou area funcional tocada pelo fluxo, mas com metodos minimos para o caminho solicitado. O teste principal deve contar o fluxo:

```javascript
test('deve concluir o fluxo principal com sucesso', async ({ page }) => {
  await loginPage.realizarLogin();
  await homePage.acessarFuncionalidade();
  await fluxoPage.preencherDadosObrigatorios();
  await fluxoPage.submeterFluxo();
  await fluxoPage.validarResultado();
});
```

Page Objects devem representar acoes funcionais, como `realizarLogin`, `acessarFuncionalidade`, `preencherDadosObrigatorios`, `avancarEtapa`, `confirmarOperacao`, `validarMensagemSucesso` e `validarRegistroNaListagem`.

Evitar metodos como `clickButton1`, `fillInput2`, `goNext` ou seletores complexos direto no spec. A spec nao deve usar `page.locator`, `getByRole`, `getByLabel` ou seletores CSS/XPath diretamente, salvo em asserts muito simples e justificados pelo padrao local.
