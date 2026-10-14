import { createContext, useContext } from "react"

import type { CargaMeta } from "@/cargas/types"

export interface SessaoApi {
  /** Encerra a sessão no servidor e volta à tela de login. */
  sair: () => Promise<void>
}

export const SessaoContext = createContext<SessaoApi>({ sair: async () => undefined })

export const useSessao = (): SessaoApi => useContext(SessaoContext)

/**
 * Lista de cargas que o porteiro já buscou ao verificar a sessão (uma requisição
 * a menos na abertura). `null` quando não há: o app lista por conta própria.
 */
export const ListaInicialContext = createContext<CargaMeta[] | null>(null)

export const useListaInicial = (): CargaMeta[] | null => useContext(ListaInicialContext)
