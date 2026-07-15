# Diagnostico E Evidencias

Use este arquivo em falhas, bloqueios, ambientes instaveis, `evidencias: falha`, `evidencias: completo` ou quando precisar explicar por que a automacao nao chegou ao fim.

## Classificacao De Falhas

Classificar a causa principal antes de responder:

- seletor;
- navegacao;
- autenticacao;
- massa de dados;
- permissao;
- regra funcional;
- ambiente indisponivel ou instavel;
- captcha, MFA ou seguranca;
- timeout/sincronizacao;
- validacao esperada diferente do comportamento real.

Nao resumir como timeout quando houver mensagem funcional, regra de negocio ou bloqueio claro.

## Reparo Rapido

Apos a primeira falha, nao repetir a spec inteira para testar seletor. Primeiro usar `parse-error-context.mjs` para extrair arquivo, linha, locator, tipo e causa provavel. Se a falha for locator, strict mode, hidden/attached, timeout de elemento ou menu JSF, usar `repair-probe.mjs` com timeout curto ou confirmar na pagina MCP preservada.

Probe curto nao valida regra funcional, persistencia, permissao ou massa; ele serve apenas para confirmar locator/estado. Reexecutar o menor cenario completo somente depois de uma correcao objetiva.

## Registro Minimo

Com `evidencias: minimo`, registrar somente erro principal e proximo passo. Com `evidencias: falha` ou `completo`, para cada falha relevante registrar:

- tela e acao tentada;
- mensagem exibida;
- seletor ou etapa envolvida;
- evidencia gerada;
- causa provavel;
- correcao aplicada, quando houver;
- proximo passo recomendado.

Nao copiar stack trace, erro bruto do terminal, timeout completo, payload, HTML, texto de `body` inteiro ou mensagem transitoria para codigo, comentario, fixture, assert ou README. No codigo, manter apenas assertions funcionais estaveis. No resumo ao usuario, sanitizar nomes reais, usuarios, documentos, matriculas, emails, telefones e identificadores pessoais.

## Bloqueios

Se houver captcha, MFA, bloqueio de automacao, indisponibilidade, permissao insuficiente ou regra ambigua, nao inventar alternativa insegura. Estruturar a automacao ate o ponto possivel e registrar a informacao necessaria para prosseguir.

Em producao ou ambiente real, nao executar criacao, alteracao, submissao, aprovacao, exclusao ou acao irreversivel sem autorizacao explicita e dados seguros. Em spec destrutiva aprovada, o alvo deve ter sido criado integralmente pela propria spec na execucao atual e localizado de forma unica pelo `runId`.

Se a falha aconteceu depois de uma acao que pode ter criado dado persistente, nao repetir a submissao cegamente. Primeiro verificar o `runId` e continuar o mesmo registro. Durante a criacao/correcao, o Codex pode remover diretamente esse registro pelo navegador quando a operacao for segura e autorizada; essa acao nao pode gerar metodo, ledger, lock, cache, setup, teardown ou spec de limpeza. Em falha da propria operacao destrutiva, preservar o alvo para diagnostico e nao repetir.

## Resumo Completo

Com `evidencias: completo`, incluir no resumo:

- evidencias geradas: relatorio, trace, screenshot, video;
- estado visivel da tela no bloqueio;
- diagnostico da causa raiz provavel;
- impacto no teste;
- passos para reproduzir;
- pendencias funcionais ou de ambiente.

## Lote De Implantacao

Executar os arquivos solicitados em um unico comando Playwright quando o QA precisar de um relatorio conjunto. O HTML nativo e as assertions funcionais sao suficientes: nao criar contrato paralelo, blobs individuais, anexos JSON/captura, runner, scanner ou leitor ZIP.

Em consultas, a propria assertion deve correlacionar o filtro com todas as linhas ou com a identidade exata pesquisada. Quando o dominio vier do produtor funcional, usar o mesmo valor na busca, no resultado e em qualquer formulario intermediario; nao registrar uma afirmacao paralela em anexo.
