// Sessão do time (D38): login único, token HMAC em cookie HttpOnly.
// A chave de assinatura deriva de AUTH_SECRET + usuário + senha: trocar o login ou a senha
// invalida todos os tokens emitidos. Verificado no roteador da API (api/rota.ts) e de novo em cada handler.
import { createHash, createHmac, timingSafeEqual } from "node:crypto"

export const COOKIE = "asten_sessao"
const QUATORZE_DIAS_S = 14 * 24 * 60 * 60
const SESSAO_CURTA_S = 12 * 60 * 60 // sem "lembrar": cookie de sessão; o token expira em 12 h

type Config = { usuario: string; senha: string; segredo: string }

function config(): Config | null {
  const usuario = process.env.BASIC_AUTH_USER
  const senha = process.env.BASIC_AUTH_PASS
  const segredo = process.env.AUTH_SECRET
  // Sem configuração completa, nega tudo (falha fechada).
  if (!usuario || !senha || !segredo) return null
  return { usuario, senha, segredo }
}

function chave(c: Config): Buffer {
  return createHash("sha256").update(`${c.segredo}\u0000${c.usuario}\u0000${c.senha}`).digest()
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  // timingSafeEqual exige o mesmo tamanho; a checagem de tamanho vem antes.
  return x.length === y.length && timingSafeEqual(x, y)
}

export function credenciaisCorretas(usuario: unknown, senha: unknown): boolean {
  const c = config()
  if (!c || typeof usuario !== "string" || typeof senha !== "string") return false
  // Avalia os dois sempre, para não revelar qual dos campos errou pelo tempo de resposta.
  const u = iguais(usuario, c.usuario)
  const s = iguais(senha, c.senha)
  return u && s
}

/** Emite o token e o header Set-Cookie correspondente. */
export function criarSessao(lembrar: boolean, agora = Date.now()): { cookie: string; expiraEm: string } {
  const c = config()
  if (!c) throw new Error("Autenticação não configurada")
  const validade = lembrar ? QUATORZE_DIAS_S : SESSAO_CURTA_S
  const exp = Math.floor(agora / 1000) + validade
  const corpo = Buffer.from(JSON.stringify({ exp })).toString("base64url")
  const assinatura = createHmac("sha256", chave(c)).update(corpo).digest("base64url")
  const atributos = ["Path=/", "HttpOnly", "Secure", "SameSite=Lax", ...(lembrar ? [`Max-Age=${validade}`] : [])]
  return {
    cookie: `${COOKIE}=${corpo}.${assinatura}; ${atributos.join("; ")}`,
    expiraEm: new Date(exp * 1000).toISOString(),
  }
}

export function cookieDeSaida(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

function lerCookie(request: Request): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const parte of header.split(";")) {
    const [nome, ...resto] = parte.trim().split("=")
    if (nome === COOKIE) return resto.join("=")
  }
  return null
}

/**
 * Login desligado no MVP de validação (D52): com LOGIN_DESATIVADO=1, toda requisição conta como sessão
 * válida. O resto do login fica intacto; religar = remover a variável (e VITE_LOGIN no build) e publicar.
 */
export function loginDesativado(): boolean {
  return process.env.LOGIN_DESATIVADO === "1"
}

/** Valida o token do cookie. Devolve a expiração (ISO) ou null se ausente, adulterado ou vencido. */
export function sessaoValida(request: Request, agora = Date.now()): { expiraEm: string } | null {
  if (loginDesativado()) return { expiraEm: new Date(agora + SESSAO_CURTA_S * 1000).toISOString() }
  const c = config()
  const token = lerCookie(request)
  if (!c || !token) return null
  const [corpo, assinatura] = token.split(".")
  if (!corpo || !assinatura) return null
  const esperada = createHmac("sha256", chave(c)).update(corpo).digest("base64url")
  if (!iguais(assinatura, esperada)) return null
  try {
    const { exp } = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as { exp: unknown }
    if (typeof exp !== "number" || exp * 1000 <= agora) return null
    return { expiraEm: new Date(exp * 1000).toISOString() }
  } catch {
    return null
  }
}

export function naoAutorizado(): Response {
  return new Response(JSON.stringify({ erro: "Sessão expirada ou ausente. Entre de novo." }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  })
}
