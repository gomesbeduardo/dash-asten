# Specs

Toda mudança de comportamento ou de tela começa aqui, antes do código (SDD), e os testes saem dos critérios (TDD). Fluxo:

1. **Spec** `NNN-nome.md` com o modelo abaixo, status "rascunho". Quem escreve: o `spec-writer` (Fable) quando a spec fixa regra de negócio, dado, arquitetura ou fluxo novo; a sessão principal quando é ajuste pequeno de UI ou usabilidade, depois de grilling por modal.
2. **Revisão básica** do `reviewer-opus` (modo spec): critério ambíguo, borda faltando, teste de aceite sem dado concreto, conta errada, contradição com ADR ou spec existente.
3. **Prancha** quando a mudança for visual (artifact com as opções e capturas reais).
4. **Aprovação** do responsável, que é a final: status vira "aprovada", com a data e o que ele escolheu.
5. **Testes** escritos a partir dos testes de aceite da spec, vistos falhando (vermelho).
6. **Código** até os testes passarem (verde); nada além do que a spec pede.
7. **Code review**: o `reviewer-opus` revisa a fatia que toca regra, dado ou área sensível, com conferência de números quando a mudança mexe em cálculo, contagem ou classificação; no fim, o `pr-reviewer` (Fable) revisa o diff consolidado uma vez, contra a spec item a item, e com **aprovado** entra o selo `revisado-por-fable`.
8. **PR** para a `staging` pelo modelo `.github/pull_request_template.md` (MR no GitLab: `.gitlab/merge_request_templates/Default.md`), conferindo cada critério com a prova. PR importante só faz merge com o rótulo `revisado-por-humano`, posto pelo responsável.

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

## Testes de aceite
Casos concretos por critério; o worker transforma cada um em teste que falha antes do código.
| # | Critério | Dado (entrada exata) | Ação | Resultado esperado (exato) | Tipo e arquivo |
|---|---|---|---|---|---|
| T1 | C1 | 3 chamados: … (valores) | … | total 3, … | unidade, `src/…test.ts` |
Inclua os casos de borda (vazio, duplicado, limite, mês antigo) e pelo menos um que deve ser rejeitado. Quando a regra conta ou calcula, mostre a conta esperada.

## Fora do escopo
- …

## Perguntas abertas
- … (com a recomendação)
```
