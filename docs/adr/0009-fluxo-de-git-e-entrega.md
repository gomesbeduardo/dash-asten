# 0009 — Fluxo de Git e entrega

**Status:** aceita
**Data:** 14/10/2026 (D44); registrada como ADR em 16/10/2026
**Decisões do PRD:** D33 (desenvolvimento a partir da `staging`, testado localmente; `main` = CI + produção), D44 (branch própria, PR para a `staging`, PR `staging` → `main`; nunca push direto; deploy de produção só depois do CI verde na `main`), D74 (a versão nova vai para produção depois da conferência à mão do responsável na `staging`, por PR `staging` → `main` que ele mergeia), D24 (GitHub Actions só em push na `main`), D27 (deploy de teste na Vercel depois do CI verde), D16 (repositório privado; planilhas fora do Git)

## Contexto

A D33 definiu o desenvolvimento na `staging` e a produção na `main`. Em 14/10 a D44 revisou isso com uma regra mais dura: nada de push direto em nenhuma das duas. A D74 fixou a ordem do fechamento da versão do modelo de posição do mês.

## Decisão

- O trabalho vai numa **branch própria** (push livre) → **PR para a `staging`** → **PR `staging` → `main`**. A `main` só recebe PR vindo da `staging`.
- **Nunca push direto** em `staging` nem em `main`.
- Desenvolvimento e teste local na `staging` (dev server em staging, com o schema `staging` do banco, ADR 0002).
- A `main` roda o CI (lint, typecheck, testes, build e e2e). **O deploy de produção só acontece depois do CI verde na `main`.**
- Produção recebe a versão nova **depois da conferência à mão do responsável na `staging`**, por um PR `staging` → `main` que ele mesmo mergeia, com o banco de produção vazio (D74).
- Planilhas reais nunca entram no Git: `*.xlsx` é ignorado fora de `fixtures/`, e os testes usam dados sintéticos.

## Consequências

Conferido no código:

- `.github/workflows/ci.yml` roda **só em push na `main`** (D24: não gastar minutos de Actions em branches), com lint, typecheck, `npm test`, build e `test:e2e` (Playwright com Chromium).
- Como o CI só roda na `main` (D24), as branches não têm CI. O script `npm run check` (lint, typecheck, testes e build, em `package.json`) reúne as verificações para rodar localmente; a PR deve trazer a prova delas.
- `.gitignore` bloqueia `*.xlsx` e `*.csv`, com exceção de `fixtures/` (D16).
- O deploy na Vercel é feito pela CLI depois do CI verde (D27, `docs/acesso-teste.md`). O deploy automático a cada push **não está ligado**; o plano o lista como refinamento pendente.
- Em worktrees paralelas: o dev server de staging fica na porta 5173 e o e2e usa a 4173 por padrão; `PW_PORT=<porta>` muda a do e2e (CLAUDE.md do projeto).
- Antes de abrir o PR de fechamento para a `main`, a D74 pede a responsividade conferida nas cinco larguras (1366, 1920, 2560, 3440 e 3840) e a medição com 12 posições sintéticas (abrir o Painel e trocar o "Comparar com" em menos de 1 s).

## Alternativas

A D33 registra o fluxo anterior (desenvolver na `staging` e promover para a `main`) e a D44 o endureceu. O PRD não registra outras alternativas.
