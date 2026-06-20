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

## Registro Minimo

Com `evidencias: minimo`, registrar somente erro principal e proximo passo. Com `evidencias: falha` ou `completo`, para cada falha relevante registrar:

- tela e acao tentada;
- mensagem exibida;
- seletor ou etapa envolvida;
- evidencia gerada;
- causa provavel;
- correcao aplicada, quando houver;
- proximo passo recomendado.

## Bloqueios

Se houver captcha, MFA, bloqueio de automacao, indisponibilidade, permissao insuficiente ou regra ambigua, nao inventar alternativa insegura. Estruturar a automacao ate o ponto possivel e registrar a informacao necessaria para prosseguir.

Em producao ou ambiente real, nao executar criacao, alteracao, submissao, aprovacao, exclusao ou acao irreversivel sem autorizacao explicita e dados seguros.

## Resumo Completo

Com `evidencias: completo`, incluir no resumo:

- evidencias geradas: relatorio, trace, screenshot, video;
- estado visivel da tela no bloqueio;
- diagnostico da causa raiz provavel;
- impacto no teste;
- passos para reproduzir;
- pendencias funcionais ou de ambiente.
