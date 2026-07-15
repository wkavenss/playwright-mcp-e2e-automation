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

## Casos De Contrato

O comportamento deve cobrir: valor especifico encontrado ou ausente, homonimos, lista vazia, itens vazios ou desabilitados, busca `%%%` sem valor especifico, dois valores informados, apenas um valor informado e dois candidatos dinamicos distintos.
