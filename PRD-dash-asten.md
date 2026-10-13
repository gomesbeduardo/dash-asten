# PRD — Painel de análise de planilhas (Asten)

**Versão:** v2, 13/10/2026, revisada após sessão de grilling. A v1 está no histórico do Git.
**Status:** esqueleto neutro do produto em construção (D19). Painéis e métricas só depois da validação do Líder (meta: 16/10/2026).
**Escopo:** painel local, numa página única, para conduzir a reunião semanal interna a partir de uma planilha `.xlsx` de estrutura fixa.

## 0. Decisões do grilling 13/10

| # | Tema | Decisão |
|---|---|---|
| D1 | Por que construir | Ferramentas como Power BI, Looker Studio e Excel projetado foram descartadas por dois motivos: **privacidade** (a planilha não pode sair da máquina) e **UX de reunião** (essas ferramentas não servem para conduzir uma conversa projetada). |
| D2 | Estrutura da planilha | **Mesma estrutura toda semana**, só os dados mudam. O produto é um painel para *essa* planilha-modelo, não um BI genérico. |
| D3 | Planilha real | **Ainda não existe** amostra. O conteúdo provável mistura **indicadores** (meta vs. realizado) e **projetos/atividades** (status, prazo, % de conclusão). Nem o usuário nem o Líder têm certeza ainda. |
| D4 | Edição do dashboard | **Edição rara.** O MVP traz **só filtros**. Construtor de cartões (adicionar, remover, configurar, redimensionar) fica para depois. Prioridade: bonito, funcional e simples de usar. |
| D5 | Layout | **Dashboard fixo por aba.** A forma ainda depende do Líder, mas tende a ser **configuração declarativa no código**. Se a aba não tem layout definido, aparece a tabela de detalhe e um aviso. Nenhum gráfico é inferido por heurística. |
| D6 | Filtros | **Tudo por aba.** Nenhum filtro atravessa abas, nem o de período. |
| D7 | Gestão de abas | Fica **ocultar/reexibir abas**. Renomear e reordenar estão **cortados**; nome e ordem vêm da planilha. |
| D8 | Foco nos dados | O usuário **escolhe quais colunas aparecem** na tabela de detalhe. Não há tela de mapeamento técnico (ver D18). |
| D9 | Dados sensíveis | **Sem máscara automática.** O layout fixo decide o que aparece. Nada persiste: fechar a aba do navegador apaga tudo. |
| D10 | Exportação / Claude Motion | **Fora do MVP.** O Motion fica registrado só como ideia futura, sem código. |
| D11 | Hospedagem | **Em aberto** (depende do Líder ou da TI). O build deve ser estático e agnóstico: precisa funcionar em qualquer host estático. |
| D12 | Visual | A Asten tem marca. A **cor principal entra só como acento** sobre uma base neutra e clara, com uma paleta de séries acessível separada da marca. |
| D13 | Stack | **Aprovada (Checkpoint C, 13/10)** depois da comparação breve de todas as opções: React 19 + TS + Vite 8, shadcn/ui (Tailwind v4), Recharts 3, TanStack Table e SheetJS ≥ 0.20.3 pelo CDN oficial. O `xlsx` do npm está **proibido** por causa de CVEs. Detalhes em `docs/comparacao-stack.md`. |
| D14 | Sucesso | **Aprovação do Líder.** Até 16/10 a entrega é planejamento, alinhamento e protótipo. Nada de produto antes de 100% de alinhamento. |
| D15 | Protótipo | **App React local descartável**, hoje na branch `prototipo` (D23), na stack escolhida, com dados fictícios. Artifact não serve porque fica visualmente muito diferente do produto. |
| D17 | Estética e telas | O painel será exibido sobretudo em **TVs e telas grandes**, mas o risco de projeção continua valendo. Por isso as **superfícies são sólidas**, com acabamento moderno e contido: cantos suaves, sombras discretas, tipografia forte. Vidro/translucidez estilo Apple foi descartado; nada de efeitos decorativos. A marca vem de astensuite.com.br: laranja `#ef8127` em detalhes, azul `#043f63` em destaques de texto e ações, e Oxanium nos títulos e números (ver `docs/marca/`). |
| D18 | Planilha consolidada | A planilha **chega validada antes do envio**: estrutura completa e conteúdo confiável. O painel trata o arquivo como consolidado. Saem do escopo o diagnóstico de abas incompatíveis, o mapeamento manual e o tratamento de arquivo malicioso. Fica só uma mensagem simples se alguém escolher um arquivo que não é a planilha da reunião. |
| D19 | Esqueleto antes do ok | Revisa a D14: começa agora **só o esqueleto neutro** (projeto, leitura genérica de planilha, modo apresentação, encaixe do contrato por aba). Painéis específicos e métricas esperam a validação do Líder. |
| D20 | Operação | A facilitadora usa **notebook com mouse e teclado ligado à TV**. A tela mostra quase só informação; abas e filtros aparecem sob demanda (mouse ou tecla) e somem sozinhos. Setas trocam de aba e uma tecla abre os filtros. |
| D21 | Formato da tela | **Página com rolagem** e o mínimo de moldura, com foco quase total na informação. Nada de cara de "site com dashboard". |
| D22 | Modo genérico | **Qualquer `.xlsx` já funciona:** cada aba vira uma tabela com filtros automáticos nas colunas de texto com poucos valores distintos e nas de data. Painéis específicos entram por aba, por cima, quando a planilha chegar. Dados fictícios só nos testes. |
| D23 | Repositório | Protótipo congelado na branch `prototipo`. O produto começa do zero na `main`, na raiz do repo. |
| D24 | Testes e CI | Vitest (TDD) e Testing Library; um teste Playwright ponta a ponta com `.xlsx` gerado no próprio teste. GitHub Actions **só em push na `main`**. Sem deploy até decidir a hospedagem. |
| D25 | Modo automático | Revisa a D5 e a D22: com qualquer planilha, cada aba ganha **KPIs e gráficos automáticos** a partir dos tipos de coluna, acima da tabela. Escopo "mais livre": contagens, período, média e total por coluna numérica, contagem por categoria e por mês, média por mês, e também comparação entre colunas numéricas quando os nomes sugerirem (meta × realizado, previsto × executado) com percentual de atingimento, e distribuição de status. Cada bloco leva o selo "automático". Painéis específicos registrados por aba continuam tendo prioridade. |
| D26 | Animação | Biblioteca **Motion** (13.4.4, fixa). Regras de movimento herdadas do `lp_centraleng` (DESIGN.md "Movimento", feito com impeccable): tokens 150/250/400 ms, curvas standard `cubic-bezier(0.4,0,0.2,1)` e emphasized `cubic-bezier(0.2,0,0,1)`; entrada única escalonada (~110 ms); números contam até o valor (~1 s, valor final sempre no texto); barras e linhas crescem ao entrar; troca de aba em fade cruzado de 200 ms; mudança de filtro só transita valores; só transform e opacity; nada em loop; com movimento reduzido tudo aparece pronto. |
| D27 | Deploy de teste | Revisa D11/D24 só para teste: projeto Vercel `g0mes/dash-asten`, publicado pela CLI depois do CI verde, **acesso aberto sem login** (coerente com o PRD sem autenticação; o app não guarda dados). Link: https://dash-asten.vercel.app (ver `docs/acesso-teste.md`). Deploy automático a cada push depende de instalar o app da Vercel no GitHub. A hospedagem definitiva continua com o Líder. |
| D16 | Versionamento | Git com repositório privado `gomesbeduardo/dash-asten`. `.gitignore` bloqueia `*.xlsx`/`*.csv` fora de `fixtures/`. |

## 1. Visão

Transformar a planilha Excel de acompanhamento operacional da reunião semanal em um painel visual, rápido e apresentável para Direção e Coordenações. A facilitadora importa o arquivo da semana. Todas as abas viram visões na mesma tela, e cada visão abre com um dashboard pronto e filtros para recortar os dados durante a conversa.

O produto não é sistema de gestão, não guarda histórico e não substitui a planilha. É uma ferramenta de leitura e conversa.

## 2. Problema

Hoje a planilha é projetada direto no Excel. As comparações são montadas à mão, os filtros são desajeitados ao vivo e a narrativa visual fica dispersa. A equipe precisa alternar rápido entre a visão executiva e o detalhe sem mexer no arquivo-fonte.

**Por que não uma ferramenta pronta (D1):** os dados não podem ir para nuvem ou serviço de terceiros, e Excel ou BI projetados não oferecem uma experiência fluida para conduzir a reunião.

## 3. Objetivos do MVP

- Importar o `.xlsx` da semana localmente; nada sai do navegador.
- Carregar todas as abas com conteúdo e exibi-las como visões numa barra de abas, sem trocar de página.
- Em cada aba, abrir um **dashboard fixo** (cartões-resumo, gráficos e tabela de detalhe) definido para a planilha-modelo.
- Oferecer **filtros por aba**, combináveis, com chips removíveis e "limpar filtros".
- Ocultar e mostrar séries pela legenda.
- Ocultar e reexibir abas da navegação.
- Escolher as colunas visíveis na tabela de detalhe.
- Visual sóbrio, legível em projeção e acessível.

## 4. Não objetivos (MVP)

- Construtor de dashboard: adicionar, remover, configurar, mover ou redimensionar cartões (pós-MVP, D4).
- Renomear ou reordenar abas (D7).
- Filtros que atravessam abas (D6).
- Exportação PNG/CSV/PDF e handoff para Claude Motion (D10).
- Persistência de qualquer tipo, inclusive localStorage e links compartilháveis.
- Autenticação, backend, API, banco, telemetria de conteúdo e colaboração.
- Suporte genérico a qualquer planilha: o produto atende à planilha-modelo (D2).
- Gráficos ou KPIs inferidos automaticamente, previsões e IA.
- Edição da planilha ou dos dados.

## 5. Pessoas e contexto

| Pessoa | Necessidade |
|---|---|
| Direção | Ver rápido cenário, tendência, gargalos e o que exige decisão. |
| Coordenações | Recortar por área, comparar e explicar variações. |
| Facilitadora | Importar a planilha da semana em minutos e conduzir filtros e navegação ao vivo. |
| Líder | Aprova escopo, métricas e layout. Também é dono das definições de negócio pendentes (§8). |

**Cenário:** computador ligado a uma TV ou tela grande (às vezes projetor). A facilitadora abre o painel, importa a planilha da semana e conduz a reunião. Fechar a aba descarta tudo.

## 6. Fluxos

### 6.1 Importar
1. Estado vazio com área de upload e orientação.
2. A pessoa seleciona ou arrasta um `.xlsx`.
3. Leitura local de todas as abas, com status por aba (ok, aviso, vazia, não reconhecida).
4. As abas com conteúdo entram na barra de navegação. Abas auxiliares ou sem layout podem ser ocultadas.
5. Como a planilha chega validada (D18), não há etapa de mapeamento nem diagnóstico por aba. Se o arquivo escolhido não for a planilha da reunião, aparece uma mensagem simples pedindo o arquivo certo.

### 6.2 Conduzir a reunião
1. A tela única mostra a barra de abas e o dashboard fixo da aba selecionada.
2. A pessoa aplica filtros da aba; cartões, gráficos e tabela refletem o recorte; os chips mostram o que está ativo.
3. Tooltip, legenda e realce respondem às perguntas pontuais. Séries podem ser ocultadas.
4. A tabela de detalhe permite escolher colunas visíveis.
5. "Limpar filtros" volta ao estado inicial da aba.

### 6.3 Trocar ou limpar arquivo
"Substituir planilha" ou "limpar sessão", com confirmação só quando há filtros ou estado que serão perdidos. Tudo é descartado da memória.

## 7. Requisitos funcionais (MVP)

- Aceitar só `.xlsx`, com uma mensagem simples se o arquivo não for a planilha da reunião.
- Ler o arquivo no dispositivo, sem nenhuma requisição de rede com os dados.
- Carregar todas as abas com conteúdo e preservar o nome de origem.
- Ler cada aba conforme o **contrato da planilha-modelo**, que vive no código e é tipado. A planilha já chega validada (D18).
- Normalizar texto, número, data e vazio. Mostrar ausente como ausente, nunca como zero.
- Ter um painel específico por aba conhecida (registrado no código) e, nas abas sem painel, o **modo automático** (D25): KPIs e gráficos a partir dos tipos de coluna, com a tabela de detalhe embaixo.
- Filtros por aba, só em dimensões aprovadas no contrato, com busca e multisseleção quando fizer sentido, chips removíveis e "limpar filtros".
- Ocultar e mostrar séries sem alterar o conjunto de dados nem os totais.
- Ocultar e reexibir abas da navegação.
- Escolher as colunas visíveis na tabela de detalhe.
- Estados de carregando, vazio, erro e dados insuficientes em cada área.

### Pós-MVP (só se validado)
Construtor de cartões; renomear e reordenar abas; persistência local de preferências; exportação PNG/CSV; handoff para Claude Motion; filtro de período global; modo tela cheia.

## 8. Pendências com o Líder (bloqueiam o produto, não o protótipo)

1. **A planilha real**, ou uma cópia anonimizada com estrutura idêntica: abas, linha de cabeçalho, colunas, tipos, mesclagens e fórmulas.
2. **O que a planilha acompanha:** indicadores, projetos/atividades ou os dois (D3)?
3. **Métricas e perguntas:** que pergunta de reunião cada gráfico responde? Quais são as fórmulas, metas e comparativos?
4. **Definições:** backlog, atraso, concluído, janela de 1–2 meses e semana de corte.
5. **Filtros:** quais dimensões filtram cada aba?
6. **Layout:** fica no código (tendência) ou é gerado automaticamente (D5)?
7. **Hospedagem:** Vercel protegida, intranet ou arquivo local (D11)?
8. **Volume:** linhas e abas no pior caso, que definem os limites de arquivo e se é preciso Web Worker.
9. **Marca:** logo, cor principal e fonte (D12).
10. **Aprovação** do escopo enxuto deste PRD e do protótipo.

## 9. Experiência visual

- **Tom:** executivo, contemporâneo e calmo. Os dados vêm antes da decoração.
- **Estrutura:** cabeçalho compacto (arquivo, aba, momento da importação); barra de abas; faixa de filtros com chips; cartões-resumo; um gráfico principal mais complementares menores; tabela de detalhe recolhível.
- **Hierarquia:** uma visualização principal por aba. Nada de "muro de gráficos".
- **Cores:** base neutra clara para projeção; a cor da Asten só como acento; paleta de séries curta, acessível e consistente (mesma série, mesma cor). Cor nunca é o único canal de informação.
- **Legibilidade em projeção:** tipografia e alvos de clique generosos; escala, unidade e período sempre visíveis.
- **Confiança:** sempre visíveis a origem (arquivo e aba), os avisos de qualidade e os valores ausentes.

## 10. Acessibilidade

Teclado em upload, abas, filtros, legenda e tabela; rótulos acessíveis; erros associados aos controles; contraste WCAG AA; alternativa textual ou tabela para cada gráfico; respeito a `prefers-reduced-motion`.

## 11. Requisitos não funcionais

- **Privacidade:** processamento estritamente local; nenhum log ou telemetria com conteúdo.
- **Desempenho:** filtro responsivo. Os limites são medidos com o arquivo real (§8.8), e Web Worker só entra se a medição pedir.
- **Compatibilidade:** Chrome, Edge, Firefox e Safari recentes, em desktop e projeção.
- **Robustez:** a planilha chega validada (D18). Basta não travar e avisar de forma simples se o arquivo escolhido for outro.
- **Manutenibilidade:** módulos separados para ingestão, contrato e modelo normalizado, filtros, agregações, configuração de layout e componentes visuais. Nenhuma métrica fica embutida em componente de gráfico.
- **Build:** estático e agnóstico de host (D11).

## 12. Arquitetura (provisória)

```text
.xlsx local
   ↓
Leitor (só leitura, sem fórmulas/macros/HTML) → abas brutas
   ↓
Contrato da planilha-modelo (por aba) → modelo normalizado + avisos
   ↓
Filtros por aba (estado serializável) → seletores/agregações puros
   ↓
Registro de painéis: painel específico da aba, ou motor automático (D25) → KPIs e gráficos
   ↓
Tela (modo apresentação, Motion) → cartões, gráficos, tabela
```

Tudo fica na memória da página. Trocar de arquivo reinicia a sessão. A fronteira entre leitor e contrato permite adaptar a planilha real sem reescrever os gráficos.

## 13. Stack e protótipo

**Stack aprovada (D13):** React 19 + TypeScript + Vite 8 · shadcn/ui (Radix, Tailwind v4) · Recharts 3 via shadcn charts · TanStack Table · SheetJS CE ≥ 0.20.3 pelo CDN oficial, nunca o `xlsx` do npm · Motion 13.4.4 para animação (D26) · Vitest + Playwright · estado local com seletores puros. ECharts é o plano B para gráficos. Comparação e fontes em `docs/comparacao-stack.md`.

O protótipo descartável (D15) fica na branch `prototipo`, pasta `prototype/`, usa essa stack e dados **fictícios marcados como tal**, e cobre as duas hipóteses de conteúdo:

- aba **"Indicadores"**: meta vs. realizado por mês e área;
- aba **"Projetos"**: status, prazo, % de conclusão e atrasos;

com filtros por aba, ocultar aba, escolher colunas e estados vazio/erro. Ele serve para o Líder reagir ao visual e à interação. **Não é código de produto** e não define métricas reais.

## 14. Privacidade

- A planilha chega validada e consolidada (D18); o painel só lê os valores, sem executar fórmulas ou macros, e mostra células como texto, que é o comportamento padrão das bibliotecas escolhidas.
- Nenhum log de células ou nomes.
- Nenhuma planilha real entra no repositório, em snapshots, URLs ou mensagens de erro.

## 15. Critérios de aceite do MVP

- Importar um `.xlsx` carrega todas as abas com conteúdo localmente, sem tráfego de dados.
- Todas as abas aparecem numa única tela, cada uma com sua origem clara, e podem ser ocultadas e reexibidas.
- Um arquivo que não é a planilha da reunião gera uma mensagem simples, sem quebrar a interface.
- Cada aba conhecida abre com o dashboard fixo acordado: título, unidade, período, legenda e estado sem dados.
- Alterar um filtro atualiza tudo o que depende dele na aba; os filtros ativos ficam visíveis; "limpar" restaura o estado inicial.
- Ocultar uma série não corrompe filtros nem totais.
- A tabela de detalhe permite escolher colunas visíveis.
- O que é essencial funciona por teclado e não depende só de cor ou tooltip.
- Há testes automatizados de leitura e contrato, filtros e agregações, e o fluxo de importação é verificado no navegador.
- Há revisão visual em resolução de projeção e numa largura menor, com dados fictícios ou anonimizados.
- O Líder aprova.

## 16. Referências

Ver `docs/comparacao-stack.md` para versões, licenças e fontes verificadas em 13/10/2026. Claude Motion: [Help Center](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion), registrado como ideia pós-MVP.
