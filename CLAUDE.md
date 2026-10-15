# dash-asten — instruções para agentes

- Leia `PRD-dash-asten.md` (§0 Decisões) e `plan-dash-asten.md` antes de mudar qualquer coisa.
- Siga a skill `time-de-agentes` (trava em `.claude/time-de-agentes.json`).
- **Dev server sempre no ar** ao mexer em algo visual ou testável: `npm run dev -- --port 5173 --strictPort` (staging). Workers não matam a porta 5173; o e2e/preview usa a 4173 por padrão; `PW_PORT=<porta> npm run test:e2e` muda a porta (worktrees em paralelo).
- **Nenhum chamado/linha é excluído do app**: todos os dados ficam presentes e tratados (classificar, rotular, separar), nunca descartados (D34).
- Desenvolvimento na branch `staging`, testado localmente; `main` = CI + produção (D33). Deploy na Vercel só depois do CI verde.
- **Nunca push direto em `staging` nem em `main`**: o trabalho vai numa branch própria (livre para push) e entra na `staging` por **PR**; a `main` só recebe PR vindo da `staging`.
- Planilhas reais nunca entram no git (`*.xlsx` ignorado fora de `fixtures/`); testes usam dados sintéticos.
