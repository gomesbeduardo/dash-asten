import { useEffect } from "react"

/** Enquanto `ativo` (envio em andamento), o navegador pede confirmação ao fechar ou recarregar a aba. */
export function useAvisoAoSair(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", aviso)
    return () => window.removeEventListener("beforeunload", aviso)
  }, [ativo])
}
