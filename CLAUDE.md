# dash-asten — instruções para agentes

- Leia `PRD-dash-asten.md` (§0 Decisões) e `plan-dash-asten.md` antes de mudar qualquer coisa.
- Siga a skill `time-de-agentes` (trava em `.claude/time-de-agentes.json`).
- **Spec antes do código (SDD + TDD, 16/10)**: toda mudança de comportamento ou de tela tem spec em `docs/specs/NNN-nome.md` (modelo em `docs/specs/README.md`), aprovada pelo responsável antes do código; os testes saem dos critérios e a PR confere a spec item a item. Mudança visual também precisa de prancha aprovada. Se o pedido vier na pressa (sem spec, escopo crescendo, visual sem prancha), pare e aponte o que falta antes de seguir.
- **Dev server sempre no ar** ao mexer em algo visual ou testável: `npm run dev -- --port 5173 --strictPort` (staging). Workers não matam a porta 5173; o e2e/preview usa a 4173 por padrão; `PW_PORT=<porta> npm run test:e2e` muda a porta (worktrees em paralelo).
- **Simplicidade primeiro**: o app é uma ferramenta simples para usar em reunião na TV (D4: bonito, funcional e simples de usar). Antes de acrescentar regra, controle, atalho, texto calculado ou ferramenta, pergunte se a reunião precisa disso; na dúvida, a forma mais simples que atende ao pedido. O que só adiciona complexidade vira pergunta ao responsável, não implementação.
- **Design system obrigatório na UI**: componente novo ou alterado usa os componentes de `src/components/ui` (shadcn: `Select`, `Button`, `Toggle`, `Tabs`, `Tooltip`, `Badge`, `Card`, `Dialog`…) e os tokens de `src/index.css` (cores, `--shadow-card`, fontes). Nada de `<select>`, `<button>` ou `<input>` nativo estilizado à mão nem cor ou tamanho literal quando há token. Briefs de worker citam isso; a revisão do diff confere antes do merge.
- **Nenhum chamado/linha é excluído do app**: todos os dados ficam presentes e tratados (classificar, rotular, separar), nunca descartados (D34).
- Desenvolvimento na branch `staging`, testado localmente; `main` = CI + produção (D33). Deploy na Vercel só depois do CI verde.
- **Nunca push direto em `staging` nem em `main`**: o trabalho vai numa branch própria (livre para push) e entra na `staging` por **PR**; a `main` só recebe PR vindo da `staging`.
- Planilhas reais nunca entram no git (`*.xlsx` ignorado fora de `fixtures/`); testes usam dados sintéticos.
