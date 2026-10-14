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
