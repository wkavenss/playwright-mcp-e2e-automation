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
MASSA E PRÉ-CONDIÇÕES:     # opcional; o plugin tenta produzir a precondição ausente
RESULTADO ESPERADO:

FONTES DE EVIDÊNCIA (obrigatórias; análise limitada ao caminho informado):
AGENTS.md do módulo: /caminho/AGENTS.md
Código-fonte: /caminho/do/sistema
```

Para criar varios casos no mesmo pedido, mantenha cada operacao e suas credenciais no proprio bloco. Casos dependentes podem formar uma unica jornada:

```text
MODO: Implantação
URL:

CASO DE USO 1:
OPERAÇÃO:
CAMINHO:
PERFIL:
USUÁRIO:
SENHA:
MASSA E PRÉ-CONDIÇÕES:     # opcional; o plugin tenta produzir a precondição ausente
DADOS ESPECÍFICOS:         # opcional
RESULTADO ESPERADO:
OBSERVAÇÕES:               # opcional

CASO DE USO 2:
OPERAÇÃO:
CAMINHO:
PERFIL:
USUÁRIO:
SENHA:
MASSA E PRÉ-CONDIÇÕES:     # opcional; o plugin tenta produzir a precondição ausente
DADOS ESPECÍFICOS:         # opcional
RESULTADO ESPERADO:
OBSERVAÇÕES:               # opcional

FONTES DE EVIDÊNCIA (obrigatórias; análise limitada aos caminhos informados):
AGENTS.md do módulo: /caminho/AGENTS.md
Código-fonte: /caminho/do/sistema
```

Os blocos devem ser numerados a partir de 1 e conter operação, caminho, perfil, usuário, senha e resultado esperado. `AGENTS.md` e raiz do código-fonte são obrigatórios como fontes globais de evidência; sua ausência ou impossibilidade de leitura bloqueia o lote antes da navegação. O plugin classifica produtores, consumidores, perfis, mutações e precondições antes de gerar código. Casos sobre a mesma entidade e o mesmo `runId` formam uma jornada, inclusive quando exigem perfis diferentes. Casos incompatíveis continuam em specs independentes. Credenciais reutilizam variáveis do `.env`, mas cada combinação de perfil e spec recebe um estado autenticado próprio.

O formato de guia não é aceito. Converta o documento em casos de uso explícitos com caminho suficiente para localizar a operação; o plugin resolve as precondições que puder produzir com segurança pela interface.

Esse modo sempre usa `AGENTS.md` e código-fonte como evidência, lendo as partes ligadas aos casos e aos produtores estritamente necessários de suas precondições. Antes de bloquear por falta de massa, o plugin tenta reutilizar saída da jornada, criar um alvo sintético pela interface e alternar para outro perfil. Massa preexistente fica restrita a consultas e operações comprovadamente não destrutivas. Cada spec representa uma operação isolada ou uma jornada compatível, com uma massa principal, contextos autenticados separados por papel, cobertura dos botões seguros, checkpoints de erro impeditivo e conclusões funcionais visíveis.

A spec conserva apenas a história funcional. Quando várias operações usam o mesmo registro, elas permanecem em um `test`; cada caso solicitado e cada produtor necessário recebem `test.step` no nível de negócio. Perfis adicionais usam `criarPaginaAutenticada(perfil, specId)` em contextos separados. Operações independentes usam testes separados; etapas de clique, preenchimento ou campo individual não recebem `test.step`. As obrigatoriedades usam `expect.soft`, e ações/provas ficam em chamadas separadas. O Page Object concentra locators e comportamento de tela, sem camada `flows`, `BasePage` ou método único que esconda a jornada.

O quality gate recebe contexto explícito: `--contract implantacao --case-kind formulario|consulta|relatorio|remocao|transicao`, `--contract massa` ou `--contract revisao`. Em implantação, repita `--expected-step "Operação"` para cada caso solicitado e use `--files` para auditar a jornada e seus Page Objects. O gate reprova caso sem cobertura, setup funcional oculto, dependência entre specs, estado compartilhado entre perfis e mutação sem alvo sintético próprio. Ele também coleta as specs selecionadas com `playwright test --list`.

Cada combinação de perfil e spec recebe um ID em `tests/auth/specProfiles.js`; uma jornada multiperfil possui várias entradas para o mesmo arquivo. A escolha é feita diretamente pelo comando: uma spec filtrada prepara todos os seus papéis, enquanto `npm test` prepara a suite completa. O `globalSetup` usa `config.argv`, cuida somente de autenticação e não exige variável adicional.

No UI Mode, `npx playwright test --ui` abre somente a interface e lista as specs. O `globalSetup` nao autentica durante essa abertura; o estado da sessao e preparado por uma fixture automatica apenas quando o usuario mandar executar a spec escolhida.

Listas alimentadas por cadastros anteriores usam a primeira opção válida, ignorando placeholders, valores vazios, opções ocultas e desabilitadas. Em autocomplete, um valor informado é pesquisado diretamente e exige correspondência exata; sem valor informado, aplicações compatíveis podem usar `%%%` para listar candidatos e selecionar o primeiro elegível. Nomes presumidos e tentativas sucessivas não entram no código. Valores de domínio que alteram o significado do registro continuam explícitos.

Formulários multipágina percorrem todas as telas na mesma sessão e sobre a mesma massa. Voltar e Cancelar só reentram no fluxo quando não criarem outro registro ou quando o mesmo `runId` puder continuar. Recuperações necessárias durante a criação são executadas pelo Codex no navegador e não geram métodos de tentativa, locks, ledger, cache ou scripts de limpeza no projeto entregue.

Remoções e transições irreversíveis só atuam sobre registro sintético criado pela própria jornada. A spec confirma persistência e unicidade pelo `runId`, testa Cancelar antes de Confirmar quando disponível e valida ausência ou estado final. Se não houver produtor seguro na interface, o plugin informa exatamente a operação, o perfil ou o dado ausente; ele não pode simplesmente omitir o caso. O relatório HTML mostra cada caso e etapa de suporte, com trace e screenshot somente em falhas.

Se o modo estiver ausente ou contraditório, o plugin pede a escolha antes de criar código ou executar o navegador.

Com esses dados, o plugin gera código Playwright reproduzível com Page Objects, `.env`, Chromium headed maximizado, relatório HTML nativo e artefatos somente em falhas. Projetos novos não recebem perfis JSON por cliente nem infraestrutura paralela de evidências.
