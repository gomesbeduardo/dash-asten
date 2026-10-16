# 003 — Padrão visual do Painel no Comparar

**Status:** rascunho (aguarda prancha)
**Pedido:** D72 (15/10): "depois de aprovado no Painel, o mesmo padrão vai para Comparar e Leituras"; confirmado em 16/10 para preparar a prancha.
**Decisões ligadas:** D72 (Δ em selo colorido com seta e valor, seguido do período em cinza; sem "vs", "·" ou "pior/melhor" visíveis), D75 (base reta e ponta arredondada; paleta por significado), D77 (paleta P3; Comparar continua em cartões, sem tabela).

## Problema
Hoje o Comparar não segue o padrão do Painel:
- Os cartões de KPI mostram o Δ como texto colorido com ícone, não com o selo do Painel (`SeloDelta`), e o período sai vazio (`CompararChamados.tsx`, cartões de KPI).
- Os gráficos "No mês" são barras agrupadas do Recharts, uma por competência (2 a 6), com gradiente e sombra. O acabamento é diferente das barras do Painel (`BarrasComparar` em `graficos.tsx`).

## Opções para a prancha
- **Cartões:** Δ com o `SeloDelta` (seta e valor) e o período em cinza, igual ao Painel.
- **Barras "No mês", opção A:** mantém as barras agrupadas por competência, com o acabamento do Painel (base reta, ponta de 4 px, espaçamento médio da D72) e as cores das competências em ordem cronológica.
- **Barras "No mês", opção B:** troca para o componente do Painel (`BarrasRefinadas`), uma série por competência.

## Critérios de aceite (ajustados à opção aprovada)
- Dado o Comparar com 2 a 6 competências, quando um KPI tem Δ, então ele aparece no selo do Painel com o período em cinza, e "pior/melhor" só no `aria-label` (teste de componente).
- Dados os gráficos "No mês", quando montam, então as barras têm base reta e só a ponta arredondada (teste de classe ou estilo), sem cor literal fora dos tokens.
- Dado um filtro ou uma troca de competência, quando os valores mudam, então as barras deslizam do valor antigo ao novo (D76).
- O teste no navegador que confere o `aria` do Δ ("+1 em relação a ago/26, pior", em `e2e/chamados.spec.ts`) continua passando ou é atualizado junto.

## Fora do escopo
- Comparar em tabela (recusado na D77).
- Mudar quais KPIs ou gráficos o Comparar mostra.

## Perguntas abertas
- Barras: opção A ou B? Recomendo a A, porque a B foi feita para duas séries e o Comparar tem até 6 competências por categoria.
