---
name: corrigir-automacao-playwright
description: Diagnosticar e corrigir uma automacao Playwright existente que falha, e instavel ou deixou de localizar elementos. Use quando o usuario apresentar teste falhando, erro, seletor quebrado, flakiness, timeout ou regressao em codigo Playwright existente. Nao usar para criar um fluxo novo, revisar toda a suite ou configurar Playwright do zero.
---

# Corrigir Automacao Playwright

Corrigir somente a falha observada, preservando arquitetura, escopo funcional e padroes locais.

Conduzir a solicitacao somente com esta skill. Nao carregar nem chamar outra skill do plugin durante a correcao.

## Fluxo

1. Localizar o teste afetado, Page Objects relacionados e comando de execucao.
2. Consultar codigo, Page Objects e logs curtos, executando somente o menor cenario que reproduza a falha.
3. Classificar a causa: seletor, navegacao, sincronizacao, autenticacao, massa, permissao, regra funcional, ambiente ou captcha/MFA.
4. Se a primeira falha for locator/strict/hidden/attached/timeout/menu JSF, executar `../../scripts/parse-error-context.mjs <raiz-do-projeto> --input <error-context.md|log> --json`; se couber probe, validar locators com `../../scripts/repair-probe.mjs <raiz-do-projeto> --manifest <probes.json> --json` ou na pagina MCP preservada antes de repetir a spec inteira.
5. Usar Playwright MCP apenas na tela necessaria para confirmar estado real e seletor; em JSF/RichFaces, manter a mesma sessao/pagina, preferir `legacy-jsf-map.mjs`/manifest unico quando houver HTML/snapshot e nao usar varios `node -e` independentes por tela/seletor.
6. Alterar a menor superficie possivel, mantendo seletores e interacoes nos Page Objects.
7. Executar novamente apenas o cenario afetado em Chromium headed, salvo pedido contrario, e somente depois de uma correcao objetiva.
8. Executar `../../scripts/quality-gate.mjs <raiz-do-projeto> --contract <implantacao|massa|revisao> --changed` a partir desta skill; em implantacao, informar tambem `--case-kind <tipo>`. Se nao houver Git, usar `--files <arquivos>` ou `--manifest .playwright-e2e/changed-files.json`.
9. Ler somente o primeiro exemplo de cada regra relevante; se houver repeticoes, cobrir as demais por busca pontual com `rg`, sem abrir todos os arquivos. Usar `--verbose` apenas quando o agrupamento nao explicar a correcao.
10. Resumir causa, criterios preservados, arquivos alterados e resultado sem copiar logs longos.

## Regras

- Nao refazer o projeto, explorar funcionalidades vizinhas nem reescrever testes saudaveis.
- Nao substituir uma validacao funcional por mera verificacao de visibilidade.
- Nao trocar criterio informado pelo usuario por outro mais fraco sem confirmacao explicita; se a alternativa preservar so parte do criterio, parar e pedir confirmacao.
- Preferir locators semanticos e assertions com espera automatica.
- Em tabela, preferir role/nome acessivel e linha filtrada; aceitar ID estavel do container como fallback legado, sem cadeia estrutural `table tbody tr` injustificada.
- Evitar `waitForTimeout`; corrigir a condicao de sincronizacao.
- Remover timeout local menor de acoes quando ele apenas antecipa o `actionTimeout` central. Preservar limite explicito somente para condicao funcional comprovada, como `expect.poll` de lista dinamica.
- Remover `test.setTimeout` repetido da spec quando o projeto puder usar `timeout: 180_000` central; preferir `test.slow()` para fluxo excepcionalmente grande e preservar valor exato apenas com evidencia e justificativa.
- Apos submissao/navegacao, nao decidir continuidade por `isVisible()` imediato; aguardar campo estavel da tela com timeout curto para distinguir atualizacao do DOM de saida real.
- Se houver consentimento conhecido de cookies, procura-lo por no maximo `2_000` ms antes das credenciais e aceita-lo quando aparecer, sem falhar quando estiver ausente. Se cookie/modal/overlay ainda interceptar uma acao, recuperar somente esse clique, fechar o overlay e repetir uma vez. Nao usar `isVisible()` imediato como unica protecao e relancar erros nao relacionados.
- Preservar `.env`, `.gitignore`, Page Objects e convencoes existentes.
- Nao corrigir falha copiando erro cru, stack trace, timeout, texto de `body` inteiro ou mensagem transitoria para comentario, fixture, constante ou assert.
- Nao hardcodar nomes reais de pessoas, usuarios, servidores/funcionarios, documentos, matriculas, emails ou telefones observados na tela.
- Nao corrigir falha temporal trocando uma data vencida por outra data fixa; substituir por gerador dinamico ou parametro local quando a regra exigir data oficial.
- Nao reexecutar submissao que cria/altera dado persistente sem antes verificar se a tentativa anterior ja criou registro. Reutilizar ou limpar diretamente pelo navegador somente durante a correcao e quando for seguro e autorizado; nao gerar metodo, fixture, ledger, lock, cache, setup, teardown ou spec de limpeza.
- Em autocomplete, pesquisar diretamente um valor informado e exigir correspondencia exata. Sem valor informado, usar `%%%`, filtrar candidatos e selecionar o primeiro elegivel. Remover nomes presumidos, `.nth()` e tentativas sucessivas.
- Em remocao ou transicao irreversivel, preservar o contrato de propriedade: alvo criado pela propria spec na execucao atual, `runId` exclusivo, persistencia anterior e linha unica comprovadas, acao escopada e estado final validado. Nao "corrigir" escolhendo primeira linha, registro preexistente, massa de outra spec ou prefixo generico.
- Se a falha destrutiva ocorrer depois da criacao do alvo, preservar o registro identificado. Nao repetir a acao nem adicionar limpeza automatica em `finally` para fazer o teste passar.
- Em validacao negativa de obrigatoriedade, usar campo-sentinela obrigatorio para impedir persistencia caso a regra sob teste falhe; restaurar alvo e sentinela em `finally`. Nao executar a conclusao positiva quando uma verificacao bloqueante falhar.
- Manter o cenario afetado em uma unica sessao de navegador quando as telas dependem do mesmo estado; nao quebrar uma correcao em um teste por tela.
- Se a spec repetir uma colecao extensa de campo-locator-valor, mover essa fonte para o Page Object sem esconder a sequencia funcional. Nao corrigir criando camada `flows` ou metodo `executarSmokeCompleto`.
- Se a colecao do Page Object ficar visualmente extensa, usar um objeto nomeado completo por linha quando legivel; nao introduzir factory posicional ou arquivo auxiliar apenas para diminuir linhas.
- Page Object nao deve importar ou manipular `testInfo`; preserve a barreira de persistencia na spec.
- Incorporar wrapper interno curto usado uma unica vez quando ele apenas encadear chamadas, preservando metodos da API da spec e operacoes com assertions ou protecao transacional.
- Nao usar percentual de reducao como objetivo da correcao; eliminar responsabilidade duplicada ou sem consumidor, sem apenas compactar comandos ou transferir o mesmo codigo.
- Em clique com confirmacao e overlay opcional, registrar o dialogo e reutilizar a recuperacao do clique existente; nao duplicar aceite e repeticao.
- Em spec de implantacao, manter fases sequenciais e rasas. Remover `test.describe` quando o arquivo possui um unico teste e o agrupamento nao acrescenta configuracao ou contexto.
- Separar a acao de submissao da comprovacao do resultado: o Page Object deve oferecer clique e `validarMensagemSucesso()` como operacoes distintas.
- Preservar as verificacoes explicitas de ausencia de erro impeditivo depois da abertura e da conclusao. Corrigir marcadores somente com evidencia da aplicacao; nao recorrer a busca generica no `body`.
- Em execucao parcial, preservar a selecao automatica do `globalSetup` por `config.argv`: o arquivo informado no comando deve limitar os perfis autenticados, sem variavel adicional.
- Se `npx playwright test --ui` autenticar antes da escolha, fazer o `globalSetup` retornar ao detectar `--ui` e mover somente a preparacao do `storageState` da spec escolhida para uma fixture automatica baseada em `testInfo.file`, usando contexto separado sem trace.
- Usar assertions normais em acesso, botoes, navegacao e conclusao. Nao manter o fluxo artificialmente vivo depois de uma falha que possa ter alterado a pagina.
- Nas obrigatoriedades recuperaveis, usar `expect.soft` somente na evidencia do campo-alvo. Manter assertions normais na sentinela e na ausencia de sucesso, restaurando alvo e sentinela em `finally`.
- Remover `RelatorioValidacoes`, `fluxoAcessivel`, `cadastroConcluido` e inventarios duplicados quando apenas replicarem o runner. Depois do loop, usar uma unica barreira `if (testInfo.errors.length > 0) return` antes da persistencia positiva.
- Remover da spec numero/status do lote, mapas de casos ou credenciais e `verificacoesPlanejadas`; essas informacoes pertencem ao processamento do prompt, nao ao teste individual.
- Preservar `test.step` quando identificar operacoes de negocio distintas sobre o mesmo registro. Remover etapas de clique, preenchimento, espera, campo individual, aninhamento e annotations.
- Remover locator ou metodo sem consumidor comprovado. Nao preservar codigo preventivo apenas porque esta no Page Object.
- Preservar reprodutibilidade por CLI: nao corrigir usando sessao local ja autenticada, perfil persistente, `storageState` manual, caminhos absolutos, `test.only/skip` ou massa escondida fora do projeto.
- Cache local pode orientar a correcao, mas nao substituir confirmacao real quando seletor, tela ou estado estiverem incertos.
- Overlay privado local em `.playwright-e2e/private-domain/` pode orientar termos e receitas do projeto, mas nunca deve ser copiado para codigo versionado, logs ou resumo.
- Fazer uma tentativa objetiva de correcao. Se a causa exigir investigacao ampla ou dados ausentes, parar e pedir somente o que falta.
- Preservar reporters nativos `line` e `html`, trace e screenshot configurados somente para falhas; manter video desligado salvo necessidade explicita.

## Saida

Informar teste corrigido, causa principal, arquivos alterados, comando executado, resultado e eventual bloqueio.
