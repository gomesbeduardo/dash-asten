// POST /api/login  { usuario, senha, lembrar } → 204 + cookie de sessão | 401
import { credenciaisCorretas, criarSessao } from "../_lib/auth.js"
import { ErroDeEntrada, erro, lerJson, protegido } from "../_lib/http.js"

export function POST(request: Request): Promise<Response> {
  return protegido(() => entrar(request))
}

async function entrar(request: Request): Promise<Response> {
  let corpo: { usuario?: unknown; senha?: unknown; lembrar?: unknown }
  try {
    corpo = (await lerJson(request)) as typeof corpo
  } catch (e) {
    return e instanceof ErroDeEntrada ? erro(e.message, e.status) : erro("Requisição inválida.", 400)
  }
  if (!credenciaisCorretas(corpo.usuario, corpo.senha)) {
    // Atraso fixo para desencorajar tentativa e erro.
    await new Promise((r) => setTimeout(r, 400))
    return erro("Usuário ou senha incorretos.", 401)
  }
  const { cookie, expiraEm } = criarSessao(corpo.lembrar === true)
  return new Response(JSON.stringify({ expiraEm }), {
    status: 200,
    headers: { "Set-Cookie": cookie, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}
