<!--
Escreva para quem não acompanhou o trabalho: sem jargão interno, e cada código citado
(D34, #71, spec 003) com uma cláusula dizendo o que é. Título em Conventional Commits.
As seções Contexto, O que mudou, Como testar, Riscos e Revisão são obrigatórias:
o hook pr-revisao.sh nega a abertura do PR sem elas.
-->

## Contexto
<!-- O problema e por que agora. Links: spec (docs/specs/NNN-…), ADR (docs/adr/NNNN-…), decisões do PRD (Dxx, o que dizem), issue. -->

## O que mudou
<!-- Um comportamento ou arquivo por linha, com o antes e o depois em linguagem simples. -->
- 

## Como testar
<!-- Passos que outra pessoa consegue repetir: comandos, dados de teste (fixtures), tela e clique. -->
1. 

## Evidências
<!-- Saída dos testes (o vermelho antes do verde de cada fatia), lint/typecheck/build, screenshot antes e depois quando muda tela. -->

## Riscos e rollback
<!-- O que pode quebrar (dados, compatibilidade, outras telas, desempenho) e como reverter. -->

## Fora do escopo
<!-- O que ficou de fora de propósito. -->

## Revisão
- PR reviewer (Fable): **<veredito>** <!-- troque por UM valor: aprovado, aprovado com ajustes, bloqueado (só em rascunho) ou dispensado (só PR/MR só de doc comum). Com aprovado, ponha o selo revisado-por-fable. -->
- Achados e o que foi feito com cada um:
- Revisão humana: PR importante (todo PR que não seja só de doc comum, e todo PR para a `main`) só faz merge com o rótulo `revisado-por-humano`, posto pelo responsável depois do último commit.

## Checklist
- [ ] Spec conferida item a item (critérios e testes de aceite)
- [ ] Testes novos escritos antes do código e vistos falhando
- [ ] `npm run check` verde (lint, typecheck, testes e build)
- [ ] Componentes e tokens do design system (`src/components/ui`, `src/index.css`)
- [ ] Nenhum chamado excluído (D34, a regra de que todo dado fica presente e tratado)
- [ ] Docs atualizadas (PRD, plano, ADR, spec)

Desenvolvido com apoio do Claude Code.
