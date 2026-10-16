# Medição com 12 posições (D74)

Pergunta: com 12 posições mensais (nov/25 a out/26) de volume próximo do real, quanto leva para abrir o Painel e para trocar o "Comparar com"? Meta: abaixo de 1 s.

**Resposta curta:** com 3.000 linhas na posição mais recente, a troca do "Comparar com" fica abaixo de 1 s (cerca de 0,2 a 0,4 s no navegador), mas abrir o Painel tem um quadro travado de ~0,6 s (borderline). Com 20.000 linhas, a troca ainda fica abaixo de 1 s (0,33 a 0,37 s), mas **abrir o Painel passa de 1 s** (maior quadro ~1,07 s; longtasks somam ~1,2 s).

## Dados

Gerados por `docs/exemplos/gerar-bench-12-posicoes.mjs` (semente fixa, nada real). `--linhas N` é o tamanho da posição de out/26; as anteriores crescem até ela (3.000: de 1.337 a 3.000; 20.000: de ~9.000 a 20.002 linhas). Cada posição traz o histórico até o Mes Ref. e chamados que mudam entre posições (a cada mês, ~9% das linhas mudam de situação; ~3,7% viram Finalizado): finalizados depois, aguardando aceite com aceite posterior, reabertos (Qtd Reabertura 1) e 8% com lançamento atrasado (a Data de Solução cai no mês anterior ao da posição que a mostra).

## Tempos

Máquina: 16 CPUs (`nproc`), 15 GB de RAM, Linux 7.1; Chromium headless do Playwright, viewport 1920x1080. Melhor de 3 (intervalo entre parênteses no navegador). Medidas feitas com outras sessões usando a máquina (load average de 1,5 a 5,4 durante as medições), então os números têm ruído para mais.

### Motor (vitest/jsdom, sem renderizar a tela)

`BENCH=1`, dados recarregados a cada rodada (cache do motor frio).

| Passo | 3.000 linhas | 20.000 linhas |
|---|---|---|
| Montagem do `usePainelComparado` | 119 ms | 606 ms |
| `pontosDaEvolucao` (6 meses) | 95 ms | 575 ms |
| Troca do seletor, mes:2025-11 | 8 ms | 48 ms |
| Troca do seletor, mes:2026-03 | 9 ms | 50 ms |
| Troca do seletor, mes:2026-07 | 8 ms | 50 ms |

### Navegador (build de produção, modo API com rotas mockadas)

Maior quadro (intervalo entre `requestAnimationFrame` numa janela de 3 s) e soma de longtasks (> 50 ms) na janela.

| Ação | 3.000: maior quadro | 3.000: longtasks | 20.000: maior quadro | 20.000: longtasks |
|---|---|---|---|---|
| Abrir o Painel | 600 ms (600-683) | 584 ms | **1.067 ms (1.067-1.383)** | **1.229 ms** |
| Painel > Comparar | 133 ms | 243 ms | 317 ms | 665 ms |
| Comparar > Painel | 200 ms | 208 ms | 183 ms | 590 ms |
| Troca "Comparar com" para mes:2026-08 | 209 ms | 217 ms | 357 ms | 372 ms |
| Troca para mes:2026-03 | 228 ms | 235 ms | 373 ms | 385 ms |
| Troca para mes:2025-11 | 179 ms | 190 ms | 328 ms | 332 ms |
| Troca para mes:2025-09 (sem posição) | 139 ms | 200 ms | 169 ms | 249 ms |

Resultado: **passou de 1 s só ao abrir o Painel com 20.000 linhas.** Os demais ficam abaixo de 1 s, mas a troca com 20.000 linhas fica com um quadro de 0,33 a 0,45 s.

## Onde está o tempo

Perfil de CPU (`PERFIL=1`, build sem minificar, 20.000 linhas, tempo próprio por função).

**Abrir o Painel (~1,2 s de CPU):**
- `paraData`, o `reviver` das cargas vindas da API (`src/cargas/repositorio-api.ts:35`, aplicado por linha e por coluna de data em `:44-:50`): 135 ms. É custo da API, e se repete a cada carga que chega (12 posições, sendo as últimas 6 pré-carregadas).
- `limitesDaCompetencia` (`src/chamados/situacao.ts:9`): 114 ms. É chamada a cada linha em `classificarLinha` (`situacao.ts:41`) e em `calcularBruto` (`src/chamados/metricas.ts:232`) e refaz o `split` e o `Date.UTC` da mesma competência para cada linha. Calcular uma vez por chamada de `classificarLinhas` removeria isso.
- `texto` / `tempo` (`situacao.ts:27` e `:29`), `normalizar` (`src/chamados/mapeamento.ts`): ~220 ms somados, leituras de célula por linha e por métrica.
- `calcularBruto` (`metricas.ts:230`): 75 ms; `agrupar` (`src/chamados/cruzamentos.ts:91`): 68 ms; `opcoesDoFiltro` (`src/components/chamados/logica.ts:730`) e `textoDe` (`logica.ts:689`): ~80 ms.
- Coleta de lixo: 194 ms.

**Troca do "Comparar com" (~0,35 s de CPU com 20.000 linhas, só ~50 ms é motor):** o motor já está barato (tabela acima); o resto é dos cruzamentos recalculados no render: `clientePorSituacao` (`cruzamentos.ts:114`, 27 ms), `operadorPorAtraso` (`:146`, 25 ms), `areaPorSla` (`:174`, 17 ms), `clientePorTempo` (`:204`, 16 ms), `contexto` (`:70`, 14 ms) e coleta de lixo (60 ms). Cada um percorre as ~20.000 linhas da posição aberta e da base, mesmo quando só a base mudou.

Observação: o motor medido no vitest (montagem 606 ms) é metade do que a abertura custa no navegador; o restante é o reviver das datas, a renderização dos gráficos e a coleta de lixo.

## Como rodar de novo

Cada comando pesado deve passar pelas travas de CPU da sessão (`portao.sh` e, nas medições de tempo, `flock .../portoes.lock`); anote `uptime` junto.

```sh
# 1. dados (docs/exemplos/bench/<N>/, ignorado pelo Git)
node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 3000
node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 20000   # --sem-xlsx pula as planilhas

# 2. motor (pulado sem BENCH; imprime "BENCH motor ..." com --disableConsoleIntercept)
BENCH=1 npx vitest run --maxWorkers=2 --disableConsoleIntercept src/components/chamados/bench-12-posicoes.test.tsx

# 3. navegador: build de produção em modo API + preview na PW_PORT (padrão 4186), 3 repetições
node scripts/bench/bench-navegador.mjs 3000 3
node scripts/bench/bench-navegador.mjs 20000 3
#   SEM_BUILD=1 reaproveita o build; PERFIL=1 imprime as funções mais pesadas (build sem minificar)
```

O script do navegador sobe e derruba o próprio servidor de preview; os resultados ficam em `docs/exemplos/bench/resultado-navegador-<N>.json`. Ele fica fora do `npm run test:e2e` (a pasta `e2e/` não o inclui).

## Depois da otimização (branch `perf/motor-linhas`)

Mudanças, todas em `src/chamados/` (e `texto` em `logica.ts`): `limitesDaCompetencia` memorizada por competência; `lerFoto` normaliza cada Situação uma vez e lê `slaPrevisto` uma vez por linha; `texto`/`textoDe` com atalho para strings; `agrupar` dos cruzamentos passou a acrescentar no grupo (antes copiava o vetor a cada linha, custo quadrático, o maior ganho); os quatro cruzamentos têm cache por entrada (`WeakMap`), então a troca do "Comparar com" não refaz o mês aberto (teste `cruzamentos-cache.test.ts`). Números inalterados (`motor-caracterizacao.test.tsx` sem regenerar a referência). `reviver`/`paraData` e `opcoesDoFiltro` ficaram como estavam.

Medido com o mesmo método (melhor de 3), load average de 1,5 a 3 antes e de 0,9 a 2,5 depois.

| Medida (20.000 linhas) | Antes | Depois |
|---|---|---|
| Abrir o Painel: maior quadro | 1.250 ms | **667 ms** |
| Abrir o Painel: soma de longtasks | 1.469 ms | **788 ms** |
| Painel > Comparar: maior quadro / longtasks | 317 / 655 ms | 200 / 443 ms |
| Comparar > Painel: maior quadro / longtasks | 200 / 623 ms | 167 / 166 ms |
| Troca do "Comparar com" (3 meses): maior quadro | 322 a 388 ms | 208 a 231 ms |
| Troca do "Comparar com": longtasks | 336 a 390 ms | 223 a 235 ms |
| Motor: montagem | 694 ms | 563 ms |
| Motor: evolução (6 meses) | 605 ms | 373 ms |
| Motor: troca do seletor | 51 a 62 ms | 36 a 39 ms |

Com 3.000 linhas: abrir o Painel 417 ms (antes ~600 ms); troca do "Comparar com" ~170 ms; motor: montagem 119 ms, evolução 54 ms. (A medição "antes" de 20.000 desta tabela foi refeita na sessão; a da seção "Tempos" acima é a original.) Meta de 1 s atingida.

## Depois do redesenho (16/10)

Staging @ c422b4e (redesenho #57, animações #59/#61, layout #63, período sem remontar #64). Build de produção em modo API, Chromium headless 1920x1080, melhor de 3, `PW_PORT=4192`, sob `portao.sh` + `flock portoes.lock`. Formato: maior quadro / soma de longtasks, em ms. "Antes" = seção "Depois da otimização" acima.

### 20.000 linhas

| Ação | Antes | Agora |
|---|---|---|
| Abrir o Painel | 667 / 788 | **350 / 447** |
| Painel > Comparar | 200 / 443 | 200 / 441 |
| Comparar > Painel | 167 / 166 | 50 / 118 |
| Troca do "Comparar com" (3 meses) | 208 a 231 / 223 a 235 | 111 a 125 / 119 a 135 |
| Troca de competência (ago/26, mai/26) | novo | 133 a 167 / 299 a 320 |
| Aplicar filtro (1ª opção de Severidade) | novo | 277 / 283 |
| Limpar filtro | novo | 110 / 114 |
| Motor: montagem | 563 | 559 |
| Motor: evolução (6 meses) | 373 | 359 |
| Motor: troca do seletor | 36 a 39 | 35 a 39 |

### 3.000 linhas

| Ação | Antes | Agora |
|---|---|---|
| Abrir o Painel | ~417 (maior quadro) | **133 / 206** |
| Painel > Comparar | n/d | 100 / 187 |
| Comparar > Painel | n/d | 50 / 69 |
| Troca do "Comparar com" | ~170 | 61 a 77 / 77 a 85 |
| Troca de competência | novo | 100 / 138 a 154 |
| Aplicar filtro | novo | 126 / 134 |
| Limpar filtro | novo | 92 / 99 |
| Motor: montagem | 119 | 120 |
| Motor: evolução | 54 | 54 |
| Motor: troca do seletor | n/d | 5 a 6 |

### Leitura

- Meta de abrir o Painel abaixo de 1 s: cumprida com folga (350 ms de maior quadro e 447 ms de longtasks com 20.000 linhas).
- Nada passou de 1 s e nada piorou mais de 20% contra o "antes".
- Maior valor novo: aplicar filtro com 20.000 linhas (277 ms num único longtask, recalcula o Painel inteiro); limpar filtro custa 110 ms (cache por entrada).
- O motor ficou igual ao "antes" (dentro do ruído). n/d = não registrado.

### Cenários novos e como rodar

O "Comparar com" agora é um Radix Select (`#comparar-com`); a troca é medida do `pointerup` no item (antes era o `change` de um `<select>`). Os cenários novos do `scripts/bench/bench-navegador.mjs`:

- Troca de competência: abre o popover "Competência" e clica na versão de agosto/26, depois na de maio/26 (medido no clique).
- Aplicar/limpar filtro: drawer "Filtros", combobox "Severidade", 1ª opção (medido no clique da opção); limpar = botão "Limpar filtros".

```sh
node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 3000 --sem-xlsx
PW_PORT=4193 node scripts/bench/bench-navegador.mjs 3000 3   # SEM_BUILD=1 reaproveita o build
```

O script sobe e derruba o próprio preview; o resultado vai para `docs/exemplos/bench/resultado-navegador-<N>.json` (ignorado pelo Git). Em medição de tempo, passe pelas travas de CPU e anote o `uptime`.
