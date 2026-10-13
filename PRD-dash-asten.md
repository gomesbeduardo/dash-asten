# PRD — Painel de análise de planilhas

**Status:** rascunho para validação; não autoriza implementação ainda.  
**Escopo inicial:** análise local de todas as abas de arquivos `.xlsx` em reuniões semanais internas, numa aplicação de página única com dashboards configuráveis.  
**Decisões provisórias:** todas as escolhas técnicas abaixo devem ser revalidadas quando chegarem uma planilha real, suas métricas e suas regras de negócio.

## 1. Visão

Transformar uma planilha Excel de acompanhamento operacional em um painel visual, rápido e apresentável para reuniões de direção e coordenações. A pessoa importa um arquivo uma vez; todas as abas elegíveis são lidas e ficam disponíveis na mesma tela como abas/visões do dashboard. Em cada visão, ela pode configurar livremente os componentes de análise — por exemplo, adicionar/remover cartões, mudar gráfico, campos, séries, filtros e organização — para explorar tendências de curto prazo (aproximadamente 1–2 meses) e demandas de backlog.

O produto não é um sistema de gestão, não guarda histórico e não substitui a planilha de origem. É uma ferramenta de leitura e conversa: reduzir o tempo gasto montando gráficos e aumentar a clareza das decisões na reunião.

## 2. Problema e oportunidade

Hoje, dados operacionais em Excel são úteis, mas difíceis de interpretar ao vivo: as comparações precisam ser montadas manualmente, filtros são pouco fluentes e a narrativa visual fica dispersa. Em uma reunião, a equipe precisa alternar rapidamente entre visão executiva e detalhes — por período, área, responsável, status ou outra dimensão que a planilha vier a trazer — sem alterar o arquivo-fonte.

## 3. Objetivos

- Importar uma planilha `.xlsx` localmente e tornar seus dados exploráveis na mesma sessão.
- Carregar todas as abas elegíveis do arquivo no início e disponibilizá-las na mesma aplicação de página única.
- Permitir alterar a configuração de todas as visões e cartões sem editar código.
- Mostrar múltiplas visualizações interativas coerentes entre si.
- Permitir habilitar/desabilitar séries e aplicar filtros combináveis, com atualização imediata da tela.
- Apoiar leitura de tendência, volume, composição, comparação e backlog no horizonte operacional curto.
- Oferecer uma experiência visual sóbria, clara e adequada à projeção em reunião.
- Manter os dados no navegador: sem login, API, banco ou envio automático do arquivo.

## 4. Não objetivos

- Autenticação, usuários, permissões, auditoria, colaboração ou persistência centralizada.
- Edição da planilha, workflow de demandas, criação de tickets ou cálculo de métricas ainda não definidas.
- Previsões, inteligência artificial, alertas automatizados ou integração com outras fontes nesta primeira versão.
- Combinar ou comparar automaticamente abas com esquemas diferentes sem mapeamento aprovado.
- Integração embutida com Claude Motion, Claude Dashboards ou outro serviço externo.
- Suporte genérico a qualquer arquivo tabular sem uma etapa de mapeamento/validação; o esquema real será definido depois.
- Tratar a aplicação como fonte oficial de dados.

## 5. Pessoas e contexto de uso

| Pessoa | Necessidade durante a reunião |
| --- | --- |
| Direção | Entender rapidamente cenário, tendência, gargalos e questões que exigem decisão. |
| Coordenações | Recortar os dados por sua área, comparar séries e explicar variações. |
| Pessoa facilitadora | Carregar a versão atual da planilha, conduzir filtros e retornar ao detalhe quando houver perguntas. |

**Cenário principal:** uma pessoa abre o painel em um computador compartilhado/projetado, importa a planilha da semana e conduz uma conversa. Portanto, legibilidade, velocidade, estados visíveis e recuperação fácil de filtros importam mais do que densidade extrema de recursos.

## 6. Fluxos principais

### 6.1 Importar e validar

1. A pessoa abre o painel e vê a área de upload com orientação e um estado vazio útil.
2. Seleciona ou arrasta um `.xlsx`.
3. A aplicação lê localmente todas as abas da pasta de trabalho e mostra o progresso/resultado por aba.
4. Todas as abas com conteúdo aparecem como visões na barra de navegação do dashboard; a pessoa pode renomeá-las, reordená-las, ocultá-las da navegação ou reexibi-las.
5. A aplicação mostra amostra, colunas reconhecidas e problemas de qualidade por aba. Se uma estrutura exigir interpretação, pede mapeamento explícito; não infere silenciosamente.

### 6.2 Explorar em reunião

1. A aplicação apresenta uma tela única de análise, com as visões de todas as abas do arquivo disponíveis numa barra de abas e um canvas de dashboard para a visão selecionada.
2. A pessoa altera filtros e séries e entra em modo de edição para adicionar/remover cartões, selecionar aba-fonte, campos e tipo de visualização, e reorganizar/redimensionar os cartões.
3. As visualizações que dependem de um filtro refletem a seleção ativa; controles indicam o escopo do filtro (visão atual ou todas as visões).
4. Ela usa tooltip, legenda e realce para responder perguntas pontuais.
5. Pode remover filtros, retornar à configuração inicial ou alterar novamente o dashboard. Na primeira versão, alterações duram até o fim da sessão; persistência local é uma decisão em aberto.

### 6.3 Trocar ou limpar arquivo

1. A pessoa escolhe “substituir planilha” ou “limpar sessão”.
2. A aplicação pede confirmação apenas quando há uma análise ativa que será perdida.
3. Os dados e filtros existentes são descartados da memória do navegador.

### 6.4 Preparar material para Claude Motion (fluxo externo opcional)

1. A pessoa identifica uma visualização ou conclusão confirmada que quer transformar em explicação animada.
2. Se exportação for aprovada, exporta uma imagem e/ou resumo textual do recorte selecionado e fornece esse material ao Claude Motion separadamente.
3. Claude Motion produz um artefato animado editável e exportável; esse fluxo ocorre fora do painel e não altera os dados importados.

## 7. Requisitos funcionais

### Prioridade inicial (MVP)

- Aceitar somente `.xlsx` e mostrar mensagens compreensíveis para arquivo inválido, vazio, protegido ou ilegível.
- Ler o arquivo no dispositivo; não realizar upload para um serviço remoto.
- Carregar todas as abas não vazias inicialmente, preservando nome/origem e exibindo status por aba. Abas vazias ou sem formato reconhecível continuam identificadas com explicação e podem ser ignoradas/ocultadas; não bloqueiam as outras.
- Permitir visualizar uma amostra e mapear cabeçalhos/tipos por aba quando necessário.
- Disponibilizar todas as abas numa barra de navegação dentro da mesma tela, sem rota ou recarregamento de página.
- Oferecer um modo de edição do dashboard: adicionar/remover cartões, escolher a aba-fonte, escolher campos e um tipo de gráfico compatível, configurar filtros/visibilidade de séries e reorganizar/redimensionar cartões.
- Permitir renomear/reordenar/ocultar/mostrar abas de dashboard. Não apagar do arquivo nem modificar o workbook original.
- Manter todos os dados de origem no estado de sessão e cada configuração ligada à origem/aba, sem misturar esquemas implicitamente.
- Normalizar valores básicos (texto, número, data e células vazias) preservando a origem para diagnóstico.
- Mostrar filtros somente para dimensões aprovadas no esquema final; incluir busca/seleção múltipla quando fizer sentido.
- Aplicar filtros globalmente, exibir filtros ativos como chips removíveis e disponibilizar “limpar filtros”.
- Permitir ocultar/mostrar séries por legenda ou controle equivalente, mantendo esse estado de maneira explícita.
- Exibir cartões-resumo, gráficos e tabela/preview com dados filtrados. Os gráficos exatos dependem de métricas confirmadas.
- Fornecer estados de carregamento, vazio, erro e dados insuficientes para cada área.
- Exportar PNG/CSV ou resumo textual da seleção para apoiar uso posterior em Claude Motion **somente após decisão de produto, teste de privacidade e validação técnica**; não é requisito do MVP.

### Pós-MVP — apenas se validado

- Salvar localmente preferências não sensíveis, como tema ou última disposição de gráficos.
- Links compartilháveis contendo apenas filtros, nunca os dados.
- Exportação de PNG/SVG/PDF ou CSV do recorte atual.
- Persistir localmente configurações de dashboard e restaurá-las após fechar/reabrir a aplicação — exige consentimento, comportamento claro para mudanças no esquema e opção de limpeza.
- Gerar um pacote de handoff para Claude Motion, caso exportar um gráfico não seja suficiente.

## 8. Dados, métricas e regras em aberto

Ainda não há planilha, dicionário de dados ou definição de indicadores. Logo, este PRD **não presume** nomes de colunas, fórmulas, metas, semântica de status nem granularidade.

Quando a amostra chegar, deve-se confirmar:

- para cada aba, em qual linha está o cabeçalho e qual é seu papel no dashboard;
- chave/identificador (se existir), unidade de uma linha e duplicidades aceitáveis;
- campos de data e fuso/semana de referência;
- campos de dimensão pelos quais se pode filtrar;
- campos numéricos, seus tipos/unidades e como tratar nulos;
- definição exata de “backlog”, “demanda”, “concluído”, “atraso” e demais termos;
- indicadores desejados, fórmulas, comparativos e regras de arredondamento;
- quais informações são sensíveis e não devem aparecer na projeção.

## 9. Experiência visual e interação

- **Tom:** executivo, contemporâneo e calmo; dados são a prioridade, não decoração.
- **Estrutura:** cabeçalho compacto com contexto do arquivo; faixa de filtros; resumo; grade responsiva de gráficos; detalhe tabular recolhível ou em painel lateral.
- **Página única:** uma única superfície de análise com navegação por abas do workbook/dashboard. A aba selecionada define o canvas visível; as demais fontes já foram carregadas e permanecem acessíveis sem navegação para outra página. Se a análise exigir comparação entre fontes, usar cartões com fontes explicitamente selecionadas e mapeadas.
- **Edição:** controles contextuais para adicionar, configurar, mover, redimensionar, ocultar e remover visualizações. A pessoa sempre consegue restaurar a configuração inicial da importação.
- **Hierarquia:** uma visualização principal por vez, com gráficos complementares menores. Evitar um “muro” de gráficos.
- **Cores:** paleta curta, contraste alto e associação consistente de cada série à mesma cor. Não depender somente de cor para comunicar estado.
- **Comparação:** séries identificadas diretamente ou por legenda clara; escala, unidade e período sempre visíveis.
- **Apresentação:** tipografia e alvos de clique confortáveis; controles legíveis sob projeção; modo tela cheia pode ser avaliado depois.
- **Confiança:** indicar origem (nome/aba do arquivo), atualização da sessão e observações de qualidade. Exibir valores ausentes em vez de convertê-los silenciosamente em zero.

## 10. Acessibilidade

- Navegação por teclado em upload, filtros, controles de série e tabelas.
- Rótulos acessíveis e mensagens de erro associadas aos respectivos controles.
- Contraste compatível com WCAG AA como meta inicial; paletas amigáveis a diferentes percepções de cor.
- Tabela ou resumo textual alternativo para informações importantes de cada gráfico; tooltips não devem ser a única fonte de informação.
- Respeitar preferência de redução de movimento; animação não pode bloquear leitura ou interação.

## 11. Requisitos não funcionais

- **Privacidade:** processamento estritamente local por padrão. A aplicação não registra conteúdo do arquivo em logs/telemetria.
- **Desempenho:** interface deve continuar responsiva ao filtrar; medições e limite prático de linhas serão definidos usando arquivo real. Cálculos caros devem ser memoizados ou transferidos a Web Worker após medição.
- **Compatibilidade:** versões recentes de Chrome, Edge, Firefox e Safari em desktop; responsividade para tablet é desejável, porém a experiência prioritária é desktop/projeção.
- **Robustez:** detectar e explicar aba ausente, cabeçalho ambíguo, tipo inválido, data não interpretável e arquivo grande; jamais travar em silêncio.
- **Manutenibilidade:** separar ingestão, modelo normalizado, seleção/filtros, agregações e componentes visuais. Nenhuma métrica deve ficar embutida em um componente de gráfico.
- **Qualidade:** testes para parsing/normalização, filtros, agregações e estados de erro; testes de interface para fluxos críticos; revisão visual em larguras relevantes.

## 12. Arquitetura proposta (provisória)

```text
Arquivo .xlsx local
        ↓
Leitor/validador de workbook → ingestão de todas as abas + mapeamento explícito por aba
        ↓
Modelo normalizado tipado (linhas + metadados + avisos)
        ↓
Estado de filtros/seleção de séries → seletores/agregações testáveis
        ↓
Cartões, gráficos e tabela de detalhe
        ↓
Exportação local opcional
```

Tudo reside na memória da página. Trocar de arquivo reinicia a sessão. A fronteira entre parsing e modelo de domínio é intencional: permite adaptar a planilha real sem reescrever os gráficos.

## 13. Opções de stack e decisão provisória

### 13.1 Aplicação e build

| Opção | Pontos fortes | Custos/limites neste caso | Decisão provisória |
| --- | --- | --- | --- |
| **React + TypeScript + Vite** | Ecossistema vasto para componentes, tabelas, testes e gráficos; composição natural de um painel todo interativo; Vite oferece ciclo local simples. | Mais escolhas possíveis e bundle deve ser monitorado. | **Recomendado para o MVP.** O painel é quase integralmente interativo. |
| Vue + TypeScript + Vite | Curva de leitura amigável, reatividade integrada e documentação sólida. | Muda a escolha de bibliotecas/componentes; só vale trocar se a equipe já for mais produtiva em Vue. | Alternativa forte para equipe Vue. |
| Svelte + TypeScript + Vite/SvelteKit | Componentes concisos e compilação que tende a reduzir trabalho no navegador. | Ecossistema de integrações de dashboard é menor que o de React; custo de familiaridade pode superar o ganho. | Boa alternativa se houver domínio interno de Svelte. |
| **Astro + ilha React/Vue/Svelte** | Excelente para páginas predominantemente estáticas, conteúdo e performance inicial. Pode hospedar uma landing page/guia ao redor do painel. | Upload, filtros, tabela e gráficos compartilham estado; praticamente toda a tela viraria uma ilha, adicionando fronteira de hidratação sem ganho proporcional. | **Não recomendado como casca do painel MVP.** Reavaliar se surgir uma área pública/editorial relevante. |

**TypeScript:** recomendado em todas as opções. Tipos não validam a planilha por si só, mas tornam explícitos o contrato de dados, os estados de carregamento/erro e as opções de gráfico. Validação em tempo de execução continua necessária.

**Vite:** recomendado para este produto estático, sem necessidade atual de SSR, rotas complexas ou servidor. É ferramenta de desenvolvimento e build, não uma dependência de produto final.

### 13.2 Estilo e componentes

| Opção | Quando ajuda | Atenção |
| --- | --- | --- |
| **shadcn/ui** | Código de componentes copiado para o projeto, customizável; ampla base de primitivas, blocos de dashboard e integração com Claude Code via skill oficial. O componente de charts é baseado em Recharts. | A equipe mantém o código copiado; chart components não são um editor visual de dashboards e blocos de exemplo precisam ser adaptados à SPA/Vite e ao esquema real. |
| **Astryx (Meta)** | Design system agent-ready, tema, CLI e mais de 150 componentes acessíveis; aceita CSS, Tailwind ou CSS Modules. | Está em beta e requer React 19+; componentes `@astryxdesign/charts`/Vega estão em canal canary sem release estável. Maior incerteza para um projeto inicial. |
| **Aceternity UI** | Componentes animados React/Tailwind prontos para efeitos e momentos de destaque. | Direcionado principalmente a componentes visuais/landing pages; não é a base mais adequada para filtros, acessibilidade e interação de dados no dashboard. Não confundir com Astryx. |
| Tailwind CSS + primitives acessíveis (Radix, Base UI ou React Aria) | Mais controle sobre um design system mínimo sem assumir uma biblioteca visual completa. | Exige compor e manter mais elementos à mão. |
| CSS Modules/vanilla CSS | Menos dependências e CSS muito explícito. | Mais trabalho manual para escala/consistência. |

**Recomendação provisória:** shadcn/ui para componentes gerais e bases de interação; aproveitar blocos de dashboard/chart como ponto de partida, customizando-os para esta experiência. Comparar um componente equivalente em Astryx num spike antes da decisão final. Não usar os dois sistemas juntos no MVP. O motivo principal é reduzir risco de beta e aproveitar a skill oficial shadcn para Claude Code. Astryx continua uma opção plausível se React 19+ e o estado beta forem aceitáveis. Aceternity pode fornecer uma ou duas animações decorativas, mas não deve estruturar o dashboard.

### 13.3 Gráficos

| Biblioteca | Melhor para | Vantagens | Trade-offs | Direção |
| --- | --- | --- | --- | --- |
| **Recharts v3 + shadcn/ui charts** | Gráficos usuais de dashboard e composições React. | Os exemplos de shadcn já são copy/paste; suporte visual integrado aos tokens/componentes comuns. | Não é editor de dashboard; criar tipos customizados pode exigir adaptação. | **Candidata inicial mais simples**, validar requisitos de interação no protótipo. |
| **dashboardcn** | Cartões KPI, tendências e composições de dados prontos baseados em shadcn, Recharts e TanStack Table. | Componentes de dashboard mais próximos do produto; código-fonte copiado/MIT e personalizável. | Projeto independente; validar maturidade, suporte a Vite e APIs atuais antes de adotar. | Candidato para acelerar cartões e layouts. |
| Tremor/Tremor Blocks | Componentes e blocos React focados em dashboards. | Catálogo de KPIs, tooltips, charts e páginas com layouts prontos; licencia Apache-2.0 no pacote principal. | Templates disponíveis podem vir com Next.js e escopo SaaS; adaptar sem trazer navegação/recursos desnecessários. | Candidato para referência/copy-paste; comparar manutenção e aderência. |
| Apache ECharts | Painel denso com muitos tipos, zoom, tooltip, legenda e interação. | Repertório amplo e datasets/interações integrados. | API de configuração mais extensa; integração deve isolar opções em adaptadores. | Alternativa se os requisitos ultrapassarem os gráficos usuais. |
| Plotly.js | Exploração analítica com zoom/pan e tipos científicos. | Interações prontas poderosas. | Pode aumentar o bundle e ter estética mais pesada; avaliar carregamento sob demanda. | Alternativa se exploração analítica prevalecer. |
| visx | Visualizações muito personalizadas. | Baixo nível, controle alto e composição React. | Exige mais código, design e testes. | Evitar no MVP; usar apenas para gráfico que nenhuma opção atende. |

O catálogo de componentes prontos acelera a fundação, mas o dashboard configurável continua sendo lógica própria: um schema declarativo de cartões/visões deve selecionar componentes de gráfico aprovados. Não executar código arbitrário fornecido pelo usuário. O agente deve fazer um spike de Recharts/shadcn vs ECharts e comparar tamanho, legibilidade, tipos necessários e acessibilidade.

### 13.4 Leitura do XLSX

| Biblioteca | Uso adequado | Vantagens | Limites | Direção |
| --- | --- | --- | --- | --- |
| **SheetJS (Community Edition)** | Ler workbook/abas e converter dados no navegador. | Foco direto em parsing de planilhas e uso amplo no ecossistema web. | Confirmar licença, bundle e comportamento necessário antes de fechar escolha. | **Candidata principal** para leitura. |
| ExcelJS | Manipular/criar workbooks e preservar mais aspectos de Excel quando necessário. | Útil se o produto evoluir para gerar ou editar planilhas. | Pode ser mais do que o necessário para apenas importar. | Não adotar no MVP sem requisito de escrita. |
| Importar CSV como alternativa | Arquivos simples/controle de origem. | Simplicidade e tamanho reduzido. | Não atende ao requisito de `.xlsx`, abas ou metadados. | Fora do escopo inicial; possível complemento futuro. |

### 13.5 Estado, tabela e exportação

- **Estado:** começar com estado local e seletores puros; adotar Zustand apenas se filtros, layout e cross-filtering tornarem props/contexto difíceis de manter. Evitar Redux no MVP.
- **Configuração do dashboard:** manter uma definição serializável por aba (widgets, fonte, tipo, campos, filtros e ordem/dimensões), separada dos dados. Na primeira versão, a edição é válida durante a sessão. Persistência local é aberta; não introduzir serviço ou sincronização.
- **Tabela:** avaliar TanStack Table se a prévia/detalhe exigir ordenação, paginação e colunas dinâmicas. Não acrescentar se uma tabela sem recursos avançados bastar.
- **Exportação:** começar sem exportar. Se aprovado, priorizar exportação de dados já filtrados para CSV; exportação de imagem depende de compatibilidade da biblioteca de gráficos e deve ser testada. Não gerar `.xlsx` sem requisito claro.

## 14. Segurança de parsing e privacidade

- Aceitar extensão e MIME apenas como sinal inicial; tratar o conteúdo como não confiável.
- Impor limites configuráveis de tamanho, número de abas, linhas e colunas antes de processar profundamente; os valores devem ser definidos com amostras reais, não adivinhados.
- Nunca executar macros, fórmulas como código, links externos ou conteúdo HTML vindo da planilha.
- Exibir texto de célula como texto; não usar inserção de HTML não sanitizada.
- Evitar logs de células, nomes de pessoas e conteúdo do arquivo; mensagens de diagnóstico devem ser estruturais.
- Considerar Web Worker para parsing de arquivos grandes depois de medir, mantendo mensagens de progresso/cancelamento.

## 15. Motion e ferramentas de frontend com Claude

**Claude Motion (referência do usuário):** o recurso apresentado no [vídeo](https://www.youtube.com/watch?v=en0GuyhieQk) é o Claude Motion, separado do Claude Dashboards. Segundo a [documentação oficial](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion), transforma conteúdo em uma animação curta editável como código e exportável em MP4; aceita contexto como relatório, dados ou imagens. É beta e a disponibilidade pode depender do plano/organização. No produto deste PRD, ele é uma etapa opcional fora da aplicação: usar uma visualização/export aprovado para produzir um explicador de reunião. Não integrar APIs, enviar planilhas automaticamente nem presumir acesso.

Ferramentas pesquisadas para o trabalho no Claude Code:

- **Anthropic `frontend-design`**: skill/plugin oficial que direciona decisões de linguagem visual, tipografia, paleta e movimento. Boa para o canvas de análise e o modo de edição; instruir o agente a manter movimento discreto e preservar leitura de dados.
- **Skill oficial shadcn/ui**: fornece contexto de `components.json` e orienta descobrir, instalar, compor e customizar componentes com APIs corretas.
- **Motion AI Kit**: se “Motions” também incluir a biblioteca Motion (antes Framer Motion), há um kit oficial separado para agentes, incluindo Claude Code. É opcional; não é o Claude Motion do vídeo e não é dependência funcional do dashboard.

Skills/plugins externos precisam ser avaliados por origem, permissões, instruções e compatibilidade antes de instalar. O agente pode pesquisar e recomendar, mas não instalar ferramentas globais ou extensões sem autorização do usuário.

## 16. Critérios de aceite do MVP

- Uma pessoa consegue abrir a aplicação e importar um `.xlsx`; todas as abas com conteúdo são carregadas localmente sem tráfego de dados para backend.
- Todas as abas estão disponíveis como visões numa única tela, sem reload/navegação entre páginas, e cada visão deixa clara a aba de origem.
- Abas vazias, incompatíveis ou com cabeçalhos diferentes recebem diagnóstico individual e não impedem a leitura das demais.
- Um arquivo inválido, vazio, maior que o limite definido ou com estrutura incompatível produz mensagem útil e não quebra a interface.
- Para o esquema confirmado, a aplicação identifica e exibe claramente colunas/avisos necessários antes dos gráficos.
- Pelo menos os gráficos acordados com o negócio são exibidos com título, unidade, período, legenda e estado sem dados.
- Alterar um filtro atualiza todos os elementos dependentes e fica claro quais filtros estão ativos.
- Séries podem ser ocultadas/reativadas sem corromper filtros nem totais.
- “Limpar filtros” restaura a visão padrão da importação atual.
- A pessoa consegue adicionar, remover, configurar e reorganizar os cartões previstos no construtor aprovado; seleção de campo/tipo inválida exibe orientação, sem inventar métrica.
- Alterações em uma visão não mudam silenciosamente a configuração de outra. Reset restaura configuração inicial derivada da importação.
- A informação essencial é utilizável por teclado e não depende somente de cor ou tooltip.
- Testes automatizados cobrem parsing/normalização em amostras permitidas, agregações e combinação de filtros; o fluxo de importação é verificado no navegador.
- A interface foi revisada visualmente em tela de reunião desktop e em largura menor, com dados realistas anonimizados.

## 17. Perguntas abertas que bloqueiam decisões de produto

1. Qual é a planilha real (ou uma amostra anonimizada), e quais abas devem ser excluídas apesar de serem carregadas inicialmente (por exemplo, instruções, lookup ou arquivo auxiliar)?
2. Quais métricas, fórmulas, metas e comparativos precisam aparecer já na primeira reunião?
3. Quais dimensões devem filtrar toda a tela e quais são apenas atributos de detalhe?
4. Como são definidas as janelas de 1–2 meses e o backlog? Há calendário de trabalho, fuso ou semana de corte?
5. Quais gráficos são indispensáveis e que pergunta cada um deve responder? Quais limites de customização significam “tudo livre” na primeira entrega (tipo de gráfico, campos, agregação permitida, tamanho/posição, abas criadas pelo usuário)?
6. Há dados pessoais, comerciais ou sensíveis que precisam ser ocultados na projeção?
7. Qual é o volume típico e máximo dos arquivos? Há células mescladas, múltiplos cabeçalhos, fórmulas, tabelas dinâmicas ou datas ambíguas?
8. Para usar Claude Motion, bastaria exportar PNG/resumo dos gráficos escolhidos, ou existe outro formato de passagem desejado? O uso do Claude Motion está disponível no plano/organização do usuário?
9. As mudanças do dashboard devem sobreviver ao fechamento do navegador via armazenamento local? Como restaurar a configuração quando a próxima planilha muda de estrutura?
10. Existe identidade visual, paleta ou exemplo de dashboard que a equipe aprecia ou rejeita?

## 18. Referências para pesquisa

Fontes oficiais verificadas em 13/10/2026; revalidar versões/licenças antes de adotar: [React](https://react.dev/), [Vue](https://vuejs.org/), [Svelte](https://svelte.dev/), [Astro](https://docs.astro.build/), [Vite](https://vite.dev/), [shadcn/ui introduction](https://ui.shadcn.com/docs), [shadcn charts](https://ui.shadcn.com/docs/components/base/chart), [shadcn dashboard blocks](https://ui.shadcn.com/blocks?category=dashboard), [shadcn skill para Claude Code](https://ui.shadcn.com/docs/skills), [Astryx (GitHub oficial)](https://github.com/facebook/astryx), [Aceternity UI](https://ui.aceternity.com/), [dashboardcn](https://dashboardcn.com/docs), [Tremor](https://github.com/tremorlabs/tremor), [Apache ECharts](https://echarts.apache.org/), [Recharts](https://recharts.org/), [Plotly.js](https://plotly.com/javascript/), [visx](https://airbnb.io/visx/), [SheetJS](https://docs.sheetjs.com/), [ExcelJS](https://github.com/exceljs/exceljs), [TanStack Table](https://tanstack.com/table/latest), [Anthropic frontend-design plugin](https://claude.com/plugins/frontend-design), [Claude Motion Help Center](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion) e [Motion AI Kit](https://motion.dev/docs/ai-kit).
