/** Máquina de estados pura da sessão (login por cookie HttpOnly). */
export type EstadoSessao =
  | { fase: "verificando" }
  | { fase: "erro-rede" }
  | { fase: "login"; aviso?: string }
  | { fase: "autenticado" }

export type EventoSessao =
  | { tipo: "sessao-valida" }
  | { tipo: "sem-sessao" }
  | { tipo: "rede-falhou" }
  | { tipo: "tentar-de-novo" }
  | { tipo: "login-ok" }
  | { tipo: "expirou" }
  | { tipo: "saiu" }

export const AVISO_EXPIRADA = "Sua sessão expirou. Entre novamente!"
export const EVENTO_SESSAO_EXPIRADA = "asten:sessao-expirada"

export const estadoInicial: EstadoSessao = { fase: "verificando" }

export function reduzir(e: EstadoSessao, ev: EventoSessao): EstadoSessao {
  switch (ev.tipo) {
    case "sessao-valida":
      return e.fase === "verificando" ? { fase: "autenticado" } : e
    case "sem-sessao":
      return e.fase === "verificando" ? { fase: "login" } : e
    case "rede-falhou":
      return e.fase === "verificando" ? { fase: "erro-rede" } : e
    case "tentar-de-novo":
      return e.fase === "erro-rede" ? { fase: "verificando" } : e
    case "login-ok":
      return e.fase === "login" ? { fase: "autenticado" } : e
    case "expirou":
      return e.fase === "autenticado"
        ? { fase: "login", aviso: AVISO_EXPIRADA }
        : e
    case "saiu":
      return e.fase === "autenticado" ? { fase: "login" } : e
  }
}
