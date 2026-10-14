import { createContext, useContext } from "react"

export interface SessaoApi {
  /** Encerra a sessão no servidor e volta à tela de login. */
  sair: () => Promise<void>
}

export const SessaoContext = createContext<SessaoApi>({ sair: async () => undefined })

export const useSessao = (): SessaoApi => useContext(SessaoContext)
