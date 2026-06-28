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

No Codex App, abra ou crie a pasta do projeto. No chat, digite `@play`, selecione o plugin **Playwright MCP E2E** na lista e envie:

```text
Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
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

No Codex App, abra ou crie a pasta do projeto. No chat, digite `@play`, selecione o plugin **Playwright MCP E2E** na lista e envie:

```text
Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
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

No Codex, abra ou crie a pasta do projeto. No chat, digite `@play`, selecione o plugin **Playwright MCP E2E** na lista e envie:

```text
Verifique se meu ambiente está pronto para criar automações Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

## Criar Uma Automação

Quando o ambiente estiver pronto, digite `@play`, selecione o plugin **Playwright MCP E2E** na lista e envie os dados mínimos:

```text
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
