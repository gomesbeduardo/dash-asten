import type { CargaMeta } from "./types"

/**
 * Cargas enviadas por este navegador. O login é único do time, então a
 * identidade de "quem enviou" é o navegador (D47). Soft delete local: "limpos"
 * só somem da aba Enviados; nada é apagado do banco compartilhado.
 */
const CHAVE = "dash-asten:enviados:v1"

type Estado = { enviados: string[]; limpos: string[] }

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []

function ler(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE)
    const o = bruto ? JSON.parse(bruto) : null
    return { enviados: lista(o?.enviados), limpos: lista(o?.limpos) }
  } catch {
    return { enviados: [], limpos: [] }
  }
}

function gravar(e: Estado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e))
  } catch {
    // Sem localStorage (modo privado/bloqueado): Enviados só fica vazio.
  }
}

const unicos = (xs: string[]) => [...new Set(xs)]

export function registrarEnvio(id: string): void {
  const e = ler()
  gravar({ enviados: unicos([...e.enviados, id]), limpos: e.limpos })
}

export function limparEnviados(ids: string[]): void {
  const e = ler()
  gravar({ enviados: e.enviados, limpos: unicos([...e.limpos, ...ids]) })
}

export const tirarDaLista = (id: string): void => limparEnviados([id])

export const foiEnviada = (id: string): boolean => ler().enviados.includes(id)

/** Enviadas deste navegador que ainda existem no histórico e não foram limpas. */
export function enviadosVisiveis(metas: CargaMeta[]): CargaMeta[] {
  const { enviados, limpos } = ler()
  return metas.filter((m) => enviados.includes(m.id) && !limpos.includes(m.id))
}
