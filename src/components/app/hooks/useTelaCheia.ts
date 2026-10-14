import { useCallback, useEffect, useState } from "react"

const suporta = () =>
  typeof document !== "undefined" &&
  typeof document.documentElement.requestFullscreen === "function" &&
  document.fullscreenEnabled !== false

/** Tela cheia da página (modo TV). Tolera falta de suporte e recusa do navegador. */
export function useTelaCheia() {
  const suportado = suporta()
  const [ativa, setAtiva] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement
  )

  useEffect(() => {
    const aoMudar = () => setAtiva(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", aoMudar)
    return () => document.removeEventListener("fullscreenchange", aoMudar)
  }, [])

  const alternar = useCallback(() => {
    if (!suporta()) return
    const p = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen()
    Promise.resolve(p).catch(() => {})
  }, [])

  return { suportado, ativa, alternar }
}
