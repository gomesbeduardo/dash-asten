# Specs

Toda mudança de comportamento ou de tela começa aqui, antes do código (SDD), e os testes saem dos critérios (TDD). Fluxo:

1. **Spec** `NNN-nome.md` com o modelo abaixo, status "rascunho".
2. **Prancha** quando a mudança for visual (artifact com as opções e capturas reais).
3. **Aprovação** do responsável: status vira "aprovada", com a data e o que ele escolheu.
4. **Testes** escritos a partir dos critérios, vistos falhando (vermelho).
5. **Código** até os testes passarem (verde); nada além do que a spec pede.
6. **PR** para a `staging` conferindo cada critério, com a prova.

Spec que muda no caminho volta para "rascunho" e é reaprovada. Dispensa: correção trivial (texto, typo, lint) e protótipo descartável para prancha.

## Modelo

```markdown
# NNN — Título curto

**Status:** rascunho | aprovada (dd/mm, escolha) | feita (PR #)
**Pedido:** a frase do responsável, literal.
**Decisões ligadas:** Dxx (o que diz, numa cláusula).

## Problema
O que está errado ou faltando hoje, com exemplo concreto.

## Critérios de aceite
- Dado …, quando …, então … (como será verificado: teste, captura, comando)

## Fora do escopo
- …

## Perguntas abertas
- … (com a recomendação)
```
