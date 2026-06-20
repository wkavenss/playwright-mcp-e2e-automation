# Playwright MCP E2E Automation

Plugin publico para Codex com skills especializadas e Playwright MCP.

## O Que Inclui

- Skills para criar, corrigir e revisar automacoes E2E e preparar projetos Playwright.
- Playwright MCP para descoberta e validacao do caminho solicitado.
- Scripts deterministas para scaffolding minimo e auditoria de boas praticas.
- Estrutura com Page Objects, variaveis de ambiente e evidencias minimas.
- Marketplace local de repositorio em `.agents/plugins/marketplace.json`.

## Como Publicar

Publique o conteudo desta pasta em um repositorio publico do GitHub.

Exemplo:

```bash
git init
git add .
git commit -m "Publica plugin Playwright MCP E2E"
git branch -M main
git remote add origin https://github.com/wkavenss/playwright-mcp-e2e-automation.git
git push -u origin main
```

## Como Instalar No Codex

Depois de publicar o repositorio, instale o marketplace:

```bash
codex plugin marketplace add wkavenss/playwright-mcp-e2e-automation
```

Em seguida, abra o Codex, acesse Plugins, selecione o marketplace `Playwright MCP E2E Automation` e instale o plugin `playwright-mcp-e2e-automation`.

Tambem e possivel instalar pelo fluxo de plugins da CLI:

```text
codex
/plugins
```

## Estrutura

```text
.agents/plugins/marketplace.json
plugins/playwright-mcp-e2e-automation/.codex-plugin/plugin.json
plugins/playwright-mcp-e2e-automation/skills/criar-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/corrigir-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/revisar-automacao-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/preparar-projeto-playwright/SKILL.md
plugins/playwright-mcp-e2e-automation/scripts/scaffold-playwright.mjs
plugins/playwright-mcp-e2e-automation/scripts/audit-playwright.mjs
```

## Validacao

Validado com:

```bash
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/criar-automacao-playwright
python3 /path/to/validate_plugin.py plugins/playwright-mcp-e2e-automation
```
