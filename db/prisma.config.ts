// Configuração do Prisma CLI. Uso: npx prisma <cmd> --config db/prisma.config.ts
// Migrações usam a conexão direta (sem pooler) e o schema do ambiente (DB_SCHEMA).
import path from "node:path"
import { config as carregarEnv } from "dotenv"
import { defineConfig } from "prisma/config"

// `vercel env pull` grava em .env.local; variáveis já definidas no ambiente têm prioridade.
carregarEnv({ path: [".env.local", ".env"], quiet: true })

const base = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? ""
const schema = process.env.DB_SCHEMA ?? "public"
if (!/^[a-z_][a-z0-9_]{0,30}$/.test(schema)) throw new Error(`DB_SCHEMA inválido: ${schema}`)

function comSchema(url: string): string {
  if (!url) return "postgresql://placeholder@localhost/placeholder" // `prisma generate` não conecta
  const u = new URL(url)
  u.searchParams.set("schema", schema)
  return u.toString()
}

export default defineConfig({
  schema: path.join(import.meta.dirname, "schema.prisma"),
  migrations: { path: path.join(import.meta.dirname, "migrations") },
  datasource: { url: comSchema(base) },
})
