# 0007 — Modelo de posição do mês

**Status:** aceita. Substitui a reconstrução de meses pelas datas (D51, revogada pela D63; regra de backlog da D34, revogada pela D64)
**Data:** 15/10/2026 (D63 a D66, D71, D73); registrada como ADR em 16/10/2026
**Decisões do PRD:** D63 (cada carga é uma foto da base no Mes Ref., a competência vem dessa coluna e acaba a reconstrução pelas datas), D64 (nada é backlog; cada Situação como ela é; atraso por ciclo), D65 (comparar o Mes Ref. com qualquer período, corrigido pela posição mais nova), D71 (o aceite manda na correção entre posições), D73 (o seletor começa na primeira carga), D66 (versões no Comparar), D69 (texto visível diz "posição do mês")

## Contexto

Em 15/10, na reunião pós-MVP com o Líder, ficou decidido que a planilha deixa de ser tratada como a competência reconstruída por datas e passa a ser uma **foto da base de chamados no Mes Ref.** (coluna da planilha), com o estado daquele momento e todo o histórico anterior. As datas vêm do sistema e são confiáveis; o que não se faz mais é deduzir estado por elas (D63). O ciclo de atraso foi confirmado pelo Líder como sendo o Mes Ref. (D64).

## Decisão

- **Carga = posição do mês.** A competência vem da coluna Mes Ref., pré-preenchida e editável no envio (revisa D28/D57). Sem a coluna, a inferência anterior (aba, arquivo, títulos, datas) segue como reserva (plano, onda 1, fatia B).
- **Acaba a reconstrução de meses pelas datas** (D51 revogada). Mês sem foto não é reconstruído.
- **Nada é backlog** (D64 revoga a regra de backlog da D34 e o vocabulário "backlog" no app). "Não finalizado" é Situação diferente de Finalizado; nada é agrupado por conta própria. O topo do Painel traz o total e um card por Situação, com nome e contagem literais; situação nova vira card.
- **Em atraso** é o não finalizado aberto antes do mês do Mes Ref., com faixas de 1, 2 a 3, 4 a 6 e 7 ou mais meses; **SLA vencido** é medido à parte. **Finalizados no mês** exigem Situação Finalizado **e** Data de Solução no mês. Chamados abertos depois do mês do Mes Ref. não entram nos números do mês: ficam numa nota "N abertos depois do Mes Ref." (sem excluir linha, ADR 0006).
- **Comparar e corrigir (D65):** o Painel mostra a posição do Mes Ref. com Δ contra **um período escolhido**; a aba Comparar mostra 2 a 6 períodos ou versões. O período anterior vem da posição daquele mês, **corrigida pela posição mais atual**. A correção só vem de posições com **Mes Ref. posterior**; versões do mesmo mês nunca se corrigem. Cruza por Código. Um chamado que a posição mais nova mostra Finalizado com Data de Solução até o fim daquele mês passa a contar como finalizado lá. Outras mudanças de situação, que não têm data, não são corrigidas. Chamados que não estavam na posição antiga não são acrescentados. O valor corrigido ganha marca discreta só quando mudou.
- **Mês sem posição** mostra só o que as datas dão (entradas e finalizados, tirados da posição mais atual); o que depende de Situação fica "—".
- **Aceite (D71):** o chamado conta como Finalizado a partir do mês do aceite. Com Data de Aceite preenchida na posição mais nova, corrige o mês antigo só se ela for até o fim dele. Sem Data de Aceite, quem estava "Aguardando aceite" no mês antigo não é corrigido; as demais situações seguem corrigidas pela Data de Solução (lançamento atrasado).
- **Seletor (D73):** os seletores de comparação (Painel e aba Comparar) listam meses só a partir da carga mais antiga. Meses sem posição entre duas cargas continuam aparecendo.
- **Versões (D66):** no Comparar, o seletor de cada coluna desdobra as versões quando o mês tem 2 ou mais (padrão = atual). Painel e "comparar com" usam a versão atual.
- Texto visível chama a planilha de "posição do mês" (D69); identificadores internos do código podem continuar com "foto".

## Consequências

Conferido no código:

- A lógica de correção entre posições vive em `src/chamados/fotos.ts` (`corrigirFoto`, `metricasCorrigidas`, `metricasDoMesSemFoto`, `opcoesDeComparacao`). O comentário de `corrigirFoto` repete as regras da D65 e da D71. Mudança nessas regras exige spec e testes de aceite (`fotos.aceite-correcao.test.ts`, `foto.aceite.test.ts`).
- `corrigirFoto` não altera a planilha ("A planilha não é alterada").
- O banco guarda o Mes Ref. lido no envio na coluna `mes_ref` (`db/schema.prisma`, migração `0004`), para auditoria quando a competência foi editada.
- **Proibido** reintroduzir "backlog", reconstrução de mês por datas ou posição "reconstruída" (o plano diz que `backlog`, `aberto-no-fim`, `reconstruivel`/`cargaPropria` e `reconstruirAnteriores` saíram). A D41 já exige selo para qualquer valor derivado (ADR 0006).
- Correção nunca vem de versão do mesmo mês nem de posição com Mes Ref. anterior.
- Texto de tela usa "posição do mês", "mês de referência" (D76) e não "foto" nem "Mes Ref.".
- O caso de aceite do motor está na tabela de testes do `docs/exemplos/LEIA-ME-testes.md` (abr v1, abr v2, mai, out), segundo o plano.

Pendências ligadas, no PRD §8: a aba da planilha modelo diz "ciclo Setembro" e a coluna Mes Ref. diz out/26; até a resposta do Líder vale o Mes Ref. (editável no envio). Reabertos não finalizados contam como resolvidos pela Data de Solução, com aviso, e aguardam confirmação (D61).

## Alternativas

- Reconstrução de meses pelas datas (D34/D51): foi o modelo anterior e foi revogado (D63, D64). O PRD não registra outras alternativas consideradas para o modelo de posição.
