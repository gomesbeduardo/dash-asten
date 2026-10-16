# 0008 — Registro de tipos de conjunto no código

**Status:** aceita
**Data:** 14/10/2026 (D30); registrada como ADR em 16/10/2026
**Decisões do PRD:** D30 (registro de tipos no código, com nome, colunas que identificam e painel próprio; sem tipo reconhecido cai em "Outro"), D25 (modo automático: KPIs e gráficos por tipo de coluna, com selo "automático", para qualquer planilha), D22 (qualquer `.xlsx` já funciona), D5 (layout por configuração declarativa no código)

## Contexto

O produto precisa abrir qualquer planilha (D22) e, para a planilha de Chamados do Líder, um painel próprio. O R11 do PRD pede que outros conjuntos de dados possam vir no futuro, cada um com o seu dash. A D30 define o formato como "em teste; pode mudar", e a planilha de Chamados é "ainda não definitiva, mas nessa linha".

## Decisão

- Os tipos de conjunto são um **registro no código**. Cada tipo tem nome, as colunas que o identificam (função `reconhecer`, que dá uma pontuação) e um painel próprio.
- O app **reconhece o tipo pelas colunas e a pessoa confirma** no envio.
- Primeiro tipo: **Chamados/OS**. **Sem tipo reconhecido → "Outro"**, que usa o modo automático (D25), com selo "automático". Painéis específicos registrados continuam com prioridade sobre o automático.
- O modo automático (D25) gera, por tipo de coluna, contagens, período, média e total por coluna numérica, contagem por categoria e por mês, comparação entre colunas numéricas quando os nomes sugerem (meta × realizado, previsto × executado) e distribuição de status.

## Consequências

Conferido no código:

- `src/cargas/tipos.ts` mantém o registro: `registrarTipo`, `tiposRegistrados` e `reconhecerTipo`. O tipo `outro` (`TIPO_OUTRO`) é o padrão e tem pontuação 0. Um tipo só é escolhido com pontuação de pelo menos 0,6 (`LIMIAR`).
- `src/app/bootstrap.ts` (`registrarTiposDoApp`) registra os tipos conhecidos; `src/main.tsx` o chama na abertura. Tipo novo entra ali.
- `tipoChamados` está em `src/chamados/mapeamento.ts` (`id: "chamados"`). O reconhecimento conta quantas das colunas de reconhecimento a aba tem.
- As visões (Painel, Leituras, Comparar) de cada tipo são registradas à parte em `src/panels/tipos.ts`, por id de tipo. Tipo novo precisa das duas pontas: o registro do tipo e as visões.
- O motor de cada tipo fica separado dos componentes (PRD §11, manutenibilidade).
- **Fora do ciclo atual:** o próximo conjunto de dados não entra sem pedido explícito (D74). Qual vem depois de Chamados e com que planilha está pendente com o Líder (PRD §8).
- Mudar o formato do registro é uma decisão de arquitetura: a D30 avisa que ele "pode mudar", então registre um ADR novo.

## Alternativas

Não registradas no PRD. A D5 já dizia que o layout tende a ser configuração declarativa no código, e a D25 revisou a D5/D22 ao acrescentar o modo automático ("nenhum gráfico é inferido por heurística", dizia a D5; a D25 passou a permitir KPIs e gráficos automáticos por tipo de coluna).
