# Configuracao Playwright

Use este arquivo para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias, README completo ou quando o projeto nao tiver padrao local claro.

## Package Manager

Antes de instalar ou executar, detectar `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package.json` e scripts existentes. Preservar o gerenciador e os scripts locais quando ja existirem.

Instalar dependencias e Chromium somente quando necessario e com autorizacao quando houver rede/sandbox.

## Scripts Minimos

Para projeto novo, configurar no minimo:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  }
}
```

Quando o usuario nao informar modo de execucao, usar `test:headed` ou comando equivalente com Chromium headed. O script `test` pode permanecer headless para CI.

## Variaveis E Segredos

Para projeto novo, usar:

```text
BASE_URL=
E2E_USER=
E2E_PASSWORD=
```

Se o projeto ja usar outro mecanismo, preservar o padrao. Quando o usuario fornecer credenciais:

- gravar valores reais somente em `.env`;
- criar `.env.example` com nomes e valores vazios/ficticios;
- garantir `.env` no `.gitignore`;
- usar `process.env` no codigo;
- nao repetir segredos em README, logs, traces, screenshots ou resposta final.

## Evidencias

Configurar Playwright com evidencias uteis em falha:

- `trace: 'on-first-retry'`;
- `screenshot: 'only-on-failure'`;
- `video: 'retain-on-failure'`;
- reporter HTML.

No modo `padrao`, relatar somente evidencias essenciais. No modo `profundo`, documentar relatorio HTML, traces, screenshots, videos, comandos e limitacoes no README.

## Dados De Teste

- Gerar dados unicos com prefixos rastreaveis como `AUTOMACAO_E2E`, `TESTE_QA` ou `PLAYWRIGHT_MCP` mais timestamp.
- Evitar dados reais sensiveis.
- Usar massa externa informada pelo usuario quando o fluxo exigir.
- Validar formato aceito pela tela para datas, valores, documentos e identificadores.
- Usar textos neutros e rastreaveis para campos longos.
