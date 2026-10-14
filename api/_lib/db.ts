// Prisma 7 + Neon (D37). Um client por instância de função (Fluid Compute reaproveita instâncias).
// PrismaNeon (WebSocket) suporta transações; o schema Postgres do ambiente vem de DB_SCHEMA.
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "../_generated/prisma/client.js"

const global = globalThis as unknown as { prisma?: PrismaClient }

export function getDb(): PrismaClient {
  if (!global.prisma) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error("DATABASE_URL não configurada")
    const schema = process.env.DB_SCHEMA ?? "public"
    if (!/^[a-z_][a-z0-9_]{0,30}$/.test(schema)) throw new Error("DB_SCHEMA inválido")
    global.prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }, { schema }) })
  }
  return global.prisma
}
