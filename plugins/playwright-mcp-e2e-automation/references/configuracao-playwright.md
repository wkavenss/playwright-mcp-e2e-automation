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
npm run test:e2e:headed
npm run test:headed
npx playwright test --headed --reporter=line
```

Escolher o menor comando que valide o cenario afetado. Quando houver uma spec especifica, executar somente essa spec. Usar Playwright MCP apenas quando o resultado do CLI nao explicar a tela real, o seletor, o campo ou o estado necessario para continuar.

`npx playwright codegen` pode ser usado somente como apoio inicial. O codigo gravado nao e entrega final: refatorar para Page Objects, `.env`, massa rastreavel e validacao funcional.

## Scripts Minimos

Para projeto novo, configurar scripts minimos e preservar aliases locais existentes:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

Quando o usuario nao informar modo de execucao, usar `test:e2e:headed` ou comando equivalente com Chromium headed.

Antes de chamar MCP, consultar `../../scripts/optimize-context.mjs <raiz-do-projeto> --mode <modo> --json` quando Node estiver disponivel. Usar o retorno para reaproveitar cache seguro, validar se `.playwright-e2e/cache/` esta ignorado e manter a resposta curta.

## Variaveis E Segredos

Para projeto novo, usar:

```text
BASE_URL=
E2E_CLIENT_PROFILE=referencia
E2E_WORKERS=1
E2E_EXAMPLE_USERNAME=
E2E_EXAMPLE_PASSWORD=
```

Se o projeto ja usar outro mecanismo, preservar o padrao. Quando o usuario fornecer credenciais:

- gravar valores reais somente em `.env`;
- criar `.env.example` com nomes e valores vazios/ficticios;
- garantir `.env` no `.gitignore`;
- garantir `.playwright-e2e/cache/` no `.gitignore`;
- garantir `.playwright-e2e/private-domain/` no `.gitignore` quando houver overlay privado local;
- usar `getAuthProfile(profileName)` nas specs e `process.env` somente dentro do helper;
- nao repetir segredos em README, logs, traces, screenshots ou resposta final.

Credenciais devem ser separadas por perfil funcional. Criar/usar `tests/utils/authProfiles.js`:

```javascript
const { getAuthProfile } = require('../utils/authProfiles');

const auth = getAuthProfile('docente');
await loginPage.realizarLogin(auth.username, auth.password);
```

O helper deve mapear o perfil para variaveis de ambiente no formato `E2E_<PERFIL>_USERNAME` e `E2E_<PERFIL>_PASSWORD`, convertendo hifens e espacos para `_`. Exemplos: `docente` -> `E2E_DOCENTE_USERNAME`; `coord-graduacao` -> `E2E_COORD_GRADUACAO_USERNAME`. Nao usar `process.env.E2E_USERNAME` ou `process.env.E2E_PASSWORD` em specs novas.

Configurar Playwright com `workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1`. O padrao serial evita conflito de sessao em sistemas legados quando varios perfis do `.env` apontam temporariamente para a mesma conta. Aumentar `E2E_WORKERS` somente quando as contas e massas forem independentes.

Dados pessoais, credenciais e identificadores sensiveis observados na tela nao devem aparecer hardcoded em specs, Page Objects, perfis versionados, asserts, comentarios ou logs. Massas institucionais nao secretas e especificas de cada cliente devem ficar em `config/clientes/<perfil>.json`; URL, perfil selecionado e credenciais continuam no `.env`.

## Perfis De Dados Por Cliente

Para suites de implantacao portateis, usar:

```text
config/
├── defaults.json
└── clientes/
    ├── referencia.json
    └── cliente-exemplo.json
```

- `defaults.json`: valores garantidos pela carga padrao do mesmo codigo-fonte.
- `clientes/<perfil>.json`: somente valores institucionais nao secretos que dependem de cadastro/escolha do cliente.
- `E2E_CLIENT_PROFILE`: nome seguro do arquivo ativo, sem extensao.
- Dados gerados pela spec permanecem em runtime e prevalecem sobre cliente e defaults.

Usar `tests/utils/clientConfig.js` como carregador unico. Cada spec/`describe` declara apenas os caminhos que usa com `requireSpecData` dentro de `test.beforeAll`, sem fixture `page`. Assim, uma propriedade pendente de outra spec nao bloqueia a execucao selecionada.

Ao descobrir nova massa especifica no ambiente de referencia, usar `update-client-profiles.mjs`: preencher somente `referencia.json`, adicionar `null` aos demais perfis e preservar valores existentes. O preenchimento correto dos clientes e manual; nunca selecionar a primeira opcao arbitrariamente.

## Evidencias

Por padrao, configurar Playwright com evidencias minimas:

- `trace: 'off'`;
- `screenshot: 'off'`;
- `video: 'off'`.

Quando o usuario pedir `evidencias: falha`, usar artefatos somente em falha:

- `trace: 'retain-on-failure'` ou `trace: 'on-first-retry'`;
- `screenshot: 'only-on-failure'`;
- `video: 'retain-on-failure'`.

Quando o usuario pedir `evidencias: completo`, habilitar evidencias suficientes para diagnostico e documentar onde ficam relatorio HTML, traces, screenshots e videos.

Com `evidencias: minimo`, nao criar nem atualizar README por causa de evidencias. Com `evidencias: falha`, registrar apenas o necessario para entender o erro. Com `evidencias: completo`, documentar comandos, relatorios, traces, screenshots, videos e limitacoes no README.

## Dados De Teste

- Gerar dados unicos com prefixos rastreaveis como `AUTOMACAO_E2E`, `TESTE_QA` ou `PLAYWRIGHT_MCP` mais timestamp.
- Evitar dados reais sensiveis.
- Nao reaproveitar nomes, usuarios ou identificadores reais vistos na tela como massa fixa.
- Usar massa externa informada pelo usuario quando o fluxo exigir.
- Validar formato aceito pela tela para datas, valores, documentos e identificadores.
- Gerar datas, periodos, anos, semestres, prazos e vencimentos em runtime; nao hardcodar valores que envelhecem.
- Para intervalos, calcular a data final a partir da data inicial, usando offset claro e rastreavel.
- Manter datas como `Date`/ISO ou estrategia equivalente ate a borda de preenchimento; formatar para a tela somente no Page Object/helper.
- Usar data fixa apenas quando a regra de negocio ou o usuario exigir; nesse caso, parametrizar em `.env` ou fixture local ignorada.
- Usar textos neutros e rastreaveis para campos longos.
- Manter massa simples dentro da spec quando usada uma unica vez.
- Mover massa maior ou reutilizavel para `tests/data`.
- Mover geradores e helpers reaproveitaveis para `tests/utils`.
- Classificar massa como `gerada`, `padrao-da-implantacao` ou `especifica-do-cliente` antes de codificar.
- Nao duplicar em perfis de cliente dados garantidos pelos scripts de implantacao.
- Campos com estrela/asterisco azul na label sao obrigatorios e devem ser preenchidos quando fizerem parte do fluxo.
- Inferir dados obrigatorios secundarios somente quando neutros e sem impacto na regra testada; pedir ao usuario dados que alterem comportamento, perfil, status, tipo, modalidade, permissao ou resultado esperado.

## Sessao E Dados Persistidos

- Modelar cada fluxo de negocio como uma unica spec/teste, usando a fixture `page` do Playwright Test e mantendo a mesma pagina/contexto durante login, navegacao, preenchimento, avancos e validacao.
- Nao abrir/fechar navegador manualmente a cada tela e nao dividir as telas de um mesmo cadastro em testes independentes.
- Validar obrigatorios um por vez dentro do mesmo teste: remover, submeter, registrar, restaurar explicitamente e somente entao passar ao proximo campo. Defaults definidos pelo servidor deixam de existir quando limpos e precisam ser selecionados novamente. Avancar uma unica vez por tela.
- Identificar campos volateis/nao redistribuidos pelo servidor, especialmente senha e upload. Restaura-los apos cada submissao para que um validador short-circuit nao masque o campo-alvo seguinte.
- Usar `validationReport` para preservar granularidade por campo e gerar Markdown sanitizado em `test-results/implantacao/`; falhar a spec somente depois de escrever o relatorio.
- Antes de executar uma acao que cria ou altera dado persistente, mapear os campos obrigatorios conhecidos, gerar `runId` unico e definir uma validacao final.
- Reduzir repeticoes de execucao quando houver criacao de registro. Se uma tentativa parcial gerar dado, reaproveitar esse registro ou limpar somente quando a tela oferecer acao segura e autorizada.

## Reprodutibilidade

- A spec deve rodar do zero pelo CLI em outra maquina com Node, Playwright, Chromium, projeto versionado e `.env` preenchido.
- Sempre partir de `BASE_URL`/`baseURL`, autenticar pelo fluxo automatizado e usar credenciais via `getAuthProfile(profileName)`.
- Nao depender de sessao aberta no MCP, navegador ja logado, perfil local do Chrome, `launchPersistentContext`, `storageState` gravado manualmente, cache local, caminhos absolutos ou arquivos fora do projeto.
- Dados criados pela automacao devem usar `runId` ou prefixo rastreavel. Dados variaveis devem ser calculados em runtime. Dados institucionais preexistentes devem vir de `defaults.json` ou do perfil versionado do cliente; segredos permanecem no `.env`.
- Nao deixar `test.only`, `test.skip`, flags temporarias ou ordem manual de execucao no codigo final.
- Se a reprodutibilidade exigir perfil, permissao ou massa especifica, registrar no resumo o requisito funcional sem expor valores sensiveis.

## Cache Local

- Usar `.playwright-e2e/cache/` somente para mapas sanitizados de telas, rotas, labels, acoes, seletores escolhidos, validacoes e estrategia de massa.
- Nao versionar cache e nao salvar senha, usuario real, nome de pessoa, documento, email, telefone, cookie, token ou storageState.
- Nao salvar no cache datas concretas que devem ser dinamicas; registrar somente a estrategia, como "inicio = hoje" e "fim = inicio + 30 dias".
- Tratar cache como sugestao. Confirmar via MCP quando houver falha, tela alterada, seletor ambiguo, permissao diferente ou estado dinamico.
- Se o cache contiver dado sensivel, descartar o trecho e corrigir o cache antes de continuar.

## Overlay Privado Local

Quando existir `.playwright-e2e/private-domain/`, tratar como camada local opcional com glossario, padroes legados, dicas de fluxo e receitas de seletor do projeto. Arquivos esperados: `glossary.json`, `legacy-patterns.json`, `flow-hints.md` e `selector-recipes.md`.

Esse conteudo deve permanecer ignorado pelo Git. Usar `private-domain-context.mjs` ou `optimize-context.mjs` para obter resumo compacto; nao copiar nomes, caminhos, mensagens, URLs, instituicoes, usuarios, dados reais ou exemplos privados para README, specs, Page Objects, fixtures versionadas, logs ou resposta final.

## Higiene De Codigo Gerado

Antes de finalizar, remover sobras de gravacao ou diagnostico: `console.log`, `debugger`, codigo comentado, `TODO/FIXME`, constantes sem uso, imports sobrando, seletores temporarios, leitura ampla de `body` e mensagens de erro cruas copiadas do terminal. Erros e bloqueios ficam no resumo ao usuario, nao como comentario, fixture, assert ou constante permanente.
