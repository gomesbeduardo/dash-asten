# Plano incremental — Painel de análise de planilhas (Asten)

**Versão:** v2, 13/10/2026, após grilling. A v1 está no histórico do Git.
**Objetivo:** orientar o Claude Code a executar o produto descrito em `PRD-dash-asten.md` sem inventar requisitos. As decisões D1–D16 citadas abaixo estão no §0 do PRD.

## Princípios inegociáveis

1. Leia `PRD-dash-asten.md` inteiro antes de alterar qualquer coisa.
2. Não invente métricas, colunas, fórmulas, regras de negócio, limites de arquivo nem interpretações de backlog. Quando isso afetar comportamento, pergunte e registre a resposta no PRD.
3. A planilha é não confiável. Processe localmente; não execute macros, fórmulas, links nem HTML; não envie dados a serviços externos.
4. Sem autenticação, backend, banco, telemetria de conteúdo, API ou persistência.
5. Mantenha separados leitor, contrato e modelo, filtros, agregações, layout e componentes visuais.
6. **Nenhum código de produto antes da aprovação do Líder (D14).** Até lá só existem docs e o protótipo descartável.
7. Antes de declarar pronto: rode os testes, valide visualmente e reporte evidência.
8. Fluxo de agentes: siga a skill `time-de-agentes`. O Opus planeja e revisa; `explorer` lê, `worker` implementa fatias com TDD e `researcher` pesquisa fontes externas.

## Fase 0 — Repositório ✅ (13/10)

- `git init`, v1 dos docs commitada e repo privado `gomesbeduardo/dash-asten`.
- `.gitignore` bloqueia `*.xlsx`, `*.xls`, `*.xlsm` e `*.csv` fora de `fixtures/`.

## Fase 1 — Comparação breve de stack (até 14/10)

1. O `researcher` compara framework, UI, gráficos e leitor XLSX contra o caso do PRD: escopo enxuto, layout fixo, filtros por aba, build estático.
2. Resultado em `docs/comparacao-stack.md`: tabela por categoria, recomendação, alternativas rejeitadas, riscos e fontes.
3. Sem spike de código; a comparação é documental (D13).

**Checkpoint C — stack:** o usuário aprova a stack antes do protótipo.

## Fase 2 — Protótipo descartável (até 16/10)

1. Criar `prototype/` como app local na stack aprovada, isolado do futuro produto (D15).
2. Gerar dados **fictícios marcados como tais**, sem nenhuma planilha real, cobrindo as duas hipóteses (D3):
   - "Indicadores": meta vs. realizado por mês e área;
   - "Projetos": status, prazo, % de conclusão e atrasos.
3. Mostrar: estado vazio e upload, barra de abas (com ocultar e reexibir), dashboard fixo por aba, filtros por aba com chips e "limpar", legenda que oculta série, tabela com escolha de colunas, e um exemplo de diagnóstico de aba incompatível.
4. Aplicar a direção visual do PRD §9: base neutra, acento de marca (placeholder até receber a marca), legível em projeção. Usar a skill `frontend-design` e a skill oficial da biblioteca de UI escolhida.
5. Validar em resolução de projeção (por exemplo, 1920×1080 e 1366×768) e numa largura menor.

**Checkpoint L — Líder (16/10):** apresentar o PRD v2, o protótipo e as pendências do PRD §8. Registrar as respostas no PRD. Sem aprovação, nada da Fase 3 em diante começa.

## Fase 3 — Planilha real e contrato de dados

1. Receber a planilha real ou uma cópia anonimizada de estrutura idêntica. Inspecionar sem copiar dados sensíveis para logs, commits ou fixtures.
2. Documentar por aba: nome, linha de cabeçalho, linhas e colunas aproximadas, tipos, campos de data, dimensão e métrica, mesclagens, fórmulas, nulos, duplicidades e ambiguidades.
3. Fechar com o Líder: perguntas de cada gráfico, fórmulas, filtros por aba, definições (backlog, atraso, período) e volume no pior caso.
4. Escrever o contrato tipado e validado em runtime, separando "confirmado" de "suposição".
5. Criar uma fixture sintética em `fixtures/` que espelha a estrutura real com dados fictícios.

**Checkpoint B — contrato:** o Líder aprova o contrato por aba, os indicadores e o layout de cada aba.

## Fase 4 — Fundação do produto

1. Scaffold na stack aprovada, com TypeScript estrito, linter, formatter e testes. Build estático com caminho de base relativo, para funcionar em qualquer host (D11).
2. Tokens de cor (neutro + acento da marca), espaçamento, tipografia, foco e paleta de séries acessível.
3. Casca da tela única: cabeçalho, upload e estado vazio, barra de abas, faixa de filtros, área do dashboard e tabela de detalhe.
4. Estados de vazio, carregando, erro e dados insuficientes antes dos gráficos.
5. Aproveitar o que o protótipo validou visualmente, reescrevendo com testes em vez de copiar o código descartável.

## Fase 5 — Ingestão, contrato e diagnóstico

1. Aceitar só `.xlsx` e validar extensão, MIME e conteúdo de forma defensiva.
2. Limites de tamanho, abas, linhas e colunas definidos a partir da medição feita com a amostra real.
3. Ler o `ArrayBuffer` localmente, sem rede e sem log de células.
4. Processar todas as abas e mostrar status por aba. Abas inválidas não bloqueiam as outras.
5. Aplicar o contrato: coerção documentada, erros por coluna, avisos e diagnóstico legível.
6. Mapeamento de cabeçalho e tipo só como fallback, quando a aba não bate com o modelo (D8).
7. Web Worker apenas se a medição mostrar bloqueio.

**Testes:** arquivo ilegível, rejeitado ou vazio; aba fora do modelo; cabeçalho ausente ou ambíguo; datas, números, nulos e inválidos; limites; garantia de que fórmulas e HTML não são executados nem injetados.

## Fase 6 — Filtros por aba e agregações

1. Filtros como estado serializável **por aba** (D6), independente da UI.
2. Seletores puros: modelo normalizado + filtros da aba + séries visíveis → dados de cada cartão, gráfico e tabela.
3. Chips de filtros ativos, remoção individual e "limpar".
4. Ocultar série é independente de filtrar dados.
5. Cartões, gráficos e tabela leem a mesma fonte filtrada.
6. Ocultar e reexibir abas (D7) e escolher colunas visíveis na tabela (D8).

**Testes:** combinação, remoção e limpeza de filtros; isolamento entre abas; consistência entre total, gráfico e tabela; ocultar série sem alterar dados; resultado vazio.

## Fase 7 — Layout fixo e gráficos acordados

1. Configuração declarativa por aba (aba → cartões, gráficos e filtros), separada dos dados (D5).
2. Um gráfico por vez, começando pela pergunta executiva de maior prioridade. Cada um com uma especificação curta: pergunta, métrica aprovada, dimensão, período, unidade, estado vazio e alternativa textual.
3. Títulos informativos, legenda, unidade, escala e período. Cor nunca é o único canal.
4. Aba sem layout: a tabela de detalhe e um aviso.

## Fase 8 — Acessibilidade, desempenho, segurança e entrega

- **Acessibilidade:** teclado, foco visível, nomes acessíveis, contraste AA e `prefers-reduced-motion`.
- **Desempenho:** medir importação, primeira renderização e filtro com a fixture realista; verificar o bundle; lazy loading de gráficos se a medição justificar.
- **Segurança:** nada de `innerHTML` em células; nenhum dado real em repo, logs ou URLs.
- **Verificação final:** lint, typecheck, testes e build; teste de navegador do fluxo completo (importar, abas, ocultar aba, filtrar, ocultar série, colunas, trocar arquivo, erro); revisão visual em projeção e em largura menor.
- Registrar os navegadores testados, a amostra usada (sem dados sensíveis), as limitações e as métricas observadas.

## Regras de comunicação

- Pergunte antes de qualquer decisão que mude a semântica de uma métrica, oculte dados, amplie o escopo ou acrescente persistência ou serviços.
- Suposição se apresenta como suposição. Recomendação não é requisito aprovado.
- Diante de ambiguidade na planilha, mostre exemplos estruturais anonimizados e peça a regra.
- Ao propor uma dependência, compare com ao menos uma alternativa.

## Ordem resumida

```text
Repo/git ✅
  → comparação de stack            [Checkpoint C: usuário]
  → protótipo descartável          [Checkpoint L: Líder, 16/10]
  → planilha real + contrato       [Checkpoint B: Líder]
  → fundação → ingestão → filtros → layout fixo e gráficos
  → a11y/perf/segurança → verificação final
```
