# 0010 — Transições de valor sem remontar

**Status:** aceita
**Data:** 15 a 16/10/2026 (D62, D76, D77); registrada como ADR em 16/10/2026
**Decisões do PRD:** D76 (ao mudar filtro, "Comparar com" ou competência, barras, pilhas e números vão do valor antigo ao novo em 600 ms, sem reanimar do zero e sem remontar o Painel), D77 (item 4: as linhas ficam na ordem antiga enquanto as barras deslizam e só depois reordenam), D26 (Motion com regras próprias, `prefers-reduced-motion` respeitado), D62 (esqueleto, entrada e `MotionConfig` global com `reducedMotion="user"`)

## Contexto

Em 15 e 16/10 o responsável reclamou: "as animações quebraram; ao mudar o filtro a barra deve encolher" (D76). Remontar o Painel a cada mudança reiniciava a animação do zero e perdia a continuidade. A D77, numa prancha de 16/10, definiu o que fazer com a ordem das linhas depois da transição.

## Decisão

- Ao mudar filtro, "Comparar com" ou competência, **barras, pilhas, linhas de comparação e números transitam do valor antigo ao novo** em 600 ms, com ease-out. Com movimento reduzido, a troca é seca.
- **O Painel não é remontado** nessas mudanças. A chave da visão é `tipo:visao`; o modo genérico recomeça por planilha.
- A **entrada do zero** só toca na primeira visita de cada visão.
- Linhas que saem com o filtro **desmontam secas**, sem fade (por simplicidade). Chips de filtro entram sem empurrar o conteúdo; esqueletos têm a altura do conteúdo.
- **Ordem das linhas (D77, item 4):** ao filtrar, as linhas ficam na ordem antiga enquanto as barras deslizam (600 ms) e só depois reordenam. Com movimento reduzido, a reordenação é na hora.
- **Movimento reduzido:** um `MotionConfig` global com `reducedMotion="user"` (D62), com tokens e regras da D26.
- Troca de aba e de competência: com os dados em cache não há esqueleto; o conteúdo antigo fica na tela enquanto o novo renderiza (D62).

## Consequências

Conferido no código:

- `src/main.tsx` envolve o app em `MotionConfig` com `reducedMotion="user"` e `transition` baseada nos tokens `duration.base` e `standard`.
- `src/components/app/Apresentacao.tsx` usa `useDeferredValue` sobre o alvo (carga e visão) e monta a chave da visão como `` `${tipo}:${visao}` ``.
- Em código novo de gráfico ou de lista: **não usar** `key` que mude com o valor filtrado, nem desmontar o Painel, para forçar reanimação. Transição de valor entra por animação do valor antigo para o novo.
- Só `transform` e `opacity`, nada em loop (D26). Texto visível usa "mês de referência" (D76).
- `VITE_ATRASO_MS` atrasa as leituras só no dev server, para ver os estados de espera (D62; `src/cargas/comAtraso.ts`, ativo apenas em `import.meta.env.DEV`).
- O desempenho medido em D76 com 12 posições de 20.000 linhas (abrir o Painel 350 ms, trocar o "Comparar com" 111 a 125 ms, a competência 133 a 167 ms e aplicar filtro 277 ms, em `docs/bench-12-posicoes.md`) é a referência: transição não pode custar a meta de menos de 1 s da D74.
- Spec de mudança visual precisa de prancha aprovada (ADR 0012).

Pendência de conferência: a implementação da reordenação depois da transição é a fatia I do plano (PR #70), ainda aberta no plano; este ADR registra a decisão, não confirma que ela já está no código.

## Alternativas

Não registradas além do que cada decisão descarta: linhas que saem com fade foram descartadas "por simplicidade" (D76); o traço do mês comparado da D75 foi substituído pelas barras listradas da D77.
