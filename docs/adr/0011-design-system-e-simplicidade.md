# 0011 — Design system obrigatório e simplicidade primeiro

**Status:** aceita
**Data:** 16/10/2026 (regras do `CLAUDE.md` do projeto); decisões de origem entre 13 e 16/10/2026
**Decisões do PRD:** D4 (bonito, funcional e simples de usar; edição rara, só filtros), D75 (cortes pelo princípio da simplicidade: títulos de conclusão calculados e atalho entre faixas), D77 (item 3: evitar tabelas; item 5: sem faixa fixa no topo), D17 (superfícies sólidas, sem vidro, marca como acento), D72 (acabamento sem simplificar; efeito de vidro descartado)

## Contexto

O app é uma ferramenta simples para conduzir reuniões na TV (D4). Em 15/10 a D75 cortou, "pelo princípio da simplicidade", os títulos de conclusão calculados e o atalho entre faixas. Em 16/10 a D77 evitou tabelas e uma faixa fixa que contrariava a barra sobreposta. O `CLAUDE.md` do projeto transformou isso em duas regras de trabalho.

## Decisão

- **Simplicidade primeiro.** Antes de acrescentar regra, controle, atalho, texto calculado ou ferramenta, pergunta-se se a reunião precisa disso. Na dúvida, vale a forma mais simples que atende ao pedido. O que só adiciona complexidade vira pergunta ao responsável, não implementação.
- **Design system obrigatório na UI.** Todo componente novo ou alterado usa os componentes de `src/components/ui` (shadcn: `Select`, `Button`, `Toggle`, `Tabs`, `Tooltip`, `Badge`, `Card`, `Dialog` etc.) e os tokens de `src/index.css` (cores, `--shadow-card`, fontes). Não se usa `<select>`, `<button>` nem `<input>` nativo estilizado à mão, nem cor ou tamanho literal quando existe token.
- **Nada entra sem pedido explícito**: login (Better Auth), "+ adicionar gráfico" e o próximo conjunto de dados (D74).
- Visual: superfícies sólidas, cantos suaves e sombras discretas, sem vidro nem efeitos decorativos (D17, D72); a cor da marca só como acento (D12); a P3 é a paleta categórica (D77).

## Consequências

Conferido no código:

- `src/components/ui/` existe com `button`, `select`, `toggle`, `tabs`, `tooltip`, `badge`, `card`, `dialog`, `table` e outros. `src/index.css` define `--shadow-card`, `--skeleton` e os tokens de cor.
- Briefs de worker citam o design system e a revisão do diff confere isso antes do merge (`CLAUDE.md`).
- Controle novo na tela só existe se há um pedido ou uma spec aprovada; sugestão vira pergunta.
- Evitar tabela como forma de mostrar dados do Painel: o Comparar continua em cartões e o Área × SLA saiu do Painel até existir forma em gráfico aprovada (D77).
- A barra superior é sobreposta e não reserva espaço, de modo que não se cria faixa fixa no topo (D43, D77).
- Cor nunca é o único canal (D41); contraste AA e teclado em todo o fluxo (PRD §10).

## Alternativas

Não registradas no PRD. Por exemplo, o efeito de vidro foi descartado (D17, D72), mas o PRD não lista outras alternativas de sistema de design além do shadcn escolhido na stack (ADR 0001).
