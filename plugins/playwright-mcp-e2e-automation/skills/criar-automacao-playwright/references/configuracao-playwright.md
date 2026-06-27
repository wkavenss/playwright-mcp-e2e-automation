# Configuracao Playwright

Use este arquivo para projeto novo, instalacao/configuracao, scripts, `.env`, evidencias completas, README completo ou quando o projeto nao tiver padrao local claro.

## Package Manager

Antes de instalar ou executar, detectar `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `package.json` e scripts existentes. Preservar o gerenciador e os scripts locais quando ja existirem.

Instalar dependencias e Chromium somente quando necessario e com autorizacao quando houver rede/sandbox.

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

## Variaveis E Segredos

Para projeto novo, usar:

```text
BASE_URL=
E2E_USERNAME=
E2E_PASSWORD=
```

Se o projeto ja usar outro mecanismo, preservar o padrao. Quando o usuario fornecer credenciais:

- gravar valores reais somente em `.env`;
- criar `.env.example` com nomes e valores vazios/ficticios;
- garantir `.env` no `.gitignore`;
- usar `process.env` no codigo;
- nao repetir segredos em README, logs, traces, screenshots ou resposta final.

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
- Usar massa externa informada pelo usuario quando o fluxo exigir.
- Validar formato aceito pela tela para datas, valores, documentos e identificadores.
- Usar textos neutros e rastreaveis para campos longos.
- Manter massa simples dentro da spec quando usada uma unica vez.
- Mover massa maior ou reutilizavel para `tests/data`.
- Mover geradores e helpers reaproveitaveis para `tests/utils`.
- Inferir dados obrigatorios secundarios somente quando neutros e sem impacto na regra testada; pedir ao usuario dados que alterem comportamento, perfil, status, tipo, modalidade, permissao ou resultado esperado.
