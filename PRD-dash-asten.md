# PRD — Painel de análise de planilhas (Asten)

**Versão:** v3.1, 14/10/2026 (fim do dia). Alinha o PRD ao app construído (fases 2C/2D) e aos requisitos de origem (§0.1). A v2 está no histórico do Git.
**Status:** MVP em produção (https://dash-asten.vercel.app), sem login por enquanto (D52): cargas por competência com histórico no banco, painel de Chamados com Leituras, Comparar (2 a 6 competências) e Evolução, envio em lote. Definições de Chamados aguardam o Líder (D31/D34/D35).
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
| D16 | Versionamento | Git com repositório privado `gomesbeduardo/dash-asten`. `.gitignore` bloqueia `*.xlsx`/`*.csv` fora de `fixtures/`. |

## 0.1 Requisitos de origem

Pedido do responsável, como chegou, e onde cada item está hoje (conferido no código em 14/10).

| # | Requisito | Situação | Onde |
|---|---|---|---|
| R1 | Upload de um `.xlsx` e, a partir dele, vários gráficos | Atende | Leitura no navegador (SheetJS); Chamados tem Painel, Leituras, Comparar e Evolução; tipo desconhecido usa o modo automático (D25) |
| R2 | Sem autenticação, base de dados, nem nada | **Revisto** | Banco (D37) e login (D38) entraram por causa do R10 e do uso em várias máquinas. Ver D45 |
| R3 | Muito apelo visual e facilitadores para a análise | Atende | Leituras do mês com modal (D35/D40), deltas vs mês anterior, rótulos diretos, selos de dado derivado (D41), números animados, botão "Filtrar por isto" |
| R4 | Curto prazo (1–2 meses) + backlog | Atende | Mês da competência com delta vs anterior; backlog, atraso, envelhecimento; Evolução limitada às **6 últimas competências** |
| R5 | Reuniões semanais (direção/coordenações) | Atende | Modo apresentação para TV, atalhos (←/→, 1–9, F, H, P, L, C, E, Esc), barra que some (D43) |
| R6 | Habilitar/desabilitar séries | Atende | Legenda clicável na Evolução e no Comparar (gráficos com 2+ séries) e no modo automático; totais intactos |
| R7 | Filtrar conjuntos por critérios | Atende | 7 dimensões em Chamados (D39), recalculam KPIs, gráficos, Leituras, Comparar e Evolução; chips e "Limpar filtros" |
| R8 | Biblioteca gráfica e leitura do xlsx | Atende | Recharts 3 (via shadcn charts); SheetJS 0.20.3 do CDN oficial, no navegador; o servidor recebe os dados já normalizados |
| R9 | Carga por competência, escolhida no upload e amarrada aos dados | Atende | Competência sugerida (aba → arquivo → datas → mês anterior) e confirmada pela pessoa (D28) |
| R10 | Guardar o passado para revisitar e comparar | Atende | Histórico no banco com versões agrupadas, seletor de competência/versão, Comparar de 2 a 6 competências, Evolução (D29/D32/D37/D53/D54) |
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
- Painel de Chamados estratégico: KPIs com variação vs mês anterior, distribuições, envelhecimento, leituras do mês (D31/D35/D36).
- Comparar duas competências lado a lado e ver a evolução das últimas competências (D32).
- Filtros por dimensão que recalculam tudo, com chips e "Limpar filtros" (D39).
- Ocultar e mostrar séries pela legenda na Evolução, no Comparar e no modo automático (R6).
- Todo dado derivado sinalizado (D41) e números conferidos de forma independente (D42).
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

**Cenário:** notebook com mouse e teclado ligado a uma TV (D20). A facilitadora abre o link, entra com o login do time (lembrado por 14 dias) e o app abre na competência mais recente. A barra fica escondida e aparece com o mouse no topo ou com H (D43).

## 6. Fluxos

### 6.1 Carregar uma ou várias competências
1. O app abre na tela de envio, com a lista do que já existe (D53); com o painel aberto, "Nova carga" abre o mesmo envio num modal (D55).
2. Soltar ou escolher um ou vários `.xlsx` (até 12, D56). O app lê no navegador, reconhece o tipo e sugere a competência; a pessoa confirma ou corrige (D28), uma a uma ou na tabela do lote.
3. Cada carga vai para o banco com a próxima versão daquele tipo + competência; o painel abre na mais recente.

### 6.2 Conduzir a reunião
1. Painel (P) com KPIs, deltas e gráficos; Leituras (L) com o detalhe de cada uma num modal; Comparar (C) de 2 a 6 competências, com leituras clicáveis; Evolução (E).
2. Filtros (F) recortam as linhas antes do cálculo; os chips mostram o recorte ativo.
3. Seletor de competência e versão na barra; Histórico (Enviados e Geral, com busca) para abrir qualquer versão.

### 6.3 Revisitar e comparar
Qualquer competência guardada abre de qualquer máquina. Comparar põe de 2 a 6 competências lado a lado (Δ = última − primeira); Evolução mostra as últimas 6, com pontos reconstruídos pelas datas marcados (D41/D51).

## 7. Requisitos funcionais

- Aceitar `.xlsx`; mensagem simples se não for reconhecido (cai no modo automático, D25).
- Ler o arquivo no navegador; enviar ao servidor só os dados normalizados (e o original, para reprocessar).
- Competência obrigatória, sugerida e confirmada; versão atribuída no servidor (D28/D37).
- Painel por tipo registrado no código (D30); Chamados conforme D31, D34–D36, D39–D41.
- Filtros por dimensão com chips e "Limpar filtros", valendo entre visões e competências do tipo (D39).
- Ocultar e mostrar séries sem alterar dados nem totais (R6).
- Nenhuma linha excluída: todas classificadas e presentes no cálculo (D34).
- Login com sessão de 14 dias ("lembrar") e API protegida em duas camadas (D38); **desligado no MVP** (D52).
- Estados de carregando, vazio, erro e dados insuficientes em cada área.

### Pós-MVP (só se validado)
Construtor de cartões; contas individuais; exportação PNG/CSV; preferências salvas; outros tipos de conjunto (projetos, OSs); modo tela cheia.

## 8. Pendências com o Líder

1. **Definições de Chamados** (D31): backlog, entradas, saídas, % SLA, atraso, sem SLA, aguardando aceite.
2. **Corte da competência** (D34): KPIs reconstruídos "como estava no último dia do mês".
3. **Limiares das leituras** (D35).
4. **Dados na nuvem** (D1/D45): aprovado pelo responsável para o MVP de testes; o Líder confirma, e o produto definitivo reavalia.
6. **Hospedagem definitiva** (D11): seguir na Vercel ou outro lugar.
7. **Próximos tipos de conjunto** (R11): qual vem depois de Chamados e com que planilha.
8. **Marca:** uso do logo e das cores como estão (D12).
9. **Mês de referência da planilha nova** (D61): a coluna "Mes Ref." diz out/26 e a aba diz "ciclo Setembro". O app segue sugerindo pela aba (setembro); confirmar qual manda.
10. **Recorte da exportação** (D61): o modelo de 14/10 não tem chamado aberto depois de jan/2026 (entradas do mês = 0) e a aba termina em "- RH"; confirmar se a exportação mensal virá completa ou por equipe.
11. **Reabertos não finalizados** (D61): hoje contam como resolvidos pela Data de Solução, com aviso; confirmar com o Líder.

## 9. Experiência visual

- **Tom:** executivo, contemporâneo e calmo. Os dados vêm antes da decoração.
- **Estrutura:** tela quase toda de informação (D20/D21); barra superior escondida até ser chamada (D43); filtros ativos sempre visíveis como chips.
- **Hierarquia:** KPIs no topo com delta; um gráfico principal e complementares; leituras numa visão própria (D40). Nada de "muro de gráficos" nem tabela de linhas soltas (D36).
- **Cores:** base neutra clara; a cor da Asten só como acento; paleta de séries curta e consistente; cor nunca é o único canal (D41).
- **Legibilidade em TV:** tipografia grande, rótulos diretos nas barras, escala e período sempre visíveis.
- **Movimento:** Motion com regras próprias e respeito a `prefers-reduced-motion` (D26).

## 10. Acessibilidade

Teclado em todo o fluxo (atalhos ignorados em campos de texto); rótulos acessíveis; foco visível; contraste WCAG AA; alternativa em tabela para os gráficos; selos com texto, não só cor; `prefers-reduced-motion`.

## 11. Requisitos não funcionais

- **Segurança:** login com token HMAC em cookie HttpOnly/Secure/Lax; IDs CUID2; entradas validadas; nenhum segredo no bundle nem em logs; Prisma (sem SQL à mão).
- **Privacidade:** nenhum log com conteúdo das planilhas; planilhas reais nunca no Git.
- **Desempenho:** abrir o app com cargas salvas em **poucos segundos** mesmo a frio (hoje ~8 s, D46); filtros respondem na hora.
- **Compatibilidade:** Chrome, Edge, Firefox e Safari recentes, em desktop e TV.
- **Manutenibilidade:** motor de Chamados puro e testado (métricas, leituras, comparação, evolução), separado dos componentes; repositório de cargas atrás de uma interface (memória, IndexedDB, API).
- **Qualidade:** lint, typecheck, testes (Vitest) e e2e (Playwright) no CI; deploy só com CI verde (D44).

## 12. Arquitetura

```text
.xlsx no navegador
   ↓  SheetJS (só leitura) → workbook normalizado
Reconhecer tipo + confirmar competência
   ↓  POST /api/cargas (gzip) → Vercel Function → Prisma → Neon (tabela cargas, versão max+1)
Abertura: /api/cargas (metadados; 401 = login) → /api/cargas/:id (dados, cache imutável)
   ↓
Motor do tipo (Chamados): mapeamento de colunas → classificação por linha → métricas, leituras, comparação, evolução
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

- Login pedido em staging e produção; "lembrar" mantém a sessão por 14 dias.
- Carregar a planilha de uma competência cria a carga com versão; recarregar cria nova versão.
- Uma carga feita numa máquina aparece em outra.
- Painel, Leituras, Comparar e Evolução de Chamados mostram os números conferidos de forma independente (D42) e os selos de dado derivado (D41).
- Filtro recalcula tudo o que depende dele; chips visíveis; "limpar" restaura.
- Ocultar uma série não altera filtros nem totais.
- Abrir o app com cargas salvas leva poucos segundos (D46).
- O essencial funciona por teclado e não depende só de cor.
- Lint, typecheck, testes e e2e verdes no CI antes de produção.
- O Líder aprova as definições (§8).

## 16. Referências

`plan-dash-asten.md` (fases), `docs/acesso-teste.md` (acesso e ambientes), `docs/comparacao-stack.md` (versões e licenças verificadas em 13/10/2026). Claude Motion: [Help Center](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion), ideia pós-MVP.
