# 002 — Área × SLA em gráfico (sem tabela)

**Status:** rascunho (aguarda prancha)
**Pedido:** "não achamos uma boa forma de demonstrar por gráfico (ou pesquise como seria o melhor para fazer)".
**Decisões ligadas:** D75 item 4 (sem meta de SLA; não existe meta), D77 item 3 (evitar tabelas) e item 1 (mês comparado em listras só depois da sólida), regra dataviz do projeto (sem eixo duplo).

## Problema
Por área, o Painel precisa mostrar duas medidas de naturezas e populações diferentes:
- **% no SLA:** dos finalizados no mês com SLA, quantos dentro do prazo (0–100%; áreas pequenas podem ter 3 chamados);
- **SLA vencido:** contagem de não finalizados com SLA vigente vencido.

A versão em tabela foi recusada. Pesquisa em `notas-sessao/manha/pesquisa-area-sla.md` (fontes: Datawrapper sobre small multiples, eixo duplo e eixo no zero; Evergreen sobre amostras pequenas).

## Opções para a prancha
- **A (recomendada):** dois gráficos de barras lado a lado com as mesmas áreas nas linhas. À esquerda, % no SLA em escala fixa de 0 a 100% e rótulo "67% (2 de 3)". À direita, SLA vencido em contagem a partir de 0, em vermelho. Nome da área uma vez, à esquerda.
- **B:** os mesmos dois gráficos em cartões separados ("No SLA por área" e "SLA vencido por área").
- **C:** só o SLA vencido por área (a % no SLA fica no KPI do topo).

## Critérios de aceite (valem depois da escolha; ajustados à opção aprovada)
- Dado um mês com áreas, quando o cartão monta, então cada área aparece uma vez, com a % no SLA e "n de N" e com o SLA vencido; não há tabela nem eixo duplo (teste de componente).
- Dada uma área sem finalizados com SLA no mês, quando o cartão monta, então a % aparece como "—" e a linha continua (D34).
- Dado o "Comparar com" ativo, quando o mês comparado é maior, então a diferença aparece em listras depois da barra (D77); quando é menor ou igual, só o valor em cinza.
- Dado um filtro novo, quando os valores mudam, então as barras deslizam e as linhas reordenam depois de 600 ms (D76/D77).
- As áreas ficam ordenadas por SLA vencido, da maior para a menor, e empatadas em ordem alfabética.

## Fora do escopo
- Meta de SLA (não existe; D75).
- Mudar o cálculo `areaPorSla`.

## Perguntas abertas
- Qual opção (A, B ou C)? Recomendo a A.
