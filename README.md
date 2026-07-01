# Playwright MCP E2E Automation

Plugin para Codex que cria, corrige, revisa e prepara automações E2E com Playwright, Page Objects, `.env`, Playwright CLI e Playwright MCP.

O padrão é simples:

- Playwright CLI roda e valida os testes.
- Playwright MCP entra somente quando o plugin precisa observar a tela real.

## Requisitos Da Máquina

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

## Instalar O Plugin

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
codex plugin add playwright-mcp-e2e-automation --marketplace playwright-mcp-e2e-automation
```

## Preparar O Projeto

Na pasta do projeto:

```bash
cd meu-projeto
```

Se ainda não existir `package.json`:

```bash
npm init -y
```

Instale Playwright Test, dotenv e Chromium:

```bash
npm install -D @playwright/test dotenv
npx playwright install chromium
```

No Linux, se faltar dependência do sistema:

```bash
npx playwright install --with-deps chromium
```

Preparar o projeto antes de chamar o plugin reduz paradas, diagnósticos e consumo de tokens. Se algo faltar, o plugin ainda pode apontar os comandos necessários.

## Playwright MCP

Não instale o Playwright MCP manualmente.

O plugin já inclui a configuração para executar o MCP via `npx` quando precisar observar a tela:

```bash
npx -y @playwright/mcp@latest
```

Esse pacote não precisa entrar no `package.json` do projeto.

## Usar No Codex

Abra o Codex na pasta do projeto:

```bash
codex
```

Ou abra a pasta pelo Codex App.

No chat, selecione `@play` e envie:

```text
URL base: ...
Usuário: ...
Senha: ...
Passo a passo:
1. ...
2. ...
3. ...
```

Com esses dados, o plugin gera código Playwright E2E com Page Objects, `.env`, validação em Chromium headed e evidências mínimas por padrão.
O código gerado deve ser reprodutível por CLI em outro ambiente com o mesmo perfil funcional e `.env` preenchido.

## Como O Plugin Trabalha

- Usa Playwright CLI para executar e validar testes.
- Usa Playwright MCP somente para descobrir tela, seletor, campo ou comportamento que precisa de observação real.
- Mantém credenciais em `.env` e cria `.env.example` seguro.
- Mantém `trace`, `screenshot` e `video` desligados por padrão.
- Audita boas práticas com scripts locais.
