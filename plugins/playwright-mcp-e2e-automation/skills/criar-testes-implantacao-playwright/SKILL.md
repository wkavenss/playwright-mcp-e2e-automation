---
name: criar-testes-implantacao-playwright
description: "Criar e validar smoke tests Playwright quando o pedido declarar `MODO: Implantacao`, com URL, AGENTS.md, codigo-fonte e um caminho individual ou blocos numerados `CASO DE USO n`. Agrupe operacoes compativeis em ciclos simples para reduzir massa, preserve uma sessao em formularios multipagina e trate autocompletes sem nomes hardcoded. Nao usar com guia, testes negativos de formato ou `MODO: Geracao de massa de dados`."
---

# Criar Smoke Tests De Implantacao Playwright

Gerar smoke tests portateis a partir de um caminho individual ou de casos explicitos, agrupando apenas operacoes que possam usar com seguranca a mesma entidade durante um unico ciclo funcional.

Conduzir a solicitacao somente com esta skill. Nao carregar outra skill do plugin durante a criacao.

## Contrato

Exigir `MODO: Implantacao`, URL, `AGENTS.md` do modulo, raiz do codigo-fonte e um dos formatos:

- individual legado: `USUARIO`, `SENHA` e `CAMINHO` globais, gerando somente a operacao informada;
- numerado: um ou mais blocos `CASO DE USO <n>` com `OPERACAO`, `CAMINHO`, `PERFIL`, `USUARIO` e `SENHA` no proprio bloco. `MASSA E PRE-CONDICOES`, `DADOS ESPECIFICOS`, `RESULTADO ESPERADO` e `OBSERVACOES` sao opcionais.

No formato numerado, exigir sequencia exata 1, 2, 3, sem limite fixo. Nao aceitar uma secao global `CREDENCIAIS`, uma secao global `CASOS DE USO`, nem misturar `CAMINHO` global com blocos numerados. Recusar `GUIA DE NAVEGACAO`, `ABRANGENCIA` ou `SECOES/CASOS` e orientar a conversao em casos explicitos.

Fazer o preflight de todos os blocos antes de gerar arquivos. Deduplicar por `operacao + caminho + perfil`. Processar na ordem numerica todos os casos completos e bloquear somente os incompletos, duplicados ou inseguros. Falha global de URL, `AGENTS.md` ou codigo-fonte interrompe o lote. Falha de um caso nao impede os casos independentes seguintes.

Se o modo estiver ausente ou contraditorio, o contrato global estiver incompleto ou nenhum caso estiver pronto, parar antes de criar arquivos ou executar navegador e listar somente o que falta por numero.

Gravar credenciais reais somente em `.env`, manter `.env` ignorado e criar `.env.example` sem segredos. Normalizar o perfil para as chaves `E2E_<PERFIL>_USERNAME` e `E2E_<PERFIL>_PASSWORD`. Em implantacao, um `globalSetup` deve autenticar sequencialmente, com trace desabilitado, e criar um `storageState` temporario por combinacao de perfil e spec em `test-results/auth/`; a spec usa esse estado e inicia confirmando a sessao autenticada, sem login ou preenchimento de credenciais dentro do teste reportado. Casos com mesmo perfil e credenciais reutilizam as variaveis, mas nao um arquivo de estado entre specs. Se o mesmo perfil aparecer com credenciais diferentes, bloquear todos os casos envolvidos ate a inconsistencia ser resolvida. Nunca copiar credenciais para spec, Page Object, cache, log, trace, anexo ou relatorio. Nao exigir `E2E_CLIENT_PROFILE`, `config/defaults.json`, `config/clientes` ou preflight de massa por cliente.

## Processamento Dos Casos

- Seguir somente o `CAMINHO` de cada caso; nao descobrir funcionalidade vizinha nem transformar botoes tecnicos em novos casos.
- Antes de escolher valor de Tipo, Situacao, Status, Modalidade ou outro dominio, rastrear o produtor funcional no codigo/tela e confirmar o mesmo valor no filtro, no resultado e em qualquer formulario intermediario. Nao inferir o valor pelo nome da operacao. Se o produtor gera somente `MODULO`, por exemplo, a busca e a alteracao nao podem selecionar `DISCIPLINA`.
- Se `Alterar` abrir uma etapa generica que nao oferece o tipo real do alvo, nao substituir o dominio por uma opcao apenas para avancar. Validar que a acao abriu, cancelar nessa etapa e refazer a busca pelo mesmo alvo para provar preservacao.
- Agrupar casos somente quando tiverem o mesmo perfil, entidade e encadeamento natural, como cadastrar, consultar, alterar e remover o mesmo registro. Cada grupo recebe uma spec, um estado autenticado temporario, uma sessao e uma massa principal.
- Manter casos incompatíveis em specs independentes. Nao compartilhar registro, pagina, contexto ou ordem entre specs e nao preparar massa em `beforeAll`.
- `MASSA E PRE-CONDICOES`, `DADOS ESPECIFICOS`, `RESULTADO ESPERADO` e `OBSERVACOES` orientam somente o caso correspondente. Nao copiar o bloco do prompt como objeto, comentario ou metadado na spec.
- Nao criar cache de lote. Se houver interrupcao, informar casos concluidos, falhos, bloqueados e nao iniciados sem guardar credenciais ou massa.
- Falha de autenticacao bloqueia os casos com as mesmas credenciais, sem expor seus valores.

O lote existe apenas na orquestracao do plugin. A spec recebe somente a historia funcional do ciclo, sem numero do caso, status do lote, mapa de credenciais, inventario, relatorio customizado ou controle manual de fluxo.

## Tentativas Durante A Geracao

- Mapear pontos de persistencia antes de navegar e fixar um `runId` antes da primeira gravacao possivel.
- Manter uma unica sessao MCP por fluxo multipagina. Nao abrir probes independentes, repetir login ou iniciar o formulario novamente para descobrir a tela seguinte.
- Se uma tentativa persistir parcialmente, inspecionar o estado atual antes de executar novamente. Continuar o mesmo registro quando possivel; se houver remocao segura e autorizada, o Codex pode remover diretamente pelo navegador somente o `runId` atual.
- Se a sessao for perdida, abrir no maximo uma sessao de recuperacao para localizar o `runId` anterior antes de iniciar outro.
- Nunca transformar essa recuperacao em `localizarTentativa`, `retomarTentativa`, `removerTentativa`, fixture, ledger, lock, cache, script npm, spec de limpeza, setup ou teardown no projeto entregue.
- Se nao for seguro retomar nem remover, usar outro `runId` somente depois da verificacao e informar o residuo na resposta final. Nao repetir automaticamente.

Classificar cada caso antes de implementar:

- formulario de cadastro ou alteracao: obrigatorios, botoes, conclusao e persistencia segura;
- consulta: acesso, filtros informados, resultado e ausencia de erro funcional;
- relatorio ou download: acao de emissao e artefato produzido;
- remocao ou transicao irreversivel: criacao do alvo sintetico pela propria spec, prova de unicidade, acao e estado final.

Casos de alteracao, remocao ou transicao irreversivel nao podem atuar sobre massa preexistente. Se a propria spec nao puder criar e localizar o alvo atual com `runId`, bloquear somente esse caso.

Em consulta, a existencia da tabela nao e prova funcional. Correlacionar o filtro com todas as linhas retornadas pela coluna identificada pelo cabecalho e exigir ausencia de carregamento. Quando o valor de dominio nao estiver disponivel como filtro na interface, filtrar por uma identidade exata de um registro elegivel e ainda comprovar o dominio em todas as linhas retornadas.

## Descoberta Seletiva

1. Inspecionar a estrutura Playwright existente e ler o `AGENTS.md` informado.
2. A partir da tela, localizar somente JSP, MBean e persistencia diretamente ligados a:
   - obrigatorios de tela e servidor;
   - origem das listas dinamicas;
   - acoes dos botoes do formulario ou wizard;
   - persistencia intermediaria;
   - mensagem de conclusao;
   - consulta segura do registro, quando existir.
3. Nao analisar conversores ou validadores para criar entradas invalidas. Consulta-los somente quando forem necessarios para preencher um valor valido.
4. Montar durante a analise um resumo compacto por tela com obrigatorios, estrategia de valor valido, botoes, efeito observavel e risco de persistencia. Esse resumo orienta a implementacao e nao deve virar estrutura de dados na spec ou README.
5. Usar o codigo como comportamento esperado e a tela para confirmar o que esta implantado. Divergencia observavel deve falhar a verificacao correspondente.

## Dados Portateis

Classificar cada valor antes de codificar:

- `gerado`: texto, identificador ou data sintetica criada em runtime com `runId`;
- `dominio`: valor intencional que altera status, modalidade, tipo ou resultado esperado;
- `cadastro-anterior`: opcao institucional carregada de registros preexistentes.

Para `cadastro-anterior`, concentrar no Page Object a selecao portatil:

- ignorar opcao desabilitada, oculta, sem valor ou cujo texto normalizado seja placeholder como `Selecione`, `Escolha` ou `-- SELECIONE --`;
- selecionar o primeiro candidato restante e confirmar o valor selecionado;
- em lista dependente, aguardar candidato valido apos a mudanca do campo pai;
- em autocomplete com valor especifico, pesquisar diretamente o valor, normalizar os resultados e exigir uma unica correspondencia exata;
- em autocomplete sem valor especifico, consultar `%%%`, filtrar vazio, desabilitado, oculto, placeholder e mensagem sem resultado, e escolher o primeiro candidato restante;
- quando dois campos exigirem pessoas diferentes, excluir o primeiro valor da segunda selecao e bloquear se nao houver outro candidato;
- diante de homonimos, usar matricula, unidade ou codigo fornecido; sem informacao complementar, bloquear em vez de escolher por posicao;
- nao usar nome presumido, `.nth()`, indice fixo, busca por tentativa e erro ou `.first()` antes da filtragem;
- confirmar o valor final do input depois do clique;
- se nenhum candidato existir, falhar somente a spec com `Nenhuma opcao valida disponivel para <rotulo>`.

Quando houver autocomplete, carregar `../../references/autocompletes-portateis.md` e aplicar o contrato completo de busca exata, filtragem, ambiguidade e papeis distintos.

Campos de dominio continuam com valor intencional. Nunca escolher automaticamente a primeira opcao de Situacao, Status, Modalidade ou outro campo que mude o significado do cadastro.

## Smoke Da Operacao

1. Criar um unico `test` quando as operacoes compartilham a mesma entidade, o mesmo `runId` e o mesmo ciclo transacional. Operacoes realmente independentes podem usar testes separados, cada um com pagina, login e massa proprios.
2. Fazer o Page Object expor os obrigatorios em uma unica colecao de objetos nomeados, como `{ campo, rotulo, controle, tipo, valorValido, origem }`. A spec recebe essa colecao por `obterCamposObrigatorios(dados)` e mantem somente o loop funcional; nao repetir o mapeamento campo-locator-valor na spec. Quando houver muitos campos, usar um objeto completo por linha quando legivel e quebrar somente descritores realmente longos, sem criar factory posicional.
3. Em cada tela, preencher uma base valida e verificar cada obrigatorio na mesma sessao. Antes da submissao negativa, limpar primeiro um campo-sentinela conhecido como obrigatorio e deixar o alvo por ultimo. A sentinela impede persistencia acidental e a ordem evita que um evento posterior restaure um select dependente JSF; ela nao representa uma segunda verificacao planejada.
4. Concentrar no Page Object a operacao atomica `validarObrigatoriedade`: escolher a sentinela, limpar ambos, confirmar por assertion normal que a sentinela continua ausente, submeter, verificar o alvo com `expect.soft` e restaurar alvo e sentinela em `finally`, inclusive campos volateis que o servidor limpa.
5. Percorrer os obrigatorios diretamente no mesmo loop. O rotulo de cada campo deve aparecer na mensagem da assertion; nao criar uma etapa separada para cada campo.
6. Depois do loop, usar uma unica barreira antes do cadastro positivo: `if (testInfo.errors.length > 0) return;`. As falhas suaves ja reprovam o teste; o retorno apenas impede que a execucao persista um registro depois de uma obrigatoriedade reprovada.
7. Tratar dependencias apenas para preencher o fluxo. Nao criar teste negativo separado para dependencia, tipo ou formato.

Navegacao, acesso, botoes e conclusao devem usar assertions normais do Playwright e falhar imediatamente. Continuar depois de uma falha que pode ter mudado a pagina torna o estado desconhecido e aumenta o risco de persistencia indevida. Usar `expect.soft` somente nas verificacoes de obrigatoriedade que foram projetadas para restaurar o formulario com seguranca.

A spec continua responsavel pela sequencia funcional e pela barreira baseada em `testInfo.errors`. O Page Object nao pode importar ou manipular `testInfo`, nem oferecer metodo monolitico como `executarSmokeCompleto` que esconda toda a operacao. Nao criar annotations, `RelatorioValidacoes`, `verificacoesPlanejadas`, estados manuais como `fluxoAcessivel`/`cadastroConcluido`, inventario duplicado de verificacoes ou `try/finally` na spec apenas para produzir relatorio.

Quando um unico ciclo possuir varias operacoes de negocio relevantes, usar `test.step` no mesmo nivel para identifica-las no HTML e no trace, por exemplo `Criar e confirmar rascunho`, `Visualizar proposta` e `Remover rascunho`. Nao criar etapa para clique, preenchimento, espera, campo obrigatorio individual ou botao isolado. Nao aninhar etapas.

Em uma operacao com um unico teste, colocar o modulo no titulo do `test` e nao criar `test.describe` sem ganho organizacional. Manter a sequencia rasa e direta. O proprio runner registra erros, traces e screenshots; nao duplicar essa responsabilidade em infraestrutura particular.

## Botoes Do Fluxo

Cobrir somente botoes e links de acao do formulario ou wizard. Excluir menu global, logout, ajuda, paginacao e acoes de outras linhas.

- `Avancar` e `Submeter`: validar durante o caminho normal, confirmando a proxima tela ou o resultado esperado.
- Acao reversivel, como Limpar ou abrir modal: clicar, validar o efeito e restaurar o estado.
- `Voltar` e `Cancelar`: testar na mesma sessao e no mesmo registro. Reentrar somente quando a acao nao persistir outro dado ou quando o mesmo `runId` puder continuar.
- Remocao ou transicao irreversivel: incluir somente quando a propria spec puder criar e localizar exatamente o alvo sintetico da execucao atual.

Reentrada controlada para testar botao e permitida somente sem nova massa. Novo login, novo contexto ou `beforeEach` por verificacao continuam proibidos. Um ciclo pode persistir no maximo uma massa principal; se Remover fizer parte do ciclo, ele encerra funcionalmente o registro atual.

## Conclusao E Relatorio

- Submeter uma unica conclusao positiva com dados sinteticos e confirmar a mensagem exata.
- Um metodo semantico como `submeter()` pode executar a acao e validar o resultado imediato da mesma operacao. Nao esconder no Page Object varias fases independentes, como criar, consultar e remover, em uma unica chamada.
- Executar a conclusao positiva somente quando `testInfo.errors.length === 0` depois das obrigatoriedades. Se houver falha suave, encerrar o teste sem persistir; o Playwright manterá o resultado reprovado.
- Confirmar o registro em listagem/consulta quando houver caminho seguro sem massa adicional.
- Em remocao, confirmar persistencia do alvo com o `runId` atual, testar Cancelar quando existir, confirmar a acao e validar ausencia ou estado final. Nunca usar primeira linha, prefixo generico ou registro de outra execucao.
- Em copia a partir de registro existente, capturar a identidade da linha de origem, abrir a acao na mesma linha e provar os campos herdados e os campos reinicializados. Se Cancelar fizer parte do formulario, confirmar retorno e preservacao sem persistir copia indevida.
- Se a acao irreversivel falhar apos a criacao, preservar o registro rastreavel; nao repetir nem tentar limpeza automatica que possa mascarar a falha.
- Quando a consulta nao for segura ou nao existir, manter somente a validacao obrigatoria da mensagem final.
- Tratar as assertions funcionais como a prova do teste. Nunca anexar objetos manuais como `{ ok: true }`, pois eles apenas repetem a assertion e podem mentir sobre uma verificacao que nao ocorreu.
- Nao criar `qaEvidence`, `implantation-contract.json`, `qa-runner`, scanner de artefatos, leitor ZIP, scripts `test:qa` ou anexos JSON/captura por operacao. Essa infraestrutura polui a spec e duplica responsabilidades do Playwright.
- Nao gerar Markdown proprio, annotations ou etapas artificiais. O reporter HTML nativo deve mostrar diretamente quais specs passaram ou falharam; trace e screenshot ficam somente nas falhas.

Organizar a spec como uma sequencia direta. Usar `test.step` somente para operacoes de negocio do mesmo ciclo que precisem aparecer separadamente no relatorio. Separar blocos por linhas em branco e comentarios apenas quando explicarem uma decisao nao obvia. Usar portugues natural em identificadores de dominio, comentarios, titulos e mensagens, preservando APIs do Playwright e JavaScript. Consultar `../../references/legibilidade-codigo.md` quando o fluxo for extenso.

## Implementacao E Validacao

- Executar `check-environment.mjs <raiz> --headed-smoke --json`, `optimize-context.mjs` e, se necessario, `scaffold-playwright.mjs <raiz> --mode implantacao`. O scaffold deve permanecer minimo em todos os modos: configuracao Playwright, fixture maximizada, perfis de autenticacao e dados de teste. Implementar o `globalSetup` seguro somente junto das specs que realmente o consumirem. Essas ferramentas nao devem criar cache nem infraestrutura de relatorio no projeto.
- Usar Page Objects, locators semanticos e IDs JSF estaveis declarados diretamente como `[id="form:campo"]`.
- Nao criar camada `flows`, `BasePage`, helper de ID, fabrica trivial, utilitario preventivo ou perfil de cliente. Separar outro Page Object somente quando houver uma tela/componente real reutilizado em mais de um fluxo.
- Evitar `.nth()`, XPath, IDs dinamicos e `.first()` sem filtragem explicita de candidatos validos.
- Quando o consentimento puder aparecer na abertura, procura-lo por no maximo `2_000` ms antes do login; se aparecer, aceita-lo e confirmar que desapareceu antes de preencher credenciais. Se nao aparecer, continuar sem falhar. Preservar a recuperacao tardia quando ele interceptar uma acao, repetindo o clique uma vez e relancando erros nao relacionados.
- Depois de submissao ou navegacao, verificar continuidade com espera observavel por um campo estavel da tela; nao usar `isVisible()` imediato para concluir que o formulario desapareceu.
- Se login e consentimento ja estiverem duplicados em mais de um Page Object, extrair um Page Object de acesso com essa responsabilidade concreta; nao inclui-lo no scaffold generico sem evidencia na interface.
- Quando um clique com confirmacao tambem puder ser interceptado pelo consentimento, registrar o dialogo e reutilizar o metodo existente de recuperacao do clique. Nao manter dois fluxos paralelos de `try/catch`, aceite e repeticao.
- Centralizar acoes em `actionTimeout`; nao adicionar timeout menor em `click`, `fill` ou `selectOption` apenas para falhar cedo. Timeout local continua permitido em `expect.poll` ou assertion quando delimitar uma condicao assincrona real.
- Usar `timeout: 180_000` no `playwright.config` como margem total padrao e nao repetir `test.setTimeout` nas specs. Para operacao comprovadamente mais longa, preferir `test.slow()`; usar valor exato local somente quando indispensavel e justificado.
- Incorporar wrappers internos curtos usados uma unica vez ao metodo consumidor. Preservar metodos chamados pela spec e metodos semanticos com assertions ou recuperacao transacional.
- Nao dividir Page Object, criar facade ou extrair helper generico de select apenas para reduzir linhas. Exigir responsabilidade independente ou reuso comprovado.
- Nao impor percentual de reducao nem comprimir comandos para atingir uma contagem. Uma reducao valida elimina responsabilidade duplicada ou wrapper sem consumidor; mover o mesmo comportamento para outro arquivo nao conta como simplificacao.
- Manter Chromium headed maximizado, `viewport: null`, `--start-maximized`, fixture CDP e `workers: 1`.
- Classificar o caso como `formulario`, `consulta`, `relatorio`, `remocao` ou `transicao` e executar `quality-gate.mjs <raiz> --contract implantacao --case-kind <tipo> --files <specs> <pages>`. Depois executar `npx playwright test <specs> --list` e uma unica execucao headed dos arquivos aprovados, com `workers=1`, para produzir o HTML nativo sem duplicar registros.
- Considerar concluido somente quando o smoke passar no ambiente real; lista dinamica vazia deve ser relatada como bloqueio da spec, nao mascarada por valor fixo.

Carregar referencias em `../../references/` somente conforme o risco: configuracao, seletores, exploracao MCP, diagnostico, legibilidade ou otimizacao.

## Saida

Entregar uma spec simples por caso isolado ou ciclo compativel, Page Objects reutilizados, utilitarios realmente usados, `.env.example`, comandos headed, mapeamento dos casos para ciclos, caminho do HTML nativo e bloqueios reais. Informar tentativas e residuos apenas na resposta, sem criar infraestrutura de recuperacao no projeto.
