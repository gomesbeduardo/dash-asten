import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react"

import { LoginScreen, type ResultadoLogin } from "@/components/login/LoginScreen"
import { SessaoContext } from "./SessaoContext"
import { estadoInicial, EVENTO_SESSAO_EXPIRADA, reduzir } from "./sessao"

const MSG_FALHA_LOGIN = "Não foi possível entrar. Verifique a conexão e tente de novo."

async function entrar(usuario: string, senha: string, lembrar: boolean): Promise<ResultadoLogin> {
  try {
    const resp = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha, lembrar }),
    })
    if (resp.ok) return { ok: true }
    let erro = MSG_FALHA_LOGIN
    try {
      const corpo = (await resp.json()) as { erro?: unknown }
      if (typeof corpo?.erro === "string") erro = corpo.erro
    } catch {
      /* corpo não é JSON */
    }
    return { ok: false, erro }
  } catch {
    return { ok: false, erro: MSG_FALHA_LOGIN }
  }
}

function Aguardando({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6 text-center text-lg text-muted-foreground">
      <div role="status">{children}</div>
    </div>
  )
}

function Porteiro({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reduzir, estadoInicial)

  useEffect(() => {
    if (estado.fase !== "verificando") return
    let cancelado = false
    fetch("/api/sessao", { credentials: "same-origin" })
      .then((resp) => {
        if (cancelado) return
        if (resp.ok) despachar({ tipo: "sessao-valida" })
        else if (resp.status === 401) despachar({ tipo: "sem-sessao" })
        else despachar({ tipo: "rede-falhou" })
      })
      .catch(() => {
        if (!cancelado) despachar({ tipo: "rede-falhou" })
      })
    return () => {
      cancelado = true
    }
  }, [estado.fase])

  useEffect(() => {
    const aoExpirar = () => despachar({ tipo: "expirou" })
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [])

  const sair = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" })
    } catch {
      /* sem rede: sai do app mesmo assim; o cookie vence sozinho */
    }
    despachar({ tipo: "saiu" })
  }, [])
  const api = useMemo(() => ({ sair }), [sair])

  const aoEntrar = useCallback(
    async (usuario: string, senha: string, lembrar: boolean) => {
      const r = await entrar(usuario, senha, lembrar)
      if (r.ok) despachar({ tipo: "login-ok" })
      return r
    },
    []
  )

  if (estado.fase === "verificando") return <Aguardando>Verificando acesso…</Aguardando>
  if (estado.fase === "erro-rede")
    return (
      <Aguardando>
        <p>Não foi possível falar com o servidor.</p>
        <button
          type="button"
          onClick={() => despachar({ tipo: "tentar-de-novo" })}
          className="mt-4 h-11 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Tentar de novo
        </button>
      </Aguardando>
    )

  // Sessão vencida com o app aberto: ele continua montado por baixo (inerte) para não perder a tela.
  const appVivo = estado.fase === "autenticado" || (estado.fase === "login" && !!estado.aviso)
  const coberto = estado.fase === "login"

  return (
    <SessaoContext.Provider value={api}>
      {appVivo && (
        <div inert={coberto} aria-hidden={coberto || undefined}>
          {children}
        </div>
      )}
      {estado.fase === "login" && (
        <LoginScreen aviso={estado.aviso} entrar={aoEntrar} sobreposta={appVivo} />
      )}
    </SessaoContext.Provider>
  )
}

/** Só protege o app quando o repositório é a API (VITE_REPOSITORIO=api); nos demais, passa direto. */
export function SessaoGate({ children }: { children: ReactNode }) {
  if (import.meta.env.VITE_REPOSITORIO !== "api") return <>{children}</>
  return <Porteiro>{children}</Porteiro>
}
