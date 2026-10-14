// POST /api/logout → 204 e apaga o cookie de sessão.
import { cookieDeSaida } from "../_lib/auth.js"

export function POST(): Response {
  return new Response(null, { status: 204, headers: { "Set-Cookie": cookieDeSaida(), "Cache-Control": "no-store" } })
}
