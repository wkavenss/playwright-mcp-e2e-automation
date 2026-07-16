---
name: revisar-automacao-playwright
description: Revisar codigo Playwright existente quanto a corretude, Page Objects, seletores, sincronizacao, seguranca de credenciais, assertions, isolamento e manutencao. Use em pedidos de review, auditoria, avaliacao de boas praticas ou qualidade de uma suite Playwright. Nao usar para implementar fluxo novo, corrigir automaticamente uma falha ou configurar projeto do zero.
---

# Revisar Automacao Playwright

Atuar em postura de code review. Priorizar bugs, riscos de regressao, fragilidade e lacunas de teste; nao modificar arquivos salvo pedido explicito.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a revisao.

## Fluxo

1. Identificar specs, Page Objects, fixtures, dados, configuracao e scripts de execucao.
2. Executar `../../scripts/quality-gate.mjs <raiz-do-projeto> --contract revisao` a partir desta skill para realizar auditoria, sintaxe e JSON em modo leitura. Quando o pedido declarar implantacao ou massa, usar o contrato explicito correspondente; em implantacao, informar tambem o tipo do caso.
3. Usar o resumo agrupado por regra; ler somente o primeiro exemplo de cada regra e abrir detalhes completos apenas com `--verbose` quando o agrupamento nao bastar.
4. Confirmar ou descartar repeticoes com busca pontual (`rg`), sem leitura ampla de arquivos.
5. Avaliar resultado funcional, isolamento, massa, sincronizacao, seletores, segredos, dados sensiveis hardcoded, higiene de codigo e manutencao.
6. Quando util e seguro, executar o menor teste relevante; nao navegar por funcionalidades nao solicitadas.
7. Apresentar achados primeiro, por severidade, com arquivo e linha. Depois registrar duvidas e risco residual.

## Criterios

- Specs devem orquestrar a historia funcional e a barreira de persistencia; seletores, descritores campo-locator-valor e interacoes pertencem aos Page Objects.
- Specs devem manter uma sequencia direta, objetos nomeados para colecoes de validacao e comentarios que expliquem decisoes nao obvias sem repetir comandos.
- Em projetos em portugues, nomes de dominio devem usar portugues natural sem traduzir APIs ou palavras reservadas. Nomes genericos, abreviacoes e traducoes excessivamente longas prejudicam a leitura.
- Funcoes auxiliares devem eliminar repeticao real ou representar fase funcional clara; reprovar `BasePage` trivial, helper de ID, fabrica de uma linha e exportacao sem consumidor.
- Um conjunto de campos deve ter uma unica fonte declarativa no Page Object. Listas, mapas e `switch` paralelos, ou uma colecao extensa campo-locator-valor na spec, aumentam o custo de manutencao.
- Colecao extensa no Page Object pode usar um objeto nomeado completo por linha quando continuar legivel. Factory posicional, arquivo adicional ou mapa paralelo usado apenas para reduzir linhas piora a manutencao.
- Page Object nao deve usar `testInfo` ou esconder toda a operacao em `executarSmokeCompleto`. Camada `flows` que apenas desloca a orquestracao tambem adiciona complexidade sem ganho.
- Wrapper interno curto usado uma unica vez deve ser incorporado quando apenas encadear chamadas. Nao tratar como excesso um metodo consumido pela spec ou que concentre assertions, sincronizacao ou protecao transacional.
- Clique com confirmacao deve reutilizar a recuperacao de overlay existente, sem duplicar aceite de cookies e nova tentativa em outro metodo.
- Quantidade de linhas isolada nao justifica dividir Page Object, criar facade ou extrair helper generico. Exigir responsabilidade separada ou reuso real.
- Percentual de reducao nao mede manutencao: diferenciar eliminacao real de responsabilidade da mera compactacao visual ou transferencia do mesmo codigo para outro arquivo.
- Em arquivo com um unico teste, `test.describe` sem configuracao, hooks ou contexto adicional e ruido organizacional. O modulo pode compor diretamente o titulo do `test`.
- Specs de implantacao devem apresentar fases sequenciais e poucos niveis de decisao. Arvores de `if`, estados `fluxoAcessivel`/`cadastroConcluido` e relatorio particular tendem a duplicar o runner e esconder a historia funcional.
- Acesso, navegacao, botoes e conclusao devem falhar imediatamente. Evidencias recuperaveis de obrigatoriedade podem usar `expect.soft`; a sentinela e a ausencia de sucesso permanecem assertions normais.
- Depois do loop de obrigatorios, deve existir uma unica barreira baseada em `testInfo.errors` antes da persistencia. Sem essa barreira, uma falha suave pode reprovar o teste e ainda criar um registro.
- Acao e comprovacao devem permanecer separadas na spec: `submeter()`, `validarMensagemSucesso()` e `validarPersistencia()`; em consulta, `buscar()` e `validarResultados()`. Reprovar metodo de acao que esconda a assertion final.
- Colecao de obrigatorios nao deve ser inicializada como plano e depois sobrescrita com dados reais na mesma variavel. Usar nomes distintos, como `camposPlanejados` e `camposObrigatorios`.
- Locator e metodo declarados sem consumidor comprovado aumentam a superficie de manutencao e devem ser removidos.
- Locators semanticos e escopados devem prevalecer sobre CSS estrutural e XPath.
- ID JSF gerado, indice escondido em `evaluate`, ID JSF estavel escrito como seletor escapado e `waitForTimeout` sem anotacao padronizada sao riscos de manutencao. ID estavel direto `[id="form:campo"]` no Page Object e aceito.
- Assertions devem comprovar o efeito funcional, nao somente a presenca de um elemento.
- Em implantacao, todos os campos visualmente obrigatorios devem ser exercitados vazios no mesmo smoke. Reprovar assertions de `maxlength`, classe CSS ou outro contrato HTML quando nao houver requisito funcional expresso.
- Depois da abertura e da conclusao, deve haver verificacao explicita de ausencia de erro impeditivo por status 5xx e marcadores estaveis confirmados para o projeto. Nao aceitar regex generica sobre o `body`; quando nao existir marcador confiavel, exigir limitacao documentada no caso.
- Dependencias entre campos devem apenas preparar o fluxo smoke; nao devem virar teste negativo proprio sem requisito explicito fora de implantacao.
- Filtro, busca ou assert nao pode perder parte do criterio informado pelo usuario sem confirmacao explicita. A mera existencia da tabela nao comprova a consulta: identificar a coluna pelo cabecalho, correlacionar todas as linhas retornadas com o filtro e confirmar ausencia de carregamento.
- Valores de dominio devem ser rastreados ate o produtor funcional no codigo ou na tela. Reprovar filtro inferido pelo nome da operacao, valor que o produtor nao gera ou opcao inexistente na interface; quando o tipo nao puder ser filtrado, aceitar identidade exata mais prova do dominio em todas as linhas.
- `waitForTimeout`, retries excessivos e esperas globais podem mascarar sincronizacao incorreta.
- Timeout local em `click`, `fill`, `check` ou `selectOption` deve ter motivo funcional; quando apenas reduz o `actionTimeout` central, prejudica portabilidade e duplica configuracao. `expect.poll` com limite explicito nao e espera fixa.
- O limite total deve ficar em `timeout: 180_000` no `playwright.config`. Para spec excepcionalmente grande, preferir `test.slow()`; `test.setTimeout` e aceitavel somente quando um valor exato for comprovado e comentado.
- Credenciais devem vir de `.env`, que precisa estar ignorado; `.env.example` nao deve conter segredos. Em implantacao, reprovar login ou preenchimento de credenciais dentro do teste reportado: usar `globalSetup` sequencial sem trace e `storageState` temporario por perfil/spec, seguido de assertion de sessao autenticada.
- Execucao parcial deve preparar somente os perfis das specs filtradas no comando por meio de `config.argv`; sem filtro de arquivo, a suite completa deve ser preparada sem exigir variavel adicional.
- `npx playwright test --ui` deve abrir a lista sem autenticar. Exigir retorno antecipado do `globalSetup` para `--ui` e fixture automatica que gere, em contexto separado sem trace, somente o `storageState` da spec escolhida por `testInfo.file`.
- Nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails, telefones e identificadores pessoais nao devem aparecer hardcoded em specs, Page Objects, fixtures, asserts, comentarios ou logs.
- Datas, periodos, anos, semestres, prazos e vencimentos fixos devem ser tratados como risco de reprodutibilidade, salvo regra explicitamente fixa e parametrizada.
- Erro cru, stack trace, timeout, texto de `body` inteiro, `console.log`, codigo comentado, `TODO/FIXME` e sobras de codegen devem ser tratados como sujeira de automacao.
- Fluxos de negocio que atravessam varias telas devem preservar uma unica sessao de navegador dentro do mesmo `test`; dividir cada tela em um teste independente ou abrir/fechar navegador manualmente aumenta fragilidade e pode gerar dados duplicados.
- Validacoes de obrigatoriedade e botoes da mesma operacao devem permanecer no mesmo `test`; login em `beforeEach` para um teste por campo e defeito de isolamento transacional.
- Submissoes negativas devem usar campo-sentinela obrigatorio e restauracao em `finally`, para que uma regra ausente nao persista o cadastro. A evidencia do alvo deve usar `expect.soft` para permitir os demais campos na mesma sessao.
- Cada obrigatorio deve ser identificado na mensagem da assertion. `test.step` e util somente para operacoes de negocio distintas no mesmo ciclo; etapas por campo, clique ou espera, annotations, inventario e Markdown proprio sao ruido.
- Em `MODO: Implantacao`, teste negativo de tipo/formato esta fora do smoke e deve ser removido. Formato valido continua podendo orientar o preenchimento.
- Chromium headed deve abrir maximizado, com viewport nativo e fallback CDP quando o projeto seguir o padrao do plugin.
- A suite deve ser reprodutivel por outra pessoa com o mesmo perfil funcional e `.env` preenchido; dependencias de sessao local, perfil persistente, `storageState` manual, caminhos absolutos, `test.only/skip` ou massa escondida fora do projeto sao defeitos.
- `.playwright-e2e/cache/`, ledger ou lock de tentativa nao pertencem ao projeto entregue; registrar como infraestrutura de geracao indevida.
- `.playwright-e2e/private-domain/`, quando existir, deve estar ignorado e nunca deve ter conteudo copiado para arquivos publicos/versionados.
- Testes devem evitar dependencia de ordem e dados compartilhados imprevisiveis. Remocao ou transicao irreversivel so e segura quando a mesma spec cria o alvo na execucao atual, comprova persistencia e unicidade pelo `runId`, escopa a acao e valida ausencia ou novo estado.
- Reprovar acao destrutiva sobre primeira linha, `.first()`/`.nth()` sem filtro exato, prefixo generico, massa preexistente ou alvo preparado por outra spec. Falha depois da criacao deve preservar o registro para diagnostico, sem limpeza automatica.
- Reprovar nomes pessoais hardcoded como consulta de autocomplete, `%%%` usado apesar de existir valor especifico, correspondencia parcial, homonimo escolhido por posicao, `.nth()` e ausencia de confirmacao do valor final.
- Em implantacao, reprovar espera fixa, `force: true`, `.first()` sem filtro, seletor estrutural de tabela e indice numerico injustificado. Aceitar indice calculado a partir do cabecalho da coluna.
- Reprovar preenchimento consecutivo do mesmo locator com o mesmo valor sem justificativa objetiva de evento JSF.
- Reprovar `localizarTentativa`, `retomarTentativa`, `removerTentativa`, ledger, lock, cache de tentativa, script npm, setup/teardown ou spec tecnica de limpeza no projeto entregue.
- Identificar casos compativeis que recriam a mesma entidade em specs separadas; recomendar um ciclo com uma massa principal quando cadastrar, consultar, alterar e remover puderem ocorrer na mesma sessao.
- Cada `CAMINHO`, individual ou em bloco `CASO DE USO <n>`, limita uma unica operacao. Explorar funcionalidade vizinha e defeito de escopo; etapas tecnicas do mesmo fluxo nao viram specs.
- O lote pertence ao processamento do prompt. Reprovar spec com numero/status do caso, mapa de credenciais, `RelatorioValidacoes`, `verificacoesPlanejadas` ou controle manual como `fluxoAcessivel`.
- Reprovar helper de evidencia manual, contrato de implantacao, runner de blobs, scanner de artefatos, leitor ZIP, scripts `test:qa` ou anexos que apenas repitam assertions. O relatorio deve ser o HTML nativo de uma unica execucao dos arquivos solicitados, com trace e screenshot somente em falhas.
- Para listas de cadastros anteriores, revisar se a primeira opcao realmente valida exclui placeholder, vazio, oculto e desabilitado. Campos de dominio devem manter valor intencional.
- `config/clientes`, `defaults.json`, `clientConfig` e `E2E_CLIENT_PROFILE` sao infraestrutura legada: alertar para migracao somente quando ainda existirem consumidores, sem excluir automaticamente.
- Reentrada controlada apos Voltar/Cancelar e permitida na mesma sessao antes de persistencia; novo login ou novo contexto continuam sendo defeitos.
- Consentimento que possa aparecer na abertura deve ser procurado por no maximo `2_000` ms antes das credenciais, aceito quando presente e ignorado quando ausente. A recuperacao tardia continua permitida somente para repetir uma acao interceptada uma vez e relancar erros nao relacionados.
- `isVisible()` imediato apos submissao/navegacao nao comprova saida do fluxo; revisar se a continuidade aguarda um campo estavel da tela com timeout curto.
- Propriedades `null` de specs nao selecionadas nao podem bloquear uma execucao parcial.
- Configuracao padrao do plugin deve usar Chromium headed, reporters `line` e HTML nativos, trace/screenshot somente em falhas e video desligado. Executar os arquivos solicitados em um unico comando quando for necessario um relatorio conjunto.

Se nao houver achados, declarar isso e mencionar testes nao executados ou riscos que permaneceram.

Ao revisar especificamente legibilidade, carregar `../../references/legibilidade-codigo.md`.
