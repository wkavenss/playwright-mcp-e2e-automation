# Exploracao MCP Detalhada

Use este arquivo quando a tela tiver fluxo complexo, quando a leitura inicial nao bastar ou quando houver falha de navegacao/campo.

## Mapa De Tela

Para cada tela relevante, levantar apenas o necessario para agir com seguranca. Nao catalogar todos os seletores da tela.

- tela, URL/rota, titulo/cabecalho;
- formulario principal, campos visiveis e origem da obrigatoriedade;
- botoes, links, menus, tabelas, modais, banners e mensagens;
- acao segura seguinte e validacao funcional candidata.

Reaproveitar o mapa quando voltar para a mesma tela na mesma execucao.

Manter a mesma sessao/pagina durante a exploracao do fluxo sempre que possivel. Nao fechar e reabrir navegador a cada tela para "descobrir" o proximo passo; isso perde estado, aumenta custo e pode gerar registros parciais ou duplicados.

Nao capturar nem colar DOM completo, HTML completo, screenshots ou listas integrais de elementos quando um resumo de tela, labels relevantes e seletores candidatos bastarem. Registrar somente o mapa minimo necessario ao passo atual.

## Navegacao

- Confirmar pagina inicial, caminho de usuario, telas intermediarias e estado final pela interface real.
- Seguir somente o caminho informado pelo usuario. Nao abrir funcionalidade vizinha, menu parecido ou caso de uso alternativo para explorar.
- Preferir navegacao pela interface quando o objetivo for validar o fluxo do usuario.
- Usar URL direta somente se o fluxo exigir ou se o usuario tiver informado essa rota.
- Validar mudanca de tela por cabecalho, texto principal, formulario, tabela, rota ou estado visual confiavel.
- Em menus com hover, usar a interacao apropriada antes do clique.
- Se o caminho nao aparecer, verificar sessao, permissao, configuracao, massa e indisponibilidade antes de declarar bloqueio.
- Evitar reiniciar login/navegador para cada etapa. Reautenticar somente quando houver sessao expirada, troca real de perfil ou bloqueio tecnico.

## Formularios

- Mapear somente os controles usados pelo passo a passo atual. Expandir para outros labels, inputs, selects, radios, checkboxes, datas, buscas, uploads e editores ricos apenas se o fluxo exigir.
- Tratar estrela/asterisco azul na label como obrigatoriedade.
- Quando a estrela/asterisco azul estiver presente, nao usar submissao vazia para descobrir obrigatoriedade.
- Considerar atributos HTML, legenda visual, mensagem de validacao e regra de tela apenas quando o marcador visual de obrigatoriedade nao existir ou quando houver falha funcional real.
- Para cada campo usado: registrar label, tipo, obrigatoriedade, valor usado, seletor escolhido e validacao esperada.
- Registrar valores usados de forma sanitizada. Dados pessoais, usuarios, documentos, emails e telefones devem aparecer como tipo de dado ou variavel generica, nunca como valor real.
- Nao submeter formulario incompleto apenas para observar validacoes de campos obrigatorios.
- Diferenciar acoes intermediarias de finais: salvar, avancar, enviar, confirmar, cancelar ou excluir.
- Antes de acao final, verificar permissao explicita, ambiente seguro, dados de teste, reversibilidade e ausencia de impacto real.
- Antes de acao que persiste dado, confirmar que os campos obrigatorios conhecidos, massa neutra e validacao final ja estao definidos. Nao usar repetidas submisssoes como mecanismo de descoberta.

## Mensagens E Registros

- Procurar mensagens de sucesso, erro e alerta apos submissao relevante.
- Registrar mensagem exata em falhas funcionais, permissoes, sessao expirada, regra de negocio ou indisponibilidade.
- Em listagens, localizar a linha pelo texto unico do registro e validar que pertence a execucao atual.
- Se houver paginacao, filtro ou busca, usar o mecanismo da tela para encontrar o registro.
- Ao registrar falhas, sanitizar nomes reais, usuarios, documentos, matriculas, emails, telefones e identificadores pessoais. Nao levar esses valores para codigo ou documentacao versionada.
