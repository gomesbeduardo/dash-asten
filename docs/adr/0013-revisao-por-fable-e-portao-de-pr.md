# 0013 — Revisão em camadas e portão de PR

**Status:** proposta
**Data:** 16/10/2026 (D78)
**Decisões do PRD:** D78 (quem escreve e quem revisa cada peça, PR no padrão de empresa e merge de PR importante só com revisão humana; é a decisão desta ADR), D44 (branch própria, PR para a `staging`, PR `staging` → `main`, nunca push direto), D42 (todo número é conferido por um cálculo independente antes de ser dado como certo), D74 (produção só depois da conferência à mão do responsável na `staging`, por PR `staging` → `main` que ele mesmo mergeia). Complementa a ADR 0009 (fluxo de Git e entrega) e a ADR 0012 (spec antes do código); não substitui nenhuma das duas.

## Contexto

Em 16/10 o responsável pediu, em mensagens seguidas, que o Fable (o modelo mais forte do time, até então só advisor) passasse a escrever as specs e ADRs "para garantir qualidade", ficando o Opus com "spec e adr mais básica que não determina tanto qualidade (mudança pequena na UI e Usabilidade e afins)", depois de "grilling por modal"; que "code review e pr-review" fossem do Fable, agindo "como QA e Dev Sênior BEM CHATO para garantir qualidade, nem que me xingue por isso"; que a revisão da spec fosse básica ("final continua minha"); que os testes de aceite viessem na spec ("penso que deveria vir na spec que o opus passará aos workers"); que a conferência de números fosse chamada "apenas quando necessário" e a revisão visual ficasse "com o Opus como hoje"; que os PRs tivessem "mais detalhes como é pedido por padrão em projetos de empresas, afinal qualquer um precisa ler e entender"; que um hook bloqueasse "PR importante sem review humano"; e que specs e ADRs ficassem em `.md` numa pasta padrão ("esqueça a parte de abrir o vscode para ler, apenas deixe em pasta padrão que abro eu mesmo").

Num modal ele fixou dois pontos: a revisão humana é o rótulo `revisado-por-humano`, que ele põe à mão no PR, e PR importante é "todo PR que mexa em funcionalidade que possa quebrar o sistema, mais regras, specs, adrs, deploy, db e api". A observação de que o GitHub não deixa aprovar o próprio PR veio da pergunta da sessão principal nesse modal, não dele.

Ainda em 16/10 ele reviu a divisão por custo: "Fable advisor e pr-reviewer, o resto dos reviews, Opus high"; e, num modal, o Fable "fica como pr-reviewer (que aprova e coloca selo quando aprova a revisão da PR), spec-writer e advisor. Mas vamos pensar na economia de tokens". Avisou também que o projeto vai sair do GitHub ("iremos para o gitlab (corporativo) e largar o github nesse projeto"); esta ADR registra só que o portão vale para as duas forjas, e a migração fica para uma ADR própria (Pendências, item 2).

A ADR 0009 já proibia push direto e a 0012 já exigia spec aprovada antes do código. Faltava dizer quem escreve, quem revisa e o que segura o merge quando a regra escrita perde peso no meio de um ciclo longo.

## Decisão

**Quem escreve e quem revisa**

- O Fable tem três papéis, e só eles: advisor; `spec-writer`; `pr-reviewer`. Fora disso não executa.
- **Spec e ADR** de regra de negócio, dado, arquitetura ou fluxo novo que o usuário percebe: subagente `spec-writer` (Fable), que também registra o Dxx no §0 do PRD e a linha do índice de ADRs. Spec básica de ajuste pequeno de UI ou usabilidade (texto, rótulo, ordem, espaçamento, estado vazio, atalho, foco), sem mudar regra nem dado: sessão principal (Opus), depois de grilling por modal (`AskUserQuestion`, uma decisão por pergunta, com a recomendação). Na dúvida, Fable. Quem escreve a spec não implementa.
- Toda spec tem a seção **Testes de aceite**: casos concretos por critério, com o dado de entrada exato, a ação, o resultado exato e a conta quando a regra calcula. A sessão principal copia esses casos no brief do worker, que escreve os testes primeiro e mostra o vermelho antes do código.
- **Revisões do dia a dia**: subagente `reviewer-opus` (Opus, effort high). São dele a revisão básica de toda spec (modo spec: critério ambíguo, borda faltando, teste sem dado concreto, conta errada, contradição com ADR ou spec existente, regra presumida; a aprovação final é do responsável), a revisão de fatia que toca regra, dado ou área sensível (inclusive código que a sessão principal escreveu), a nova revisão depois de uma correção (só do trecho corrigido), a revisão de docs e a **conferência de números** com as fixtures, só quando a mudança mexe em cálculo, contagem ou classificação de chamado (é a forma de processo da D42). Fatia trivial (texto, estilo, teste que só acrescenta caso) a sessão principal confere sozinha pelo diff.
- **Revisão final do PR/MR**: subagente `pr-reviewer` (Fable), uma vez por PR, sobre o diff consolidado, antes de abrir o PR (ou num PR aberto que o responsável pedir). O veredito dele vai na linha de revisão do corpo e, com **aprovado**, a sessão principal põe o selo `revisado-por-fable` (rótulo já criado no repo). PR só de doc comum dispensa o `pr-reviewer` (veredito "dispensado").
- Postura dos dois revisores: QA e dev sênior implacável; começam em "bloqueado", rodam testes, typecheck, lint e build, tentam quebrar com caso de borda; tom duro permitido, e todo achado vem com prova (`arquivo:linha` e o cenário que quebra). Achado é repassado ao responsável sem amaciar; a sessão principal não descarta achado por conta própria.
- **Revisão visual** (a tela contra a prancha aprovada e o design system): sessão principal, com dev server e captura.
- **Economia de tokens**: um revisor por frente, nunca dois revisando a mesma coisa; o `pr-reviewer` uma vez por PR; o `spec-writer` só para spec ou ADR de regra de negócio, dado ou arquitetura; advisor só nos casos de sempre.

**PR no padrão de empresa** (MR no GitLab)

Escrito para quem não acompanhou o trabalho, sem jargão interno, cada código citado com uma cláusula dizendo o que é. Título em Conventional Commits. Corpo pelo modelo `.github/pull_request_template.md` (no GitLab, `.gitlab/merge_request_templates/Default.md`), nesta ordem: Contexto, O que mudou, Como testar, Evidências, Riscos e rollback, Fora do escopo, Revisão e Checklist. Na seção Revisão, a linha `- PR reviewer (Fable): **<veredito>**` com **um** valor em negrito (aprovado, aprovado com ajustes, bloqueado ou dispensado), os achados e o que foi feito com cada um; o placeholder com várias opções é negado pelo hook. Termina com "Desenvolvido com apoio do Claude Code."

**Portão de PR e de MR** (hook desta máquina, não do repo: `~/.claude/hooks/pr-revisao.sh`, que chama `pr-revisao.py`)

- Vale para a sessão principal e para os subagentes, em comandos `gh` (GitHub) e `glab` (GitLab). O hook separa o comando em comandos simples antes de conferir: abre `bash -c`, `eval`, `env`/`timeout`/`xargs`, `$( )`, crase e heredoc lido por shell. Valor que ele não consegue resolver (variável desconhecida, substituição) num ponto sensível é negado, nunca adivinhado. Sem `python3`, nega todo comando que pareça sensível.
- **Criar PR/MR**: negado sem as seções Contexto, O que mudou, Como testar, Riscos e Revisão, ou sem a linha do veredito com um valor só. "Bloqueado" só abre como rascunho (`--draft`). "Dispensado" só vale para PR só de doc comum e nunca para a `main`. `--web` passa: o corpo é escrito pelo humano no navegador.
- **Merge**: PR/MR importante só com o rótulo `revisado-por-humano` posto **depois do último commit** (no GitLab, também depois do último push, pela hora do servidor); merge automático de PR importante é negado (`--auto`, `--when-pipeline-succeeds`, e no `glab` todo merge sem `--auto-merge=false`, porque o glab liga o automático por padrão), assim como `gh pr merge --admin`, que passa por cima da proteção do servidor. Merge, escrita de branch, ref, arquivo ou commit pela API são negados.
- **Rótulo e aprovação**: nenhum agente põe nem cria o rótulo `revisado-por-humano` (tirar pode); aprovar (`gh pr review --approve`, `glab mr approve`) é do responsável, nunca do Claude, porque no GitLab dá para aprovar o próprio MR. Rótulo, merge e aprovação pela API (`gh api`, `glab api`, mutação GraphQL, `curl`) são negados, assim como alias de `gh`/`glab` que esconderia um desses comandos. O selo `revisado-por-fable` não passa por esse portão.
- **Push**: negado em branch protegida (`main`, `master`, `staging`; lista ajustável) e negado em branch cujo PR/MR já tem o rótulo humano (tirar o rótulo antes, subir e pedir nova revisão); `--all`, `--mirror` e refspec com curinga são negados. Se a forja não responde (sem login, fora do ar, `glab` não instalado), o push é negado até dar para conferir. Aliases de push do oh-my-zsh (`gp`, `ggpush`…) e aliases do git são expandidos antes da conferência.
- **PR importante** = vai para a `main` ou `master`, ou toca qualquer arquivo fora de doc comum. Doc comum = `*.md`, `docs/*` e imagens (`png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`). Sempre importantes, mesmo sendo `.md`: `*CLAUDE.md`, `*AGENTS.md`, `PRD*`, `plan*`, `docs/specs/*`, `docs/adr/*`, `docs/agents/*`, `.claude/*`, `.github/*`, `.gitlab/*` e `.gitlab-ci.yml`. Teste conta como importante. PR com arquivos demais para listar é importante. O projeto pode trocar as listas em `.claude/pr-review.json` (`baixoRisco`, `sempreImportante`, `branchesProtegidas`).

**Spec e ADR em pasta padrão**

Spec fica em `docs/specs/NNN-nome.md` e ADR em `docs/adr/NNNN-nome.md`, em Markdown; o responsável abre por conta própria. Nada de abrir editor por hook.

## Consequências

Conferido no código em 16/10 (`pr-revisao.sh` e `pr-revisao.py`, `~/.claude/settings.json`, agentes `spec-writer`, `reviewer-opus` e `pr-reviewer`, skill `time-de-agentes`, `CLAUDE.md` global e do projeto, modelo de PR):

- O hook está registrado em `~/.claude/settings.json`, **fora do repo**, como `PreToolUse` em `Bash`. Ele governa só os comandos que o Claude Code roda nesta máquina; o próprio hook se declara "cinto de segurança do Claude nesta máquina; a trava de verdade é a proteção de branch no servidor". O responsável mergeando pela web ou no terminal dele fica fora do portão, e é isso que mantém verdadeiro o "PR `staging` → `main` que ele mesmo mergeia" da ADR 0009. Outra máquina ou outro usuário sem o hook não tem portão. Não foi conferido se há proteção de branch no GitHub hoje; no GitLab corporativo o controle no servidor é pendência (item 1).
- O portão **falha fechado**: se não consegue ler o PR/MR, os commits ou os eventos do rótulo, nega o merge; erro interno do próprio hook também nega o comando sensível. Rótulo mais velho que o último commit nega o merge: commit novo exige o responsável tirar e repor o rótulo.
- O hook confere **5 dos 8 títulos** do modelo (não exige Evidências, Fora do escopo nem Checklist) e confere título e veredito, não o conteúdo: a qualidade do corpo continua sendo revisão humana. Corpo pela entrada padrão ou por variável não é aceito; o caminho tem de ser literal (ou `$(cat arquivo)`).
- O Claude pode **tirar** o rótulo humano para subir um commit numa branch já revisada; depois disso o merge volta a depender de o responsável revisar de novo e repor o rótulo.
- `.claude/pr-review.json` não existe no projeto: valem os padrões do hook. Como `.claude/*` é sempre importante, mudar as listas exige o rótulo humano.
- Spec, ADR, PRD, plano e regra não são doc comum: o próprio PR desta ADR precisa do veredito do `pr-reviewer` e do rótulo humano (ver Pendências, item 4).
- O veredito do modo spec do `reviewer-opus` ("pronta para o responsável", "pronta com ajustes", "volta para o spec-writer") não vai no corpo do PR; a linha do PR leva só o veredito do `pr-reviewer`.
- Limites dos agentes: o `spec-writer` não tem Bash (confere lendo, não rodando); `reviewer-opus` e `pr-reviewer` não editam, não comitam, não comentam em PR, não aprovam e não põem rótulo; rodam teste, typecheck, lint e build. O subagente `reviewer` antigo deixou de existir.
- Custo: Fable custa mais por token e o plano tem limite; por isso a revisão do caminho é do Opus, a spec básica e o grilling são do Opus, e a conferência de números não é padrão. `spec-writer`, `reviewer-opus` e `pr-reviewer` não releem a conversa (só o brief e o que leem no repo), ao contrário do advisor.
- O que fica mais difícil: nenhum PR importante entra sem o responsável ler e rotular, inclusive uma correção pequena de código; abrir PR exige o `pr-reviewer` antes e o corpo completo; uma spec passa por dois leitores (`reviewer-opus` e responsável) antes de qualquer código; push direto em `staging`/`main` pelo Claude deixa de ser possível mesmo por engano. O fluxo da ADR 0012 ganha dois passos (revisão básica da spec e code review em duas camadas); o fluxo de referência, em 8 passos, está em `docs/specs/README.md`.
- Reverter: tirar a entrada do hook de `~/.claude/settings.json`; voltar `.github/pull_request_template.md` (ou `.gitlab/merge_request_templates/Default.md` depois da migração), os itens "Quem escreve e quem revisa" e "PR no padrão de empresa" do `CLAUDE.md` do projeto, os passos 1, 2, 7 e 8 de `docs/specs/README.md` e a linha "Quem escreve" de `docs/adr/README.md`; voltar os trechos correspondentes de `~/.claude/CLAUDE.md` (§ Modelos, § Forja, § Spec antes do código, § Commits e PRs), da skill `time-de-agentes` e dos agentes `~/.claude/agents/spec-writer.md`, `reviewer-opus.md` e `pr-reviewer.md`; e marcar esta ADR como substituída por uma nova. As ADRs 0009 e 0012 continuam valendo sozinhas.

## Alternativas

Registradas em 16/10:

- **Fable em todas as revisões** (code review de toda fatia e do PR): foi o pedido inicial do responsável ("Code review e pr-review deve ser por fable também"), revisto por ele no mesmo dia por economia de tokens: o Fable fica só na revisão final do PR; as demais revisões vão para o Opus em effort high.
- **Aprovação de PR no GitHub como revisão humana**: descartada; o responsável escolheu o rótulo posto à mão. O motivo "o GitHub não deixa aprovar o próprio PR" foi levantado pela sessão principal na pergunta do modal, não por ele.
- **Testes de aceite escritos pelo Fable em separado**: descartado pelo responsável ("penso que deveria vir na spec que o opus passará aos workers").
- **Conferência de números em toda revisão**: descartada ("chame apenas quando necessário").
- **Revisão visual pelo Fable**: descartada ("pode ficar com o Opus como hoje").
- **Abrir spec e ADR no VS Code por hook**: pedido e retirado no mesmo dia pelo responsável; spec e ADR ficam só na pasta padrão.
- Proteção de branch no servidor no lugar do hook: não registrada como alternativa; o hook se apresenta como complemento dela (Pendências, item 1).

## Pendências

Decisões do responsável que esta ADR não fixa; cada uma com a recomendação de quem escreveu.

1. **No GitLab corporativo, ligar também o controle no servidor?** O hook só vale para o Claude nesta máquina: outro cliente, outra máquina ou a interface web do GitLab não passam por ele, e no GitLab dá para aprovar o próprio MR. Exemplo: alguém mergeia um MR que toca `api/` pela web sem o rótulo, e o hook nunca vê. Recomendação: sim; `staging` e `main` como branches protegidas (merge só por MR, push direto negado para todos) e aprovação obrigatória se o plano permitir, mantendo o rótulo `revisado-por-humano` como a marca que o hook confere.
2. **Migração para o GitLab em ADR própria.** Falta decidir CI (`.github/workflows/ci.yml` → `.gitlab-ci.yml`), a integração Vercel ↔ GitLab (deploy de prévia e produção), a revisão de D16 (repositório privado no GitHub), D24 (GitHub Actions só em push na `main`) e D27 (deploy de teste na Vercel) e o que muda na ADR 0009. Recomendação: escrever essa ADR antes de mover o repo, não depois.
3. **Gravar `.claude/pr-review.json` no repo** com as listas padrão explícitas (`baixoRisco`, `sempreImportante`, `branchesProtegidas`), para a regra de "importante" viajar com o projeto e não depender da cópia do hook na máquina? Recomendação: sim.
4. **PR só de spec ou ADR passa pelo `pr-reviewer` (Fable)?** Pelo hook, spec e ADR são sempre importantes, então o veredito "dispensado" é negado e a linha precisa do `pr-reviewer`, mesmo com a revisão básica do `reviewer-opus` já feita. Exemplo: o PR desta ADR. Recomendação: manter (o diff é curto e a spec é o que define a qualidade do que vem depois); se o custo pesar, o responsável decide se "dispensado" passa a valer também para PR só de spec/ADR já revisada pelo `reviewer-opus`.
