// Toda a API numa função só (D46): uma partida a frio por visita, em vez de uma por endpoint
// mais a do Routing Middleware. O vercel.json reescreve /api/* para cá com o caminho em ?r=.
// A sessão é conferida aqui, antes de qualquer rota privada, e de novo em cada handler (D38).
import { naoAutorizado, sessaoValida } from "./_lib/auth.js"
import { erro } from "./_lib/http.js"
import * as carga from "./_rotas/carga.js"
import * as cargas from "./_rotas/cargas.js"
import * as login from "./_rotas/login.js"
import * as logout from "./_rotas/logout.js"
import * as sessao from "./_rotas/sessao.js"

type Metodo = "GET" | "POST" | "DELETE"
type Handler = (request: Request, param: string) => Response | Promise<Response>
type Rota = { padrao: RegExp; publica?: boolean; metodos: Partial<Record<Metodo, Handler>> }

const ROTAS: Rota[] = [
  { padrao: /^login$/, publica: true, metodos: { POST: login.POST } },
  { padrao: /^logout$/, publica: true, metodos: { POST: logout.POST } },
  { padrao: /^sessao$/, metodos: { GET: sessao.GET } },
  { padrao: /^cargas$/, metodos: { GET: cargas.GET, POST: cargas.POST } },
  { padrao: /^cargas\/([^/]+)$/, metodos: { GET: carga.GET, DELETE: carga.DELETE } },
]

/** Caminho depois de /api/: vem em ?r= quando a requisição foi reescrita, senão no próprio pathname. */
export function caminhoDa(request: Request): string {
  const url = new URL(request.url)
  const r = url.pathname === "/api/rota" ? url.searchParams.get("r") : null
  const bruto = r ?? url.pathname.replace(/^\/api\/?/, "")
  try {
    return decodeURIComponent(bruto).replace(/^\/+|\/+$/g, "")
  } catch {
    return ""
  }
}

function despachar(metodo: Metodo, request: Request): Response | Promise<Response> {
  const caminho = caminhoDa(request)
  for (const rota of ROTAS) {
    const m = rota.padrao.exec(caminho)
    if (!m) continue
    const handler = rota.metodos[metodo]
    if (!handler) {
      const resposta = erro("Método não permitido.", 405)
      resposta.headers.set("Allow", Object.keys(rota.metodos).join(", "))
      return resposta
    }
    if (!rota.publica && !sessaoValida(request)) return naoAutorizado()
    return handler(request, m[1] ?? "")
  }
  return erro("Não encontrado.", 404)
}

export const GET = (request: Request) => despachar("GET", request)
export const POST = (request: Request) => despachar("POST", request)
export const DELETE = (request: Request) => despachar("DELETE", request)
