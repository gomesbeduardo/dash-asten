# Plano incremental de implementação — Painel de análise de planilhas

**Objetivo deste arquivo:** orientar o Claude Code a planejar e executar o produto descrito em `PRD.md` sem inventar requisitos. Este é um handoff de planejamento; não autoriza automaticamente a implementação antes dos checkpoints indicados.

## Princípios inegociáveis

1. Leia `PRD.md` integralmente antes de alterar código.
2. Não invente métricas, colunas, fórmulas, regras de negócio, limites de arquivo ou interpretações de backlog. Quando isso afetar comportamento, pergunte ao usuário e registre a resposta.
3. O arquivo do usuário é não confiável. Não execute macros, fórmulas, links, HTML ou qualquer conteúdo da planilha; processe localmente e não envie dados a serviços externos.
4. Não acrescente autenticação, backend, banco, telemetria de conteúdo, API ou persistência centralizada.
5. Faça decisões reversíveis e mantenha parsing, modelo normalizado, filtros, agregações e gráficos em módulos separados.
6. Antes de declarar pronto, execute os testes relevantes, valide visualmente e reporte evidências — não apenas intenção.

## Fase 0 — Descoberta do repositório e do fluxo existente

1. Inspecione o repositório sem modificá-lo inicialmente: `README`, `AGENTS.md`, `CLAUDE.md`, convenções, gerenciador de pacotes, scripts, estrutura de testes, lint, CI e estado do Git.
2. Identifique o fluxo de agentes já existente (papéis, handoffs, worktrees, checklist de revisão e comandos de validação). Siga-o; não imponha um novo processo se o repositório já fornece um.
3. Relate de forma curta: estado atual, tecnologia existente, arquivos relevantes, comandos de qualidade e qualquer mudança local que não pertença à tarefa.
4. Se o repositório estiver vazio, confirme isso e proponha a estrutura mínima; não inicie scaffold sem o checkpoint da Fase 2.

**Checkpoint A — contexto:** peça confirmação se a estrutura existente mudar materialmente a proposta de React + TypeScript + Vite ou se houver instruções conflitantes.

## Fase 1 — Descoberta de dados e definição de contrato

1. Solicite uma planilha real ou amostra anonimizada, além de um dicionário de dados se existir.
2. Inspecione-a sem copiar dados sensíveis para logs, commits ou fixtures públicas.
3. Documente por aba: nome, linha de cabeçalho, número aproximado de linhas/colunas, tipos observados, campos candidatos a data/dimensão/métrica, células mescladas, fórmulas, nulos, duplicidades e ambiguidades. O requisito é carregar todas as abas com conteúdo; pergunte apenas sobre exceções que devam ser excluídas.
4. Conduza uma conversa orientada a perguntas de decisão:
   - Qual pergunta de reunião cada métrica e cada gráfico deve responder?
   - Quais campos são filtros globais e quais são somente detalhes?
   - Qual é a definição operacional de backlog, período e status?
   - Quais dados não podem aparecer na projeção?
   - Qual volume e formato de arquivo representam o pior caso plausível?
5. Escreva um contrato de dados interno, tipado e validado em runtime: campos aceitos, mapeamentos explícitos, transformações permitidas, validações, avisos e condições de bloqueio. Separe “confirmado pelo usuário” de “suposição do agente”.

**Checkpoint B — dados, abas e métricas:** não construir gráficos até o usuário aprovar o contrato de dados por aba, os indicadores e o conjunto mínimo de visualizações. Abas com esquemas diferentes não podem ser combinadas automaticamente. Se a planilha ainda não existir, montar somente casca/estados neutros, sem dados ou métricas fictícias apresentadas como reais.

## Fase 2 — Pesquisa e decisão de dependências

Antes de instalar, pesquise documentação oficial, licença, manutenção, bundle, compatibilidade com o framework e acessibilidade. Registre a comparação e a decisão no PR ou documento de arquitetura.

| Necessidade | Candidatas para avaliar | Critério de escolha |
| --- | --- | --- |
| Framework | React + Vite; Vue + Vite; Svelte + Vite/SvelteKit; Astro com ilhas | Aderência ao repositório/equipe e simplicidade de SPA com tabs, filtros e edição de dashboard. Astro só é preferível se a maior parte da experiência for conteúdo estático. |
| Linguagem | TypeScript | Contrato seguro entre parsing, estado e visualização; continua exigindo validação runtime. |
| Gráficos | ECharts, Recharts, Plotly.js, visx | Tipos realmente necessários, cross-filtering, exportação, legibilidade, teclado/alternativa textual, tamanho e esforço de customização. |
| XLSX | SheetJS CE, ExcelJS | Leitura local, licença, robustez com a amostra real, bundle e necessidade (ou não) de escrita. |
| Estado | estado React/local; Context; Zustand | Começar simples; escalar apenas se estado compartilhado de filtros/layout justificar. |
| Tabela | HTML simples; TanStack Table | Ordenação, busca, colunas dinâmicas e acessibilidade de que o usuário realmente precisa. |
| UI geral | shadcn/ui; Astryx; primitives + Tailwind | Consistência, maturidade, React 19, acessibilidade, liberdade de edição e compatibilidade com Vite/Claude skills. Não misturar design systems sem um motivo demonstrado. |
| Componentes de dashboard | shadcn dashboard blocks/charts; dashboardcn; Tremor Blocks | Adaptação a uma página única e editável, compatibilidade Vite, licença, facilidade de customizar e dependências trazidas. |
| Motion | Claude Motion (produto de explicação animada); Motion for React (biblioteca de animação) | São coisas diferentes. O primeiro é fluxo externo para export; o segundo é animação dentro da interface. Adicionar ambos só com caso de uso. |
| Skills | Anthropic frontend-design; shadcn/ui skill; Motion AI Kit | Origem oficial, acesso/permissões, compatibilidade e benefício concreto. |

Faça um spike pequeno e descartável, se necessário, com dados permitidos e representativos para comparar as duas bibliotecas mais promissoras de gráficos e de parsing. Meça o que importa: interação, tempo de importação, responsividade ao filtrar e tamanho de produção. Não confunda protótipo com código pronto.

**Checkpoint C — arquitetura:** apresente a decisão recomendada, alternativas rejeitadas e evidência do spike. Espere aprovação antes de criar projeto, instalar dependências ou implementar.

### Comparação inicial para direcionar o spike

- **shadcn/ui:** distribui o código fonte dos componentes para edição pelo próprio projeto; tem dashboard blocks, chart examples sobre Recharts e skill oficial para Claude Code. Bom ponto de partida para componentes gerais, filtros, diálogos, abas e cartões.
- **Astryx:** design system open-source da Meta com CLI e componentes agent-ready; está em beta, requer React 19+ e seus charts estão em canal canary. Comparar visual e APIs num spike, mas tratar estabilidade como risco real.
- **Aceternity UI:** foco mais forte em efeitos e componentes animados para React/Tailwind. Usar, se necessário, para detalhes visuais pontuais; não é a base para a camada de dados nem a alternativa que o usuário nomeou.
- **dashboardcn:** blocos analíticos que se integram a shadcn/Recharts/TanStack Table, com fonte copiada para o projeto. Verificar maturidade e Vite.
- **Tremor:** componentes e templates com foco em dashboard; os templates podem incluir Next.js e funcionalidades além do MVP, então selecionar apenas peças úteis.
- **Claude Motion:** produto da Anthropic que converte relatório/dados/imagens em animações editáveis e MP4. Tratar como fluxo externo opcional de comunicação; não é pacote npm nem módulo embutido na SPA.

Fontes de entrada: [shadcn](https://ui.shadcn.com/docs), [Astryx](https://github.com/facebook/astryx), [dashboardcn](https://dashboardcn.com/docs), [Tremor Blocks](https://blocks.tremor.so/), [Claude Motion](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion).

### Skills sugeridas para o trabalho no Claude Code

1. `frontend-design` oficial da Anthropic para direção visual, tipografia, paleta e movimento.
2. Skill shadcn/ui oficial para ler a configuração real do projeto e descobrir APIs/componentes antes de gerar código.
3. Motion AI Kit opcional somente se for desejada animação de layout dentro do React. Não confundir com Claude Motion.

Antes de instalar qualquer skill/plugin/MCP, revisar fonte, comandos e permissões; seguir o fluxo de instalação do usuário. Não instalar globalmente de modo automático.

## Fase 3 — Fundação e desenho da experiência

Após aprovação:

1. Inicialize ou adapte o projeto com a stack aprovada, preservando padrões existentes.
2. Configure TypeScript estrito, formatter/linter e a estratégia de testes que o repositório adotar.
3. Defina tokens de cor, espaçamento, tipografia e estados de foco. Estabeleça uma paleta de séries acessível e consistente.
4. Crie a estrutura semântica da tela única: contexto do arquivo, upload/estado vazio, barra com todas as abas carregadas, filtros, resumo, canvas editável de cartões e detalhe tabular.
5. Trate primeiro os estados vazios, carregando, erro e dados insuficientes. Um painel sem dados deve explicar o próximo passo.
6. Faça uma validação visual cedo com um layout estático/fixtures anonimizadas autorizadas. Ajuste densidade, leitura projetada e responsividade antes de multiplicar gráficos.

**Checkpoint D — experiência e edição:** apresente capturas ou prévia executável com várias abas, mudança de visão e modo de edição. Confirme navegação, nível de liberdade para configurar widgets e como restaurar o layout antes de aprofundar visualizações.

## Fase 4 — Ingestão local, validação e modelo de dados

1. Aceite apenas o formato aprovado e valide extensão/MIME/conteúdo de forma defensiva.
2. Defina limites configuráveis de tamanho, abas, linhas e colunas com base na amostra e medições. Não escolha valores arbitrários.
3. Leia `ArrayBuffer` localmente. Não faça requisições de rede com os dados e não registre conteúdo de células.
4. Processe todas as abas no início e mostre uma prévia/status por aba. Abas vazias/incompatíveis não devem bloquear as válidas.
5. Aplique o contrato aprovado por aba: mapeamento explícito, coerção documentada de data/número, erros por coluna e avisos para dados ausentes/ambíguos.
6. Preserve metadados de qualidade (linhas rejeitadas, avisos) sem expor conteúdo sensível.
7. Se medições mostrarem bloqueio de interface por parsing, mova o trabalho para Web Worker com progresso e cancelamento; não otimize prematuramente.

### Testes mínimos da fase

- workbook/aba ausente, arquivo ilegível e formato rejeitado;
- cabeçalho ausente ou ambíguo;
- datas, números, nulos e valores inválidos conforme o contrato;
- limites de arquivo e mensagens de erro;
- garantia de que fórmulas/conteúdo não são executados ou injetados como HTML.

## Fase 5 — Filtros, agregações e estado compartilhado

1. Modele os filtros como estado serializável e independente de componentes visuais.
2. Crie seletores/transformações puros: dados normalizados + filtros + seleção de séries → subconjunto/agregações para cada visão.
3. Exiba filtros ativos, possibilidade de removê-los individualmente e restauração para o padrão da sessão.
4. Mantenha ocultação de séries independente dos filtros de dados; documente a diferença na interface.
5. Garanta que cartões, gráficos e tabela leiam a mesma fonte filtrada.
6. Meça o custo de recalcular; use memoização e só introduza store global se o fluxo demonstrar necessidade.

## Fase 5A — Construtor configurável por sessão

1. Modelar cada visão do dashboard como configuração serializável separada dos dados importados.
2. Criar/editar/remover widget por seleção de aba-fonte, colunas, forma de visualização entre tipos aprovados, filtros, séries e apresentação.
3. Permitir reordenar/redimensionar cartões e abas, renomear/ocultar/mostrar visão, sempre preservando a referência da aba de origem.
4. Exibir somente operações compatíveis com os tipos de coluna. Agregações que mudem o significado dos dados exigem validação/decisão explícita; não gerar KPI por heurística.
5. Na primeira entrega, tratar mudanças como estado em memória da sessão. Só implementar localStorage após definir com o usuário retenção, limpeza e migração quando o formato do XLSX mudar.
6. Oferecer reset claro para a configuração inicial que veio com a importação.

### Testes mínimos da fase

- combinação, remoção e reset de filtros;
- consistência entre total, gráfico e tabela;
- ocultar/reexibir uma série sem alterar o conjunto de dados;
- resultado vazio e dados incompletos.

## Fase 6 — Visualizações acordadas

1. Implemente um gráfico por vez, começando pela pergunta executiva de maior prioridade.
2. Para cada gráfico, mantenha uma especificação curta: pergunta respondida, métrica/fórmula aprovada, dimensão, período, unidade, filtro aplicado, estado vazio e alternativa textual.
3. Inclua títulos informativos, legenda/identificação de série, unidade, escala e período. Não use cor como único canal semântico.
4. Implemente tooltip e interação apenas se ajudam uma pergunta de reunião; evite complexidade visual decorativa.
5. Garanta resize correto, limpeza de listeners/instâncias e carregamento sob demanda de bibliotecas pesadas quando a medição indicar benefício.
6. Não implementar exportação até haver requisito confirmado. Quando houver, testar que exporta somente o recorte atual e não vaza dados além dele.
7. Avaliar como opção de pós-MVP a exportação de um gráfico/descrição para uso posterior no Claude Motion. O uso acontece fora do painel; não criar integração de conta/API nem enviar a planilha automaticamente.

## Fase 7 — Acessibilidade, desempenho e segurança

### Acessibilidade

- Navegue por teclado upload, filtros, legendas/controles e tabela.
- Verifique foco visível, nomes acessíveis e mensagens de erro anunciáveis.
- Revise contraste e paleta de séries; entregue tabela, descrição ou resumo alternativo para cada dado importante.
- Garanta que animações respeitem preferência de movimento reduzido.

### Desempenho

- Meça importação, primeira renderização e interação de filtro com amostra realista/anonimizada.
- Defina orçamento e limite de dados com base nessas medições.
- Verifique bundle de produção; remova dependências não justificadas e considere lazy loading de gráficos.
- Só adote virtualização/Web Worker ao demonstrar necessidade.

### Segurança e privacidade

- Não aceite macros como código nem execute fórmulas/links externos.
- Não use `innerHTML`/renderização não sanitizada para células.
- Não coloque planilhas ou dados identificáveis em repositório, snapshots, rastreadores, logs, URLs ou mensagens de erro.
- Reavalie exportação e armazenamento local com o usuário antes de habilitar.

### Uso opcional de Claude Motion

O recurso mencionado pelo usuário no vídeo é o Claude Motion, ferramenta separada do app que transforma conteúdo (como imagem de gráfico, dados ou relatório) em explicador animado editável e exportável como MP4. Para o handoff de reunião, considerar uma ação de exportar imagem/descrição apenas após o usuário aprovar o escopo e a privacidade. Verificar disponibilidade da ferramenta no plano/organização. Não adicionar chamada externa nem afirmar que o painel consegue sincronizar um artefato Motion.

## Fase 8 — Verificação final e entrega

1. Execute lint, checagem de tipos, testes unitários/integrados e build de produção, usando os comandos reais do repositório.
2. Faça teste de navegador do fluxo completo: importar, carregar todas as abas, mudar visão, validar falha individual de aba, filtrar, criar/configurar/remover/reordenar widget, ocultar série, resetar configuração, trocar arquivo e tratar erro.
3. Faça revisão visual em resolução de notebook/projeção e em uma largura menor. Confira truncamento, contraste, hierarquia, legenda e estados vazios.
4. Registre versões de navegador testadas, arquivo/amostra usada (sem dados sensíveis), limitações conhecidas e métricas de desempenho observadas.
5. Só declare o trabalho concluído com evidência de cada validação e com critérios de aceite do `PRD.md` satisfeitos ou explicitamente adiados pelo usuário.

## Regras de comunicação com o usuário

- Pergunte antes de decisões que alterem semântica de uma métrica, ocultem dados, ampliem o escopo ou adicionem persistência/serviços.
- Informe suposições como suposições; ofereça recomendação, mas não trate recomendação como requisito aprovado.
- Quando houver ambiguidade na planilha, mostre exemplos estruturais (nome de coluna/valor anonimizado) e peça a regra de resolução.
- Ao propor uma dependência, compare pelo menos uma alternativa e justifique pelo problema concreto, não por popularidade.
- Mantenha mudanças pequenas e verificáveis; após cada checkpoint, aguarde a aprovação indicada antes de avançar para a fase que cria produto.

## Ordem resumida

```text
Explorar repositório/fluxo
  → receber e entender planilha + métricas
  → comparar dependências e fazer spike
  → aprovar arquitetura
  → fundação visual com navegação de todas as abas
  → importação e contrato de dados por aba
  → filtros e agregações
  → construtor de dashboard por sessão e gráficos acordados
  → acessibilidade, desempenho e segurança
  → testes, revisão visual e handoff
```
