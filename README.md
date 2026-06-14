# Playwright MCP E2E Automation

Plugin publico para Codex com a skill `playwright-mcp-e2e-automation`.

## O Que Inclui

- Skill para criar ou atualizar automacoes E2E com Playwright, JavaScript e Playwright MCP.
- Orientacoes para projetos novos e existentes.
- Estrutura com Page Objects, dados de teste, fixtures, variaveis de ambiente e documentacao.
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
plugins/playwright-mcp-e2e-automation/skills/playwright-mcp-e2e-automation/SKILL.md
plugins/playwright-mcp-e2e-automation/skills/playwright-mcp-e2e-automation/agents/openai.yaml
```

## Validacao

Validado com:

```bash
python3 /path/to/quick_validate.py plugins/playwright-mcp-e2e-automation/skills/playwright-mcp-e2e-automation
python3 /path/to/validate_plugin.py plugins/playwright-mcp-e2e-automation
```
