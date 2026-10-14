// GET    /api/cargas/:id → carga completa (metadados + workbook) | 404
// PATCH  /api/cargas/:id → { nome?, tipo?, competencia?, arquivada? } → metadados atualizados (D58)
// DELETE /api/cargas/:id → 204
import { Prisma } from "../_generated/prisma/client.js"
import { naoAutorizado, sessaoValida } from "../_lib/auth.js"
import { getDb } from "../_lib/db.js"
import { ErroDeEntrada, ehCompetencia, ehId, ehTipo, erro, json, lerJson, paraMeta, protegido, validarNome } from "../_lib/http.js"

// Os dados de uma carga (id) nunca mudam depois de criada: recarregar cria outra versão, com outro id.
// Por isso o navegador pode guardá-la para sempre (privado: só a sessão de quem pediu). Os metadados
// (nome, tipo, competência, versão, arquivada) podem mudar pelo PATCH: o app os lê da listagem.
const CACHE_IMUTAVEL = "private, max-age=31536000, immutable"

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

export function GET(request: Request, id: string): Promise<Response> {
  return protegido(() => obter(request, id))
}

async function obter(request: Request, id: string): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  if (!ehId(id)) return erro("Carga não encontrada.", 404)
  const carga = await getDb().carga.findUnique({
    where: { id },
    select: { ...SELECAO_META, dados: true },
  })
  if (!carga) return erro("Carga não encontrada.", 404)
  return new Response(JSON.stringify({ ...paraMeta(carga), workbook: carga.dados }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": CACHE_IMUTAVEL },
  })
}

type Alteracao = { nome?: string | null; tipo?: string; competencia?: string; arquivada?: boolean }

function validarAlteracao(corpo: unknown): Alteracao {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroDeEntrada("Corpo inválido.", 400)
  const c = corpo as Record<string, unknown>
  const permitidos = new Set(["nome", "tipo", "competencia", "arquivada"])
  if (Object.keys(c).some((k) => !permitidos.has(k))) throw new ErroDeEntrada("Campo não permitido.", 400)
  const alt: Alteracao = {}
  if ("nome" in c) alt.nome = validarNome(c.nome)
  if ("tipo" in c) {
    if (!ehTipo(c.tipo)) throw new ErroDeEntrada("Tipo inválido.", 400)
    alt.tipo = c.tipo
  }
  if ("competencia" in c) {
    if (!ehCompetencia(c.competencia)) throw new ErroDeEntrada("Competência inválida (use AAAA-MM).", 400)
    alt.competencia = c.competencia
  }
  if ("arquivada" in c) {
    if (typeof c.arquivada !== "boolean") throw new ErroDeEntrada("Arquivada inválido.", 400)
    alt.arquivada = c.arquivada
  }
  if (Object.keys(alt).length === 0) throw new ErroDeEntrada("Nada para alterar.", 400)
  return alt
}

export function PATCH(request: Request, id: string): Promise<Response> {
  return protegido(() => alterar(request, id))
}

async function alterar(request: Request, id: string): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  if (!ehId(id)) return erro("Carga não encontrada.", 404)
  let alt: Alteracao
  try {
    alt = validarAlteracao(await lerJson(request))
  } catch (e) {
    return e instanceof ErroDeEntrada ? erro(e.message, e.status) : erro("Requisição inválida.", 400)
  }
  const db = getDb()

  // Mudar tipo ou competência move a carga para outro grupo: ela vira a versão max+1 do destino.
  // A unicidade (tipo, competência, versão) barra corrida com outra carga; tenta de novo.
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const atualizada = await db.$transaction(async (tx) => {
        const atual = await tx.carga.findUnique({ where: { id }, select: { tipo: true, competencia: true } })
        if (!atual) return null
        const tipo = alt.tipo ?? atual.tipo
        const competencia = alt.competencia ?? atual.competencia
        const move = tipo !== atual.tipo || competencia !== atual.competencia
        let versao: number | undefined
        if (move) {
          const { _max } = await tx.carga.aggregate({ where: { tipo, competencia }, _max: { versao: true } })
          versao = (_max.versao ?? 0) + 1
        }
        return tx.carga.update({
          where: { id },
          data: {
            ...(alt.nome !== undefined ? { nome: alt.nome } : {}),
            ...(move ? { tipo, competencia, versao } : {}),
            ...(alt.arquivada !== undefined ? { arquivadaEm: alt.arquivada ? new Date() : null } : {}),
          },
          select: SELECAO_META,
        })
      })
      if (!atualizada) return erro("Carga não encontrada.", 404)
      return json(paraMeta(atualizada))
    } catch (e) {
      const conflito = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
      if (!conflito || tentativa === 4) throw e
    }
  }
  return erro("Não foi possível alterar a carga.", 500)
}

export function DELETE(request: Request, id: string): Promise<Response> {
  return protegido(() => excluir(request, id))
}

async function excluir(request: Request, id: string): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  if (!ehId(id)) return erro("Carga não encontrada.", 404)
  await getDb().carga.deleteMany({ where: { id } })
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
}
