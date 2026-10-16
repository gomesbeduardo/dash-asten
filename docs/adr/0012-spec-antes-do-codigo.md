# 0012 — Spec antes do código (SDD + TDD)

**Status:** aceita
**Data:** 16/10/2026
**Decisões do PRD:** não há um Dxx para esta regra. Ela está no `CLAUDE.md` do projeto ("Spec antes do código, SDD + TDD, 16/10"), em `docs/specs/README.md` e no plano (onda 4, nota de 16/10). Ligada a D72 e D77, que passaram a exigir prancha aprovada para mudança visual

## Contexto

A partir de 16/10 o fluxo ganhou uma etapa antes do código. O `CLAUDE.md` pede que, se o pedido vier na pressa (sem spec, escopo crescendo, visual sem prancha), o agente pare e aponte o que falta. O motivo detalhado não está escrito além disso.

## Decisão

Toda mudança de comportamento ou de tela tem uma spec em `docs/specs/NNN-nome.md` (modelo em `docs/specs/README.md`), **aprovada pelo responsável antes do código**. Os testes saem dos critérios de aceite e a PR confere a spec item a item. Mudança visual também precisa de **prancha** aprovada. O fluxo é:

1. Spec com status "rascunho".
2. Prancha, quando a mudança for visual (artifact com as opções e capturas reais).
3. Aprovação do responsável: status vira "aprovada", com a data e a escolha.
4. Testes escritos a partir dos critérios e vistos falhando (vermelho).
5. Código até os testes passarem (verde), sem nada além do que a spec pede.
6. PR para a `staging` conferindo cada critério, com a prova.

Spec que muda no caminho volta para "rascunho" e é reaprovada. **Dispensa:** correção trivial (texto, typo, lint) e protótipo descartável para prancha.

## Consequências

- Não se escreve código de comportamento ou de tela sem spec aprovada. Se o pedido chegar sem ela, a resposta correta é apontar o que falta.
- Cada critério da spec tem um teste que o verifica (Vitest, Testing Library ou Playwright, ADR 0001); o vermelho observado e o verde vão na PR.
- Specs existentes em `docs/specs/`: `001-retirar-area-sla.md` (aprovada, segundo o plano), `002-area-sla-em-grafico.md`, `003-padrao-painel-no-comparar.md` e `004-padrao-painel-nas-leituras.md` (aguardam prancha, segundo o plano).
- O trabalho a fazer está nas issues do GitHub (plano). Decisões de arquitetura ficam em `docs/adr/`: decisão nova de arquitetura vira ADR novo.

## Alternativas

Não registradas.
