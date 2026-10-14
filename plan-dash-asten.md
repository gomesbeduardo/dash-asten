# Plano incremental — Painel de análise de planilhas (Asten)

**Versão:** v2, 13/10/2026, após grilling. A v1 está no histórico do Git.
**Objetivo:** orientar o Claude Code a executar o produto descrito em `PRD-dash-asten.md` sem inventar requisitos. As decisões D1–D16 citadas abaixo estão no §0 do PRD.

## Princípios inegociáveis

1. Leia `PRD-dash-asten.md` inteiro antes de alterar qualquer coisa.
2. Não invente métricas, colunas, fórmulas, regras de negócio, limites de arquivo nem interpretações de backlog. Quando isso afetar comportamento, pergunte e registre a resposta no PRD.
3. A planilha chega validada e consolidada (D18). Processe localmente e não envie dados a serviços externos.
4. Sem autenticação, backend, banco, telemetria de conteúdo, API ou persistência.
5. Mantenha separados leitor, contrato e modelo, filtros, agregações, layout e componentes visuais.
6. **Antes da validação do Líder, só o esqueleto neutro (D19).** Painéis específicos e métricas esperam o ok.
7. Antes de declarar pronto: rode os testes, valide visualmente e reporte evidência.
8. Fluxo de agentes: siga a skill `time-de-agentes`. O Opus planeja e revisa; `explorer` lê, `worker` implementa fatias com TDD e `researcher` pesquisa fontes externas.

## Fase 0 — Repositório ✅ (13/10)

- `git init`, v1 dos docs commitada e repo privado `gomesbeduardo/dash-asten`.
- `.gitignore` bloqueia `*.xlsx`, `*.xls`, `*.xlsm` e `*.csv` fora de `fixtures/`.

## Fase 1 — Comparação breve de stack ✅ (13/10, aprovada no Checkpoint C)

1. O `researcher` compara framework, UI, gráficos e leitor XLSX contra o caso do PRD: escopo enxuto, layout fixo, filtros por aba, build estático.
2. Resultado em `docs/comparacao-stack.md`: tabela por categoria, recomendação, alternativas rejeitadas, riscos e fontes.
3. Sem spike de código; a comparação é documental (D13).

**Checkpoint C — stack:** o usuário aprova a stack antes do protótipo.

## Fase 2 — Protótipo descartável ✅ (13/10, aguardando Checkpoint L)

1. Criar `prototype/` como app local na stack aprovada, isolado do futuro produto (D15). Hoje congelado na branch `prototipo` (D23).
2. Gerar dados **fictícios marcados como tais**, sem nenhuma planilha real, cobrindo as duas hipóteses (D3):
   - "Indicadores": meta vs. realizado por mês e área;
   - "Projetos": status, prazo, % de conclusão e atrasos.
3. Mostrar: estado vazio e upload, barra de abas (com ocultar e reexibir), dashboard fixo por aba, filtros por aba com chips e "limpar", legenda que oculta série, tabela com escolha de colunas.
4. Aplicar a direção visual do PRD §9: base neutra, acento de marca (placeholder até receber a marca), legível em projeção. Usar a skill `frontend-design` e a skill oficial da biblioteca de UI escolhida.
5. Validar em resolução de projeção (por exemplo, 1920×1080 e 1366×768) e numa largura menor.

**Checkpoint L — Líder (16/10):** apresentar o PRD v2, o protótipo e as pendências do PRD §8. Registrar as respostas no PRD. Sem aprovação, nada da Fase 3 em diante começa.

## Fase 2B — Esqueleto do produto (D19–D27) ✅ (13/10)

Na `main`, na raiz do repo, do zero e com testes:

1. Scaffold: React 19 + TS + Vite + shadcn/ui + Recharts + TanStack Table + SheetJS (CDN) + Vitest + Testing Library + Playwright. Marca e tokens da D17.
2. Pipeline em camadas: leitor (arquivo → abas cruas) → normalizador (tipa colunas: texto, número, data, vazio) → registro de painéis (aba → painel específico ou visão genérica) → tela.
3. Visão genérica (D22): tabela por aba com filtros automáticos (texto com poucos valores distintos, datas), chips e "limpar".
4. Modo apresentação (D20/D21): quase só informação; barra de abas e filtros aparece sob demanda e some sozinha; setas trocam de aba; tecla abre filtros.
5. Ocultar/reexibir abas e escolher colunas visíveis (D7/D8).
6. CI no GitHub Actions só em push na `main` (D24).

**Pronto quando:** importar qualquer `.xlsx` mostra todas as abas na visão genérica, com filtros e atalhos funcionando; testes de unidade e o ponta a ponta passam.
7. Modo automático (D25): KPIs e gráficos por tipo de coluna acima da tabela, com selo "automático". ✅
8. Animações com Motion (D26), regras do `lp_centraleng`. ✅
9. Deploy de teste aberto em https://dash-asten.vercel.app (D27), sempre depois do CI verde. ✅

**Feito:** 94 testes de unidade/componente e 1 ponta a ponta passando; CI verde na `main`.

## Fase 2C — Competência, histórico e tipos de conjunto (D28–D33) ← agora, na `staging`

**Modelo:**
- `Carga` = { id, tipo, competência `AAAA-MM`, versão, importadaEm, arquivo, workbook normalizado }. Tipo + competência + versão é único; versão nova a cada recarga do mesmo mês.
- `RepositorioDeCargas` (interface): listar metadados, obter carga, salvar (atribui versão), excluir. Adaptadores: memória (testes) e IndexedDB (provisório, D29). Datas serializadas e revividas na leitura.
- `TipoDeConjunto` (registro no código): id, nome, `reconhecer(workbook) → pontuação`, mapeamento de colunas por sinônimos (planilha ainda não definitiva), painel. Tipos: `chamados` e `outro` (modo automático).
- Inferência de competência: mês por extenso em nome de aba/arquivo (pt-BR) + ano inferido das datas; senão mês anterior à data de hoje.

**Fatias** (contratos fixados no brief antes de paralelizar):
1. Núcleo de cargas (TDD): interface + adaptadores memória/IndexedDB, versão, serialização, inferência de competência, registro e reconhecimento de tipos.
2. Métricas de Chamados (TDD): mapeamento de colunas, KPIs da D31 sobre a competência, variação vs competência anterior, dados de comparação (A×B) e de evolução (série por competência).
3. Interface de carga e histórico: tela inicial com histórico (tipo, competência, versões), nova carga com passo de confirmação (tipo + competência), seletor de competência/versão no modo apresentação.
4. Interface de Chamados: painel da D31 com deltas, tela Comparar (A×B lado a lado), tela Evolução; Motion e marca como hoje.

**Pronto quando:** carregar a planilha do Líder (local, nunca no git) e uma fictícia de outro mês gera duas competências; painel, comparação e evolução funcionam; recarga cria versão; testes de unidade, componente e ponta a ponta passam; tudo testado localmente na `staging` antes de ir para a `main`.

## Fase 2D — Banco, autenticação e painel estratégico (D36–D38) ← feita na `staging`, falta promover para a `main`

**Infra (Opus — área sensível):**
1. ✅ **Neon** pelo Marketplace no projeto `g0mes/dash-asten`. Um banco só; ambientes separados por **schema Postgres** (`public` = produção, `staging` = preview e local) via `DB_SCHEMA`.
2. ✅ Esquema com **Prisma 7.10.0** (`db/schema.prisma`, migrações `0001_cargas` e `0002_ids_cuid` geradas por `prisma migrate diff`, aplicadas nos dois schemas): tabela `cargas` com id **CUID2**, tipo, competência, versão, importada_em, arquivo, linhas, dados jsonb, unique(tipo, competência, versão).
3. ✅ API em Vercel Functions: `GET /api/cargas` (metadados), `POST /api/cargas` (corpo gzip, versão = max+1 com retry em conflito), `GET /api/cargas/:id`, `DELETE /api/cargas/:id`. Sem "apagar tudo" (405). Entradas validadas (id CUID2, tipo, tamanho até 4 MB).
4. ✅ **Login próprio** (D38) no lugar do Basic Auth: `POST /api/login`, `/api/logout`, `/api/sessao`; token HMAC em cookie HttpOnly/Secure/Lax (14 dias com "lembrar"); duas camadas (Routing Middleware em `/api/*` + verificação em cada função; o middleware foi trocado pelo roteador único na fase 2E).
5. ✅ Dev local: `vercel dev` (porta 3000) para o app completo.

**Cliente (workers):**
6. ✅ `criarRepositorioApi()` com o mesmo contrato da memória/IndexedDB; `VITE_REPOSITORIO` escolhe o repositório.
7. ✅ D36: sem tabela de linhas brutas; filtros das leituras destacam KPIs e gráficos.
8. ✅ Painel de Chamados (KPIs com delta, leituras, distribuições, envelhecimento), Comparar (A×B), Evolução (cargas próprias + reconstruídas, com selo) e base correta do "aguardando aceite". Tela de login.

**Pronto quando:** login pedido em staging e produção; carga feita numa máquina aparece em outra; recarga cria versão no banco; comparação e evolução vêm do banco; testes e e2e verdes; validado localmente com `vercel dev` antes da `main`. **Falta:** promover para a `main`, CI verde, deploy de produção e validar com a planilha do Líder.

## Fase 2E — Fechar os requisitos do MVP (14/10) ✅ em produção

- [x] Lentidão (D46): API numa função só, carga com cache imutável, abertura sem `/api/sessao`, cache e pré-carga no cliente, carregando nas visões. A frio: 6,1 s → ~2,5 s de rede.
- [x] Histórico Enviados/Geral com busca e "Limpar" local (D47); versões agrupadas com a mais recente por cima (D53).
- [x] Séries liga/desliga na Evolução e no Comparar (R6/D49); Evolução nas 6 competências mais recentes (D48); mês faltante reconstruído pela carga seguinte (D51).
- [x] Barra sobreposta que some de verdade (D43); fundo e cartões menos claros para TV; selos só com símbolo, antes do texto, com legenda; controles, abas e toggles com cor e transição.
- [x] Login desligado no MVP (D52); abertura na tela de envio com a lista do que existe (D53); banco de staging limpo.
- [x] Comparar com 2 a 6 competências e leituras clicáveis (D54).
- [x] Nova carga em modal com arrastar e soltar (D55) e envio em lote (D56).
- [x] Competência reconhecida em todas as formas: nome, títulos e datas das linhas (D57).
- [x] Produção atualizada pela `main` com CI verde; artifact publicado.
- [x] Planilhas fictícias de teste com guia e números esperados (`docs/exemplos/LEIA-ME-testes.md`, fora do Git).

**Refinamento (depois da validação):** o leitor descarta linhas de título acima do cabeçalho ("Competência: setembro" ali não é visto); palavras soltas como "set"/"out" no nome contam como mês; legenda da Evolução ainda cita "planilha mais antiga" para buraco no meio; semear o cache com a carga recém-enviada; com a gaveta de filtros aberta a barra cobre o topo dos chips; remover `@vercel/functions` (sem uso); `vercel dev` abre em branco por causa do CSP no modo dev; JS de ~800 kB (carregar gráficos e leitor sob demanda); aviso do npm sobre scripts do Prisma; ligar o deploy automático pelo GitHub; contas individuais; hard delete; regras D31/D34/D35 com o Líder; próximo tipo de conjunto.

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

## Fase 5 — Leitura da planilha

A planilha chega validada e consolidada (D18), então esta fase é enxuta.

1. Aceitar `.xlsx` e ler o `ArrayBuffer` localmente, sem rede e sem log de células.
2. Ler todas as abas conforme o contrato da planilha-modelo e normalizar texto, número, data e vazio.
3. Se o arquivo escolhido não for a planilha da reunião, mostrar uma mensagem simples pedindo o arquivo certo.
4. Web Worker apenas se a medição com o arquivo real mostrar a tela travando.

**Testes:** leitura de cada aba da fixture; datas, números e vazios; mensagem para arquivo errado.

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
