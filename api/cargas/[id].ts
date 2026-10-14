// GET    /api/cargas/:id → carga completa (metadados + workbook) | 404
// DELETE /api/cargas/:id → 204
import { naoAutorizado, sessaoValida } from "../_lib/auth.js"
import { getDb } from "../_lib/db.js"
import { ehId, erro, json, paraMeta, protegido } from "../_lib/http.js"

function idDa(request: Request): string | null {
  const id = decodeURIComponent(new URL(request.url).pathname.split("/").pop() ?? "")
  return ehId(id) ? id : null
}

export function GET(request: Request): Promise<Response> {
  return protegido(() => obter(request))
}

async function obter(request: Request): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  const id = idDa(request)
  if (!id) return erro("Carga não encontrada.", 404)
  const carga = await getDb().carga.findUnique({
    where: { id },
    select: { id: true, tipo: true, competencia: true, versao: true, importadaEm: true, arquivo: true, linhas: true, dados: true },
  })
  if (!carga) return erro("Carga não encontrada.", 404)
  return json({ ...paraMeta(carga), workbook: carga.dados })
}

export function DELETE(request: Request): Promise<Response> {
  return protegido(() => excluir(request))
}

async function excluir(request: Request): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  const id = idDa(request)
  if (!id) return erro("Carga não encontrada.", 404)
  await getDb().carga.deleteMany({ where: { id } })
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
}
