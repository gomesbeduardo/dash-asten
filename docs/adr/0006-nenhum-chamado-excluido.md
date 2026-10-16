# 0006 — Nenhum chamado é excluído, dado derivado é sinalizado e números são conferidos

**Status:** aceita (a regra de backlog e as classificações da D34 foram revogadas pela D64; o princípio de não excluir linha continua)
**Data:** 14/10/2026 (D34, D41, D42); registrada como ADR em 16/10/2026
**Decisões do PRD:** D34 (nenhum chamado é excluído: todas as linhas ficam presentes e tratadas), D41 (todo número que não é dado original puro leva selo claro), D42 (número é conferido por um cálculo independente antes de ser dado como certo)

## Contexto

A D34 nasceu do corte da competência: chamados abertos depois do fim do mês poderiam ser descartados. A decisão foi tratá-los, nunca descartá-los. A D41 e a D42 vêm do mesmo cuidado: quem olha o painel na reunião precisa saber o que é dado original e o que é derivado, e os números precisam ser confiáveis.

Nota de revisão: a D64 (15/10) revogou a regra de backlog e a classificação "Situação na competência" da D34, mas mantém o princípio: os chamados abertos depois do mês do Mes Ref. "ficam numa nota, sem excluir linha (D34)". A D77 repete: "nenhum dado sai do cálculo (D34)". As regras de cálculo do modelo atual estão no ADR 0007.

## Decisão

1. **Nenhum chamado ou linha é excluído do app.** Todos os dados ficam presentes e tratados (classificar, rotular, separar), nunca descartados.
2. **Todo número que não é dado original puro leva um selo claro, com ícone e texto**, igual em todas as visões, nunca só cor nem só tooltip. Os exemplos que a D41 lista são reconstruído pelas datas, calculado sobre colunas da data da exportação, classificação derivada e agrupamento "Outros". No modelo atual, o selo que a D65 prevê é o de valor **corrigido** por posição posterior.
3. **Antes de dar um número como certo, ele é conferido por um cálculo independente** do motor do app (feito do zero sobre a planilha), e as diferenças são explicadas. Não presumir.

## Consequências

- Código que filtra, agrupa ou classifica linhas não pode removê-las do conjunto de dados. Um chamado que não entra nos números do mês entra numa nota ou em outra classificação (ex.: "N abertos depois do Mes Ref.").
- O filtro de interface recorta as linhas antes do cálculo (D39); isso é escolha da pessoa na tela e não é exclusão de dado.
- Valor derivado novo (qualquer número que não seja o dado cru da planilha) precisa de selo com ícone e texto, e a spec da mudança diz qual. O selo "corrigido" existe no código (`src/chamados/fotos.ts`, `src/components/chamados/comparar.ts` e `CompararChamados.tsx`).
- Mudança de regra de cálculo precisa de conferência independente (D42) antes de ser dada como correta. O PRD §15 exige que Painel, Leituras e Comparar mostrem números conferidos assim.
- Planilhas reais nunca entram no Git; a conferência usa dados sintéticos nos testes (`docs/exemplos/`).

Não conferido no código: se o agrupamento "Outros" e o selo de "calculado" ainda existem na interface. O plano diz que os selos "reconstruído" e "calculado" saíram na fatia A.

## Alternativas

Não registradas no PRD para estas três decisões.
