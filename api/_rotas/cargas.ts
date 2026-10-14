// GET  /api/cargas → metadados de todas as cargas (sem dados)
// POST /api/cargas → salva uma nova carga (nome opcional, D58); a versão é max+1 de (tipo, competência) — D28/D37.
// Não existe "apagar tudo": o banco é compartilhado pelo time.
import { Prisma } from "../_generated/prisma/client.js"
import { naoAutorizado, sessaoValida } from "../_lib/auth.js"
import { getDb } from "../_lib/db.js"
import { ErroDeEntrada, ehCompetencia, ehTipo, erro, json, lerJson, paraMeta, protegido, validarNome } from "../_lib/http.js"

const SELECAO_META = {
  id: true,
  tipo: true,
  competencia: true,
  versao: true,
  importadaEm: true,
  arquivo: true,
  linhas: true,
  nome: true,
  arquivadaEm: true,
} as const

export function GET(request: Request): Promise<Response> {
  return protegido(() => listar(request))
}

async function listar(request: Request): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  const cargas = await getDb().carga.findMany({
    select: SELECAO_META,
    orderBy: [{ tipo: "asc" }, { competencia: "desc" }, { versao: "desc" }],
  })
  return json(cargas.map(paraMeta))
}

type NovaCargaDto = { tipo: string; competencia: string; arquivo: string; nome?: string | null; workbook: { sheets: { rows: unknown[] }[] }; originalBase64?: string }

function validar(corpo: unknown): NovaCargaDto {
  const c = corpo as Partial<NovaCargaDto> | null
  if (!c || typeof c !== "object") throw new ErroDeEntrada("Corpo inválido.", 400)
  if (!ehTipo(c.tipo)) throw new ErroDeEntrada("Tipo inválido.", 400)
  if (!ehCompetencia(c.competencia)) throw new ErroDeEntrada("Competência inválida (use AAAA-MM).", 400)
  c.nome = validarNome(c.nome)
  // eslint-disable-next-line no-control-regex -- recusa caracteres de controle no nome do arquivo
  if (typeof c.arquivo !== "string" || c.arquivo.length === 0 || c.arquivo.length > 255 || /[\u0000-\u001f\u007f/\\<>]/.test(c.arquivo))
    throw new ErroDeEntrada("Nome de arquivo inválido.", 400)
  const sheets = c.workbook?.sheets
  if (!Array.isArray(sheets) || sheets.some((s) => !s || !Array.isArray(s.rows)))
    throw new ErroDeEntrada("Planilha inválida.", 400)
  if (c.originalBase64 !== undefined && typeof c.originalBase64 !== "string")
    throw new ErroDeEntrada("Arquivo original inválido.", 400)
  return c as NovaCargaDto
}

export function POST(request: Request): Promise<Response> {
  return protegido(() => salvar(request))
}

async function salvar(request: Request): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  let nova: NovaCargaDto
  try {
    nova = validar(await lerJson(request))
  } catch (e) {
    return e instanceof ErroDeEntrada ? erro(e.message, e.status) : erro("Requisição inválida.", 400)
  }
  const linhas = nova.workbook.sheets.reduce((n, s) => n + s.rows.length, 0)
  const original = nova.originalBase64 ? new Uint8Array(Buffer.from(nova.originalBase64, "base64")) : null
  const db = getDb()

  // Duas cargas simultâneas do mesmo mês podem calcular a mesma versão; a unicidade
  // (tipo, competência, versão) barra a segunda, que tenta de novo.
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const criada = await db.$transaction(async (tx) => {
        const { _max } = await tx.carga.aggregate({
          where: { tipo: nova.tipo, competencia: nova.competencia },
          _max: { versao: true },
        })
        return tx.carga.create({
          data: {
            tipo: nova.tipo,
            competencia: nova.competencia,
            versao: (_max.versao ?? 0) + 1,
            arquivo: nova.arquivo,
            nome: nova.nome ?? null,
            linhas,
            dados: nova.workbook as Prisma.InputJsonValue,
            original,
          },
          select: SELECAO_META,
        })
      })
      return json(paraMeta(criada), 201)
    } catch (e) {
      const conflito = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
      if (!conflito || tentativa === 4) throw e
    }
  }
  return erro("Não foi possível salvar a carga.", 500)
}
