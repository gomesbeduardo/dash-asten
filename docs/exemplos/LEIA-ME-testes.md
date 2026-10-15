# Planilhas fictícias para testar o import de Chamados/OS

Tudo aqui é **100% fictício**: gerado por script com semente fixa, com nomes inventados (Cliente Alfa, Operador 01, Projeto 01...). Nenhuma planilha real foi usada. Os `.xlsx` são ignorados pelo Git (não vão para o repositório).

Todas as planilhas de chamados vêm da **mesma população** de 1.100 chamados (+70 abertos em outubro), então os meses conversam entre si: um chamado aberto em abril aparece, com o mesmo código, nos meses seguintes até ser solucionado. Cada arquivo é a exportação do **último dia do mês**: só tem chamados abertos até ali, a solução só aparece se já ocorreu e a Situação é coerente com essa data.

## Definições dos números

- **Backlog**: chamados abertos até o fim do mês e sem Data de Solução até lá.
- **Entradas**: Data de Abertura dentro do mês.
- **Saídas**: Data de Solução dentro do mês.
- **% no SLA**: entre os solucionados no mês que têm SLA, os que foram solucionados até o fim do dia do SLA vigente (Renegociado, senão Previsto).

**Os números abaixo vêm de uma conta independente, refeita lendo os arquivos `.xlsx` salvos (não do gerador). O app deve bater com eles.** Se divergir, investigue o app.

## Tabela de arquivos

| Arquivo | Competência sugerida | O que testa | Linhas | Backlog | Entradas | Saídas | % no SLA |
|---|---|---|---|---|---|---|---|
| `chamados-2026-04-ficticio.xlsx` | 2026-04 | Primeiro mês da série (abertos desde set/25). | 620 | 149 | 84 | 72 | 51,4% |
| `chamados-2026-05-ficticio.xlsx` | 2026-05 | Série de 6 cargas próprias. | 714 | 166 | 94 | 77 | 62,3% |
| `chamados-2026-06-ficticio.xlsx` | 2026-06 | Série de 6 cargas próprias. | 828 | 192 | 114 | 88 | 65,9% |
| `chamados-2026-07-ficticio.xlsx` | 2026-07 | Série de 6 cargas próprias. | 922 | 188 | 94 | 98 | 53,1% |
| `chamados-2026-08-ficticio.xlsx` | 2026-08 | Mesmo conteúdo de `chamados-agosto-2026-ficticio.xlsx` (só muda a Situação dos abertos); use um dos dois. | 1032 | 205 | 110 | 93 | 63,4% |
| `chamados-2026-09-ficticio.xlsx` | 2026-09 | Mês mais recente da série; equivale a `chamados-setembro-2026-ficticio.xlsx`. | 1100 | 188 | 68 | 85 | 49,4% |
| `chamados-agosto-2026-ficticio.xlsx` | 2026-08 | Arquivo antigo (mantido): ago/26 para o roteiro de Comparar. | 1032 | 205 | 110 | 93 | 63,4% |
| `chamados-setembro-2026-ficticio.xlsx` | 2026-09 | Arquivo antigo (mantido): set/26. | 1100 | 188 | 68 | 85 | 49,4% |
| `chamados-2026-09-v2-correcao-ficticio.xlsx` | 2026-09 | Versão corrigida de set/26: 5 chamados (códigos 5069, 5163, 5297, 5550, 5760) ganharam Data de Solução em setembro e Situação nova. Deve entrar como **v2 por cima** do grupo de setembro; backlog cai 5, saídas sobem 5. | 1100 | 183 | 68 | 90 | 46,7% |
| `chamados-2026-10-ficticio.xlsx` | 2026-10 | Mês novo no topo (out/26): Evolução e Comparar ganham outubro; setembro vira o anterior. | 1170 | 165 | 70 | 93 | 69,9% |
| `cenario-leituras-a-ficticio.xlsx` | 2026-09 | Leituras, parte A: dispara **fluxo** (saídas ≥ 1,5 × entradas e backlog menor que agosto), **concentração**, **envelhecimento** e **gargalo no cliente**. As 4 aparecem. | 1044 | 145 | 12 | 72 | 18,1% |
| `cenario-leituras-b-ficticio.xlsx` | 2026-09 | Leituras, parte B: igual à A, mais **Sem SLA**. As 5 regras disparam, mas o app mostra no máximo 4, da mais grave à menos: o fluxo (destaque) é o que fica de fora. | 1044 | 145 | 12 | 72 | 18,1% |
| `cenario-colunas-diferentes-ficticio.xlsx` | 2026-09 | Reconhecimento tolerante: conteúdo igual ao de set/26 com cabeçalhos variantes (`DATA ABERTURA`, `Cód`, `Prioridade`, `Status`, `SLA`, `Novo SLA`, `Data Solução`, `DT ACEITE`, `Quantidade Reaberturas`, `Título`, `Responsável`) e uma coluna extra, `Observações internas`, que deve ser ignorada. Os números devem ser idênticos aos de set/26. | 1100 | 188 | 68 | 85 | 49,4% |

Outros arquivos:

| Arquivo | O que testa |
|---|---|
| `outro-tipo-ficticio.xlsx` | Não é de chamados: aba "Projetos", 30 linhas, colunas Projeto, Responsável, Status, % Concluído, Prazo, Orçamento. Deve ser reconhecida como "Outro" e abrir no modo automático. |
| `planilha-ficticia.xlsx` | Já existia; não foi alterado. |

## Detalhes dos cenários de leitura (competência 2026-09)

Valores calculados do arquivo (iguais em A e B, exceto Sem SLA):

| Regra | Limite | A | B |
|---|---|---|---|
| Fluxo: saídas / entradas | ≥ 1,5 e backlog < ago (205) | 72 / 12; backlog 145 | idem |
| Concentração (maior cliente / backlog) | ≥ 40% | Cliente Alfa, 67,6% | idem |
| Envelhecimento (> 180 dias) | > 25% (crítico se > 40%) | 66,9% (crítico) | idem |
| Gargalo no cliente (aguardando aceite / (backlog + aguardando)) | ≥ 30% | 72 / 217 = 33,2% | idem |
| Sem SLA (backlog sem SLA Previsto) | ≥ 20% | 0% (não dispara) | 39,3% |

Por que dois arquivos: o app limita a 4 leituras e ordena por gravidade (crítico, atenção, destaque). Com as 5 regras ativas, o fluxo (destaque) sai; por isso A mostra o fluxo e B mostra o Sem SLA. O agosto de comparação é o da mesma população (`chamados-2026-08-ficticio.xlsx` ou `chamados-agosto-2026-ficticio.xlsx`; backlog 205); se não houver carga de agosto, o app o reconstrói a partir do próprio arquivo de setembro e dá o mesmo resultado.

## Roteiro de teste (ordem sugerida)

1. **Só setembro**: carregue `chamados-2026-09-ficticio.xlsx` (competência 2026-09). Em Comparar, agosto deve aparecer como **reconstruído** (backlog 205, entradas 110, saídas 93).
2. **Agosto**: carregue `chamados-2026-08-ficticio.xlsx` (2026-08). Agosto passa a ser carga **própria** (sem o selo de reconstruído).
3. **Abril a julho**: carregue `chamados-2026-04`, `05`, `06` e `07`. A Evolução fica com **6 cargas** próprias (abr a set); Comparar aceita escolher até 6.
4. **v2**: carregue `chamados-2026-09-v2-correcao-ficticio.xlsx` na competência 2026-09. Deve entrar como versão 2 por cima da anterior do mesmo grupo (histórico guarda a v1). Confira backlog 183, saídas 90, % no SLA 46,7%.
5. **Outubro**: carregue `chamados-2026-10-ficticio.xlsx` (2026-10). Vira o mês do topo; Comparar usa setembro como anterior.
6. **Cenários** (em competência 2026-09; use um ambiente limpo ou descarte as versões depois): `cenario-leituras-a` e `cenario-leituras-b` para as Leituras; `cenario-colunas-diferentes` para o reconhecimento (deve identificar "Chamados / OS" sem pedir mapeamento manual e ignorar a coluna extra).
7. **Outro tipo**: carregue `outro-tipo-ficticio.xlsx`; escolha "Outro" e confira o modo automático.

## Regerar

`node gerar-testes.mjs` (script no scratchpad da sessão) reescreve os arquivos de forma idêntica (semente fixa).

## Estrutura nova da planilha (14/10, D61)

`chamados-estrutura-nova-set-2026.xlsx` (ignorado pelo Git; regerar com `node docs/exemplos/gerar-estrutura-nova.mjs`): aba "chamados ciclo Setembro - RH", 40 linhas fictícias, cabeçalho novo completo (Mes Ref., Data Abertura, Hora Abertura, Código, Tipo, Severidade, Resumo, Área Superior, Área, Cliente, Autarquia, Operador, Situação, Data de Solução, SLA Previsto, SLA Renegociado, Data de Aceite, Data Ultima Reabertura, Situação Ultima Reabertura, Qtd Reabertura, Observação), **sem** Atividade. Severidade toda vazia; Tipo e Autarquia preenchidos só em parte (vazio = "(sem informação)" nos filtros). Contém 3 reabertos pendentes (Data Ultima Reabertura > Data de Solução, Situação "Em Análise"), 2 reabertos já Finalizados e 2 "Aguardando Aceite de Solução" com solução e sem aceite.

Números esperados (contados no gerador direto das datas, não pelo código do app; o backlog segue as datas, D34):

| Competência | Backlog | Entradas | Saídas | Em atraso | Sem SLA | Aguardando aceite | Reabertos pendentes (aviso) | Abertos após a competência |
|---|---|---|---|---|---|---|---|---|
| 2026-09 | 18 | 11 | 10 | 6 | 3 | 2 | 3 | 5 |
| 2026-10 | 17 | 5 | 6 | 10 | 4 | 2 | 3 | 0 |

- Aviso esperado no rodapé do painel, nas duas competências: "3 chamado(s) reabertos depois da solução e não finalizados contam como resolvidos pela Data de Solução". Os KPIs não mudam por causa dele. Em set/26 há ainda o aviso de 5 abertos após a competência.
- Filtros novos: **Autarquia** (Autarquia X, Autarquia Y, "(sem informação)") e **Tipo** (Incidente, Requisição, "(sem informação)"), na ordem Cliente, Autarquia, Área Superior, Área, Atividade, Tipo, Severidade, Operador, Situação na competência. Sem a coluna Atividade, o filtro Atividade não aparece para esta carga.
- Para testar o filtro sem coluna: carregue junto uma carga antiga (com Atividade, sem Autarquia/Tipo), ative Autarquia ou Tipo e abra Comparar ou Evolução: a competência da carga antiga mostra "—" e o aviso "Sem a coluna Autarquia nesta carga: filtro não se aplica".

## Teste do modelo "foto" (D63+, 15/10)

Recorte de `chamados-2026-04-ficticio.xlsx` com a coluna **Mes Ref.** acrescentada. Cada planilha é uma foto da empresa no Mes Ref. e traz os chamados anteriores com a situação daquele momento. Arquivos (ignorados pelo Git): `teste-foto-abr26-v1.xlsx`, `teste-foto-abr26-v2.xlsx` (mesmo mês, reexportado), `teste-foto-mai26.xlsx`, `teste-foto-out26.xlsx` (salto de jun a set sem fotos).

Regras usadas na conta: **não finalizado** = Situação ≠ Finalizado; **finalizado no mês** = Situação Finalizado e Data de Solução no mês do Mes Ref.; **em atraso (ciclo)** = não finalizado aberto antes do mês do Mes Ref.; **SLA vencido** = não finalizado com SLA (renegociado, senão previsto) antes do fim do mês.

### Os chamados

| Código | Cliente | Operador | Abertura | Abr v1 | Abr v2 | Mai | Out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5000 | Ômega | Op 05 | 03/04/26 | Em Atendimento (SLA 20/04) | Finalizado 28/04, aceite 29/04 | igual | igual |
| 5003 | Ômega | Op 05 | 18/01/26 | Em Análise (SLA 28/01, reneg. 15/05) | igual | igual | Finalizado 20/06, aceite 22/06 |
| 5005 | Delta | Op 04 | 10/03/26 | Finalizado 08/04 (SLA 25/03), aceite 10/04 | igual | igual | igual |
| 5007 | Delta | Op 04 | 02/04/26 | Finalizado 12/04 (SLA 15/04), aceite 13/04, 1 reabertura | igual | igual | igual |
| 5010 | Ômega | Op 04 | 05/12/25 | Aguardando aceite, solução 25/04, sem SLA | Finalizado, aceite 27/04 | igual | igual |
| 5012 | Delta | Op 05 | 22/04/26 | — | Em Análise (SLA 06/05) | Finalizado 05/05, aceite 07/05 | igual |
| 5015 | Ômega | Op 04 | 10/05/26 | — | — | Em Atendimento (SLA 25/05) | Finalizado **30/05**, aceite 02/06 |
| 5020 | Delta | Op 05 | 14/08/26 | — | — | — | Em Análise (SLA 30/08) |
| 5022 | Ômega | Op 04 | 06/10/26 | — | — | — | **Aguardando cliente** (SLA 20/10) |
| 5024 | Delta | Op 05 | 01/10/26 | — | — | — | Finalizado 09/10 (SLA 15/10), aceite 10/10, 2 reaberturas |

### Números esperados por foto

| Indicador | Abr v1 | Abr v2 | Mai | Out |
| --- | --- | --- | --- | --- |
| Chamados na foto | 5 | 6 | 7 | 10 |
| Cards por Situação | Em Atendimento 1 · Em Análise 1 · Aguardando aceite 1 · Finalizado 2 | Em Análise 2 · Finalizado 4 | Em Atendimento 1 · Em Análise 1 · Finalizado 5 | Em Análise 1 · Aguardando cliente 1 · Finalizado 8 |
| Entradas no mês | 2 (5000, 5007) | 3 (+5012) | 1 (5015) | 2 (5022, 5024) |
| Finalizados no mês | 2 (5005, 5007) | 4 (+5000, 5010) | 1 (5012) | 1 (5024) |
| Não finalizados | 3 | 2 | 2 | 2 |
| Em atraso (ciclo) | 2: 5003 (2–3 meses), 5010 (4–6) | 1: 5003 (2–3) | 1: 5003 (4–6) | 1: 5020 (2–3) |
| SLA vencido | 1 (5000) | 0 | 2 (5003, 5015) | 2 (5020, 5022) |
| % no SLA | 50% (1 de 2) | 33,3% (1 de 3; 5010 sem SLA fica fora) | 100% (1 de 1) | 100% (1 de 1) |
| Tempo médio de resolução | 19,5 dias (29 e 10) | 51,3 dias (29, 10, 25, 141) | 13,0 dias | 8,0 dias |
| Tempo até o aceite | 1,5 dia (2 e 1) | 1,5 dia (2, 1, 1, 2) | 2,0 dias | 1,0 dia |
| % reabertos | 50% | 25% | 0% | 100% |
| Sem SLA (não finalizados) | 1 (5010) | 0 | 0 | 0 |
| SLA renegociado | 1 (5003) | 1 (5003) | 1 (5003) | 0 |
| Aguardando aceite | 1 (5010) | 0 | 0 | 0 |
| Por cliente (finalizados no mês · não finalizados) | Ômega 0 · 3; Delta 2 · 0 | Ômega 2 · 1; Delta 2 · 1 | Ômega 0 · 2; Delta 1 · 0 | Ômega 0 · 1; Delta 1 · 1 |
| Por operador (finalizados no mês · não finalizados) | Op 04 2 · 1; Op 05 0 · 2 | Op 04 3 · 0; Op 05 1 · 2 | Op 04 0 · 1; Op 05 1 · 1 | Op 04 0 · 1; Op 05 1 · 1 |

Faixa de atraso = meses entre o mês de abertura e o mês do Mes Ref. (jan→abr = 3 → "2–3"; dez→abr = 4 → "4–6").

### O que conferir nos saltos e na correção

- **v1 × v2 de abril** (Comparar com as duas versões): Em Atendimento 1 → 0, Em Análise 1 → 2, Finalizado 2 → 4, Aguardando aceite 1 → 0; entradas 2 → 3; finalizados no mês 2 → 4; em atraso 2 → 1.
- **Maio corrigido pela foto de outubro**: a foto de maio dizia 5015 "Em Atendimento"; a de outubro diz que foi resolvido em 30/05. Com as duas fotos carregadas, maio passa a mostrar **finalizados no mês 2** (era 1), **não finalizados 1** (era 2), **Em Atendimento 0** (era 1) e **SLA vencido 1** (era 2), **com a marca "corrigido pela foto de out/26"**. Indicadores que não mudaram ficam sem marca.
- **Meses sem foto (jun a set)**, ao comparar outubro com eles: só o que as datas dão, tirado da foto de outubro. Jun: entradas 0, finalizados 1 (5003). Jul: 0 e 0. Ago: entradas 1 (5020), finalizados 0. Set: 0 e 0. Cards por Situação e em atraso aparecem como "—" (sem foto).
- **Situação nova**: "Aguardando cliente" só existe na foto de outubro e vira um card próprio.
- **Competência**: o envio deve vir preenchido com abr/26, mai/26 e out/26 (coluna Mes Ref.), editável.
