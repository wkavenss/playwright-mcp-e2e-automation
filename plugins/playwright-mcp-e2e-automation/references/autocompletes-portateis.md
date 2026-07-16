# Autocompletes Portateis

Carregue esta referencia somente quando o fluxo tiver autocomplete, sugestao dinamica ou papeis relacionados, como responsavel e substituto.

## Decisao De Busca

Use uma unica operacao semantica no Page Object e escolha o termo antes de interagir:

```javascript
const consulta = valorEspecifico?.trim() || '%%%';
```

- Com `valorEspecifico`, limpe o campo e pesquise diretamente esse valor. `%%%` nao participa dessa busca.
- Sem valor especifico, pesquise `%%%` para obter candidatos disponiveis sem presumir nomes.
- Nunca use nomes pessoais hardcoded, sequencia de tentativas com nomes diferentes ou termo aleatorio.

## Candidato Elegivel

Antes de escolher, descarte linhas vazias, ocultas, desabilitadas, placeholders e mensagens como `Nenhum resultado`. Somente depois dessa filtragem use o primeiro candidato restante. Nao use `.first()`, `.nth()` ou indice fixo sobre a lista bruta.

Quando um valor foi solicitado, normalize espacos, caixa e acentos tanto no valor quanto nos resultados. Exija igualdade exata. Correspondencia parcial nao e suficiente.

- zero correspondencias: bloquear somente o caso dependente, informando campo, valor e caso de uso;
- uma correspondencia: selecionar e confirmar o valor assumido pelo input;
- mais de uma correspondencia: usar identificador, unidade ou codigo fornecido. Sem discriminador suficiente, bloquear em vez de escolher por posicao.

## Papeis Relacionados

Para dois papeis que exigem pessoas diferentes:

- ambos informados: pesquisar cada valor diretamente;
- somente um informado: pesquisar esse valor diretamente e usar `%%%` apenas no outro campo;
- nenhum informado: usar `%%%` nos dois campos;
- sempre excluir o candidato escolhido no primeiro papel da selecao do segundo;
- bloquear quando nao houver dois candidatos distintos.

Depois de cada clique, confirme que o input assumiu o texto esperado. Se a confirmacao falhar, use uma mensagem funcional sem copiar o nome descoberto dinamicamente para a spec, `.env`, log ou relatorio.

## Qualificacao Funcional Reversivel

Algumas listas retornam cadastros consultaveis, mas nao expõem no autocomplete a regra que determina se cada candidato pode ocupar o papel solicitado. Nessa situacao, uma qualificacao sistematica e permitida somente quando as fontes e a tela confirmarem uma acao anterior a persistencia principal que aplique a mesma regra e possa ser integralmente desfeita.

- Colete a lista dinamica uma vez, descarte itens invalidos e deduplique por identidade normalizada.
- Derive a quantidade necessaria dos papeis consumidores da jornada.
- Selecione cada candidato por valor exato e submeta cada identidade no maximo uma vez ao validador reversivel.
- Mantenha os candidatos aceitos apenas enquanto forem necessarios para comprovar cardinalidade e distincao.
- Remova todas as inclusoes temporarias e confirme o retorno ao estado inicial antes da persistencia principal.
- Se a lista terminar sem candidatos suficientes, informe a quantidade obtida e a precondicao ausente; nao procure automaticamente outro modulo nem invente valores.

Nao aplique este procedimento quando a elegibilidade ja estiver expressa na lista ou quando a acao de teste persistir, auditar ou notificar o candidato. Nesses casos, use a selecao simples ou bloqueie com o dado exato ausente.

## Casos De Contrato

O comportamento deve cobrir: valor especifico encontrado ou ausente, homonimos, lista vazia, itens vazios ou desabilitados, busca `%%%` sem valor especifico, dois valores informados, apenas um valor informado, papeis dinamicos distintos e qualificacao reversivel com sucesso, reversao e esgotamento insuficiente.
