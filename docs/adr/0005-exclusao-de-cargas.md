# 0005 — Exclusão de cargas

**Status:** aceita
**Data:** 15/10/2026 (D70); registrada como ADR em 16/10/2026
**Decisões do PRD:** D58 (arquivar é soft delete para todos; nada é apagado), D66 (excluir continua sendo só arquivar), D47 (o "Limpar" do histórico Enviados é soft delete local), D70 (exclusão definitiva liberada nos testes e travada por `ADMIN_TOKEN` antes da primeira planilha real)

## Contexto

O histórico de cargas é compartilhado entre máquinas (ADR 0002). Em 14/10 o histórico ganhou o "Limpar" das cargas enviadas por um navegador, que só tira da lista (D47). Em 14/10 a D58 acrescentou editar e arquivar. Em 15/10 o responsável pediu explicitamente, para limpar o banco durante os testes, que a exclusão definitiva ficasse liberada (D70).

## Decisão

- **No app, excluir é arquivar** (D58, mantido pela D66). Arquivar é soft delete para todos: a carga some das listas, do seletor, do Comparar e do "Ao longo do tempo", aparece em "Mostrar arquivadas" e pode ser restaurada. Nada é apagado.
- O "Limpar" do histórico Enviados só tira a carga da lista local deste navegador; nada sai do banco (D47).
- **Exclusão definitiva** (`DELETE /api/cargas/:id`): sem `ADMIN_TOKEN` no ambiente, funciona sem chave (fase de testes, pedido do responsável). Com `ADMIN_TOKEN` configurado (24 ou mais caracteres), só passa quem mandar o cabeçalho `X-Admin-Token` igual.
- **Configurar `ADMIN_TOKEN` na Vercel antes da primeira planilha real** (decidido em 15/10). A produção pode subir liberada enquanto o banco só tiver dados de teste. No plano, isso é a fatia N da onda 4, ainda aberta.
- **Não existe "apagar tudo"**: a API não tem exclusão em massa (PRD §14).

## Consequências

Conferido no código:

- `api/_lib/http.ts`, função `adminAutorizado`: sem token no ambiente, devolve `true`; token com menos de 24 caracteres devolve `false` (nunca autoriza); com token válido compara o cabeçalho `x-admin-token` com `timingSafeEqual`. Quem for mexer nisso deve manter essa ordem.
- `DELETE /api/cargas/:id` está na rota `carga.ts`. Não há `DELETE` em `/api/cargas`; `api/rota.ts` responde 405 a método sem handler.
- A interface `RepositorioDeCargas` tem `excluir(id)` (`src/cargas/types.ts`) e a alteração de carga aceita `arquivada` (`AlteracaoDeCarga`). Telas novas que "removem" carga usam arquivar, nunca `excluir`.
- **Proibido** criar rota ou botão que apague várias cargas de uma vez.
- Antes de carregar a primeira planilha real em produção, `ADMIN_TOKEN` precisa estar configurado. Esse é um item de entrega, não só de código.

## Alternativas

Não registradas no PRD. A D47 diz que o hard delete "fica para depois, se vier" e o plano o põe fora do ciclo atual ("D66 manteve só arquivar").
