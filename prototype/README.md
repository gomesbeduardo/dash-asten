# Protótipo descartável — Painel semanal Asten

**Dados 100% fictícios.** Serve só para o Líder avaliar visual e interação (PRD D15). Não é código de produto.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build estático em dist/
```

Stack: React 19 + TypeScript + Vite 8 + shadcn/ui (Radix, Tailwind v4) + Recharts 3 + TanStack Table. Ver `../docs/comparacao-stack.md`.

Estrutura: `src/data` (gerador fictício com seed), `src/lib` (filtros e agregações puros), `src/config` (abas e layouts), `src/components/dashboard/{shell,shared,indicators,projects,fallback}`.
