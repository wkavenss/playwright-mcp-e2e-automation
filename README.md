# Playwright MCP E2E Automation

Plugin para Codex que gera massa sintética, cria smoke tests de implantação, corrige, revisa, higieniza e prepara automações E2E com Playwright, Page Objects, `.env`, Playwright CLI e Playwright MCP.

O padrão é simples:

- Playwright CLI roda e valida os testes.
- Playwright MCP entra somente quando o plugin precisa observar a tela real.

## Requisitos da Máquina

Instale Node.js, npm/npx, Git e Codex.

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
winget install --id Git.Git -e --source winget
npm install -g @openai/codex
```

### macOS

```bash
brew install node git
npm install -g @openai/codex
```

### Linux

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git
npm install -g @openai/codex
```

## Instalar o Plugin

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

## Preparar o Projeto

Na pasta do projeto:

```bash
cd meu-projeto
```

Se ainda não existir `package.json`:

```bash
npm init -y
```

Instale Playwright Test, dotenv e o Chromium esperado pelo Playwright do projeto:

```bash
npm install -D @playwright/test dotenv
npm exec -- playwright install chromium
```

Rode esses comandos nessa ordem e dentro da pasta do projeto.

No Windows PowerShell, se aparecer bloqueio de `npm.ps1` ou `npx.ps1`, use:

```powershell
npm.cmd install -D @playwright/test dotenv
npm.cmd exec -- playwright install chromium
```

No Linux, se faltar dependência do sistema:

```bash
npm exec -- playwright install --with-deps chromium
```

Preparar o projeto antes de chamar o plugin reduz paradas, diagnósticos e consumo de tokens. Se algo faltar, o plugin ainda pode apontar os comandos necessários.

## Playwright MCP

Não instale o Playwright MCP manualmente.

O plugin já inclui a configuração para executar o MCP via `npx` quando precisar observar a tela:

```bash
npx -y @playwright/mcp@0.0.78
```

Esse pacote não precisa entrar no `package.json` do projeto.

## Usar no Codex

Abra o Codex na pasta do projeto:

```bash
codex
```

Ou abra a pasta pelo Codex App.

No chat, selecione o plugin e escolha um dos dois modos funcionais.

Para gerar massa:

```text
MODO: Geração de massa de dados
URL:
USUÁRIO:
SENHA:
CAMINHO:
```

Para criar testes de implantação:

```text
MODO: Implantação
URL:
OPERAÇÃO:
CAMINHO:
PERFIL:
USUÁRIO:
SENHA:
MASSA E PRÉ-CONDIÇÕES:     # obrigatória quando depender de cadastro anterior
RESULTADO ESPERADO:

FONTES DE EVIDÊNCIA (obrigatórias; análise limitada ao caminho informado):
AGENTS.md do módulo: /caminho/AGENTS.md
Código-fonte: /caminho/do/sistema
```

Para criar várias specs no mesmo pedido, mantenha cada caso e suas credenciais no mesmo bloco:

```text
MODO: Implantação
URL:

CASO DE USO 1:
OPERAÇÃO:
CAMINHO:
PERFIL:
USUÁRIO:
SENHA:
MASSA E PRÉ-CONDIÇÕES:     # obrigatória quando depender de cadastro anterior
DADOS ESPECÍFICOS:         # opcional
RESULTADO ESPERADO:
OBSERVAÇÕES:               # opcional

CASO DE USO 2:
OPERAÇÃO:
CAMINHO:
PERFIL:
USUÁRIO:
SENHA:
MASSA E PRÉ-CONDIÇÕES:     # obrigatória quando depender de cadastro anterior
DADOS ESPECÍFICOS:         # opcional
RESULTADO ESPERADO:
OBSERVAÇÕES:               # opcional

FONTES DE EVIDÊNCIA (obrigatórias; análise limitada aos caminhos informados):
AGENTS.md do módulo: /caminho/AGENTS.md
Código-fonte: /caminho/do/sistema
```

Os blocos devem ser numerados a partir de 1 e conter operação, caminho, perfil, usuário, senha e resultado esperado. `AGENTS.md` e raiz do código-fonte são obrigatórios como fontes globais de evidência; sua ausência ou impossibilidade de leitura bloqueia o lote antes da navegação. `MASSA E PRÉ-CONDIÇÕES` torna-se obrigatória quando o fluxo depender de cadastro anterior. O plugin processa todos os casos completos na ordem e agrupa somente operações compatíveis sobre a mesma entidade, perfil e massa em um ciclo funcional. Casos incompatíveis continuam em specs independentes. Casos com o mesmo perfil e credenciais reutilizam as variáveis do `.env`; credenciais nunca entram no código.

O formato de guia não é aceito. Converta o documento em casos de uso explícitos e envie apenas os que já tenham caminho e pré-condições suficientes para automação.

Esse modo sempre usa `AGENTS.md` e código-fonte como evidência, mas lê somente instruções, telas, controladores, validadores e persistência ligados ao caminho informado. Regras internas não observáveis não criam casos adicionais, assertions ou exploração de funcionalidades vizinhas. Cada spec representa uma operação isolada ou um ciclo compatível, com uma sessão maximizada, uma massa principal, validações de todos os obrigatórios visuais, cobertura dos botões seguros, checkpoints de erro impeditivo e uma única conclusão positiva. Assertions de `maxlength`, classe CSS e testes negativos de tipo ou formato não fazem parte do smoke salvo requisito explícito.

A spec conserva apenas a história funcional. Quando várias operações usam o mesmo registro, elas permanecem em um `test` e recebem `test.step` apenas no nível de negócio, como criar, visualizar, imprimir e remover. Operações independentes usam testes separados; etapas de clique, preenchimento ou campo individual não recebem `test.step`. As obrigatoriedades usam `expect.soft` para verificar todos os campos na mesma sessão. Antes da única persistência positiva, a spec consulta `testInfo.errors` uma vez e encerra sem cadastrar se alguma obrigatoriedade falhou. Ações e provas ficam em chamadas separadas, como `submeter()`, `validarMensagemSucesso()` e `validarPersistencia()`. O Page Object concentra locators, campos e operações de preenchimento, validação, restauração e consulta, sem camada `flows`, `BasePage` ou método único que esconda todo o smoke. O lote nunca adiciona relatório customizado, `fluxoAcessivel`, inventário ou metadados à spec.

O quality gate recebe contexto explícito: `--contract implantacao --case-kind formulario|consulta|relatorio|remocao|transicao`, `--contract massa` ou `--contract revisao`. Use `--files` para auditar somente a spec e seus Page Objects e `--exclude <caminho>` quando fixtures negativas intencionais não devam participar da autoauditoria. Em implantação, o gate também coleta as specs selecionadas com `playwright test --list` e trata esperas fixas e seletores estruturais de alto risco como erros.

Cada spec recebe um ID em `tests/auth/specProfiles.js`. A escolha e feita diretamente pelo comando: `npx playwright test "tests/e2e/minha-spec.spec.js"` executa e autentica somente a spec informada; `npm test` sem filtro executa e autentica a suite completa. O `globalSetup` usa `config.argv`, fornecido pelo Playwright, e nao exige variavel adicional para essa selecao.

No UI Mode, `npx playwright test --ui` abre somente a interface e lista as specs. O `globalSetup` nao autentica durante essa abertura; o estado da sessao e preparado por uma fixture automatica apenas quando o usuario mandar executar a spec escolhida.

Listas alimentadas por cadastros anteriores usam a primeira opção válida, ignorando placeholders, valores vazios, opções ocultas e desabilitadas. Em autocomplete, um valor informado é pesquisado diretamente e exige correspondência exata; sem valor informado, aplicações compatíveis podem usar `%%%` para listar candidatos e selecionar o primeiro elegível. Nomes presumidos e tentativas sucessivas não entram no código. Valores de domínio que alteram o significado do registro continuam explícitos.

Formulários multipágina percorrem todas as telas na mesma sessão e sobre a mesma massa. Voltar e Cancelar só reentram no fluxo quando não criarem outro registro ou quando o mesmo `runId` puder continuar. Recuperações necessárias durante a criação são executadas pelo Codex no navegador e não geram métodos de tentativa, locks, ledger, cache ou scripts de limpeza no projeto entregue.

Remoções e transições irreversíveis só atuam sobre um registro sintético criado pela própria spec na execução atual. A spec confirma persistência e unicidade pelo `runId`, testa Cancelar antes de Confirmar quando disponível e valida ausência ou estado final. Se não puder garantir propriedade exclusiva ou segurança contra cascata, somente essa operação fica bloqueada. O relatório HTML mostra diretamente quais specs passaram ou falharam, com trace e screenshot somente em falhas.

Se o modo estiver ausente ou contraditório, o plugin pede a escolha antes de criar código ou executar o navegador.

Com esses dados, o plugin gera código Playwright reproduzível com Page Objects, `.env`, Chromium headed maximizado, relatório HTML nativo e artefatos somente em falhas. Projetos novos não recebem perfis JSON por cliente nem infraestrutura paralela de evidências.
