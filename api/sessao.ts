// GET /api/sessao → 200 { expiraEm } com sessão válida | 401
import { naoAutorizado, sessaoValida } from "./_lib/auth.js"
import { json } from "./_lib/http.js"

export function GET(request: Request): Response {
  const sessao = sessaoValida(request)
  return sessao ? json(sessao) : naoAutorizado()
}
