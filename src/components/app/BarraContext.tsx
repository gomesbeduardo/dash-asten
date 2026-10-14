import { createContext, useContext } from "react"

/**
 * Ponte entre a casca e o painel do tipo: o painel desenha seus controles
 * (abas, filtros) numa faixa da barra superior (`slot`) e avisa quando mantém
 * um menu/painel aberto (`setHold`), para a barra não sumir.
 */
export type BarraCtx = {
  slot: HTMLElement | null
  setHold: (on: boolean) => void
  /** Atalhos extras do painel, mostrados na linha de dicas da barra. */
  setDica: (texto: string | null) => void
}

export const BarraContext = createContext<BarraCtx>({
  slot: null,
  setHold: () => {},
  setDica: () => {},
})

export const useBarra = () => useContext(BarraContext)
