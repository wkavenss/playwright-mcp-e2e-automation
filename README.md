# Playwright MCP E2E Automation

Plugin público para Codex que cria, corrige, revisa e prepara automações E2E com Playwright, Playwright MCP, Page Objects, variáveis de ambiente e Chromium headed por padrão.

O plugin já inclui a configuração do Playwright MCP via:

```bash
npx -y @playwright/mcp@latest
```

Não é necessário instalar o Playwright MCP manualmente. O que precisa existir na máquina é Node.js/npm/npx, Git, Playwright Test no projeto e o Chromium do Playwright.

## Instalação Do Zero

### Windows

No PowerShell ou terminal do Windows:

```powershell
winget install OpenJS.NodeJS.LTS
winget install --id Git.Git -e --source winget
npm install -g @openai/codex
```

Feche e abra o terminal novamente. Depois rode:

```powershell
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

No Codex App, abra ou crie a pasta do projeto e envie o primeiro prompt:

```text
@playwright-mcp-e2e-automation Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

### macOS

No Terminal:

```bash
brew install node git
npm install -g @openai/codex
```

Feche e abra o terminal novamente. Depois rode:

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

No Codex App, abra ou crie a pasta do projeto e envie o primeiro prompt:

```text
@playwright-mcp-e2e-automation Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

### Linux

No terminal:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git
npm install -g @openai/codex
```

Feche e abra o terminal novamente. Depois rode:

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

No Codex, abra ou crie a pasta do projeto e envie o primeiro prompt:

```text
@playwright-mcp-e2e-automation Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

## Marketplace E Plugin

O comando abaixo adiciona a fonte do marketplace:

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
```

O comando abaixo instala o plugin dessa fonte:

```bash
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

## Primeiro Uso

Depois de instalar, sempre comece pedindo a verificação do ambiente:

```text
@playwright-mcp-e2e-automation Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

Se algo estiver faltando, o plugin deve retornar comandos para Windows, macOS e Linux. Ele não instala ferramentas de sistema automaticamente.

## Criar Uma Automação

Quando o ambiente estiver pronto, envie os dados mínimos:

```text
@playwright-mcp-e2e-automation

URL base: ...
Usuário: ...
Senha: ...
Passo a passo:
1. ...
2. ...
3. ...
```

Com esses dados, o plugin deve navegar, entender o fluxo e gerar código Playwright com Page Objects. Mesmo que o usuário não peça explicitamente para gerar código, a criação do código Playwright é o comportamento padrão.

## O Que O Plugin Faz

- Cria automações Playwright E2E com JavaScript.
- Usa Playwright MCP para descobrir e validar telas quando disponível.
- Mantém credenciais em `.env` e cria `.env.example` seguro.
- Usa Page Objects por padrão.
- Executa em Chromium headed por padrão.
- Mantém evidências mínimas por padrão, sem README, trace, screenshot ou vídeo, salvo pedido explícito.
- Audita boas práticas com scripts locais.

## Dados Mínimos

Para criar uma automação, informe:

- URL base;
- usuário;
- senha;
- passo a passo.

Campos obrigatórios secundários devem ser descobertos na tela quando possível. Quando houver legenda de estrela azul, o plugin trata esses campos como obrigatórios.

## Estrutura Do Repositório

```text
.agents/plugins/marketplace.json
plugins/playwright-mcp-e2e-automation/.codex-plugin/plugin.json
plugins/playwright-mcp-e2e-automation/.mcp.json
plugins/playwright-mcp-e2e-automation/skills/criar-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/corrigir-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/revisar-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/preparar-projeto-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/scripts/check-environment.mjs
plugins/playwright-mcp-e2e-automation/scripts/scaffold-playwright.mjs
plugins/playwright-mcp-e2e-automation/scripts/audit-playwright.mjs
```

## Validação Do Plugin

Validação usada durante desenvolvimento:

```bash
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/criar-automacao-playwright
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/preparar-projeto-playwright
python3 /path/to/validate_plugin.py plugins/playwright-mcp-e2e-automation
```
