# PRD — Painel de análise de planilhas (Asten)

**Versão:** v4, 16/10/2026. Alinha o PRD ao modelo de posição do mês (D63–D77, fase 2F do plano). A v3.1 está no histórico do Git.
**Status:** produção (https://dash-asten.vercel.app) ainda na versão da apresentação de 14/10 (MVP com reconstrução pelas datas). Na `staging`, o modelo de posição do mês: Painel em página única de três faixas, Leituras e Comparar (2 a 6 competências ou versões), sem login (D52). Vai para produção depois da conferência à mão do responsável (D74). Pendências com o Líder no §8.
**Escopo:** app web interno para conduzir as reuniões das coordenações da Asten, exibido em TV, a partir de planilhas `.xlsx` carregadas por competência.

## 0. Decisões (grilling 13/10 e revisões seguintes)

| # | Tema | Decisão |
|---|---|---|
| D1 | Por que construir | Ferramentas como Power BI, Looker Studio e Excel projetado foram descartadas por dois motivos: **privacidade** (a planilha não pode sair da máquina) e **UX de reunião** (essas ferramentas não servem para conduzir uma conversa projetada). ~~a planilha não pode sair da máquina~~ — **revisto por D37/D45**: para guardar e comparar o passado entre máquinas, as cargas vão para o banco do app (Neon), atrás de login (D38). A UX de reunião continua sendo o motivo central. |
| D2 | Estrutura da planilha | **Mesma estrutura toda semana**, só os dados mudam. O produto é um painel para *essa* planilha-modelo, não um BI genérico. |
| D3 | Planilha real | **Ainda não existe** amostra. O conteúdo provável mistura **indicadores** (meta vs. realizado) e **projetos/atividades** (status, prazo, % de conclusão). Nem o usuário nem o Líder têm certeza ainda. |
| D4 | Edição do dashboard | **Edição rara.** O MVP traz **só filtros**. Construtor de cartões (adicionar, remover, configurar, redimensionar) fica para depois. Prioridade: bonito, funcional e simples de usar. |
| D5 | Layout | **Dashboard fixo por aba.** A forma ainda depende do Líder, mas tende a ser **configuração declarativa no código**. Se a aba não tem layout definido, aparece a tabela de detalhe e um aviso. Nenhum gráfico é inferido por heurística. |
| D6 | Filtros | **Tudo por aba.** Nenhum filtro atravessa abas, nem o de período. |
| D7 | Gestão de abas | Fica **ocultar/reexibir abas**. Renomear e reordenar estão **cortados**; nome e ordem vêm da planilha. |
| D8 | Foco nos dados | O usuário **escolhe quais colunas aparecem** na tabela de detalhe. Não há tela de mapeamento técnico (ver D18). |
| D9 | Dados sensíveis | **Sem máscara automática.** O layout decide o que aparece. ~~Nada persiste~~ — revisto pela D29: as cargas ficam guardadas para o histórico (hoje no próprio navegador); "Limpar" passa a oferecer apagar o histórico deste navegador. |
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
| D27 | Deploy de teste | Revisa D11/D24 só para teste: projeto Vercel `g0mes/dash-asten`, publicado pela CLI depois do CI verde, ~~acesso aberto sem login~~ — **revisto por D38**: o app passou a guardar as cargas no banco (D37) e exige login. Link: https://dash-asten.vercel.app (ver `docs/acesso-teste.md`). Deploy automático a cada push depende de instalar o app da Vercel no GitHub. A hospedagem definitiva continua com o Líder. |
| D28 | Competência | Cada carga é feita **por competência** (mês/ano de análise), amarrada à massa de dados. Após escolher o arquivo, um passo pede tipo + competência, pré-preenchida pelo nome da aba/arquivo (ex.: "Setembro" → 09/2026) ou, sem pista, pelo mês anterior; a pessoa confirma. Recarregar o mesmo tipo + competência gera **nova versão**; as anteriores ficam acessíveis e a mais recente é a padrão. |
| D29 | Histórico de cargas | Toda carga fica guardada (tipo, competência, versão, data da carga, arquivo, dados normalizados) para revisitar e comparar. Revisa D9/§4 (sem persistência). **Fechado pela D37** (banco na nuvem com login). O código acessa o armazenamento por uma interface única; o adaptador IndexedDB ficou para testes e uso offline. |
| D30 | Tipos de conjunto | **Registro de tipos no código**: cada tipo tem nome, colunas que o identificam e painel próprio. O app reconhece o tipo pelas colunas e a pessoa confirma. Primeiro tipo: **Chamados/OS** (planilha do Líder, "ainda não definitiva, mas nessa linha"). Sem tipo reconhecido → "Outro", com o modo automático (D25). Formato em teste; pode mudar. |
| D31 | Painel de Chamados | Definições provisórias até validação do Líder, sobre o mês da competência: **backlog aberto** (Situação ≠ Finalizado); **entradas** (Data Abertura no mês); **saídas** (Data de Solução no mês); **% no SLA** (solucionados no mês com SLA: Data de Solução ≤ SLA Renegociado, senão SLA Previsto); **em atraso** (abertos com Tempo em Atraso > 0); **sem SLA** (abertos sem SLA); **distribuição** do backlog por Cliente, Área Superior, Atividade e Situação; **envelhecimento** do backlog (0–30, 31–90, 91–180, >180 dias da abertura ao fim da competência); **tempo médio de resolução** e **% reabertos** (entre os solucionados no mês); **aguardando aceite** (Situação contém "aceite"). |
| D32 | Passado e comparativo | Seletor de competência e versão; KPIs com variação vs competência anterior; **tela de comparação** lado a lado entre duas competências; **evolução** de cada KPI ao longo das competências carregadas. |
| D33 | Branches | Desenvolvimento a partir da `staging`, testado localmente; vai para a `main` (CI + produção) só quando aprovado. **Revisto 14/10 (D44):** nada de push direto em `staging` nem `main`. |
| D34 | Corte da competência | **Nenhum chamado é excluído**: todas as linhas ficam presentes e tratadas. Cada linha ganha a classificação **"Situação na competência"** (aberto no fim do mês · resolvido no mês · resolvido antes do mês · aberto após a competência). Os KPIs do mês refletem **como estava no último dia da competência**, reconstruído pelas datas (backlog = aberto até o fim do mês e sem solução até lá; atraso = SLA vigente vencido antes do fim do mês sem solução até lá); os abertos depois do fim do mês aparecem num KPI próprio, "Abertos após a competência". A Situação original da planilha fica na tabela como "Situação atual (na exportação)". KPIs que dependem de colunas da data da exportação (aguardando aceite, reabertos, SLA renegociado) só são comparáveis entre competências que tenham carga própria. "Aguardando aceite" conta como aberto. **Pendente de validação do Líder.** |
| D35 | Leituras estratégicas | Além dos números, cada competência ganha **"Leituras do mês"** (2 a 4 cartões entre os KPIs e o gráfico principal), geradas por regras com limite numérico, cada uma com a conclusão, os números que a sustentam e um link que filtra a tabela: (1) **fluxo** — saídas ≥ 1,5× entradas com backlog caindo → "mês de redução de estoque"; com tempo médio subindo junto → "fechou chamados antigos" (explica SLA em queda); (2) **concentração** — um cliente com ≥ 40% do backlog, e quantos dele têm > 180 dias; (3) **envelhecimento** — > 25% do backlog com mais de 180 dias; (4) **gargalo no cliente** — aguardando aceite ≥ 30% do backlog; (5) **sem SLA** — ≥ 20% do backlog sem SLA. **Sem projeção** de quando o backlog zera; só tendência. Limites provisórios até o Líder. |
| D36 | Sem tabela de dados soltos | O painel **não mostra a tabela de linhas brutas**: só KPIs, gráficos e leituras, para uso estratégico nas reuniões das coordenações. Revisa D8 (escolher colunas) e o "link para a tabela" da D35 (os filtros das leituras passam a destacar KPIs/gráficos). Se algum detalhe for importante, vira gráfico ou KPI. Todos os dados continuam presentes no cálculo (D34). |
| D37 | Persistência em banco | Fecha a D29: histórico de cargas num **banco Postgres (Neon, via Vercel Marketplace)**, compartilhado entre máquinas. Tabela `cargas` (id, tipo, competência, versão, importada_em, arquivo, linhas, dados normalizados em JSONB), versão atribuída no servidor com unicidade (tipo, competência, versão). API em Vercel Functions (`/api/cargas`). O adaptador IndexedDB fica só para testes/offline. Ambientes separados por **schema Postgres** no mesmo banco (`public` = produção; `staging` = preview e local), via `DB_SCHEMA`; ids **CUID2**; esquema e migrações com **Prisma 7** (nada de SQL à mão). Dev local com `vercel dev` (porta 3000). |
| D38 | Autenticação | **Tela de login própria** (logo + card com usuário e senha + "lembrar login"), com **usuário e senha únicos do time** (variáveis secretas na Vercel). Login gera um token assinado (HMAC) em cookie HttpOnly/Secure/SameSite=Lax: com "lembrar", vale **14 dias**; sem, termina ao fechar o navegador. A chave de assinatura deriva do segredo + usuário + senha, então **trocar o login ou a senha invalida todos os tokens** e força a volta à tela de login. A API (onde estão os dados) é protegida em duas camadas: o roteador da API confere a sessão antes de qualquer rota privada e cada handler confere de novo (o Routing Middleware saiu na D46). A casca estática do app é pública (não contém dados). Revisa D27. Contas individuais ficam para depois. |
| D39 | Filtros no painel de Chamados | Os filtros (D6) valem também para Chamados: Cliente, Área Superior, Área, Atividade, Severidade, Operador e Situação na competência. O filtro recorta as linhas **antes** do cálculo, então KPIs, deltas, leituras, gráficos, Comparação e Evolução refletem o recorte. Tecla F, painel lateral, chips sempre visíveis e "Limpar filtros"; o filtro persiste entre visões e competências do mesmo tipo. |
| D40 | Leituras em visão própria | "Leituras do mês" ficam numa **visão própria** (Painel · Comparar · Evolução · Leituras; atalho L). Cada leitura abre o detalhe num **modal** (regra e limite, números, mini-gráfico de evidência, ação), sem navegar nem rolar a página. No Painel, só um indicador discreto que leva às Leituras. Revisa a posição da D35. |
| D41 | Dado derivado sempre sinalizado | Todo número que **não é dado original puro** leva um selo claro com ícone e texto, igual em todas as visões, nunca só cor nem só tooltip: reconstruído pelas datas, calculado sobre colunas da data da exportação, classificação derivada (Situação na competência) e agrupamento "Outros". Na Evolução, pontos reconstruídos ficam vazados ou tracejados, com legenda. |
| D42 | Conferência independente | Antes de dar um número como certo, ele é **conferido por um cálculo independente** do motor do app (feito do zero sobre a planilha) e as diferenças são explicadas. Não presumir. |
| D43 | Barra auto-ocultável | Revisa a D20: a barra superior fica **escondida por padrão** (aparece 3 s ao abrir), **sobreposta** ao conteúdo (não reserva espaço; sai inteira para cima). Aparece quando o mouse chega na faixa dela no topo e some 0,8 s depois que ele sai. **H fixa** a barra (H de novo solta). Menus abertos e foco de teclado dentro dela também a mostram. Filtros ativos continuam visíveis como chips. |
| D44 | Fluxo de Git | Trabalho numa branch própria (push livre) → **PR para a `staging`** → PR `staging` → `main`. **Nunca push direto** em `staging` nem em `main`. Deploy de produção só depois do CI verde na `main`. |
| D45 | Requisito original revisto | O pedido original dizia "sem autenticação, base de dados, nem nada". O requisito seguinte, **guardar o passado carregado para revisitar e comparar**, junto com o uso por várias máquinas (TV, notebooks), levou ao banco (D37) e, por consequência, ao login (D38). Fica registrado como revisão consciente do pedido original. **14/10: aprovado pelo responsável para o MVP de testes**; o produto definitivo, que vem depois da validação, reavalia banco, login e hospedagem. |
| D46 | Desempenho da abertura | Abrir o app com cargas salvas levava **~8 s** na Vercel. Medição (14/10): índices não são o gargalo (leitura por chave primária, tabela pequena); a rede em série (sessão → lista → carga) soma 2–3 s quente e **6,1 s a frio** (sessão 2,3 s sem nem tocar o banco: cada função e o middleware acordam separados). Correção: **API numa função só** com a checagem de login dentro dela (substitui o Routing Middleware da D38, que era mais uma partida a frio por chamada); carga com **cache permanente** no navegador (versão nunca muda); abertura sem a chamada separada de sessão; cargas já baixadas reaproveitadas entre Painel, Comparar e Evolução, com pré-carga e estado de carregamento. Meta: abrir a frio em ~3 s. |
| D47 | Histórico: Enviados e Geral | O histórico ganha **duas abas**. **Enviados**: as cargas enviadas por este navegador (o login é único do time, então "meu" = deste navegador até existirem contas individuais), com **"Limpar"**, que só tira da lista de Enviados (soft delete local; nada sai do banco). **Geral**: todas as cargas, **sem limpar**, com **busca** por nome do arquivo, competência, data da carga, tipo e versão. Hard delete fica para depois, se vier. |
| D48 | Evolução em 6 competências | A Evolução mostra **exatamente as 6 competências mais recentes** (próprias + reconstruídas), coerente com o foco em curto prazo (R4). Confirmado pelo responsável em 14/10. |
| D49 | Séries na legenda | R6: legenda clicável liga/desliga séries nos gráficos com 2+ séries (Evolução e Comparar), sem mudar dados, totais nem filtros; a última série visível não some; o estado volta ao padrão ao trocar de competência. |
| D50 | Regras provisórias no MVP | D31, D34 e D35 seguem como estão; o Líder confirma ou corrige pela lista "Para validar" do artifact. Sem predição: as leituras só descrevem o mês (D35). |
| D51 | De onde vem cada mês | Mês com carga própria usa sempre a **própria (versão mais recente)**; nunca reconstrói por cima. Mês sem carga **antes da primeira** é reconstruído pela planilha mais antiga; mês sem carga **no meio** (ex.: jul e set carregados, ago não) é reconstruído pela planilha da **carga seguinte**, a exportação mais próxima depois dele. Reconstruídos sempre com selo e tracejado (D41), na Evolução (6 competências de calendário, sem buracos) e como opção no Comparar. Decidido pelo responsável em 14/10. |
| D52 | Login desligado no MVP | 14/10, pedido do responsável: o login fica **no código mas desligado** até a aprovação. Servidor: `LOGIN_DESATIVADO=1` faz toda requisição contar como sessão válida (`api/_lib/auth.ts`); app: `VITE_LOGIN=desativado` esconde o botão "Sair". Religar = remover as duas variáveis na Vercel e publicar. Risco aceito: quem tiver o link vê e altera as cargas. Banco de staging limpo (14 versões de teste apagadas pela API); produção começa vazia. |
| D53 | Abertura no envio | O app abre **sempre na tela de envio**, com a lista do que já existe para abrir; não baixa nenhuma carga até a pessoa escolher. Cargas do mesmo tipo + competência formam **um grupo** com a versão mais recente por cima e as anteriores recolhidas (tela de envio, Histórico Geral e Enviados). Botão "Sair" na barra quando o login estiver em uso. Revisa a abertura da D28 ("abre na competência mais recente"). |
| D54 | Comparar 2 a 6 competências | Revisa a D32: o Comparar aceita de **2 a 6 competências**. Colunas em ordem cronológica; **uma coluna Δ no fim = última − primeira**; cada célula ganha uma setinha discreta vs a coluna anterior (sem número). As Leituras do Comparar comparam a mais recente com a anterior a ela e são **clicáveis**, abrindo o mesmo detalhe da visão Leituras (D40). Decidido pelo responsável em 14/10. |
| D55 | Nova carga em modal | O botão "Nova carga" abre um modal com a mesma área de arrastar e soltar da tela inicial ("Escolher arquivo" continua como alternativa). Arrastar um arquivo sobre a janela, com o painel aberto, também abre o modal. |
| D56 | Envio em lote | Até **12 planilhas** de uma vez (soltar ou escolher várias). Com 2 ou mais, a confirmação vira uma **tabela, uma linha por arquivo**, com tipo e competência sugeridos e editáveis, aviso de versão quando o mês se repete e de tipo "Outro"; dá para tirar uma linha. "Confirmar N cargas" envia **um por vez**, com estado por linha; falha numa linha não para as outras e pode ser repetida. No fim, abre a competência mais recente do lote. Com 1 arquivo, o fluxo é o de sempre. |
| D57 | Competência reconhecida em todas as formas | Revisa a sugestão da D28: o app procura o mês no nome da aba, no nome do arquivo, nos títulos e cabeçalhos da planilha e, por fim, **nas datas das linhas** (mês mais recente com volume significativo da coluna de evento, ignorando datas futuras como SLA), sem a trava "só mês atual ou anterior". Reconhece mês por extenso e abreviado (pt-BR e inglês), junto ou separado do ano (`set/26`, `SET26`, `setembro2026`), número + ano (`2026-09`, `09/2026`, `202609`) e datas completas em vários formatos (`30/09/2026`, `2026-09-30`, `30-set-2026`, `30 de setembro de 2026`, data do Excel). A pessoa sempre confirma. |
| D58 | Nome, correção e arquivamento de cargas | Cada carga pode ter um **nome** (opcional, até 80 caracteres). O campo só aparece quando a carga vira **versão 2 ou mais** do mesmo mês, já preenchido com o nome do arquivo, para não atrasar o caso comum. No Histórico: **editar** nome, tipo e competência de uma carga já enviada (mudar tipo/mês faz dela a versão seguinte do destino) e **arquivar**/restaurar. Arquivar é soft delete para todos: some de listas, seletor, Comparar e Evolução, aparece em "Mostrar arquivadas", nada é apagado. Banco: colunas opcionais `nome` e `arquivada_em` (migração 0003, Prisma); API `PATCH /api/cargas/:id`. |
| D59 | Lista viva e seletor por tipo | A lista de cargas se atualiza ao voltar para a aba (no máximo a cada 30 s), depois de enviar e depois de editar; carga apagada ou arquivada por outra pessoa some, e se for a aberta o app avisa e volta ao envio. O seletor de competência mostra só cargas do tipo aberto, com versão e nome; outros tipos aparecem rotulados. Sugestão de mês pelas datas conta eventos de abertura **e** solução, para não descartar mês legítimo com poucas entradas. |
| D60 | Uso na TV e envio sem atrito | Soltar arquivos em **qualquer ponto da tela** (overlay de página inteira), não só na caixa. Aviso ao fechar a aba durante um envio; indicador ao abrir uma carga. **Tela cheia** (botão e tecla T). O navegador lembra a última visão e carga ("Abrir a última"). A barra não cobre os chips de filtro. |
| D61 | Planilha de Chamados com estrutura nova | 14/10: a exportação ganhou **Mes Ref., Hora Abertura, Tipo, Autarquia, Data e Situação da Última Reabertura, Observação** e perdeu **Atividade**; o app já a reconhecia (5/5 colunas de reconhecimento). Decidido pelo responsável: (1) **backlog segue pelas datas (D34)**, também para reabertos: chamado com Data da Última Reabertura posterior à Data de Solução e Situação diferente de Finalizado continua resolvido no mês da solução, e o painel mostra um **aviso com a contagem** desses casos. Contar o reaberto como aberto foi descartado, porque só valeria para cargas com a coluna e faria o backlog "subir" no Comparar/Evolução sem piora real. (2) **Autarquia e Tipo** viram filtros (D39); vazio = "(sem informação)". (3) Filtro ativo numa carga **sem a coluna** mostra "—" com aviso, não zero (Comparar, Evolução e painel). Hora Abertura, Situação da Última Reabertura, Observação e Mes Ref. seguem só como colunas da planilha. |
| D62 | Transições e carregamento | 15/10, varredura de UI pedida pelo responsável (refina D26 e D60). **Esqueleto com o formato de cada aba** (painel, leituras, comparar, evolução), da lista de cargas e da verificação de sessão, com cor própria (`--skeleton`) visível na TV; nas telas sem fade cruzado ele só aparece após ~120 ms, para não piscar com cache. **O conteúdo real entra animado mesmo chegando depois do esqueleto** (a entrada é travada na montagem da aba). Troca de aba e de competência: **com os dados em cache não há esqueleto** (`espiarCarga` em `comCache` e os hooks de chamados já montam com os dados no 1º render); o conteúdo antigo fica na tela enquanto o novo renderiza (`useDeferredValue`, render interrompível) e o indicador da aba responde na hora; a entrada dura 150 ms partindo de 0,3 de opacidade, só na primeira visita. Sem cache ou com conexão lenta, o esqueleto do painel cobre a espera (sem tela vazia). **Nada empurra o conteúdo:** a tela de envio é alinhada pelo topo, o aviso de erro fica sobreposto e a barra segurada pela gaveta de Filtros fica sobreposta; só a barra fixada por **H** reserva espaço (revisa a D60 nesse ponto: com a gaveta aberta, a barra pode cobrir os chips, que a gaveta já mostra). Avisos do canto em pilha com fade, overlays com 150 ms de entrada e 100 ms de saída na curva standard, `MotionConfig` global com `reducedMotion="user"`. `VITE_ATRASO_MS` atrasa as leituras só no dev server, para ver os estados de espera. |
| D63 | Carga = foto da empresa no Mes Ref. | 15/10, pós-reunião com o Líder (doc "Pós-reunião MVP — decisões e verificações"). Cada planilha é uma **foto** da base de chamados no Mes Ref. (coluna da planilha), com o estado daquele momento e todo o histórico anterior. A **competência vem da coluna Mes Ref.**, pré-preenchida e editável no envio (revisa D28/D57). Acaba a reconstrução de meses pelas datas (**revoga D51**). As datas vêm do sistema e são confiáveis; o que não se faz mais é deduzir estado por elas. |
| D64 | Nada é backlog; cada Situação como ela é | Revoga a regra de backlog da D34 e o vocabulário "backlog" no app. **Não finalizado** = Situação ≠ Finalizado; nada é agrupado por conta própria. Topo do Painel: total da foto + **um card por Situação** (nome e contagem literais; situação nova vira card). **Em atraso** (ciclo = Mes Ref., confirmado pelo Líder): não finalizado aberto antes do mês do Mes Ref., com faixas 1, 2–3, 4–6, 7+ meses; **SLA vencido** à parte (não finalizado com SLA vigente vencido). KPIs: Entradas no mês, Finalizados no mês (Situação Finalizado **e** Data de Solução no mês; Data de Solução sem Situação Finalizado não conta), Em atraso, SLA vencido, % no SLA, Tempo médio de resolução, Tempo até o aceite, % reabertos, Sem SLA, SLA renegociado, Aguardando aceite; saem Backlog aberto e Abertos após. Chamados abertos **depois** do mês do Mes Ref. (foto exportada mais tarde) não entram nos números do mês: ficam numa nota "N abertos depois do Mes Ref.", sem excluir linha (D34). Gráficos por Cliente, Área e Operador: **finalizados no mês × não finalizados**, com toggle no card para "finalizados no período" (confirmado pelo Líder). |
| D65 | Comparar o Mes Ref. com qualquer período | Painel = foto do Mes Ref. com Δ contra **1 período escolhido** num seletor "comparar com" (mês anterior, N meses, outra versão). Aba Comparar = 2 a 6 períodos ou versões lado a lado. O período anterior vem **da foto daquele mês, corrigida pela foto mais atual**. A correção só vem de fotos com **Mes Ref. posterior** (versões do mesmo mês nunca se corrigem: a versão escolhida aparece como está) e vale tanto para a foto aberta no Painel quanto para o período comparado. Cruza por Código; um chamado que a foto mais nova mostra Finalizado com Data de Solução até o fim daquele mês passa a contar como finalizado lá; outras mudanças de situação, que não têm data, não são corrigidas; chamados que não estavam na foto antiga não são acrescentados. Valor corrigido ganha marca discreta ("corrigido pela foto de out/26, era 30") só quando mudou. **Mês sem foto** mostra só o que as datas dão (entradas e finalizados, tirados da foto mais atual); o que depende de Situação fica "—". A Evolução segue a mesma regra. |
| D66 | Versões e arquivamento | No Comparar, o seletor de cada coluna desdobra as versões quando o mês tem 2 ou mais ("Setembro de 2026 · v2 (atual)", "· v1"); padrão = atual. No Histórico, mês com 2+ versões ganha o atalho "comparar versões". Painel e "comparar com" usam a versão atual. Excluir continua sendo **só arquivar** (D58). |
| D67 | Responsividade em todas as telas | Na reunião, numa TV 4K ultrawide curva, o conteúdo ficou centralizado com laterais vazias e exigiu zoom de 150%+. O app usa a largura disponível (sem teto fixo de 1760 px), escala texto e números para leitura à distância e reorganiza a grade por largura. Conferido em 1366×768, 1920×1080, 2560×1440, 3440×1440 e 3840×2160. |
| D68 | Painel e Evolução numa página só | 15/10, segundo grilling (decisões 23–27 do doc pós-reunião). O Painel tem **três blocos**: (1) **topo** numa faixa única com o total da posição, a barra empilhada por Situação (contagem e Δ na legenda) e os KPIs; (2) **No mês**, com **um seletor "Comparar com" para a página toda** (vale para KPIs, faixa, gráficos e cruzamentos; escolhe mês ou versão; o botão "comparar período" continua no card) e os cruzamentos **Cliente × Situação, Operador × Atraso, Área × SLA e Cliente × Tempo médio**; (3) **Ao longo do tempo**, bloco compacto (não finalizados por situação, entradas × finalizados, em atraso + SLA vencido, % no SLA, tempo médio, por operador e por cliente; 6 ou 12 meses). A **aba Evolução sai** (e o atalho E). O Painel faz comparação simples 1:1; a **aba Comparar** fica para 3 ou mais competências ou versões. "+ adicionar gráfico" fica para o futuro (só a lista de configuração, sem tela). |
| D69 | "Posição do mês" no lugar de "foto" | 15/10, pedido do responsável: todo texto visível chama a planilha de **posição do mês** ("sem posição de set/26", "corrigido por posição posterior"). Identificadores internos do código podem continuar com "foto". Refina a linguagem da D63–D66. |
| D70 | Exclusão definitiva liberada na fase de testes | 15/10, pedido explícito do responsável, para limpar o banco durante os testes: sem `ADMIN_TOKEN` no ambiente, `DELETE /api/cargas/:id` funciona sem chave. Para travar depois, basta configurar `ADMIN_TOKEN` (24 ou mais caracteres): aí só passa quem mandar `X-Admin-Token` igual. No app, excluir continua sendo arquivar (D58/D66). **Travar (configurar `ADMIN_TOKEN` na Vercel) antes da primeira planilha real**, decidido em 15/10; a produção pode subir liberada enquanto o banco só tiver dados de teste. |
| D71 | Aceite manda na correção entre posições | 15/10, decidido pelo responsável. Refina a D65 (a correção de meses antigos pelas posições mais novas): o chamado conta como Finalizado **a partir do mês do aceite**. Na posição mais nova, Data de Aceite preenchida corrige o mês antigo só se for até o fim dele; sem Data de Aceite, quem estava "Aguardando aceite" no mês antigo não é corrigido (a posição daquele mês estava certa); as demais situações seguem corrigidas pela Data de Solução (lançamento atrasado). Assim o "Aguardando aceite" não zera retroativamente e nada fica no aceite para sempre. |
| D72 | Acabamento visual sem simplificar | 15/10, pedido do responsável depois de ver a página única (D68): o conteúdo fica todo (nenhum KPI, gráfico ou bloco sai); muda o acabamento. Δ dos KPIs em **selo colorido com seta e valor, seguido do período em cinza** ("[↓ −16,7 p.p.] abr/26 v1"), sem "vs", "·" nem "pior/melhor" visíveis (vão no `aria-label`). Pontos e "·" só separam itens sem valor; legenda com valores ganha estrutura. "Sem base no mês anterior" aparece uma vez, junto do seletor. Gráficos escolhidos numa prancha: **"No mês" com barras refinadas** (duas por categoria, arredondadas, mês comparado como contorno tracejado atrás com o valor em cinza), **"Ao longo do tempo" com área em gradiente** (linha suave, degradê embaixo, destaque só no último mês; o ponto vazado de "corrigido" continua), **paleta Marca** (azul petróleo para finalizados, laranja da marca para não finalizados) e **espaço médio** (8 px entre barras, 24 px entre categorias). Efeito de vidro descartado (não serve para apresentação). Animações suaves em todas as partes, inclusive ao trocar o "Comparar com". Depois de aprovado no Painel, o mesmo padrão vai para Comparar e Leituras. |
| D73 | Seletor começa na primeira carga | 15/10, decidido pelo responsável. Os seletores de comparação (Painel e aba Comparar) listam meses só a partir da carga mais antiga; meses sem posição entre duas cargas continuam (só entradas e finalizados). Antes, o limite era a abertura mais antiga da posição mais atual, o que listava meses como set/25 "(sem posição)" e confundia. |
| D74 | Ordem de fechamento e fora do ciclo | 15/10. A nova versão vai para produção **depois da conferência à mão do responsável na staging** (4 planilhas de teste), por PR staging→main que ele mergeia; deploy com CI verde, banco de produção vazio. Antes: responsividade conferida em 1366, 1920, 2560, 3440 e 3840 (com escala maior na 4K ultrawide se preciso) e medição com 12 posições sintéticas (abrir o Painel e trocar o "Comparar com" abaixo de 1 s). **Nada entra sem pedido explícito**: login (Better Auth), "+ adicionar gráfico" e o próximo conjunto de dados. Pendente com o Líder: a planilha modelo diz "ciclo Setembro" na aba e out/26 no Mes Ref.; até a resposta, vale o Mes Ref. (editável no envio). |
| D75 | Redesenho do Painel por boas práticas | 15/10, depois de uma pesquisa de boas práticas de dashboards e gráficos (`notas-sessao/pesquisa-dashboard.md`, fora do repo, com o link de cada fonte) e de uma prancha de opções. Refina a D68 (página única) e a D72 (acabamento). O responsável escolheu: (1) **página em três faixas com título-pergunta** ("Como estamos?", "Onde está o problema?", "Estamos melhorando?"), sem atalho próprio (a rolagem basta); cada gráfico com título fixo e claro (o que mostra e a população) e o período no subtítulo. Títulos de conclusão calculados e o atalho entre faixas foram cortados pelo princípio da simplicidade (15/10); (2) os 12 KPIs ficam: **4 grandes com minigráfico de 6 meses** (Não finalizados, Finalizados no mês, Em atraso, % no SLA) e 8 compactos em "Fluxo" e "Prazo"; (3) **comparação com outro mês: barra do mês aberto e um traço do mês comparado** (substitui o contorno tracejado); (4) **Área × SLA como tabela com barras embutidas**, sem o número da % visível e **sem meta** (não existe meta de SLA; o código aceita uma depois); (5) empilhadas com 2 px de fundo entre segmentos, a situação de maior total na base em Cliente × Situação e o 7+ na base em Operador × Atraso, faixas de atraso numa cor só; (6) Cliente × Tempo médio em duas barras finas por cliente; (7) Ao longo do tempo em linha de 2 px com área a 10% e só o último valor escrito; (8) **paleta por significado**, com a cor da situação fixa pelo nome (Finalizado = azul dos finalizados) e vermelho só para SLA vencido. Barras com base reta e ponta arredondada. Escala de texto para leitura a 3 m na TV. Nada é removido (D34). |
| D76 | Transições de valor e período sem remontar | 15–16/10, pedido do responsável ("as animações quebraram; ao mudar o filtro a barra deve encolher"). Ao mudar filtro, "Comparar com" ou competência, **barras, traço do mês comparado, pilhas e números vão do valor antigo ao novo** (600 ms, ease-out; seco com movimento reduzido), sem reanimar do zero e sem remontar o Painel (a chave da visão é `tipo:visao`; o genérico recomeça por planilha). A entrada do zero fica só na primeira visita de cada visão. Linhas que saem com o filtro desmontam secas (sem fade, por simplicidade). Chips de filtro sem empurrar seco; esqueletos com a altura do conteúdo. Texto visível usa "mês de referência" (não "Mes Ref."). Medido com 12 posições de 20.000 linhas: abrir o Painel 350 ms, trocar o "Comparar com" 111–125 ms, trocar a competência 133–167 ms, aplicar filtro 277 ms (`docs/bench-12-posicoes.md`). As pendências visuais desta decisão foram resolvidas na D77. |
| D77 | Decisões de 16/10 (barras, cores, sem tabelas) | 16/10, decidido pelo responsável numa prancha. Refina a D75 e a D76. (1) **Mês comparado nas barras:** quando o comparado é maior que o mês aberto, a diferença continua a barra sólida em listras a 45°, na mesma espessura, e entra depois que a sólida cresce; nunca fica atrás da sólida. Comparado menor ou igual não tem listra: o valor dele fica em cinza no rótulo. Substitui o traço da D75 (item 3). (2) **Paleta P3** (categórica equilibrada, com paleta própria nas linhas por operador e cliente), validada para daltonismo e contraste. (3) **Evitar tabelas:** o Comparar continua em cartões (a proposta em tabela foi recusada) e o **Área × SLA deixa de ser tabela** e vira dois gráficos de barras lado a lado com as mesmas áreas (% no SLA com "n de N" e SLA vencido), escolhido numa prancha em 16/10 (spec 002; revisa a D75, item 4). Os KPIs % no SLA e SLA vencido continuam, e nenhum dado sai do cálculo (D34). (4) **Ao filtrar, as linhas ficam na ordem antiga enquanto as barras deslizam (600 ms) e só depois reordenam**; com movimento reduzido, na hora. (5) **Sem faixa fixa no topo** para o título (contrariaria a barra sobreposta da D43). (6) Confirmados: o "Comparar com" desliza do valor antigo ao novo; linhas que saem com o filtro somem secas; "Comparar período" e "Ver dados" continuam abertos ao trocar a competência. |
| D16 | Versionamento | Git com repositório privado `gomesbeduardo/dash-asten`. `.gitignore` bloqueia `*.xlsx`/`*.csv` fora de `fixtures/`. |

## 0.1 Requisitos de origem

Pedido do responsável, como chegou, e onde cada item está hoje (conferido no código em 14/10; revisto em 16/10 para o modelo de posição do mês).

| # | Requisito | Situação | Onde |
|---|---|---|---|
| R1 | Upload de um `.xlsx` e, a partir dele, vários gráficos | Atende | Leitura no navegador (SheetJS); Chamados tem Painel (com "Ao longo do tempo", D68), Leituras e Comparar; tipo desconhecido usa o modo automático (D25) |
| R2 | Sem autenticação, base de dados, nem nada | **Revisto** | Banco (D37) e login (D38) entraram por causa do R10 e do uso em várias máquinas. Ver D45 |
| R3 | Muito apelo visual e facilitadores para a análise | Atende | Leituras do mês com modal (D35/D40), Δ contra o período escolhido no "Comparar com" (D65), rótulos diretos, selo "corrigido" (D41/D65), barras e números que transitam (D76), botão "Filtrar por isto" |
| R4 | Curto prazo (1–2 meses) + backlog | Atende | Posição do mês com Δ contra o período escolhido; não finalizados, atraso por ciclo e SLA vencido no lugar de "backlog" (D64); "Ao longo do tempo" com os **6 últimos meses** |
| R5 | Reuniões semanais (direção/coordenações) | Atende | Modo apresentação para TV, atalhos (←/→, 1–9, F, H, T, P, L, C, Esc), barra que some (D43) |
| R6 | Habilitar/desabilitar séries | Atende | Legenda clicável nos gráficos com 2+ séries (Painel e Comparar) e no modo automático; totais intactos |
| R7 | Filtrar conjuntos por critérios | Atende | 7 dimensões em Chamados (D39), recalculam KPIs, gráficos, Leituras e Comparar; chips e "Limpar filtros" |
| R8 | Biblioteca gráfica e leitura do xlsx | Atende | Recharts 3 (via shadcn charts); SheetJS 0.20.3 do CDN oficial, no navegador; o servidor recebe os dados já normalizados |
| R9 | Carga por competência, escolhida no upload e amarrada aos dados | Atende | Competência sugerida pela coluna Mes Ref. (D63; reserva: aba → arquivo → títulos → datas) e confirmada pela pessoa (D28) |
| R10 | Guardar o passado para revisitar e comparar | Atende | Histórico no banco com versões agrupadas, seletor de competência/versão, Comparar de 2 a 6 competências ou versões, "Ao longo do tempo" no Painel (D29/D37/D53/D54/D66/D68) |
| R11 | Outros conjuntos no futuro, cada um com seu dash | Atende (estrutura) | Registro de tipos no código (D30); hoje só Chamados/OS; sem tipo reconhecido → "Outro" com modo automático |

Referência visual citada: https://www.youtube.com/watch?v=en0GuyhieQk

## 1. Visão

Transformar as planilhas de acompanhamento operacional em painéis visuais, rápidos e apresentáveis para Direção e Coordenações. A pessoa carrega o `.xlsx` de uma competência; o app guarda a carga, reconhece o tipo de conjunto (hoje, Chamados/OS) e abre um painel estratégico com KPIs, leituras do mês, comparação entre competências e evolução, com filtros para recortar durante a conversa.

É uma ferramenta de leitura e conversa: não edita dados nem substitui a planilha de origem.

## 2. Problema

Hoje a planilha é projetada direto no Excel. As comparações são montadas à mão, os filtros são desajeitados ao vivo, o mês anterior não está à mão e a narrativa visual fica dispersa. A equipe precisa alternar rápido entre a visão executiva e o detalhe, e comparar com meses anteriores, sem mexer no arquivo-fonte.

**Por que não uma ferramenta pronta (D1):** Excel ou BI projetados não oferecem uma experiência fluida para conduzir a reunião. A restrição original de privacidade foi revista (D45): os dados ficam no banco do app, atrás de login.

## 3. Objetivos

- Carregar um `.xlsx` informando tipo e competência; a carga fica guardada com versão (D28/D37).
- Abrir na TV direto na competência mais recente, com o painel do tipo.
- Painel de Chamados estratégico: posição do mês com KPIs, Δ contra o período escolhido, gráficos por cliente, área e operador, atraso por ciclo e leituras do mês (D35/D36/D63–D65/D75).
- Comparar de 2 a 6 competências ou versões lado a lado e ver os últimos 6 meses no "Ao longo do tempo" (D65/D66/D68).
- Filtros por dimensão que recalculam tudo, com chips e "Limpar filtros" (D39).
- Ocultar e mostrar séries pela legenda no Painel, no Comparar e no modo automático (R6).
- Todo dado corrigido por posição posterior sinalizado (D41/D65) e números conferidos de forma independente (D42).
- Visual legível em TV, acessível e com a marca Asten como acento.

## 4. Não objetivos (por ora)

- Construtor de dashboard pela tela (D4).
- Renomear ou reordenar abas (D7); filtros que atravessam tipos de conjunto (D6).
- Exportação PNG/CSV/PDF e handoff para Claude Motion (D10).
- Tabela de linhas brutas no painel de Chamados (D36).
- Contas individuais e permissões por pessoa (D38: login único do time por enquanto).
- Projeções e IA (D35: só tendência).
- Edição da planilha ou dos dados.

## 5. Pessoas e contexto

| Pessoa | Necessidade |
|---|---|
| Direção | Ver rápido cenário, tendência, gargalos e o que exige decisão. |
| Coordenações | Recortar por cliente, área e atividade; comparar com o mês anterior e explicar variações. |
| Facilitadora | Carregar a planilha da competência em minutos e conduzir filtros e navegação ao vivo. |
| Líder | Aprova escopo, métricas e layout; dono das definições de negócio pendentes (§8). |

**Cenário:** notebook com mouse e teclado ligado a uma TV (D20). A facilitadora abre o link (sem login no MVP, D52) e o app abre na tela de envio com a lista do que existe (D53). A barra fica escondida e aparece com o mouse no topo ou com H (D43).

## 6. Fluxos

### 6.1 Carregar uma ou várias competências
1. O app abre na tela de envio, com a lista do que já existe (D53); com o painel aberto, "Nova carga" abre o mesmo envio num modal (D55).
2. Soltar ou escolher um ou vários `.xlsx` (até 12, D56). O app lê no navegador, reconhece o tipo e sugere a competência; a pessoa confirma ou corrige (D28), uma a uma ou na tabela do lote.
3. Cada carga vai para o banco com a próxima versão daquele tipo + competência; o painel abre na mais recente.

### 6.2 Conduzir a reunião
1. Painel (P) em três faixas ("Como estamos?", "Onde está o problema?", "Estamos melhorando?", D75) com KPIs, Δ, gráficos e "Ao longo do tempo"; Leituras (L) com o detalhe de cada uma num modal; Comparar (C) de 2 a 6 competências ou versões, com leituras clicáveis.
2. Filtros (F) recortam as linhas antes do cálculo; os chips mostram o recorte ativo.
3. Seletor de competência e versão na barra; Histórico (Enviados e Geral, com busca) para abrir qualquer versão.

### 6.3 Revisitar e comparar
Qualquer competência guardada abre de qualquer máquina. Comparar põe de 2 a 6 competências ou versões lado a lado (Δ = última − primeira); o "Ao longo do tempo" mostra os últimos 6 meses. Mês sem posição aparece só com entradas e finalizados; mês antigo é corrigido pelas posições mais novas, com o selo "corrigido" (D65/D71).

## 7. Requisitos funcionais

- Aceitar `.xlsx`; mensagem simples se não for reconhecido (cai no modo automático, D25).
- Ler o arquivo no navegador; enviar ao servidor só os dados normalizados (e o original, para reprocessar).
- Competência obrigatória, sugerida pelo Mes Ref. e confirmada; versão atribuída no servidor (D28/D37/D63).
- Painel por tipo registrado no código (D30); Chamados conforme D35, D36, D39–D41 e D63–D77.
- Filtros por dimensão com chips e "Limpar filtros", valendo entre visões e competências do tipo (D39).
- Ocultar e mostrar séries sem alterar dados nem totais (R6).
- Nenhuma linha excluída: todas classificadas e presentes no cálculo (D34).
- Login com sessão de 14 dias ("lembrar") e API protegida em duas camadas (D38); **desligado no MVP** (D52).
- Estados de carregando, vazio, erro e dados insuficientes em cada área.

### Pós-MVP (só se validado)
Construtor de cartões; contas individuais; exportação PNG/CSV; preferências salvas; outros tipos de conjunto (projetos, OSs); modo tela cheia.

## 8. Pendências com o Líder

As definições de Chamados da D31 e o corte da competência da D34 foram revistos na reunião de 15/10 (D63–D65: posição do mês, nada é backlog, atraso por ciclo).

1. **Limiares das leituras** (D35).
2. **Dados na nuvem** (D1/D45): aprovado pelo responsável para o MVP de testes; o Líder confirma, e o produto definitivo reavalia.
3. **Hospedagem definitiva** (D11): seguir na Vercel ou outro lugar.
4. **Próximos tipos de conjunto** (R11): qual vem depois de Chamados e com que planilha.
5. **Marca:** uso do logo e das cores como estão (D12).
6. **Mês de referência da planilha nova** (D61/D74): a aba diz "ciclo Setembro" e a coluna Mes Ref. diz out/26. Até a resposta, vale o Mes Ref. (editável no envio).
7. **Recorte da exportação** (D61): o modelo de 14/10 não tem chamado aberto depois de jan/2026 (entradas do mês = 0) e a aba termina em "- RH"; confirmar se a exportação mensal virá completa ou por equipe.
8. **Reabertos não finalizados** (D61): hoje contam como resolvidos pela Data de Solução, com aviso; confirmar com o Líder.

## 9. Experiência visual

- **Tom:** executivo, contemporâneo e calmo. Os dados vêm antes da decoração.
- **Estrutura:** tela quase toda de informação (D20/D21); barra superior escondida até ser chamada (D43); filtros ativos sempre visíveis como chips.
- **Hierarquia:** página em três faixas com título-pergunta (D75): KPIs no topo com Δ, depois onde está o problema, depois a tendência; leituras numa visão própria (D40). Nada de "muro de gráficos" nem tabela de linhas soltas (D36).
- **Cores:** base neutra clara; a cor da Asten só como acento; paleta por significado (D75) com a P3 (D77); vermelho só para SLA vencido; cor nunca é o único canal (D41).
- **Legibilidade em TV:** tipografia grande, rótulos diretos nas barras, escala e período sempre visíveis.
- **Movimento:** Motion com regras próprias e respeito a `prefers-reduced-motion` (D26); valores transitam do antigo ao novo sem remontar (D76) e as linhas reordenam depois da transição (D77).

## 10. Acessibilidade

Teclado em todo o fluxo (atalhos ignorados em campos de texto); rótulos acessíveis; foco visível; contraste WCAG AA; alternativa em tabela para os gráficos; selos com texto, não só cor; `prefers-reduced-motion`.

## 11. Requisitos não funcionais

- **Segurança:** login com token HMAC em cookie HttpOnly/Secure/Lax; IDs CUID2; entradas validadas; nenhum segredo no bundle nem em logs; Prisma (sem SQL à mão).
- **Privacidade:** nenhum log com conteúdo das planilhas; planilhas reais nunca no Git.
- **Desempenho:** abrir o app com cargas salvas em **poucos segundos** mesmo a frio (hoje ~8 s, D46); filtros respondem na hora.
- **Compatibilidade:** Chrome, Edge, Firefox e Safari recentes, em desktop e TV.
- **Manutenibilidade:** motor de Chamados puro e testado (métricas, correção entre posições, cruzamentos, leituras, comparação), separado dos componentes; repositório de cargas atrás de uma interface (memória, IndexedDB, API).
- **Qualidade:** lint, typecheck, testes (Vitest) e e2e (Playwright) no CI; deploy só com CI verde (D44).

## 12. Arquitetura

```text
.xlsx no navegador
   ↓  SheetJS (só leitura) → workbook normalizado
Reconhecer tipo + confirmar competência
   ↓  POST /api/cargas (gzip) → Vercel Function → Prisma → Neon (tabela cargas, versão max+1)
Abertura: /api/cargas (metadados; 401 = login) → /api/cargas/:id (dados, cache imutável)
   ↓
Motor do tipo (Chamados): mapeamento de colunas → posição do mês e correção pelas posições mais novas (`fotos.ts`) → métricas, cruzamentos, leituras, comparação
   ↓
Tela (modo apresentação, Recharts + Motion)
```

Login: `/api/login` gera o cookie de sessão. Toda a API é uma função só (`api/rota.ts`, `/api/*` reescrito para ela): o roteador confere a sessão antes das rotas privadas e cada handler confere de novo. Ambientes por schema Postgres (`public`, `staging`).

## 13. Stack

React 19 + TypeScript + Vite 8 · shadcn/ui (Radix, Tailwind v4) · Recharts 3 via shadcn charts · SheetJS CE 0.20.3 pelo CDN oficial · Motion 13.4.4 (D26) · Vercel Functions (uma função para a API) · Neon Postgres (Vercel Marketplace) · Prisma 7.10.0 · Vitest + Testing Library + Playwright. O protótipo descartável segue congelado na branch `prototipo` (D15/D23).

## 14. Privacidade e dados

- As cargas (dados normalizados e o `.xlsx` original) ficam no banco Neon do projeto, acessível só pela API com login (D37/D38/D45).
- O app só lê valores, sem executar fórmulas ou macros.
- Nenhum log de células ou nomes; nenhuma planilha real no repositório, em fixtures, capturas ou mensagens de erro. Capturas e testes usam dados fictícios.
- Nenhuma carga é apagada em massa: não existe "apagar tudo" no banco compartilhado.

## 15. Critérios de aceite

- Sem login no MVP (D52); exclusão definitiva travada com `ADMIN_TOKEN` antes da primeira planilha real (D70).
- Carregar a planilha de uma competência cria a carga com versão; recarregar cria nova versão.
- Uma carga feita numa máquina aparece em outra.
- Painel, Leituras e Comparar de Chamados mostram os números conferidos de forma independente (D42) e o selo "corrigido" quando uma posição posterior muda o mês (D41/D65).
- Filtro recalcula tudo o que depende dele; chips visíveis; "limpar" restaura.
- Ocultar uma série não altera filtros nem totais.
- Abrir o app com cargas salvas leva poucos segundos (D46); com 12 posições, abrir o Painel e trocar o "Comparar com" levam menos de 1 s (D74).
- O essencial funciona por teclado e não depende só de cor.
- Lint, typecheck, testes e e2e verdes no CI antes de produção.
- O Líder aprova as definições (§8).

## 16. Referências

`plan-dash-asten.md` (fases), `docs/acesso-teste.md` (acesso e ambientes), `docs/comparacao-stack.md` (versões e licenças verificadas em 13/10/2026). Claude Motion: [Help Center](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion), ideia pós-MVP.
