# 001 — Retirar o Área × SLA do Painel

**Status:** aprovada (16/10, pedido direto do responsável)
**Pedido:** "retire o Área x SLA por agora, não achamos uma boa forma de demonstrar por gráfico".
**Decisões ligadas:** D75 item 4 (Área × SLA como tabela com barras, agora revisto), D77 item 3 (evitar tabelas; o cartão sai até haver forma em gráfico aprovada), D34 (nenhum dado sai do cálculo).

## Problema
O cartão "Área × SLA" da faixa "Onde está o problema?" é uma tabela com barras embutidas, e o responsável quer evitar tabelas. Ainda não há forma em gráfico aprovada (spec 002).

## Critérios de aceite
- Dado o Painel de Chamados com qualquer posição, quando a faixa "Onde está o problema?" monta, então não existe cartão "Área × SLA" (teste de componente: nenhum elemento com o título nem `id="areaSla"`).
- Dado o Painel sem o cartão, quando a linha dos cruzamentos é exibida em 1366, 1920, 2560, 3440 e 3840 px de largura, então os cartões restantes (Cliente × Situação, Operador × Atraso, Cliente × Tempo médio) ocupam a linha sem buraco nem cartão esticado fora do padrão (capturas nas 5 larguras).
- Dado o Painel, quando os KPIs aparecem, então "% no SLA" e "SLA vencido" continuam com os mesmos valores de antes (teste do motor inalterado e golden `motor.txt` sem mudança de número).
- Dado o código, quando a remoção termina, então os componentes usados só pelo cartão (`AreaSla`, `BarraPercentual`, `BarraVencidos`) e os testes deles saem; o cálculo `areaPorSla` do motor fica, porque a spec 002 o reaproveita.
- Testes, checagem de tipos, lint, build e testes no navegador passam.

## Fora do escopo
- A forma em gráfico do Área × SLA (spec 002).
- Mudar qualquer outro cartão da faixa.

## Perguntas abertas
- Nenhuma.
