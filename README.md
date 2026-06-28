# Playwright MCP E2E Automation

Plugin publico para Codex que cria, corrige, revisa e prepara automacoes E2E com Playwright, Playwright MCP, Page Objects, variaveis de ambiente e Chromium headed por padrao.

O plugin ja inclui a configuracao do Playwright MCP via:

```bash
npx -y @playwright/mcp@latest
```

Nao e necessario instalar o Playwright MCP manualmente. O que precisa existir na maquina e Node.js/npm/npx, Git, Playwright Test no projeto e o Chromium do Playwright.

## Instalacao Do Zero

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
@playwright-mcp-e2e-automation Verifique se meu ambiente esta pronto para criar automacoes Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
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
@playwright-mcp-e2e-automation Verifique se meu ambiente esta pronto para criar automacoes Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
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
@playwright-mcp-e2e-automation Verifique se meu ambiente esta pronto para criar automacoes Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
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

Depois de instalar, sempre comece pedindo a verificacao do ambiente:

```text
@playwright-mcp-e2e-automation Verifique se meu ambiente esta pronto para criar automacoes Playwright. Se faltar Node, Git, Playwright, Chromium ou qualquer requisito essencial, me informe exatamente o que falta e os comandos para corrigir.
```

Se algo estiver faltando, o plugin deve retornar comandos para Windows, macOS e Linux. Ele nao instala ferramentas de sistema automaticamente.

## Criar Uma Automacao

Quando o ambiente estiver pronto, envie os dados minimos:

```text
@playwright-mcp-e2e-automation

URL base: ...
Usuario: ...
Senha: ...
Passo a passo:
1. ...
2. ...
3. ...
```

Com esses dados, o plugin deve navegar, entender o fluxo e gerar codigo Playwright com Page Objects. Mesmo que o usuario nao peca explicitamente para gerar codigo, a criacao do codigo Playwright e o comportamento padrao.

## O Que O Plugin Faz

- Cria automacoes Playwright E2E com JavaScript.
- Usa Playwright MCP para descobrir e validar telas quando disponivel.
- Mantem credenciais em `.env` e cria `.env.example` seguro.
- Usa Page Objects por padrao.
- Executa em Chromium headed por padrao.
- Mantem evidencias minimas por padrao, sem README, trace, screenshot ou video, salvo pedido explicito.
- Audita boas praticas com scripts locais.

## Dados Minimos

Para criar uma automacao, informe:

- URL base;
- usuario;
- senha;
- passo a passo.

Campos obrigatorios secundarios devem ser descobertos na tela quando possivel. Quando houver legenda de estrela azul, o plugin trata esses campos como obrigatorios.

## Estrutura Do Repositorio

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

## Validacao Do Plugin

Validacao usada durante desenvolvimento:

```bash
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/criar-automacao-playwright
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/preparar-projeto-playwright
python3 /path/to/validate_plugin.py plugins/playwright-mcp-e2e-automation
```
