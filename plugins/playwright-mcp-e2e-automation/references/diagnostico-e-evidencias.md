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

Para entrega de implantacao, produzir um unico relatorio consolidado do contrato completo. Cada spec gera seu proprio blob e cada operacao anexa exatamente um JSON sanitizado mais uma captura recortada e mascarada. A contagem esperada de testes, operacoes e anexos vem de `tests/qa/implantation-contract.json`; uma execucao individual nao pode substituir o lote final.

Antes de distribuir o HTML, varrer dados embutidos, blobs, traces ZIP, logs e anexos. O scanner deve rejeitar senha, token, secret, cookie, credencial e parametros de autenticacao, informar apenas chave/caminho e nunca ecoar o valor. Traces de falha permanecem fora do HTML final e somente no diretorio local de diagnostico.

Em consultas, registrar no JSON a quantidade retornada, o filtro efetivamente aplicado, a coluna identificada pelo cabecalho e a comprovacao sobre todas as linhas. Quando o dominio vier do produtor funcional, registrar a fonte e o valor produzido; isso impede que um nome de operacao seja convertido indevidamente em um tipo que o modulo nao gera.
