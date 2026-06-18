# Exploracao MCP Detalhada

Use este arquivo quando a tela tiver fluxo complexo, quando a leitura inicial nao bastar ou quando houver falha de navegacao/campo.

## Mapa De Tela

Para cada tela relevante, levantar apenas o necessario para agir com seguranca. Nao catalogar todos os seletores da tela.

- tela, URL/rota, titulo/cabecalho;
- formulario principal, campos visiveis e origem da obrigatoriedade;
- botoes, links, menus, tabelas, modais, banners e mensagens;
- acao segura seguinte e validacao funcional candidata.

Reaproveitar o mapa quando voltar para a mesma tela na mesma execucao.

## Navegacao

- Confirmar pagina inicial, caminho de usuario, telas intermediarias e estado final pela interface real.
- Preferir navegacao pela interface quando o objetivo for validar o fluxo do usuario.
- Usar URL direta somente se o fluxo exigir ou se o usuario tiver informado essa rota.
- Validar mudanca de tela por cabecalho, texto principal, formulario, tabela, rota ou estado visual confiavel.
- Em menus com hover, usar a interacao apropriada antes do clique.
- Se o caminho nao aparecer, verificar sessao, permissao, configuracao, massa e indisponibilidade antes de declarar bloqueio.

## Formularios

- Mapear somente os controles usados pelo passo a passo atual. Expandir para outros labels, inputs, selects, radios, checkboxes, datas, buscas, uploads e editores ricos apenas se o fluxo exigir.
- Tratar estrela azul com legenda como obrigatoriedade.
- Considerar tambem atributo HTML, asterisco, legenda visual, mensagem de validacao e regra de tela.
- Para cada campo usado: registrar label, tipo, obrigatoriedade, valor usado, seletor escolhido e validacao esperada.
- Submeter formulario incompleto para observar validacoes somente quando os obrigatorios nao estiverem claros pela tela.
- Diferenciar acoes intermediarias de finais: salvar, avancar, enviar, confirmar, cancelar ou excluir.
- Antes de acao final, verificar permissao explicita, ambiente seguro, dados de teste, reversibilidade e ausencia de impacto real.

## Mensagens E Registros

- Procurar mensagens de sucesso, erro e alerta apos submissao relevante.
- Registrar mensagem exata em falhas funcionais, permissoes, sessao expirada, regra de negocio ou indisponibilidade.
- Em listagens, localizar a linha pelo texto unico do registro e validar que pertence a execucao atual.
- Se houver paginacao, filtro ou busca, usar o mecanismo da tela para encontrar o registro.
