// Respostas e validações comuns da API de cargas.
import { gunzipSync } from "node:zlib"
import { isCuid } from "@paralleldrive/cuid2"

export const LIMITE_CORPO = 4 * 1024 * 1024

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export function erro(mensagem: string, status: number): Response {
  return json({ erro: mensagem }, status)
}

/** IDs são CUID2 (gerados pelo Prisma); qualquer outra coisa é rejeitada antes de tocar o banco. */
export const ehId = (s: string) => s.length <= 32 && isCuid(s)

/** Executa o handler; erros inesperados viram 500 genérico, sem stack nem detalhe do banco. */
export async function protegido(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    console.error("[api] erro inesperado:", e instanceof Error ? e.name : "desconhecido")
    return erro("Erro interno. Tente de novo.", 500)
  }
}

/** Lê o corpo JSON, descomprimindo quando o cliente enviou X-Content-Encoding: gzip. */
export async function lerJson(request: Request): Promise<unknown> {
  const bruto = Buffer.from(await request.arrayBuffer())
  if (bruto.length > LIMITE_CORPO) throw new ErroDeEntrada("Corpo grande demais.", 413)
  const texto =
    request.headers.get("x-content-encoding") === "gzip"
      ? gunzipSync(bruto, { maxOutputLength: 64 * 1024 * 1024 }).toString("utf8")
      : bruto.toString("utf8")
  try {
    return JSON.parse(texto)
  } catch {
    throw new ErroDeEntrada("JSON inválido.", 400)
  }
}

export class ErroDeEntrada extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Metadados públicos de uma carga (sem dados nem arquivo original). */
export type CargaMetaDto = {
  id: string
  tipo: string
  competencia: string
  versao: number
  importadaEm: string
  arquivo: string
  linhas: number
}

export function paraMeta(c: {
  id: string
  tipo: string
  competencia: string
  versao: number
  importadaEm: Date
  arquivo: string
  linhas: number
}): CargaMetaDto {
  return {
    id: c.id,
    tipo: c.tipo,
    competencia: c.competencia,
    versao: c.versao,
    importadaEm: c.importadaEm.toISOString(),
    arquivo: c.arquivo,
    linhas: c.linhas,
  }
}
