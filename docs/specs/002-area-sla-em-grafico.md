# 002 — Área × SLA em gráfico (sem tabela)

**Status:** aprovada (16/10, opção A, prancha https://claude.ai/artifact/BPp7T9zdJtEPZc1qGWmLJy). Substitui o cartão em tabela; a spec 001 (retirar o cartão) foi descartada.
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

## Critérios de aceite (opção A)
- Dado o Painel com uma posição, quando a faixa "Onde está o problema?" monta, então há **um** cartão "Área × SLA", numa linha própria abaixo dos três cruzamentos (Cliente × Situação, Operador × Atraso, Cliente × Tempo médio), que passam a ocupar uma linha de 3 sem buraco (teste de componente + capturas em 1366, 1920, 2560, 3440 e 3840).
- Dado o cartão, quando monta, então tem dois gráficos de barras lado a lado com as mesmas áreas nas mesmas linhas, alinhadas: à esquerda "% no SLA · finalizados no mês", em escala fixa de 0 a 100% e rótulo com a % inteira e o "n de N" (ex.: "67% (4 de 6)"); à direita "SLA vencido · não finalizados", em contagem a partir de 0, na cor de SLA vencido. O nome da área aparece uma vez, à esquerda. Sem tabela no cartão e sem eixo duplo; o "Ver dados" continua como nos outros cartões (teste de componente).
- Dada uma área sem finalizados com SLA no mês, quando o cartão monta, então a % aparece como "—" e a linha continua, com o SLA vencido normal (D34) (teste de componente).
- Dado o "Comparar com" ativo, quando o mês comparado é maior, então a diferença aparece em listras depois da barra sólida; quando é menor ou igual, não há listra e o valor comparado aparece em cinza no rótulo ("mai 78%", "mai 20") (D77) (teste de componente).
- As áreas ficam ordenadas por SLA vencido, da maior para a menor, e empatadas em ordem alfabética; ao filtrar, as barras deslizam do valor antigo ao novo e as linhas reordenam depois de 600 ms (D76/D77) (teste com relógio falso).
- O motor não muda: `areaPorSla` e os KPIs % no SLA e SLA vencido têm os mesmos números (golden `motor.txt` inalterado).
- Só componentes e tokens do design system; nenhuma cor ou tamanho literal.
- Testes, checagem de tipos, lint, build e testes no navegador passam.

## Fora do escopo
- Meta de SLA (não existe; D75).
- Mudar o cálculo `areaPorSla`.

## Perguntas abertas
- Nenhuma. O protótipo (`proto/area-sla`, commit f80df8e) serve de referência visual; a escolha por `?areasla=` e as opções B e C não entram.
