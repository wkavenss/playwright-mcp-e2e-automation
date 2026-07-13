---
name: higienizar-automacao-playwright
description: Limpar e endurecer uma automacao Playwright existente sem recriar fluxo. Use quando o usuario pedir melhoria de codigo, higiene, refatoracao pontual, remocao de lixo de codegen, eliminacao de dados hardcoded, reducao de seletores frageis, reprodutibilidade ou preparo do codigo para review senior. Nao usar para criar fluxo novo, revisar sem alterar ou corrigir falha funcional ampla.
---

# Higienizar Automacao Playwright

Melhorar codigo Playwright existente com baixo consumo de tokens, usando auditoria local e edicoes objetivas. Nao reexplorar telas, nao recriar specs e nao chamar MCP por padrao.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a higiene.

## Fluxo

1. Identificar a raiz do projeto e os arquivos afetados: specs, Page Objects, dados, fixtures e utils.
2. Executar `node ../../scripts/quality-gate.mjs <raiz-do-projeto> --changed` a partir desta skill. Se o usuario pedir a suite inteira, omitir `--changed`; usar `--verbose` somente quando o resumo por regra nao explicar a correcao.
3. Ler somente o primeiro exemplo de cada regra do gate e os arquivos claramente relacionados ao fluxo. Quando houver achados repetidos, corrigir por tipo de problema e usar busca pontual para cobrir as demais ocorrencias.
4. Corrigir apenas achados objetivos e proximos do escopo.
5. Nao abrir MCP, salvo quando codigo e logs nao explicarem seletor, tela ou estado real indispensavel.
6. Executar novamente o quality gate no mesmo escopo.
7. Quando houver comando claro e barato, executar o menor teste CLI afetado.
8. Responder curto: arquivos alterados, tipos de achado tratados, comando executado, resultado e pendencias. Nao colar a saida completa do quality gate.

## Corrigir

- Remover `console.log`, `debugger`, `TODO/FIXME`, codigo comentado e sobra de codegen.
- Remover erro bruto, stack trace, timeout ou texto transitorio copiado para string, comentario, fixture ou assert.
- Substituir nomes reais, usuarios, documentos, emails, telefones e identificadores por `.env`, fixture local ignorada ou massa neutra.
- Mover contexto privado recorrente para `.playwright-e2e/private-domain/` quando for local ao projeto e garantir que nao seja versionado.
- Substituir datas, anos, periodos, semestres e prazos fixos por geradores dinamicos ou parametro local quando a regra exigir valor oficial.
- Mover seletores e interacoes diretas da spec para Page Objects quando houver acoplamento claro.
- Trocar metodos genericos como `clickButton1`, `fillInput2` e `goNext` por nomes funcionais.
- Em projeto em portugues, usar portugues natural sem acentos nos identificadores de dominio, preservando APIs e palavras reservadas do framework/linguagem.
- Trocar pares posicionais de validacao por objetos com propriedades nomeadas quando isso tornar a leitura imediata.
- Em spec extensa, agrupar grandes fases com `test.step` e comentar apenas linhas-chave: preflight, massa, sessao, restauracao, dependencia, recuperacao e persistencia.
- Remover comentario que apenas repete a instrucao seguinte, mas preservar explicacoes uteis para leitores iniciantes.
- Remover helper generico usado uma unica vez quando a logica ficar mais clara diretamente na fase funcional.
- Reduzir `.nth()`, `.first()` sem filtro, XPath sem justificativa, ID gerado e seletor estrutural fragil.
- Corrigir indice escondido em `evaluate`, ID JSF gerado, ID JSF estavel espalhado sem helper e `waitForTimeout` sem anotacao padronizada de requisito explicito.
- Preservar todos os criterios informados pelo usuario; nao simplificar filtro/assert sem confirmacao.
- Preservar uma unica sessao de navegador por fluxo; nao abrir/fechar browser manualmente em spec Playwright Test.
- Mover massa institucional nao secreta especifica do cliente para `config/clientes/<perfil>.json` e validar somente os requisitos da spec selecionada.
- Fortalecer assertions fracas para validar efeito funcional quando houver sinal estavel no codigo.

## Nao Fazer

- Nao criar automacao nova.
- Nao navegar por funcionalidades vizinhas.
- Nao trocar falha real por assert mais fraco.
- Nao inventar massa funcional que altere regra de negocio.
- Nao instalar dependencias nem baixar navegador sem autorizacao.
- Nao reformatar ou reescrever arquivos sem relacao com a higiene solicitada.
- Nao copiar conteudo do overlay privado para README, codigo, fixtures versionadas ou resposta final.

Ao higienizar legibilidade, carregar `../../references/legibilidade-codigo.md`.

## Saida

```text
Higiene aplicada:
Arquivos alterados:
Achados tratados:
Comando executado:
Resultado:
Pendencias/Bloqueios:
```
