# Legibilidade Do Codigo Gerado

Use esta referencia ao criar ou refatorar specs extensas, especialmente quando o leitor tiver pouca experiencia com Playwright.

## Linguagem

- Seguir o idioma predominante do pedido e do projeto. Em projetos em portugues, usar portugues em variaveis, metodos de dominio, titulos, etapas e comentarios.
- Preservar APIs e termos do Playwright/JavaScript, como `test`, `expect`, `page`, `locator`, `beforeAll`, `try` e `catch`.
- Nao usar acentos em identificadores. Manter acentos em comentarios, titulos e mensagens visiveis.
- Preferir nomes naturais e objetivos. Evitar abreviacoes, nomes genericos como `data`, `access`, `success` e `planned`, e traducoes artificialmente longas.

## Estrutura

- Manter a historia principal visivel na spec. Page Objects concentram seletores e interacoes, nao a orquestracao completa do cenario.
- Usar `test.step` apenas para grandes fases funcionais. Nao criar uma etapa para cada campo obrigatorio.
- Representar listas de validacao com objetos nomeados, como `{ campo: 'nome', rotulo: 'Nome' }`, em vez de pares posicionais.
- Extrair funcao somente quando representar uma fase clara ou eliminar repeticao real. Evitar factories, wrappers e helpers genericos usados uma unica vez.
- Reduzir condicionais profundas sem dividir o fluxo transacional nem impedir a escrita do relatorio final.

## Comentarios

Comentar linhas-chave para explicar intencao, causa ou efeito que nao sejam obvios para um leitor iniciante:

- por que o preflight ocorre antes da navegacao;
- origem de credenciais e massa do cliente;
- motivo do `runId` e da sessao unica;
- estrategia de remover, submeter e restaurar obrigatorios;
- restauracao de campos volateis;
- dependencias entre campos;
- recuperacao de overlay tardio;
- momento permitido para persistir;
- confirmacao da persistencia;
- escrita do relatorio em `finally`.

Comentario util:

```javascript
// Cada submissao limpa a senha no servidor; restaure-a antes da proxima validacao.
await cursoPage.restaurarSenha(credenciais.password);
```

Comentario redundante:

```javascript
// Clica no botao Cadastrar.
await botaoCadastrar.click();
```

Nao impor quantidade fixa de comentarios. A complexidade do fluxo define quanto precisa ser explicado.
