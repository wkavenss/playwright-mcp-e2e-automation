---
name: higienizar-automacao-playwright
description: Limpar e endurecer uma automacao Playwright existente sem recriar fluxo. Use quando o usuario pedir melhoria de codigo, higiene, refatoracao pontual, remocao de lixo de codegen, eliminacao de dados hardcoded, reducao de seletores frageis, reprodutibilidade ou preparo do codigo para review senior. Nao usar para criar fluxo novo, revisar sem alterar ou corrigir falha funcional ampla.
---

# Higienizar Automacao Playwright

Melhorar codigo Playwright existente com baixo consumo de tokens, usando auditoria local e edicoes objetivas. Nao reexplorar telas, nao recriar specs e nao chamar MCP por padrao.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a higiene.

## Fluxo

1. Identificar a raiz do projeto e os arquivos afetados: specs, Page Objects, dados, fixtures e utils.
2. Executar `node ../../scripts/quality-gate.mjs <raiz-do-projeto> --changed` a partir desta skill. Se o usuario pedir a suite inteira, omitir `--changed`.
3. Ler somente os arquivos citados pelo gate ou claramente relacionados ao fluxo.
4. Corrigir apenas achados objetivos e proximos do escopo.
5. Nao abrir MCP, salvo quando codigo e logs nao explicarem seletor, tela ou estado real indispensavel.
6. Executar novamente o quality gate no mesmo escopo.
7. Quando houver comando claro e barato, executar o menor teste CLI afetado.
8. Responder curto: arquivos alterados, achados tratados, comando executado, resultado e pendencias.

## Corrigir

- Remover `console.log`, `debugger`, `TODO/FIXME`, codigo comentado e sobra de codegen.
- Remover erro bruto, stack trace, timeout ou texto transitorio copiado para string, comentario, fixture ou assert.
- Substituir nomes reais, usuarios, documentos, emails, telefones e identificadores por `.env`, fixture local ignorada ou massa neutra.
- Substituir datas, anos, periodos, semestres e prazos fixos por geradores dinamicos ou parametro local quando a regra exigir valor oficial.
- Mover seletores e interacoes diretas da spec para Page Objects quando houver acoplamento claro.
- Trocar metodos genericos como `clickButton1`, `fillInput2` e `goNext` por nomes funcionais.
- Reduzir `.nth()`, `.first()` sem filtro, XPath sem justificativa, ID gerado e seletor estrutural fragil.
- Preservar uma unica sessao de navegador por fluxo; nao abrir/fechar browser manualmente em spec Playwright Test.
- Fortalecer assertions fracas para validar efeito funcional quando houver sinal estavel no codigo.

## Nao Fazer

- Nao criar automacao nova.
- Nao navegar por funcionalidades vizinhas.
- Nao trocar falha real por assert mais fraco.
- Nao inventar massa funcional que altere regra de negocio.
- Nao instalar dependencias nem baixar navegador sem autorizacao.
- Nao reformatar ou reescrever arquivos sem relacao com a higiene solicitada.

## Saida

```text
Higiene aplicada:
Arquivos alterados:
Achados tratados:
Comando executado:
Resultado:
Pendencias/Bloqueios:
```
