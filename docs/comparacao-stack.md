# Comparação breve de stack — 13/10/2026

Base: decisão D13 do PRD v2. As versões e datas vêm do registry npm e da API do GitHub, consultados em 13/10/2026; o gzip vem do bundlephobia e é um teto, sem tree-shaking. A pesquisa foi documental, sem spike de código.

**Caso avaliado:** SPA 100% client-side com dashboard **fixo** por aba, filtros por aba, tabela com escolha de colunas, sem construtor, export ou persistência; build estático agnóstico de host; projeção em reunião; WCAG AA; desenvolvimento com Claude Code.

## Recomendação

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **React 19 + TypeScript + Vite 8** | Maior ecossistema de tabela, gráfico e UI (shadcn e Astryx só existem em React). Gera build estático trivial. |
| UI | **shadcn/ui** (Tailwind v4, Radix) | Código fica no repo, sem lock-in; tem template Vite oficial, charts e blocos de dashboard; skill e MCP oficiais para Claude Code. |
| Gráficos | **Recharts 3** via shadcn charts | O dashboard fixo usa gráficos comuns (linha, barra, empilhada, KPI, progresso). Licença MIT, ativa e com `accessibilityLayer`. |
| Tabela | **TanStack Table** (padrão documentado pelo shadcn) | A escolha de colunas visíveis (D8), a ordenação e a busca saem prontas. |
| Leitor XLSX | **SheetJS CE ≥ 0.20.3 pelo tarball do CDN oficial**, com versão fixada e integridade no lockfile | Mesclagens (`!merges`) e datas (`cellDates`) documentadas; não avalia fórmulas. **Nunca o `xlsx` do npm** (ver riscos). |
| Estado | `useState`/`useReducer` + seletores puros | O escopo é enxuto; store global (Zustand) só se a dor aparecer. |

## A) Framework

| Opção | Versão (data) | Licença | Veredito |
|---|---|---|---|
| **React + TS + Vite** | react 19.3.0 (09/09/26); vite 8.3.4 (08/10/26) | MIT | **Escolhido.** |
| Vue + TS + Vite | vue 3.5.44 (13/10/26) | MIT | Ótimo, mas tem menos UI e dashboard prontos. Nenhum ganho aqui. |
| Svelte 5 + Vite / SvelteKit | svelte 5.57.2; kit 3.0.1 (06/10/26) | MIT | Bundle menor e menos componentes de dashboard. O Kit é desnecessário para uma SPA. |
| Astro com ilhas | astro 7.3.8 (08/10/26) | MIT | Feito para conteúdo estático. Aqui a tela inteira viraria uma ilha. Rejeitado. |

## B) UI / componentes

| Opção | Versão / licença | Manutenção | Adequação |
|---|---|---|---|
| **shadcn/ui** | CLI 4.21.4 (07/10/26), MIT | Releases diários | **Alta.** Template `-t vite`, Tailwind v4, Recharts v3, skill oficial. Compatibilidade explícita com React 19 a confirmar no scaffold. |
| Astryx (Meta) | @astryxdesign/core 0.7.0 (13/10/26), MIT | Releases a cada 1–3 dias | **Média.** Está em beta 0.x, exige React 19+, e `@astryxdesign/charts` só existe no canal canary. Vale observar, mas não serve para um dashboard que depende de gráficos. |
| Aceternity UI | npm `aceternity-ui` 0.2.2 (07/24, abandonado); blocos pagos | — | **Baixa.** Feito para efeitos de landing page, sem dashboards ou charts. |
| Tremor / Blocks | @tremor/react 3.18.7 (01/25), Apache-2.0 / MIT | Parado há ~21 meses | **Baixa.** Compatibilidade com Tailwind v4 e React 19 não verificada. |
| dashboardcn | Repo com 15 estrelas e licença não declarada | Hobby | **Baixa.** Os blocos oficiais do shadcn cobrem o mesmo. A licença impede o uso. |
| Tailwind + Radix / Base UI / React Aria | tailwind 4.3.3; base-ui 1.9.0; react-aria-components 1.22.1 | Ativos | **Alta**, mas exige montar mais coisa à mão. O shadcn já usa Radix ou Base UI por baixo. |

## C) Gráficos

| Lib | Versão | Licença | Gzip (teto) | Veredito |
|---|---|---|---|---|
| **Recharts** | 3.10.1 (13/10/26) | MIT | ~151 KB | **Escolhida.** Base dos shadcn charts; inclui radial (gauge e progresso). O protótipo usa a 3.8.0, fixada pelo shadcn; no produto, subir para 3.10.x. |
| ECharts | 6.1.0 (05/26) + echarts-for-react 3.0.6 | Apache-2.0 | ~368 KB (menor com tree-shaking) | **Plano B**, se precisar de gauge rico ou de muitos tipos. A11y por teclado é fraca. |
| Plotly.js | 4.1.2 (10/26) | MIT | ~1 MB | Pesada demais para o caso. Rejeitada. |
| visx | @visx/xychart 4.0.0 (06/26) | MIT | ~50 KB | Baixo nível, sem gauge, e a a11y fica por nossa conta. Rejeitada no MVP. |

## D) Leitura XLSX

| Lib | Versão | Licença | Veredito |
|---|---|---|---|
| SheetJS CE pelo **npm** (`xlsx`) | 0.18.5 (03/2022), ainda o `latest` | Apache-2.0 | **Proibido.** Vulnerável a CVE-2023-30533 (prototype pollution) e CVE-2024-22363 (ReDoS). |
| **SheetJS CE pelo CDN** | ≥ 0.20.3 | Apache-2.0 | **Escolhido.** Corrige as duas CVEs. Na Fase 4, conferir no `cdn.sheetjs.com` a versão vigente, que não foi verificada hoje. |
| ExcelJS | 4.4.0 (12/2024) | MIT | Pesado (~256 KB), pouco mantido e orientado a escrita. Rejeitado. |
| read-excel-file | 9.3.12 (07/10/26) | MIT | Alternativa só-leitura e ativa. Suporte a mesclagens e múltiplas abas não verificado; reavaliar se o CDN da SheetJS virar problema. |

## Riscos e cuidados

- **Supply chain do SheetJS:** o tarball do CDN não passa pelo registry npm. Fixar URL e versão e manter a integridade no lockfile.
- **Arquivo não confiável:** nunca avaliar fórmulas, nunca usar `sheet_to_html` com `innerHTML`, limitar o tamanho, e renderizar células só como texto.
- **Contraste:** as cores padrão dos shadcn charts não garantem AA contra o acento da marca. Validar a paleta com ferramenta (axe ou similar).
- **React 19 + shadcn:** confirmar no scaffold do protótipo.
- **Recharts:** fixar a versão e testar em tela grande ou projeção.

## Não verificado (13/10)

Versão exata vigente no CDN da SheetJS; peso real dos bundles com tree-shaking; teclado e aria dos gráficos no código instalado; WCAG do Astryx e do Tremor; licença comercial da Aceternity.

## Fontes

registry.npmjs.org (react, vue, svelte, astro, vite, shadcn, recharts, echarts, plotly.js-dist-min, @visx/xychart, xlsx, exceljs, read-excel-file, @tremor/react, @base-ui/react, react-aria-components, @astryxdesign/core, @astryxdesign/charts, aceternity-ui) ·
[shadcn skills](https://ui.shadcn.com/docs/skills) · [shadcn Vite](https://ui.shadcn.com/docs/installation/vite) · [shadcn chart](https://ui.shadcn.com/docs/components/radix/chart) ·
[Astryx](https://github.com/facebook/astryx) · [Tremor](https://github.com/tremorlabs/tremor) · [dashboardcn](https://github.com/NoahGdev/dashboardcn) · [Aceternity pricing](https://ui.aceternity.com/pricing) ·
[SheetJS CDN](https://cdn.sheetjs.com/) · [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) · [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) · [bundlephobia](https://bundlephobia.com)
