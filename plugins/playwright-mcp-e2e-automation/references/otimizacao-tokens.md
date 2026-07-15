# Otimizacao De Tokens

Use este arquivo ao criar, ampliar ou reparar automacoes quando houver risco de consumo alto, redescoberta de telas, muitos passos, modos economicos ou duvida sobre quando usar CLI ou MCP.

## Principio Central

Robustez prevalece sobre economia. Reduzir tokens por roteiro compacto, logs curtos, leitura seletiva, execucao incremental e MCP sob demanda. Nunca reduzir tokens por seletor fragil, assert generica, dado real hardcoded, validacao removida ou teste superficial.

## Protocolo Economico

1. Normalizar o pedido em roteiro compacto: objetivo, perfil, passos, dados, telas esperadas, acoes, validacoes e restricoes.
2. Consultar codigo, Page Objects e logs curtos antes de abrir MCP.
3. Se existir `.playwright-e2e/private-domain/`, carregar apenas resumo/receitas relevantes como contexto local privado; nao copiar valores privados para codigo ou resposta.
4. Classificar cada item do roteiro:
   - `cli`: instalacao, scaffold, execucao, validacao, auditoria, repair incremental, lint/typecheck ou comando repetivel.
   - `mcp`: tela nao mapeada, seletor ambiguo, menu/modal/autocomplete/tabela dinamica, estado real incerto ou falha que o log nao explica.
   - `remover`: exploracao fora do escopo, log repetitivo, DOM completo, reprocessamento do passo bruto ou leitura desnecessaria.
5. Descobrir via MCP somente os elementos necessarios para o proximo passo e uma validacao funcional.
6. Manter a descoberta MCP em uma sessao/pagina maximizada e continua por fluxo; nao abrir probes Playwright temporarios para cada tela ou seletor ainda nao codificado.
7. Gerar ou alterar codigo de forma incremental.
8. Validar por CLI no menor escopo que prove o fluxo.
9. Em falha, usar MCP apenas se codigo e log do CLI nao explicarem tela, seletor ou estado.

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

Nao gravar nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails, telefones, cookies, tokens, senha, storageState ou identificadores pessoais em codigo, fixture versionada, assert, comentario ou log.

Para reprodutibilidade:

- login pelo fluxo automatizado com `process.env`;
- URL por `BASE_URL`/`baseURL`;
- massa neutra gerada com `runId`;
- datas, periodos, anos, semestres e prazos gerados em runtime ou parametrizados localmente quando forem regra fixa;
- registro preexistente inevitavel por variavel generica em `.env` ou fixture local ignorada;
- assertions sobre efeito funcional, nao sobre dado pessoal real.

Economia de tokens nao justifica copiar data observada ou valor valido apenas na execucao atual. Para dados temporais, guardar a estrategia curta: data inicial relativa a execucao, data final derivada da inicial, periodo calculado ou variavel local exigida pela regra.

## Contexto Local

Overlay privado permitido: `.playwright-e2e/private-domain/`, sempre ignorado pelo Git, para glossario, padroes e receitas locais. Ele reduz tokens por evitar reexplicar dominio recorrente, mas nao substitui validacao funcional nem pode ser versionado.

Nao criar cache, ledger ou lock no projeto para guardar telas, fluxos ou tentativas. A descoberta corrente permanece na tarefa do Codex e as recuperacoes acontecem diretamente na sessao do navegador.

## Modos

- `padrao`: roteiro compacto, codigo/CLI primeiro, MCP sob demanda, resposta curta.
- `discovery`: mapear somente tela/seletor/validacao necessarios, sem gerar teste salvo pedido explicito.
- `repair`: corrigir falha com CLI primeiro e MCP apenas quando houver incerteza real.
- `cli-only`: usar CLI quando nao existe duvida visual; interromper e mudar para MCP se surgir incerteza.
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
