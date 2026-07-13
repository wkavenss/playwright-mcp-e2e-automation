---
name: criar-testes-implantacao-playwright
description: "Criar e validar testes Playwright para implantacao quando o pedido declarar `MODO: Implantacao` e fornecer URL, credenciais, caminho funcional, AGENTS.md do modulo e codigo-fonte. Use para analisar tela e cadeia seletiva JSP/MBean/validadores/conversores/persistencia e gerar testes de cadastro com sucesso, obrigatoriedade individual e tipo/formato, incluindo perfis de massa por cliente. Nao usar para geracao de massa em lote ou quando o pedido declarar `MODO: Geracao de massa de dados`."
---

# Criar Testes De Implantacao Playwright

Gerar testes de conformidade da implantacao no ambiente de referencia e mante-los portateis para clientes com o mesmo codigo e massas institucionais diferentes.

Conduzir a solicitacao somente com esta skill. Nao carregar outra skill do plugin durante a criacao.

## Contrato

Exigir `MODO: Implantacao`, URL, usuario, senha, caminho, caminho do `AGENTS.md` do modulo e raiz do codigo-fonte. Se o modo estiver ausente, contiver tambem `Geracao de massa de dados` ou faltar fonte, parar antes de criar arquivos e listar somente o que falta.

Gravar credenciais reais somente em `.env`, manter `.env` ignorado e criar `.env.example` sem segredos. Usar `E2E_CLIENT_PROFILE=referencia` no ambiente de referencia.

## Descoberta De Regras

1. Inspecionar a estrutura Playwright existente.
2. Ler o `AGENTS.md` informado e seguir suas instrucoes progressivas.
3. A partir da tela/operacao, localizar somente JSP, MBean, validadores, conversores e persistencia diretamente ligados ao fluxo. Nao analisar o modulo inteiro.
4. Montar inventario compacto por campo: label, origem da obrigatoriedade/formato, valor valido, comportamento invalido observavel, seletor e estrategia de persistencia.
   Classificar como `obrigatoriedade` somente quando o bloqueio ou mensagem puder ser atribuido ao proprio campo. Se limpar um controle apenas limpar, desabilitar ou invalidar outro campo, classificar a verificacao como `dependencia`; nunca reutilizar a mensagem do dependente como prova de obrigatoriedade do controlador.
5. Usar o codigo como comportamento esperado e a tela para confirmar o que esta implantado. Se divergirem, manter o criterio do codigo, falhar a spec e relatar divergencia de implantacao.
6. Nao transformar condicao interna sem efeito observavel em teste E2E.

## Classificacao Da Massa

Classificar cada valor obrigatorio:

- `gerado`: criar em runtime; nao gravar em JSON.
- `padrao-da-implantacao`: confirmado em scripts/tabelas de carga comuns; registrar em `config/defaults.json` quando precisar ser compartilhado.
- `especifico-do-cliente`: depende de cadastro/escolha institucional; registrar no perfil do cliente.

Para nova chave especifica, executar `node ../../scripts/update-client-profiles.mjs <raiz-do-projeto> --classification client --path <caminho.logico> --reference-value-json <json>`. O script preenche somente `referencia.json`, adiciona `null` aos demais perfis e preserva valores existentes. Nunca copiar o valor de referencia para outro cliente nem escolher a primeira opcao da tela.

Cada spec ou `describe` deve declarar somente seus requisitos com `obterDadosDaSpec`. Validar dentro de `test.beforeAll` sem depender de `page`, para que apenas specs selecionadas sejam bloqueadas:

```javascript
let dadosCliente;
test.beforeAll(() => {
  dadosCliente = obterDadosDaSpec({
    spec: 'modulo.operacao',
    requisitos: ['modulo.dadoObrigatorio'],
  });
});
```

Propriedades ausentes de outras specs nunca bloqueiam a execucao selecionada.

## Geracao Dos Testes

1. Criar um unico `test` para a operacao completa: autenticar uma vez, entrar no fluxo uma vez e manter a mesma fixture `page` ate a confirmacao de persistencia.
   Em projeto/pedido em portugues, usar portugues sem acentos nos identificadores de dominio e preservar APIs/palavras reservadas do Playwright e JavaScript. Seguir outro idioma quando ele for predominante no repositorio.
   Manter nomes naturais e objetivos; evitar abreviacoes, nomes genericos e traducoes excessivamente longas.
2. Pre-registrar no `RelatorioValidacoes` todas as verificacoes por tela. Definir os obrigatorios em uma unica colecao de objetos `{ campo, rotulo, controle, tipo, valorValido }`, sem callbacks, arrays posicionais, mapas paralelos ou `switch` duplicado. Derivar dessa colecao o preenchimento inicial, plano do relatorio, limpeza, restauracao e sequencia de validacao.
   Em cada tela, preencher a base valida uma vez e, para cada obrigatorio, remover somente o campo alvo, submeter, registrar bloqueio/mensagem e restaurar somente esse campo antes do proximo. Nao preencher novamente o formulario inteiro nem tratar default do primeiro carregamento como restaurado depois de limpa-lo.
   Mapear campos volateis que o servidor limpa a cada resposta, como senha e upload, e restaura-los apos toda submissao. Considerar validadores short-circuit que podem impedir as regras seguintes quando um campo volatil fica vazio.
   Descritores `(tela, tipo, campo)` devem ser unicos. Duas verificacoes nao podem aparecer no relatorio com a mesma descricao para esconder que uma mensagem foi atribuida ao campo errado.
3. Na mesma tela e sessao, validar formatos somente quando comprovados. Aceitar bloqueio de digitacao ou rejeicao na submissao e restaurar o valor valido antes de avancar.
   Para campos dependentes via AJAX, aguardar uma mudanca observavel no controle dependente antes de submeter; nao usar somente o valor transitorio do campo pai como sinal de sincronizacao.
4. Avancar uma unica vez por tela, somente depois das verificacoes alcancaveis, e concluir o cadastro positivo com dados sinteticos unicos, mensagem de sucesso e confirmacao na listagem/consulta.
5. Se uma validacao fizer o sistema avancar ou persistir indevidamente, registrar falha, marcar verificacoes inacessiveis como `nao-executado` e continuar do estado atual. Nao refazer login, voltar ao inicio ou criar outro registro.
6. Nao exigir `input[type=number]`; considerar texto com conversor, mascara ou validacao de servidor. Nunca excluir automaticamente dado persistido por defeito.

Organizar a spec com `test.step` para grandes fases funcionais, sem criar uma etapa por campo. Usar objetos nomeados em listas de validacao, manter a narrativa principal na spec e extrair somente funcoes que eliminem repeticao real ou representem fase clara.

Adicionar comentarios nas linhas-chave para explicar preflight, origem da massa, `runId`, sessao unica, restauracao de campos, dependencias, overlays, persistencia e escrita do relatorio. Nao comentar operacoes obvias isoladas. A quantidade depende da complexidade; consultar `../../references/legibilidade-codigo.md` ao criar ou refatorar uma spec de implantacao.

Gerar `test-results/implantacao/<spec>-<runId>.md` com itens `passou`, `falhou` e `nao-executado`, agrupados por tela. Escrever o relatorio em `finally`, anexa-lo ao `testInfo` e falhar a spec ao final se houver falha ou item nao executado. O relatorio nao pode conter credenciais, dados pessoais ou valores sensiveis.

## Implementacao E Validacao

- Executar `check-environment.mjs <raiz> --headed-smoke --json`, `optimize-context.mjs` e, se necessario, `scaffold-playwright.mjs <raiz> --mode implantacao`; nao iniciar exploracao se o smoke headed falhar.
- Usar Page Objects, `getByRole`, `getByLabel`, texto escopado e IDs JSF estaveis declarados diretamente como `[id="form:campo"]`.
- Nao criar `BasePage`, helper que apenas encapsule `page.locator`, fabrica que apenas chame `new`, funcao/exportacao sem consumidor ou `legacyForm` sem necessidade comprovada.
- Evitar `.nth()`, posicao, XPath e IDs JSF dinamicos.
- Em tabelas, priorizar tabela por role/nome acessivel e linhas com `getByRole('row').filter({ hasText })`; usar ID estavel do container como fallback legado e justificar CSS estrutural inevitavel.
- Para cookie, modal ou overlay opcional que possa aparecer tarde, nao depender apenas de `isVisible()` antes da acao critica. Recuperar somente o clique interceptado: confirmar o overlay, fecha-lo, repetir uma vez e relancar qualquer erro nao relacionado.
- Manter Chromium headed maximizado, `viewport: null`, `--start-maximized`, fixture CDP, `workers: 1`, dados unicos e registros positivos rastreados.
- Definir timeout unico proporcional ao fluxo completo; nao conservar o padrao de 30 segundos quando a mesma spec executar varias validacoes sequenciais.
- Na descoberta MCP, abrir uma unica pagina, dimensiona-la uma vez para a area disponivel da tela, autenticar uma vez e confirmar cada tela conforme for alcancada. Nao usar probe independente em fluxo transacional nem reentrar no cadastro para mapear a proxima tela.
- Corrigir falhas objetivas de seletor/sincronizacao na pagina MCP preservada. Usar probe curto independente somente quando ele nao reexecutar login, navegacao ou persistencia do fluxo.
- Parar quando faltar massa auxiliar e informar spec, propriedade, perfil e arquivo.
- Executar `npx playwright test <spec> --list` antes do headed para detectar titulo duplicado, erro de coleta e preflight carregado no escopo errado.
- Executar cada spec afetada e depois `quality-gate.mjs`.
- Considerar concluido somente quando as specs passarem no ambiente real; divergencia de implantacao ou massa ausente permanece bloqueio, nao sucesso parcial.

Carregar referencias em `../../references/` somente conforme o risco: legibilidade, configuracao/perfis, seletores, exploracao MCP, diagnostico ou otimizacao.

## Saida

Entregar spec, Page Object, `RelatorioValidacoes`, utilitarios necessarios, `.env.example`, comando, inventario resumido de obrigatorios/formatos, resultado headed, caminho do relatorio Markdown, perfis/chaves usados e pendencias.
