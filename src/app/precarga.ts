import { useEffect } from "react"

import type { CargaMeta, RepositorioDeCargas } from "@/cargas"
import { ultimasVersoes } from "@/components/chamados/logica"

/** As mesmas competências da Evolução. */
export const MAX_PRECARGA = 6

/** Versão mais recente de cada uma das últimas competências do tipo, da mais nova à mais antiga. */
export function idsParaPrecarregar(
  metas: CargaMeta[],
  tipo: string,
  max = MAX_PRECARGA
): string[] {
  return ultimasVersoes(metas.filter((m) => m.tipo === tipo))
    .slice(-max)
    .reverse()
    .map((m) => m.id)
}

type Agendador = (fn: () => void) => () => void

/** Roda `fn` quando o navegador está ocioso (fallback: um timeout curto). */
const quandoOcioso: Agendador = (fn) => {
  if (typeof requestIdleCallback === "function") {
    const h = requestIdleCallback(fn, { timeout: 2000 })
    return () => cancelIdleCallback(h)
  }
  const h = setTimeout(fn, 50)
  return () => clearTimeout(h)
}

/**
 * Depois que o painel abriu, aquece o cache de cargas em segundo plano, uma por vez,
 * para Comparar e Evolução abrirem sem esperar. Falhas são ignoradas (as visões
 * tentam de novo quando precisarem).
 */
export function usePrecarga(
  repo: RepositorioDeCargas,
  metas: CargaMeta[],
  tipo: string | null
) {
  useEffect(() => {
    if (!tipo) return
    const fila = idsParaPrecarregar(metas, tipo)
    let cancelado = false
    let cancelarAgenda: (() => void) | null = null
    const proximo = () => {
      if (cancelado) return
      const id = fila.shift()
      if (id === undefined) return
      cancelarAgenda = quandoOcioso(() => {
        repo
          .obter(id)
          .catch(() => null)
          .then(proximo)
      })
    }
    proximo()
    return () => {
      cancelado = true
      cancelarAgenda?.()
    }
  }, [repo, metas, tipo])
}
