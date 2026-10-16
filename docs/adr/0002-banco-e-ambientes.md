# 0002 — Banco e ambientes

**Status:** aceita
**Data:** 14/10/2026 (Fase 2D do plano); registrada como ADR em 16/10/2026
**Decisões do PRD:** D29 (toda carga fica guardada para revisitar e comparar), D37 (histórico num Postgres Neon compartilhado, com schemas por ambiente, CUID2 e Prisma 7), D45 (revisão consciente do pedido original "sem base de dados"), D1 (privacidade revista por D37/D45)

## Contexto

O pedido original dizia "sem autenticação, base de dados, nem nada" (D45). O requisito seguinte, guardar o passado carregado para revisitar e comparar, junto com o uso por várias máquinas (TV e notebooks), levou ao banco. O responsável aprovou isso em 14/10 para o MVP de testes; o produto definitivo, depois da validação, reavalia banco, login e hospedagem (D45, §8 do PRD).

## Decisão

- Histórico de cargas num **Postgres Neon**, instalado pelo Vercel Marketplace, no projeto `g0mes/dash-asten`. Um banco só.
- **Ambientes separados por schema Postgres** no mesmo banco: `public` é produção; `staging` é preview e desenvolvimento local. O schema vem da variável `DB_SCHEMA`.
- Tabela `cargas`: id, tipo, competência, versão, importada_em, arquivo, linhas e os dados normalizados em JSONB, com unicidade em (tipo, competência, versão). A versão é atribuída no servidor (`max + 1`, com nova tentativa em caso de conflito).
- IDs **CUID2**.
- Esquema e migrações com **Prisma 7.10.0** ("nada de SQL à mão", D37). As migrações `0001_cargas` e `0002_ids_cuid` foram geradas por `prisma migrate diff` e aplicadas nos dois schemas (plano, Fase 2D).
- O código acessa o armazenamento por uma interface única (`RepositorioDeCargas`); o adaptador IndexedDB ficou para testes e uso offline (D29/D37).
- Desenvolvimento local do app completo com `vercel dev` na porta 3000.

## Consequências

Conferido no código:

- `db/schema.prisma` é a fonte do esquema. Mudança de esquema vira migração em `db/migrations/` (hoje `0001_cargas`, `0002_ids_cuid`, `0003_nome_arquivada` e `0004_mes_ref_checks`). Não se altera o banco à mão.
- `api/_lib/db.ts` lê `DB_SCHEMA` (padrão `public`), valida o nome com a expressão `^[a-z_][a-z0-9_]{0,30}$` e o passa ao adaptador do Neon. `db/prisma.config.ts` faz o mesmo para as migrações, usando a conexão direta (`DATABASE_URL_UNPOOLED`) quando existir.
- `npm run db:migrate` roda `prisma migrate deploy`. O `postinstall` roda `prisma generate`.
- O que se testa em staging não aparece em produção; migração aplicada em um schema precisa ser aplicada no outro (plano: migrações "aplicadas nos dois schemas").
- Quem usa o repositório de cargas depende da interface `RepositorioDeCargas` (`src/cargas/types.ts`), nunca de um adaptador específico. `VITE_REPOSITORIO=api` escolhe o banco compartilhado; qualquer outro valor usa o IndexedDB local (`src/cargas/escolherRepositorio.ts`). O script `test:e2e` roda com `VITE_REPOSITORIO=local`.
- Segredos de conexão (`DATABASE_URL` e afins) ficam nas variáveis da Vercel, nunca no repositório.
- Nenhuma carga é apagada em massa: não existe "apagar tudo" no banco compartilhado (PRD §14). Ver ADR 0005.

## Alternativas

- Guardar só no navegador (IndexedDB, que era o provisório da D29): foi o adaptador inicial e hoje é só para testes e uso offline. O motivo de ter sido substituído está na D45 (vários computadores).
- Outros bancos, outros provedores ou SQL à mão: não registrado.
