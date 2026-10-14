// Routing Middleware da Vercel: protege a API com a sessão do time (D38).
// /api/login fica aberto; a casca estática do app é pública (não contém dados).
// As funções da API repetem a verificação (o middleware não é a única camada).
import { next } from "@vercel/functions"
import { naoAutorizado, sessaoValida } from "./api/_lib/auth.js"

export const config = {
  runtime: "nodejs",
  matcher: "/api/:path*",
}

export default function middleware(request: Request) {
  const { pathname } = new URL(request.url)
  if (pathname === "/api/login") return next()
  if (!sessaoValida(request)) return naoAutorizado()
  return next()
}
