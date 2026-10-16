# 0001 — Stack do front

**Status:** aceita
**Data:** 13/10/2026 (aprovada no Checkpoint C); registrada como ADR em 16/10/2026
**Decisões do PRD:** D13 (stack aprovada depois da comparação breve de todas as opções), D26 (Motion 13.4.4 fixa, com regras de movimento próprias), D18 (a planilha chega validada e consolidada; leitura enxuta), D24 (Vitest, Testing Library e um Playwright ponta a ponta)

## Contexto

Antes de qualquer protótipo, o plano (Fase 1) pediu uma comparação documental de framework, UI, gráficos e leitor de XLSX contra o caso do PRD: escopo enxuto, layout fixo, filtros por aba e build estático. O resultado está em `docs/comparacao-stack.md` e a stack foi aprovada no Checkpoint C (13/10).

## Decisão

- React 19 + TypeScript + Vite 8.
- shadcn/ui (Tailwind v4, Radix) para os componentes de interface.
- Recharts 3, usado por meio dos "charts" do shadcn, para os gráficos.
- TanStack Table.
- SheetJS (`xlsx`) a partir de 0.20.3, **pelo tarball do CDN oficial** (`cdn.sheetjs.com`), lendo o arquivo no navegador.
- Motion 13.4.4 (versão fixa) para animação, com as regras de movimento da D26: tokens de 150, 250 e 400 ms, curvas standard e emphasized, só `transform` e `opacity`, nada em loop e tudo pronto quando o usuário pede movimento reduzido.
- Testes: Vitest e Testing Library para unidade e componente; Playwright para o ponta a ponta.

## Consequências

- **É proibido** instalar o pacote `xlsx` do registro npm (versão 0.18.5, com as CVEs registradas na comparação). A dependência é a URL do CDN com versão fixa em `package.json` (conferido: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`).
- A planilha é lida no navegador; o servidor recebe os dados já normalizados (R8 do PRD).
- `motion` fica em `13.4.4` exata em `package.json` (conferido). Trocar de versão ou de biblioteca de animação exige decisão nova.
- Componentes de interface vêm de `src/components/ui` (shadcn); gráficos usam Recharts via `chart.tsx` desse diretório. Ver também o ADR 0011.
- O build é estático para a casca do app (D11 pede build agnóstico de host); a API é tratada no ADR 0003.
- Movimento: ver ADR 0010.

## Alternativas

Registradas em `docs/comparacao-stack.md`:

- Framework: Vue + Vite (ótimo, mas com menos UI e dashboard prontos), Svelte 5 / SvelteKit (bundle menor e menos componentes de dashboard) e Astro com ilhas (feito para conteúdo estático; aqui a tela inteira viraria uma ilha, rejeitado).
- Gráficos: Plotly.js (pesada demais, rejeitada) e visx (baixo nível, sem gauge, acessibilidade por conta própria, rejeitada no MVP).
- Leitor de XLSX: `xlsx` do npm (proibido por CVE-2023-30533 e CVE-2024-22363), ExcelJS (pesado, pouco mantido e orientado a escrita, rejeitado) e read-excel-file (alternativa só de leitura; reavaliar se o CDN da SheetJS virar problema).
- Motivo da escolha do Motion e alternativas a ele: não registrado no PRD (a D26 só registra a versão e as regras de movimento).
