import type { Visao } from "./navegacao"

const CHAVE = "dash-asten:ultima-abertura"
const VISOES: readonly Visao[] = ["painel", "leituras", "comparar", "evolucao"]

export type UltimaAbertura = { cargaId?: string; visao?: Visao }

/** Última carga e visão abertas neste navegador (para a TV voltar onde parou). */
export function lerUltimaAbertura(): UltimaAbertura {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return {}
    const o = JSON.parse(bruto) as Record<string, unknown>
    const r: UltimaAbertura = {}
    if (typeof o.cargaId === "string" && o.cargaId) r.cargaId = o.cargaId
    if (VISOES.includes(o.visao as Visao)) r.visao = o.visao as Visao
    return r
  } catch {
    return {}
  }
}

/** Mescla com o que já estava guardado; nunca lança (storage pode estar bloqueado). */
export function guardarUltimaAbertura(parcial: UltimaAbertura): void {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ ...lerUltimaAbertura(), ...parcial })
    )
  } catch {
    /* sem storage: o app segue sem lembrar */
  }
}
