# Configuracao Playwright

Use este arquivo para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias completas, README completo ou quando o projeto nao tiver padrao local claro.

## Package Manager

Antes de instalar ou executar, detectar `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package.json` e scripts existentes. Preservar o gerenciador e os scripts locais quando ja existirem.

Instalar dependencias e Chromium somente quando necessario e com autorizacao quando houver rede/sandbox. Instalar primeiro `@playwright/test` no projeto e depois o Chromium pela CLI local do projeto:

```bash
npm install -D @playwright/test dotenv
npm exec -- playwright install chromium
```

Nao tratar `npx playwright install chromium` executado fora da raiz, ou antes da dependencia local, como prova suficiente: ele pode instalar uma revisao transitoria diferente da esperada pelo `@playwright/test` do projeto. No Windows PowerShell, se a Execution Policy bloquear `npm.ps1`/`npx.ps1`, usar `npm.cmd exec -- playwright install chromium`.

## Execucao Por CLI

Usar Playwright CLI como motor padrao para executar e validar automacoes. Preferir comandos existentes do projeto e saida compacta:

```bash
npm run test:headed
npx playwright test --headed
```

Escolher o menor comando que valide o cenario afetado. Quando houver uma spec especifica, executar somente essa spec. Usar Playwright MCP apenas quando o resultado do CLI nao explicar a tela real, o seletor, o campo ou o estado necessario para continuar.

`npx playwright codegen` pode ser usado somente como apoio inicial. O codigo gravado nao e entrega final: refatorar para Page Objects, `.env`, massa rastreavel e validacao funcional.

## Scripts Minimos

Para projeto novo, configurar scripts minimos e preservar aliases locais existentes:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed"
  }
}
```

Quando o usuario nao informar modo de execucao, usar `test:headed` ou comando equivalente com Chromium headed.

Antes de chamar MCP, consultar `../../scripts/optimize-context.mjs <raiz-do-projeto> --mode <modo> --json` quando Node estiver disponivel. Usar o retorno para ler somente os arquivos relevantes e manter a resposta curta; nao inicializar cache no projeto.

## Timeouts E Sincronizacao

- Centralizar o limite das acoes em `actionTimeout`; nao repetir um timeout menor em `click`, `fill`, `check` ou `selectOption` sem requisito funcional documentado.
- Configurar `timeout: 180_000` no `playwright.config` como margem central dos fluxos longos de implantacao; o valor evita o padrao insuficiente de 30 segundos sem deixar execucao ilimitada.
- Nao repetir `test.setTimeout` em cada spec. Para uma operacao excepcionalmente longa, preferir `test.slow()`, que triplica o limite central para 540 segundos e comunica a intencao. Usar `test.setTimeout` somente quando houver um limite exato comprovado e registrar a justificativa junto da excecao.
- Aceitar timeout explicito em `expect.poll` ou assertion quando ele representa o tempo maximo para uma condicao assincrona real, como uma lista dependente carregar.
- Nao usar `waitForTimeout` como sincronizacao.
- Para consentimento opcional antes do login, usar espera curta de ate `2_000` ms quando existir recuperacao tardia do clique. Assim, a ausencia do banner nao atrasa cada spec e a aparicao posterior continua protegida.
- Na recuperacao tardia de overlay, deixar o primeiro clique respeitar `actionTimeout`; recuperar somente quando o overlay estiver realmente visivel e relancar os demais erros.

## Variaveis E Segredos

Para projeto novo, usar:

```text
BASE_URL=
E2E_WORKERS=1
E2E_EXAMPLE_USERNAME=
E2E_EXAMPLE_PASSWORD=
```

Se o projeto ja usar outro mecanismo, preservar o padrao. Quando o usuario fornecer credenciais:

- gravar valores reais somente em `.env`;
- criar `.env.example` com nomes e valores vazios/ficticios;
- garantir `.env` no `.gitignore`;
- garantir `.playwright-e2e/private-domain/` no `.gitignore` quando houver overlay privado local;
- ler `obterCredenciais(nomePerfil)` somente no bootstrap de autenticacao, nunca dentro do teste reportado, e usar `process.env` somente dentro do utilitario;
- nao repetir segredos em README, logs, traces, screenshots ou resposta final.

Credenciais devem ser separadas por perfil funcional. Criar/usar `tests/utils/authProfiles.js` no `globalSetup`, com trace desabilitado:

```javascript
const { obterCredenciais } = require('../utils/authProfiles');

const credenciais = obterCredenciais('docente');
await loginPage.realizarLogin(credenciais.username, credenciais.password);
await page.context().storageState({ path: caminhoAuthTemporario('docente', specId) });
```

Manter `tests/auth/specProfiles.js` como uma lista simples de objetos `{ id, perfil, arquivo }`, com um ID unico por spec e sem credenciais. O `globalSetup(config)` deve usar `config.argv`, fornecido pelo proprio Playwright, para reconhecer os filtros de arquivo do comando. Sem filtro de arquivo, preparar todas as specs; com um ou mais filtros, preparar somente as correspondentes. Fazer essa selecao antes de ler credenciais, abrir paginas e gerar os respectivos `storageState`. Filtro informado sem correspondencia deve falhar com mensagem objetiva. Nao exigir uma variavel de ambiente adicional para escolher entre uma spec e a suite.

Usar os comandos normais do Playwright:

```bash
npx playwright test --headed "tests/e2e/minha-spec.spec.js"
npm run test:headed
```

O primeiro prepara e executa somente a spec informada. O segundo, sem filtro de arquivo, prepara e executa a suite completa.

O UI Mode possui outro ciclo: o Playwright executa o `globalSetup` ao abrir a interface, antes de o usuario escolher um teste. Portanto, ao encontrar `--ui` em `config.argv`, o `globalSetup` deve retornar antes de iniciar browser ou ler credenciais. Na fixture compartilhada, adicionar uma fixture automatica de autenticacao que so roda quando uma spec for executada pela interface. Ela deve localizar `{ id, perfil, arquivo }` por `testInfo.file`, abrir um contexto separado sem trace, autenticar, gravar o `storageState` daquela spec e fechar o contexto antes de o Playwright criar a pagina do teste. Nao autenticar todos os perfis nem reutilizar estado manual.

Assim, este comando abre apenas a lista:

```bash
npx playwright test --ui
```

O browser da aplicacao e o login devem iniciar somente depois que o usuario clicar para executar uma spec.

O utilitario deve mapear o perfil para variaveis de ambiente no formato `E2E_<PERFIL>_USERNAME` e `E2E_<PERFIL>_PASSWORD`, convertendo hifens e espacos para `_`. Exemplos: `operador` -> `E2E_OPERADOR_USERNAME`; `coord-area` -> `E2E_COORD_AREA_USERNAME`. Nao usar `process.env.E2E_USERNAME` ou `process.env.E2E_PASSWORD` em specs novas. Salvar um `storageState` temporario por perfil/spec em `test-results/auth/`, configurar `test.use({ storageState })` e iniciar a spec confirmando que a sessao esta autenticada. Nao reutilizar estado manual ou versionado.

Configurar Playwright com `workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1`. O padrao serial evita conflito de sessao em sistemas legados quando varios perfis do `.env` apontam temporariamente para a mesma conta. Aumentar `E2E_WORKERS` somente quando as contas e massas forem independentes.

Dados pessoais, credenciais e identificadores sensiveis observados na tela nao devem aparecer hardcoded em specs, Page Objects, asserts, comentarios ou logs. URL e credenciais continuam no `.env`; massa sintetica fica em runtime.

## Dados Portateis E Listas Dinamicas

Nao criar `config/defaults.json`, `config/clientes`, `clientConfig.js` ou `E2E_CLIENT_PROFILE` em projetos novos.

- Dados sinteticos e identificadores devem ser gerados em runtime.
- Campos de dominio que alterem situacao, status, modalidade, tipo ou resultado devem receber valor intencional rastreado ate o produtor funcional no codigo ou na tela. Registrar no contrato `field`, `producerValue`, `resultValue`, `sourceEvidence` e `filterStrategy`; nao inferir o tipo pelo nome da operacao.
- Selects, radios ou listas alimentadas por cadastros anteriores devem escolher a primeira opcao valida, ignorando item vazio, oculto, desabilitado e placeholder.
- Autocomplete so pode escolher o primeiro item quando a lista abrir sem termo institucional especifico. Nao inventar texto de busca.
- Lista sem candidato valido bloqueia somente a spec/registro atual e deve informar o rotulo do campo.
- Infraestrutura antiga de perfis deve ser preservada enquanto houver consumidor e removida somente durante migracao controlada.

## Evidencias

Por padrao, configurar Playwright com evidencias somente em falhas:

- `trace: 'retain-on-first-failure'`;
- `screenshot: 'only-on-failure'`;
- `video: 'off'`.

Quando o usuario pedir `evidencias: falha`, manter artefatos somente em falha:

- `trace: 'retain-on-failure'` ou `trace: 'on-first-retry'`;
- `screenshot: 'only-on-failure'`;
- `video: 'off'`, salvo solicitacao explicita de video.

Quando o usuario pedir `evidencias: completo`, habilitar evidencias suficientes para diagnostico e documentar onde ficam relatorio HTML, traces, screenshots e videos.

Com `evidencias: minimo` ou `evidencias: falha`, nao criar nem atualizar README por causa de evidencias e guardar somente trace/screenshot de falhas. Com `evidencias: completo`, documentar somente comandos e local dos artefatos solicitados.

Em implantacao, usar o reporter HTML nativo em uma unica execucao dos arquivos solicitados. Nao criar anexos por operacao, contrato paralelo, runner de blobs, scanner ou leitor ZIP. Credenciais continuam fora dos testes reportados por meio de `globalSetup` sem trace e `storageState` temporario.

## Dados De Teste

- Gerar dados unicos com prefixos rastreaveis como `AUTOMACAO_E2E`, `TESTE_QA` ou `PLAYWRIGHT_MCP` mais timestamp.
- Evitar dados reais sensiveis.
- Nao reaproveitar nomes, usuarios ou identificadores reais vistos na tela como massa fixa.
- Usar massa externa informada pelo usuario quando o fluxo exigir.
- Formatar corretamente datas, valores, documentos e identificadores para produzir entrada valida. Em smoke de implantacao, nao gerar entrada invalida para testar tipo/formato.
- Gerar datas, periodos, anos, semestres, prazos e vencimentos em runtime; nao hardcodar valores que envelhecem.
- Nao usar, como padrao generico, anos de outro seculo ou datas artificialmente distantes. Usar valor fornecido ou intervalo relativo cuja faixa funcional tenha sido confirmada para o sistema.
- Para intervalos, calcular a data final a partir da data inicial, usando offset claro e rastreavel.
- Manter datas como `Date`/ISO ou estrategia equivalente ate a borda de preenchimento; formatar para a tela somente no Page Object/helper.
- Usar data fixa apenas quando a regra de negocio ou o usuario exigir; nesse caso, parametrizar em `.env` ou fixture local ignorada.
- Usar textos neutros e rastreaveis para campos longos.
- Manter massa simples dentro da spec quando usada uma unica vez.
- Mover massa maior ou reutilizavel para `tests/data`.
- Mover geradores e helpers reaproveitaveis para `tests/utils`.
- Classificar massa como `gerada`, `dominio` ou `cadastro-anterior` antes de codificar.
- Todos os campos identificados visualmente como obrigatorios devem ser validados vazios no mesmo smoke e preenchidos no fluxo positivo.
- Nao gerar assertions de `maxlength`, classe CSS de obrigatoriedade, atributo HTML ou formato invalido por padrao. Inclui-las somente quando forem requisito funcional expresso ou indispensaveis para produzir uma entrada valida.
- Inferir dados obrigatorios secundarios somente quando neutros e sem impacto na regra testada; pedir ao usuario dados que alterem comportamento, perfil, status, tipo, modalidade, permissao ou resultado esperado.

## Sessao E Dados Persistidos

- Modelar cada operacao isolada ou ciclo compativel como uma unica spec/teste, usando a fixture `page` e mantendo a mesma pagina/contexto durante login, navegacao, preenchimento, avancos e validacao.
- Dentro de uma jornada compativel, usar `test.step` para cada caso de negocio solicitado e para produtores de precondicao que precisem ficar visiveis no HTML. Perfis diferentes usam contextos e estados autenticados separados no mesmo `test`; operacoes independentes usam testes independentes. Nao compartilhar massa entre specs por modo serial, project dependencies ou hooks funcionais.
- Quando cadastrar, consultar, alterar e remover puderem reutilizar a mesma entidade, preferir um ciclo com uma massa principal. Nao compartilhar estado entre specs nem preparar massa em `beforeAll`.
- Nao abrir/fechar navegador manualmente a cada tela e nao dividir as telas de um mesmo cadastro em testes independentes.
- Validar obrigatorios um por vez dentro do mesmo teste: remover, submeter, registrar, restaurar explicitamente e somente entao passar ao proximo campo.
- Na submissao negativa, limpar a sentinela antes do campo-alvo. O alvo deve ser a ultima alteracao antes de submeter, pois eventos posteriores podem recompor selects dependentes em JSF.
- Tratar dependencias apenas para restaurar/preencher o fluxo smoke; nao gerar teste negativo separado para o campo controlador.
- Identificar campos volateis/nao redistribuidos pelo servidor, especialmente senha e upload. Restaura-los apos cada submissao para que um validador short-circuit nao masque o campo-alvo seguinte.
- Testar botoes do formulario pelo efeito funcional. Permitir reentrada apos Voltar/Cancelar somente na mesma sessao e sem criar outro registro, ou quando o mesmo `runId` puder continuar.
- Remocao ou transicao irreversivel exige alvo criado pela propria jornada na execucao atual, `runId` exclusivo, persistencia comprovada, uma unica linha localizada e estado final validado. Antes de bloquear, tentar produzir o alvo pela interface, inclusive com outro perfil autenticado.
- Se a acao destrutiva falhar depois da criacao do alvo, preservar o registro identificado; nao repetir a acao nem executar limpeza automatica em `finally`.
- Usar `expect.soft` somente nas evidencias recuperaveis de obrigatoriedade e identificar cada campo na mensagem da assertion. Assertions de acesso, navegacao, botoes, sentinela e conclusao permanecem bloqueantes.
- Antes da persistencia positiva, consultar `testInfo.errors` uma unica vez. Nao criar acumuladores, estados de fluxo ou relatorio customizado para duplicar o runner.
- Manter acao e comprovacao em chamadas separadas na spec, como `submeter()`, `validarMensagemSucesso()` e `validarPersistencia()`. Em consulta, expor `buscar()` e `validarResultados()` separadamente.
- Depois de abrir a funcionalidade e depois do resultado final, chamar uma verificacao compartilhada de ausencia de erro impeditivo. Ela deve combinar status 5xx da navegacao com marcadores estaveis confirmados para a aplicacao e nunca pesquisar genericamente o `body` inteiro. Se o sistema nao oferecer marcador confiavel, registrar a limitacao no caso em vez de inventar regex ampla.
- Executar o auditor com contexto explicito: `quality-gate.mjs <raiz> --contract implantacao --case-kind <formulario|consulta|relatorio|remocao|transicao>`. Usar `--contract massa` para geracao e `--contract revisao` para auditoria generica.
- O quality gate deve executar `playwright test --list` sobre specs JavaScript e TypeScript selecionadas, alem das verificacoes estaticas. Em implantacao, espera fixa, `force: true`, indice numerico injustificado, seletor estrutural de tabela e `.first()` sem filtro sao bloqueantes.
- Configurar reporters `line` e `html`, com `outputDir: 'test-results/playwright'` para artefatos e HTML em `test-results/html`. Manter trace e screenshot apenas em falhas.
- Antes de executar uma acao que cria ou altera dado persistente, mapear os campos obrigatorios conhecidos, gerar `runId` unico e definir uma validacao final.
- Reduzir repeticoes de execucao quando houver criacao. Se uma tentativa parcial gerar dado, o Codex deve reaproveitar o registro ou removê-lo diretamente pelo navegador somente quando a tela oferecer acao segura e autorizada.
- Recuperacao da geracao nao entra no projeto: nao criar metodos de tentativa, ledger, lock, cache, script npm, fixture, setup, teardown ou spec tecnica de limpeza.

## Reprodutibilidade

- A spec deve rodar do zero pelo CLI em outra maquina com Node, Playwright, Chromium, projeto versionado e `.env` preenchido.
- Sempre partir de `BASE_URL`/`baseURL`, autenticar no `globalSetup` sem trace e usar credenciais via `obterCredenciais(nomePerfil)` somente nesse bootstrap.
- Nao depender de sessao aberta no MCP, navegador ja logado, perfil local do Chrome, `launchPersistentContext`, `storageState` gravado manualmente, cache local, caminhos absolutos ou arquivos fora do projeto.
- Dados criados pela automacao devem usar `runId` ou prefixo rastreavel. Dados variaveis devem ser calculados em runtime e listas de cadastros anteriores devem usar o primeiro candidato valido; segredos permanecem no `.env`.
- Nao deixar `test.only`, `test.skip`, flags temporarias ou ordem manual de execucao no codigo final.
- Se a reprodutibilidade exigir perfil, permissao ou massa especifica, registrar no resumo o requisito funcional sem expor valores sensiveis.

## Overlay Privado Local

Quando existir `.playwright-e2e/private-domain/`, tratar como camada local opcional com glossario, padroes legados, dicas de fluxo e receitas de seletor do projeto. Arquivos esperados: `glossary.json`, `legacy-patterns.json`, `flow-hints.md` e `selector-recipes.md`.

Esse conteudo deve permanecer ignorado pelo Git. Usar `private-domain-context.mjs` ou `optimize-context.mjs` para obter resumo compacto; nao copiar nomes, caminhos, mensagens, URLs, instituicoes, usuarios, dados reais ou exemplos privados para README, specs, Page Objects, fixtures versionadas, logs ou resposta final.

## Higiene De Codigo Gerado

Antes de finalizar, remover sobras de gravacao ou diagnostico: `console.log`, `debugger`, codigo comentado, `TODO/FIXME`, constantes sem uso, imports sobrando, seletores temporarios, leitura ampla de `body` e mensagens de erro cruas copiadas do terminal. Erros e bloqueios ficam no resumo ao usuario, nao como comentario, fixture, assert ou constante permanente.
