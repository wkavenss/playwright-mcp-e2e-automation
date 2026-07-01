---
name: criar-automacao-playwright
description: Criar uma nova automacao Playwright E2E ou ampliar um fluxo existente a partir de URL, usuario, senha e passo a passo. Use para transformar um procedimento web em codigo Playwright com Page Objects, .env, Playwright CLI, MCP sob demanda e validacao funcional em Chromium headed, mesmo quando o usuario nao pedir explicitamente para gerar codigo. Nao usar para apenas corrigir falha, revisar codigo ou somente configurar o projeto.
---

# Criar Automacao Playwright

Criar ou atualizar automacoes E2E com Playwright Test, JavaScript, Playwright CLI e Playwright MCP sob demanda. Sempre implementar codigo Playwright, sem perguntar se o usuario quer gerar codigo. Se o usuario informar URL, usuario, senha e passo a passo, interpretar que o trabalho e navegar quando necessario, entender o fluxo e entregar codigo Playwright. Por padrao, executar e validar com Playwright CLI em Chromium headed. O codigo final deve ser limpo, sanitizado e sem literais sensiveis observados na tela.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a criacao.

O plugin inclui configuracao de Playwright MCP em `.mcp.json`; usar esse servidor apenas quando for necessario observar a tela real. Em primeira execucao, o MCP pode exigir rede para baixar `@playwright/mcp@latest` via `npx`.

Antes de navegar, reduzir o pedido do usuario a um roteiro compacto e classificar cada parte como CLI, MCP, cache local ou remocao. Economizar tokens por menos contexto repetido, cache sanitizado, logs curtos, leitura seletiva e execucao incremental; nunca economizar usando seletor fragil, dado real hardcoded, assert generica ou teste superficial.

## Contrato Minimo

Antes de agir, exigir apenas:

- URL base;
- usuario;
- senha;
- passo a passo.

Se faltar algo, interromper e responder em uma linha: `Faltam: ...`. Nao criar projeto, instalar dependencias, explorar tela nem executar teste ate receber esses dados.

Dados opcionais: ambiente, objetivo, caminho, acao final, massa, validacoes, evidencias, modo e restricoes.

Quando houver credenciais no chat, gravar em `.env`, proteger no `.gitignore`, criar `.env.example` seguro e usar `process.env`. Nunca repetir segredos no codigo, README, logs ou resposta final.

Tratar tambem como sensiveis nomes reais de pessoas, usuarios, servidores/funcionarios, emails, telefones, documentos, matriculas, identificadores pessoais e valores especificos observados na interface. Nao hardcodar esses dados em specs, Page Objects, fixtures, asserts, comentarios, nomes de teste ou logs. Usar massa neutra gerada, dados fornecidos explicitamente pelo usuario para teste, `.env` local ou fixture local nao versionada; se o dado real for indispensavel para localizar um registro existente, pedir confirmacao e encapsular em variavel com nome generico.

## Padroes

- Implementar codigo Playwright: obrigatorio sempre, sem perguntar ao usuario.
- Mesmo que o usuario apenas descreva o fluxo, gerar a automacao Playwright quando houver contrato minimo.
- Nao encerrar com apenas navegacao, diagnostico, relato de tela ou instrucoes manuais.
- So nao gerar codigo se faltar dado minimo, houver bloqueio de escrita/tecnico ou o usuario disser explicitamente que nao quer codigo.
- Execucao no navegador: assumir Chromium `headed` quando nao informado.
- Sessao do fluxo: uma automacao de negocio deve rodar em uma unica spec/teste e uma unica pagina/contexto, sem fechar e reabrir navegador a cada tela.
- Reprodutibilidade: a spec deve poder ser executada por outra pessoa com o mesmo perfil funcional, dependencias instaladas e `.env` preenchido, sem depender da sessao local do autor.
- Trabalho: sempre rapido, com baixo consumo de tokens.
- Evidencias: assumir `minimo` quando nao informado.
- Campos obrigatorios: campos com estrela/asterisco azul na label sao obrigatorios.
- Nao submeter ou avancar formulario com campos vazios apenas para descobrir obrigatoriedade.
- Dados sensiveis: nao gravar no codigo nomes reais, usuarios, servidores/funcionarios, emails, telefones, documentos, matriculas ou identificadores vistos na tela.
- Erros e diagnosticos: nao transformar erro lancado, stack trace, log cru, timeout, mensagem transitoria ou tentativa falha em comentario, constante, fixture, assert ou documentacao no codigo.
- Higiene: remover sobras de exploracao, `console.log`, codigo comentado, `TODO/FIXME`, seletores temporarios, constantes nao usadas, snapshots de `body` e codigo linear de codegen antes de finalizar.
- Dados no sistema: evitar reexecucoes que criem registros parciais, duplicados ou lixo funcional. Planejar o fluxo antes da acao final, usar `runId` rastreavel e reutilizar/limpar dados criados somente quando for seguro.
- Estado externo: nao depender de navegador ja logado, perfil local, `storageState` manual, cache do MCP, arquivos absolutos da maquina, massa criada em execucao anterior ou dados escondidos fora do projeto.
- Cache local: consultar `.playwright-e2e/cache/` antes de usar MCP, mas tratar cache como sugestao. Confirmar via MCP quando houver falha, incerteza de tela, seletor ambiguo ou mudanca visual/estrutural.
- Modos: usar `padrao` quando nao informado; aceitar `discovery`, `repair`, `cli-only`, `debug` e `full` somente quando fizer sentido para o pedido.
- Projeto existente: preservar estrutura e padroes locais.
- Projeto novo: criar somente estrutura minima necessaria.
- Page Objects: usar por padrao para toda implementacao Playwright; a spec deve orquestrar o fluxo e nao concentrar seletores/interacoes.
- Estrutura: usar `tests/e2e`, `tests/pages`, `tests/fixtures`, `tests/data` e `tests/utils` somente quando fizer sentido; nao criar arquivos vazios desnecessarios.

## Saida Obrigatoria

A entrega principal sempre e codigo Playwright no workspace: spec, Page Objects e suporte minimo de `.env`/config quando necessario. Playwright MCP e apenas observacao pontual para descoberta ou diagnostico; nunca encerrar entregando somente navegacao, diagnostico ou relato de telas.

Se nao conseguir criar ou alterar arquivos, declarar bloqueio de escrita. Nao substituir a automacao por execucao manual no navegador.

## Escopo Rigido

Seguir somente a URL, credenciais e passo a passo informados pelo usuario. Nao abrir casos de uso vizinhos, menus parecidos, telas alternativas ou funcionalidades nao citadas. Se o caminho informado nao aparecer, parar no ponto exato, relatar o item ausente e manter o codigo estruturado ate onde foi possivel.

Quando o usuario pedir para preencher campos com dados aleatorios, gerar massa de teste rastreavel e preencher apenas os campos exigidos pela tela ou necessarios para concluir o passo solicitado.

## Inferencia Controlada

O usuario normalmente informa apenas os dados principais do fluxo. Mapear pela tela os campos com estrela/asterisco azul e preencher valores neutros, rastreaveis e validos quando eles nao alterarem a regra testada. Nao reutilizar nomes, usuarios ou identificadores reais vistos na tela como massa de teste. Usar Playwright MCP somente quando a tela real precisar ser observada para confirmar campo, seletor, estado ou comportamento.

Pedir informacao somente quando o dado obrigatorio impactar diretamente objetivo, resultado esperado, perfil, status, tipo, modalidade, permissao, periodo ou regra de negocio. Nao inventar regras nem escolher automaticamente uma opcao que mude o comportamento do cenario.

Registrar no resumo, de forma curta, quais dados obrigatorios foram inferidos.

## Execucao Rapida

Usar sempre o caminho mais curto que preserve boas praticas e economize contexto:

- roteiro compacto do fluxo antes de navegar;
- caminho principal informado pelo usuario;
- cache sanitizado para telas, rotas, labels, acoes, seletores e validacoes ja conhecidos;
- Playwright CLI para executar e validar;
- Playwright MCP somente quando cache, CLI, codigo e passo a passo nao explicarem a tela real;
- uma sessao continua de navegador por fluxo, sem reiniciar a cada tela;
- reprodutibilidade por CLI a partir de `.env`, massa controlada e projeto versionado;
- Page Objects minimos para telas ou areas tocadas;
- seletores mapeados sob demanda;
- uma validacao funcional forte;
- uma tentativa objetiva de correcao por falha;
- resumo curto.

Nao explorar menus, telas ou campos fora do passo a passo, salvo para desbloquear o fluxo ou entender uma falha.

## Modos Economicos

- `padrao`: gerar/alterar de forma incremental, usar cache primeiro, MCP sob demanda e resposta curta.
- `discovery`: mapear somente telas, campos, acoes, seletores e validacoes necessarios; nao gerar teste salvo pedido explicito.
- `repair`: corrigir falha existente sem recriar fluxo, usando CLI primeiro e MCP apenas se o log nao explicar tela/seletor/estado.
- `cli-only`: usar apenas CLI e cache quando nao houver incerteza visual; abortar para MCP se surgir seletor/tela/estado desconhecido.
- `debug`: permitir diagnostico mais detalhado, sem segredos, dados pessoais, DOM completo ou logs extensos desnecessarios.
- `full`: recriar estrutura ou fluxo inteiro somente quando o usuario pedir explicitamente.

## Evidencias

- `minimo` (padrao): sem README, trace, screenshot, video ou diagnostico detalhado. Usar `trace: 'off'`, `screenshot: 'off'` e `video: 'off'`.
- `falha`: gerar artefatos somente em falha ou quando forem indispensaveis para explicar bloqueio.
- `completo`: gerar README, traces, screenshots/videos quando util e diagnostico detalhado; usar somente quando o usuario pedir.

Mesmo em `minimo`, o terminal pode emitir saida. Nao copiar logs longos; resumir resultado, erro principal e proximo passo.

## Fluxo Principal

1. Validar contrato minimo.
2. Definir modo economico (`padrao` se nao informado) e nivel de evidencias.
3. Normalizar o passo a passo em roteiro compacto: objetivo, perfil, passos, dados, telas esperadas, acoes, validacoes e restricoes. Nao repetir o texto bruto do usuario em prompts/logs.
4. Executar `node ../../scripts/check-environment.mjs <raiz-do-projeto>`; se `node` nao existir, informar o bootstrap (`winget install OpenJS.NodeJS.LTS`, `brew install node` ou NodeSource/apt). Se faltar outro requisito, interromper e devolver os comandos exibidos pelo script.
5. Executar `node ../../scripts/optimize-context.mjs <raiz-do-projeto> --mode <modo> --json` quando houver Node, para consultar cache, validar higiene do cache e obter resumo compacto.
6. Detectar se ja existe Playwright no repositorio antes de instalar ou criar arquivos. Se nao existir, executar diretamente `../../scripts/scaffold-playwright.mjs <raiz-do-projeto>` a partir desta skill.
7. Definir o comando CLI mais curto para validar o fluxo, preservando scripts locais; preferir `test:e2e:headed`, `test:headed` ou `npx playwright test --headed --reporter=line`.
8. Classificar cada parte do roteiro como `cache`, `cli`, `mcp` ou `remover`; nao chamar MCP para item coberto por cache confiavel ou CLI deterministica.
9. Usar Playwright MCP somente quando precisar observar a tela real para confirmar caminho, seletor, campo com estrela/asterisco azul, menu, modal, autocomplete, tabela ou estado nao explicado pelo cache/CLI.
10. Mapear sob demanda apenas campos/acoes do proximo passo e uma validacao funcional. Nao submeter formulario vazio para descobrir obrigatoriedade.
11. Planejar o teste como fluxo continuo: uma spec/teste deve autenticar, navegar, preencher, avancar telas e validar o resultado sem reiniciar navegador entre etapas.
12. Antes de acao que cria/altera dado persistente, confirmar que campos obrigatorios, seletores e validacao final ja estao mapeados o suficiente para evitar cadastros parciais.
13. Sanitizar dados observados: substituir nomes reais, usuarios, identificadores pessoais e mensagens de erro cruas por massa neutra, variaveis de ambiente ou fixtures locais.
14. Implementar ou atualizar spec, Page Objects, dados, fixtures e utilitarios na menor superficie possivel.
15. Garantir reprodutibilidade: a spec deve partir de `BASE_URL`, autenticar com `process.env`, gerar/receber massa controlada e nao depender de estado manual da maquina atual.
16. Configurar `.env`, `.env.example`, `.gitignore`, scripts e Playwright apenas quando necessario.
17. Executar validacao final pelo CLI em Chromium headed, salvo pedido contrario.
18. Se o CLI falhar e o log nao explicar a causa, usar MCP apenas na tela necessaria, corrigir uma falha objetiva e executar o CLI novamente. Nao reiniciar o navegador por tela nem transformar cada tela em uma execucao separada.
19. Executar `../../scripts/audit-playwright.mjs <raiz-do-projeto> --changed` a partir desta skill. Auditar somente arquivos modificados e corrigir erros dentro do escopo solicitado.
20. Responder com resumo compacto.

## Regras Essenciais

- Usar Playwright CLI como caminho padrao para executar e validar automacoes.
- Usar Playwright MCP apenas quando for necessario observar a tela real para descobrir ou confirmar estado, seletor, campo, navegacao ou falha.
- Usar cache local sanitizado antes do MCP, mas nunca deixar cache substituir confirmacao real quando houver incerteza.
- Nao ler, colar ou resumir DOM completo, HTML completo, screenshot, trace ou arquivos inteiros quando um trecho, locator ou resumo de tela bastar.
- Manter o fluxo em uma unica sessao de navegador sempre que tecnicamente possivel. Nao fechar/reabrir navegador entre telas, nao criar uma spec/teste por tela e nao usar `chromium.launch` manual dentro de specs Playwright Test salvo exigencia explicita do projeto.
- Evitar lixo funcional: nao repetir submissao ou acao final apenas para descobrir a proxima tela; preferir observar antes, executar uma vez com massa rastreavel e validar o registro criado. Se uma execucao parcial criar dado, registrar no resumo e reutilizar ou limpar somente com seguranca.
- Construir a spec para ser reprodutivel por qualquer usuario com o mesmo perfil funcional: login pelo fluxo automatizado, URL e credenciais por `.env`, massa gerada ou parametrizada, assertions funcionais e sem dependencia de sessao local.
- Nao usar `test.only`, `test.skip`, perfil persistente de navegador, `launchPersistentContext`, `storageState` manual, caminho absoluto local ou dado secreto fora de `.env` para fazer o teste passar.
- Quando um registro preexistente for indispensavel, parametrizar por `.env`/fixture local ignorada e documentar no resumo qual tipo de dado e necessario, sem revelar o valor.
- Nao instalar ferramentas de sistema automaticamente; se o check de ambiente falhar, orientar com comandos objetivos.
- Nao assumir nomes de menus, botoes, campos, mensagens ou fluxos sem observar a interface.
- Campos com estrela/asterisco azul na label sao obrigatorios.
- Nao submeter ou avancar formulario com campos vazios apenas para descobrir obrigatoriedade.
- Priorizar: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` escopado, `getByTestId`, CSS semantico relativo e XPath so em ultimo caso.
- Nao usar seletor por indice, posicao, ordem visual, classe gerada, `.nth()` ou `.first()` sem filtro estavel.
- Nao usar IDs JSF gerados (`j_id`, `j_id_jsp`, `j_idt`, `javax.faces` ou similares) como seletor principal.
- Em telas JSF/legadas, substituir IDs gerados por label, role, texto visual, linha/container do formulario ou sufixo estavel do ID.
- Em JSF/RichFaces legado, nao converter tudo cegamente para `getByRole/getByLabel`; centralizar IDs estaveis em `byId(id)` quando forem o contrato mais confiavel.
- Evitar `waitForLoadState` generico, `.first()` sem filtro, `force: true` amplo e leitura do `body` inteiro; esperar efeitos observaveis e escopar ao conteudo principal.
- Em sufixos `id$` e textareas/editors JSF ocultos, validar unicidade; se usar setter nativo, disparar `input` e `change` e confirmar `toHaveValue`.
- Em autocomplete e `select`, filtrar/normalizar pelo texto esperado e usar o valor real do input apos selecionar.
- Nao mapear todos os campos/botoes; escolher o menor conjunto para executar o passo atual e validar o resultado.
- Em tabelas, localizar a linha por texto unico e so entao a acao dentro da linha.
- Nao usar nome real de pessoa, usuario, servidor/funcionario, documento, matricula, email ou telefone como texto hardcoded para localizar linha, preencher campo ou validar resultado. Preferir registro criado pela automacao, dado neutro fornecido pelo usuario ou variavel local.
- Manter seletores e interacoes dentro de Page Objects; specs devem conter passos funcionais, dados e assertions de alto nivel.
- Validar resultado funcional: mensagem, registro, detalhe persistido, estado final, download, protocolo ou bloqueio esperado.
- Evitar `waitForTimeout`; preferir waits automaticos e assertions do Playwright.
- Pedir autorizacao para rede, instalacao, navegador, credenciais, escrita sensivel, ambiente externo ou sandbox.
- Nao gerar README, traces, screenshots, videos ou diagnostico detalhado por padrao; usar o nivel de evidencias solicitado.
- Nao automatizar captcha, burlar MFA, commitar segredos, usar dados reais sensiveis ou executar acao destrutiva em ambiente real sem confirmacao explicita.
- Em falha, classificar causa principal antes de responder: seletor, navegacao, autenticacao, massa, permissao, regra funcional, ambiente, captcha/MFA ou sincronizacao.
- `npx playwright codegen` pode ser usado apenas como apoio inicial quando fizer sentido; codigo gerado por gravacao linear nao e entrega final e deve ser refatorado para Page Objects.

## Codigo E Boas Praticas

Codigo Playwright so fica pronto com Page Objects para telas ou areas tocadas. Excecao: projeto existente com arquitetura diferente; preservar o padrao local e justificar.

Evitar seletores, cliques e fills na spec. A spec conta a historia; Page Objects expõem metodos como `realizarLogin`, `preencherDadosObrigatorios`, `submeterFluxo` e `validarResultado`.

Em fluxos simples, criar Page Objects minimos e evoluir somente em falha ou duplicacao real.

A spec deve conter cenario, passos principais, validacoes e chamadas para Page Objects/helpers. Usar `test.step` em fluxos medios ou longos. Nomear testes no padrao `deve [comportamento esperado] quando [condicao]`.

Evitar codigo com aparencia de gravacao linear de cliques. Manter funcoes pequenas, nomes claros, pouca duplicacao e comentarios apenas para decisoes importantes, seletores frageis ou suposicoes relevantes.

Antes de finalizar, revisar Page Objects para remover IDs gerados, helpers genericos baseados em `id` cru e preenchimento via `document.getElementById`/`element.value` quando houver alternativa observavel. Em JSF/RichFaces legado, manter IDs estaveis centralizados em `byId(id)` quando isso for mais confiavel que acessibilidade inexistente.

Antes da resposta final, fazer uma passada de higiene nos arquivos alterados: remover `console.log`, comentarios de debug, codigo comentado, `TODO/FIXME`, mensagens de erro cruas, dados reais hardcoded e imports/constantes/helpers que sobraram da exploracao. Se uma falha precisa ser explicada, resumir no retorno ao usuario; nao deixar a falha documentada no codigo.

Antes de finalizar, conferir que outra pessoa conseguiria executar o fluxo pelo mesmo comando CLI apos preencher `.env`: sem depender da janela aberta pelo MCP, sem perfil local do navegador, sem `test.only/skip`, sem caminho absoluto da maquina e sem dados manuais invisiveis.

## Referencias Sob Demanda

Carregar estes arquivos apenas quando necessario:

- `references/otimizacao-tokens.md`: carregar ao criar, ampliar ou reparar fluxo quando houver risco de consumo alto, cache, modos, MCP sob demanda ou seletores/dados reutilizaveis.
- `references/exploracao-mcp.md`: carregar quando a tela for complexa ou quando a exploracao inicial nao bastar.
- `references/seletores-page-objects.md`: carregar somente ao refatorar muitos Page Objects, lidar com tabelas/listagens complexas ou apos falha por seletor fragil.
- `references/configuracao-playwright.md`: carregar para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias e templates.
- `references/diagnostico-e-evidencias.md`: carregar em falhas, bloqueios, ambientes instaveis ou quando precisar de diagnostico detalhado.

Nao carregar referencias se o fluxo puder ser implementado com o nucleo acima.

## Saida E Documentacao

Com `evidencias: minimo`, responder curto e nao criar/atualizar README. Com `evidencias: falha`, documentar somente limitacoes necessarias. Com `evidencias: completo`, usar `references/configuracao-playwright.md` e `references/diagnostico-e-evidencias.md` para README e evidencias completas.

Resumo final padrao:

```text
Codigo Playwright implementado: Sim
Arquivos criados/alterados:
Fluxo automatizado:
Validacoes:
Dados principais:
Dados obrigatorios inferidos:
Reprodutibilidade:
Como executar:
Execucao realizada:
Modo de execucao:
Evidencias:
Resultado:
Pendencias/Bloqueios:
```
