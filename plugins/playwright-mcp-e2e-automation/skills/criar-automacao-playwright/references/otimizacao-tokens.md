# Otimizacao De Tokens

Use este arquivo ao criar, ampliar ou reparar automacoes quando houver risco de consumo alto, redescoberta de telas, muitos passos, cache local, modos economicos ou duvida sobre quando usar CLI, MCP ou cache.

## Principio Central

Robustez prevalece sobre economia. Reduzir tokens por roteiro compacto, cache sanitizado, logs curtos, leitura seletiva, execucao incremental e MCP sob demanda. Nunca reduzir tokens por seletor fragil, assert generica, dado real hardcoded, validacao removida ou teste superficial.

## Protocolo Economico

1. Normalizar o pedido em roteiro compacto: objetivo, perfil, passos, dados, telas esperadas, acoes, validacoes e restricoes.
2. Consultar cache local em `.playwright-e2e/cache/` antes de abrir MCP.
3. Classificar cada item do roteiro:
   - `cache`: tela, rota, label, seletor, acao ou validacao ja mapeados e ainda confiaveis.
   - `cli`: instalacao, scaffold, execucao, validacao, auditoria, repair incremental, lint/typecheck ou comando repetivel.
   - `mcp`: tela nao mapeada, seletor ambiguo, menu/modal/autocomplete/tabela dinamica, estado real incerto ou falha que o log nao explica.
   - `remover`: exploracao fora do escopo, log repetitivo, DOM completo, reprocessamento do passo bruto ou leitura desnecessaria.
4. Descobrir via MCP somente os elementos necessarios para o proximo passo e uma validacao funcional.
5. Gerar ou alterar codigo de forma incremental.
6. Validar por CLI no menor escopo que prove o fluxo.
7. Em falha, usar MCP apenas se cache, codigo e log do CLI nao explicarem tela, seletor ou estado.

## Seletores Confiaveis

Preferir nesta ordem:

1. `getByRole` com nome acessivel estavel.
2. `getByLabel`.
3. `getByPlaceholder`.
4. `getByText` estavel e escopado ao container correto.
5. `getByTestId` quando existir.
6. ID estavel centralizado em helper semantico, especialmente em JSF/RichFaces legado.
7. CSS semantico relativo a formulario, tabela, linha ou secao.
8. XPath somente como ultimo recurso, com justificativa curta.

Nao usar seletor por indice, posicao, ordem visual, classe gerada, texto volatil, `.nth()` ou `.first()` sem filtro estavel. Se usar sufixo de ID ou fallback JSF, validar escopo/unicidade e manter o detalhe dentro do Page Object.

## Dados Reutilizaveis E Seguros

Nao gravar nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails, telefones, cookies, tokens, senha, storageState ou identificadores pessoais em codigo, cache, fixture versionada, assert, comentario ou log.

Para reprodutibilidade:

- login pelo fluxo automatizado com `process.env`;
- URL por `BASE_URL`/`baseURL`;
- massa neutra gerada com `runId`;
- registro preexistente inevitavel por variavel generica em `.env` ou fixture local ignorada;
- assertions sobre efeito funcional, nao sobre dado pessoal real.

## Cache Local

Cache permitido: `.playwright-e2e/cache/`, sempre ignorado pelo Git.

Arquivos sugeridos:

- `screens.json`: tela, rota, cabecalho, labels, acoes, seletores escolhidos e validacoes.
- `flows.json`: roteiro compacto, telas usadas, comandos CLI e validacoes esperadas.
- `auth.json`: somente metadados seguros de perfil/autenticacao; nunca cookies, tokens, senha ou storageState.

O cache e uma sugestao, nao uma verdade absoluta. Invalidar ou confirmar via MCP quando:

- teste falhar por seletor, navegacao ou estado visual;
- tela mudou;
- permissao/perfil mudou;
- seletor ficou ambiguo;
- componente dinamico nao bate com o mapa;
- cache contem dado sensivel ou informacao especifica demais.

## Modos

- `padrao`: roteiro compacto, cache primeiro, MCP sob demanda, CLI para validar, resposta curta.
- `discovery`: mapear somente tela/seletor/validacao necessarios, sem gerar teste salvo pedido explicito.
- `repair`: corrigir falha com CLI primeiro e MCP apenas quando houver incerteza real.
- `cli-only`: usar CLI/cache quando nao existe duvida visual; interromper e mudar para MCP se surgir incerteza.
- `debug`: diagnostico mais detalhado, sem segredos, dados pessoais, DOM completo ou logs extensos desnecessarios.
- `full`: recriar estrutura ou fluxo inteiro somente quando o usuario pedir explicitamente.

## Saida Economica

No modo padrao, responder apenas:

- arquivos criados/alterados;
- fluxo automatizado;
- validacoes;
- comando executado;
- resultado;
- pendencias/bloqueios.

Nao repetir passo a passo inteiro, DOM, HTML, logs longos, screenshots, traces ou justificativas extensas para cada seletor. Em `debug`, detalhar somente o necessario para diagnostico e sempre sanitizar dados sensiveis.
