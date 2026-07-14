---
name: criar-testes-implantacao-playwright
description: "Criar e validar smoke tests Playwright quando o pedido declarar `MODO: Implantacao`, com URL, AGENTS.md, codigo-fonte e um caminho individual ou blocos numerados `CASO DE USO n` com operacao, caminho, perfil e credenciais. Gere uma spec simples e independente por caso pronto, inclusive remocao segura sobre dados criados pela propria spec. Nao usar com guia de navegacao, testes negativos de tipo/formato, geracao de massa ou `MODO: Geracao de massa de dados`."
---

# Criar Smoke Tests De Implantacao Playwright

Gerar um smoke test portatil por operacao, a partir de um caminho individual ou de um ou mais casos de uso explicitos.

Conduzir a solicitacao somente com esta skill. Nao carregar outra skill do plugin durante a criacao.

## Contrato

Exigir `MODO: Implantacao`, URL, `AGENTS.md` do modulo, raiz do codigo-fonte e um dos formatos:

- individual legado: `USUARIO`, `SENHA` e `CAMINHO` globais, gerando somente a operacao informada;
- numerado: um ou mais blocos `CASO DE USO <n>` com `OPERACAO`, `CAMINHO`, `PERFIL`, `USUARIO` e `SENHA` no proprio bloco. `MASSA E PRE-CONDICOES`, `DADOS ESPECIFICOS`, `RESULTADO ESPERADO` e `OBSERVACOES` sao opcionais.

No formato numerado, exigir sequencia exata 1, 2, 3, sem limite fixo. Nao aceitar uma secao global `CREDENCIAIS`, uma secao global `CASOS DE USO`, nem misturar `CAMINHO` global com blocos numerados. Recusar `GUIA DE NAVEGACAO`, `ABRANGENCIA` ou `SECOES/CASOS` e orientar a conversao em casos explicitos.

Fazer o preflight de todos os blocos antes de gerar arquivos. Deduplicar por `operacao + caminho + perfil`. Processar na ordem numerica todos os casos completos e bloquear somente os incompletos, duplicados ou inseguros. Falha global de URL, `AGENTS.md` ou codigo-fonte interrompe o lote. Falha de um caso nao impede os casos independentes seguintes.

Se o modo estiver ausente ou contraditorio, o contrato global estiver incompleto ou nenhum caso estiver pronto, parar antes de criar arquivos ou executar navegador e listar somente o que falta por numero.

Gravar credenciais reais somente em `.env`, manter `.env` ignorado e criar `.env.example` sem segredos. Normalizar o perfil para as chaves `E2E_<PERFIL>_USERNAME` e `E2E_<PERFIL>_PASSWORD`, usando `obterCredenciais('<perfil>')` na spec. Casos com mesmo perfil e credenciais reutilizam essas variaveis. Se o mesmo perfil aparecer com credenciais diferentes, bloquear todos os casos envolvidos ate a inconsistencia ser resolvida. Nunca copiar credenciais para spec, Page Object, cache, log ou relatorio. Nao exigir `E2E_CLIENT_PROFILE`, `config/defaults.json`, `config/clientes` ou preflight de massa por cliente.

## Processamento Dos Casos

- Seguir somente o `CAMINHO` de cada caso; nao descobrir funcionalidade vizinha nem transformar botoes tecnicos em novos casos.
- Criar uma spec independente por caso pronto, com login, sessao e massa proprios. Reutilizar apenas Page Objects e infraestrutura sem estado.
- Nao compartilhar registro criado, variavel mutavel, pagina, contexto ou ordem de execucao entre specs.
- `MASSA E PRE-CONDICOES`, `DADOS ESPECIFICOS`, `RESULTADO ESPERADO` e `OBSERVACOES` orientam somente o caso correspondente. Nao copiar o bloco do prompt como objeto, comentario ou metadado na spec.
- Nao criar cache de lote. Se houver interrupcao, informar casos concluidos, falhos, bloqueados e nao iniciados sem guardar credenciais ou massa.
- Falha de autenticacao bloqueia os casos com as mesmas credenciais, sem expor seus valores.

O lote existe apenas na orquestracao do plugin. Ele nao muda a arquitetura nem aumenta o tamanho de cada spec. E proibido gerar dentro da spec lista de casos, numero do caso, status de lote, mapa de credenciais, inventario de verificacoes, relatorio customizado ou controle manual de fluxo.

Classificar cada caso antes de implementar:

- formulario de cadastro ou alteracao: obrigatorios, botoes, conclusao e persistencia segura;
- consulta: acesso, filtros informados, resultado e ausencia de erro funcional;
- relatorio ou download: acao de emissao e artefato produzido;
- remocao ou transicao irreversivel: criacao do alvo sintetico pela propria spec, prova de unicidade, acao e estado final.

Casos de alteracao, remocao ou transicao irreversivel nao podem atuar sobre massa preexistente. Se a propria spec nao puder criar e localizar o alvo atual com `runId`, bloquear somente esse caso.

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

Para `cadastro-anterior`, declarar no Page Object um metodo reutilizado como `selecionarPrimeiraOpcaoValida(controle, rotulo)`:

- ignorar opcao desabilitada, oculta, sem valor ou cujo texto normalizado seja placeholder como `Selecione`, `Escolha` ou `-- SELECIONE --`;
- selecionar o primeiro candidato restante e confirmar o valor selecionado;
- em lista dependente, aguardar candidato valido apos a mudanca do campo pai;
- em autocomplete, escolher o primeiro item visivel somente quando a lista abrir sem termo institucional especifico;
- nao inventar texto de busca, nao copiar valor do ambiente de referencia e nao tentar candidatos sucessivos;
- se nenhum candidato existir, falhar somente a spec com `Nenhuma opcao valida disponivel para <rotulo>`.

Campos de dominio continuam com valor intencional. Nunca escolher automaticamente a primeira opcao de Situacao, Status, Modalidade ou outro campo que mude o significado do cadastro.

## Smoke Da Operacao

1. Criar um unico `test` para a operacao completa, com uma fixture `page`, um navegador e um login.
2. Fazer o Page Object expor os obrigatorios em uma unica colecao de objetos nomeados, como `{ campo, rotulo, controle, tipo, valorValido, origem }`. A spec recebe essa colecao por `obterCamposObrigatorios(dados)` e mantem somente o loop funcional; nao repetir o mapeamento campo-locator-valor na spec. Quando houver muitos campos, usar um objeto completo por linha quando legivel e quebrar somente descritores realmente longos, sem criar factory posicional.
3. Em cada tela, preencher uma base valida e verificar cada obrigatorio na mesma sessao. Antes da submissao negativa, limpar primeiro um campo-sentinela conhecido como obrigatorio e deixar o alvo por ultimo. A sentinela impede persistencia acidental e a ordem evita que um evento posterior restaure um select dependente JSF; ela nao representa uma segunda verificacao planejada.
4. Concentrar no Page Object a operacao atomica `validarObrigatoriedade`: escolher a sentinela, limpar ambos, confirmar por assertion normal que a sentinela continua ausente, submeter, verificar o alvo com `expect.soft` e restaurar alvo e sentinela em `finally`, inclusive campos volateis que o servidor limpa.
5. Percorrer os obrigatorios diretamente no mesmo loop. O rotulo de cada campo deve aparecer na mensagem da assertion para que a falha seja identificada sem criar `test.step`, annotations ou inventario paralelo.
6. Depois do loop, usar uma unica barreira antes do cadastro positivo: `if (testInfo.errors.length > 0) return;`. As falhas suaves ja reprovam o teste; o retorno apenas impede que a execucao persista um registro depois de uma obrigatoriedade reprovada.
7. Tratar dependencias apenas para preencher o fluxo. Nao criar teste negativo separado para dependencia, tipo ou formato.

Navegacao, acesso, botoes e conclusao devem usar assertions normais do Playwright e falhar imediatamente. Continuar depois de uma falha que pode ter mudado a pagina torna o estado desconhecido e aumenta o risco de persistencia indevida. Usar `expect.soft` somente nas verificacoes de obrigatoriedade que foram projetadas para restaurar o formulario com seguranca.

A spec continua responsavel pela sequencia funcional e pela barreira baseada em `testInfo.errors`. O Page Object nao pode importar ou manipular `testInfo`, nem oferecer metodo monolitico como `executarSmokeCompleto` que esconda toda a operacao. Nao criar `test.step`, annotations, `RelatorioValidacoes`, `verificacoesPlanejadas`, estados manuais como `fluxoAcessivel`/`cadastroConcluido`, inventario duplicado de verificacoes ou `try/finally` na spec apenas para produzir relatorio.

Em uma operacao com um unico teste, colocar o modulo no titulo do `test` e nao criar `test.describe` sem ganho organizacional. Manter a sequencia rasa e direta. O proprio runner registra erros, traces e screenshots; nao duplicar essa responsabilidade em infraestrutura particular.

## Botoes Do Fluxo

Cobrir somente botoes e links de acao do formulario ou wizard. Excluir menu global, logout, ajuda, paginacao e acoes de outras linhas.

- `Avancar` e `Submeter`: validar durante o caminho normal, confirmando a proxima tela ou o resultado esperado.
- Acao reversivel, como Limpar ou abrir modal: clicar, validar o efeito e restaurar o estado.
- `Voltar` e `Cancelar`: clicar, validar o destino e reentrar no fluxo com a mesma sessao autenticada, somente antes de persistencia intermediaria.
- Remocao ou transicao irreversivel: incluir somente quando a propria spec puder criar e localizar exatamente o alvo sintetico da execucao atual.

Reentrada controlada para testar botao e permitida. Novo login, novo contexto ou `beforeEach` por verificacao continuam proibidos. Uma spec comum pode persistir no maximo um registro positivo; uma spec destrutiva cria somente o menor alvo sintetico necessario e nao compartilha massa com outra spec.

## Conclusao E Evidencias

- Submeter uma unica conclusao positiva com dados sinteticos e confirmar a mensagem exata.
- Registrar clique e resultado separadamente: `clicarCadastrar()` ou `clicarConfirmar()` executa somente a acao; `validarMensagemSucesso()` comprova a conclusao. Nao criar `concluirCadastro()` que esconda as duas responsabilidades.
- Executar a conclusao positiva somente quando `testInfo.errors.length === 0` depois das obrigatoriedades. Se houver falha suave, encerrar o teste sem persistir; o Playwright manterá o resultado reprovado.
- Confirmar o registro em listagem/consulta quando houver caminho seguro sem massa adicional.
- Em remocao, confirmar persistencia do alvo com o `runId` atual, testar Cancelar quando existir, confirmar a acao e validar ausencia ou estado final. Nunca usar primeira linha, prefixo generico ou registro de outra execucao.
- Se a acao irreversivel falhar apos a criacao, preservar o registro rastreavel; nao repetir nem tentar limpeza automatica que possa mascarar a falha.
- Quando a consulta nao for segura ou nao existir, manter somente a validacao obrigatoria da mensagem final.
- Configurar reporters nativos `line` e `html`, com HTML em `test-results/html` e abertura manual. Manter trace e screenshot apenas em falhas.
- Nao gerar Markdown proprio, annotations ou etapas artificiais. O HTML nativo deve mostrar diretamente quais specs passaram ou falharam; trace e screenshot aparecem somente quando houver falha.

Organizar a spec como uma sequencia direta de chamadas sem `test.step`. Separar blocos por linhas em branco e comentarios apenas quando explicarem uma decisao nao obvia. Usar portugues natural em identificadores de dominio, comentarios, titulos e mensagens, preservando APIs do Playwright e JavaScript. Consultar `../../references/legibilidade-codigo.md` quando o fluxo for extenso.

## Implementacao E Validacao

- Executar `check-environment.mjs <raiz> --headed-smoke --json`, `optimize-context.mjs` e, se necessario, `scaffold-playwright.mjs <raiz> --mode implantacao`.
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
- Executar `npx playwright test <spec> --list`, cada spec aprovada headed no ambiente real e `quality-gate.mjs`. Nao reexecutar a suite inteira apenas para duplicar os registros ja criados nas validacoes individuais.
- Considerar concluido somente quando o smoke passar no ambiente real; lista dinamica vazia deve ser relatada como bloqueio da spec, nao mascarada por valor fixo.

Carregar referencias em `../../references/` somente conforme o risco: configuracao, seletores, exploracao MCP, diagnostico, legibilidade ou otimizacao.

## Saida

Entregar uma spec simples por caso pronto, Page Objects reutilizados, utilitarios realmente usados, `.env.example`, comandos headed, resultados por numero, caminho do relatorio HTML nativo e bloqueios reais. Informar casos concluidos, falhos, bloqueados e nao iniciados sem criar relatorio ou cache paralelo.
