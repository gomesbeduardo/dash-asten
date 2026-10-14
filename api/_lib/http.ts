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
  /** Nome dado pela pessoa (D58); null = sem nome. */
  nome: string | null
  /** Quando foi arquivada (D58); null = ativa. */
  arquivadaEm: string | null
}

export function paraMeta(c: {
  id: string
  tipo: string
  competencia: string
  versao: number
  importadaEm: Date
  arquivo: string
  linhas: number
  nome: string | null
  arquivadaEm: Date | null
}): CargaMetaDto {
  return {
    id: c.id,
    tipo: c.tipo,
    competencia: c.competencia,
    versao: c.versao,
    importadaEm: c.importadaEm.toISOString(),
    arquivo: c.arquivo,
    linhas: c.linhas,
    nome: c.nome,
    arquivadaEm: c.arquivadaEm ? c.arquivadaEm.toISOString() : null,
  }
}

export const LIMITE_NOME = 80

/** Nome opcional da carga: texto sem caracteres de controle, até 80 caracteres; vazio vira null. */
export function validarNome(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v !== "string") throw new ErroDeEntrada("Nome inválido.", 400)
  const nome = v.trim().replace(/\s+/g, " ")
  if (nome.length === 0) return null
  // eslint-disable-next-line no-control-regex -- recusa caracteres de controle no nome
  if (nome.length > LIMITE_NOME || /[\u0000-\u001f\u007f<>]/.test(nome)) throw new ErroDeEntrada("Nome inválido (até 80 caracteres, sem < >).", 400)
  return nome
}

export const ehTipo = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v)
export const ehCompetencia = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
