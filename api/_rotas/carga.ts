// GET    /api/cargas/:id → carga completa (metadados + workbook) | 404
// DELETE /api/cargas/:id → 204
import { naoAutorizado, sessaoValida } from "../_lib/auth.js"
import { getDb } from "../_lib/db.js"
import { ehId, erro, paraMeta, protegido } from "../_lib/http.js"

// Uma carga (id) nunca muda depois de criada: recarregar cria outra versão, com outro id.
// Por isso o navegador pode guardá-la para sempre (privado: só a sessão de quem pediu).
const CACHE_IMUTAVEL = "private, max-age=31536000, immutable"

export function GET(request: Request, id: string): Promise<Response> {
  return protegido(() => obter(request, id))
}

async function obter(request: Request, id: string): Promise<Response> {
  if (!sessaoValida(request)) return naoAutorizado()
  if (!ehId(id)) return erro("Carga não encontrada.", 404)
  const carga = await getDb().carga.findUnique({
    where: { id },
    select: { id: true, tipo: true, competencia: true, versao: true, importadaEm: true, arquivo: true, linhas: true, dados: true },
  })
  if (!carga) return erro("Carga não encontrada.", 404)
  return new Response(JSON.stringify({ ...paraMeta(carga), workbook: carga.dados }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": CACHE_IMUTAVEL },
  })
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
