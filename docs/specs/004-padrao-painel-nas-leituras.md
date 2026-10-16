# 004 — Padrão visual do Painel nas Leituras

**Status:** rascunho (aguarda prancha)
**Pedido:** D72 (15/10): "depois de aprovado no Painel, o mesmo padrão vai para Comparar e Leituras"; confirmado em 16/10 para preparar a prancha.
**Decisões ligadas:** D72 (acabamento), D75 item 8 (paleta por significado: cor da situação fixa pelo nome, vermelho só para SLA vencido), D77 (P3).

## Problema
No modal de cada leitura, a evidência usa `BarrasRanking` (Recharts) com cores genéricas do tema (`COR.cinza`, `COR.verde` = `var(--chart-N)`), e não as cores por significado do Painel (`--serie-*` e as cores das faixas de atraso) (`ListaLeituras.tsx`).

## Opções para a prancha
- **A:** a evidência usa o componente de barras do Painel (`BarrasRefinadas`) com as cores por significado.
- **B:** mantém o `BarrasRanking`, só com as cores por significado e o acabamento (base reta, ponta de 4 px).

## Critérios de aceite (ajustados à opção aprovada)
- Dada uma leitura com evidência em barras, quando o modal abre, então as cores seguem o significado (não finalizados com a cor dos não finalizados, faixa 7+ com a cor da faixa) e nenhuma usa `--chart-N` (teste de componente).
- As barras têm base reta e só a ponta arredondada.
- As regras das leituras não mudam (testes de `leituras.ts` inalterados; o responsável manteve a regra "fluxo" em 16/10).

## Fora do escopo
- Mudar regras ou limites das leituras (dependem do Líder, PRD §8).

## Perguntas abertas
- A ou B? Recomendo a A, para um único padrão de barras no app.
