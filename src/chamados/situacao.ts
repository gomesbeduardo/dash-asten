import type { Competencia } from "@/cargas/types"
import type { CellValue, Row, Sheet } from "@/core"
import { mapearColunas, type MapaColunas } from "./mapeamento"

/** Onde a linha cai em relação à foto (Mes Ref.): nenhuma linha é excluída, só separada (D34/D64). */
export type PosicaoNaFoto = "na-foto" | "aberto-depois" | "sem-abertura"

/** Limites do mês "AAAA-MM" em UTC: início = dia 1 00:00:00; fim = último dia 23:59:59.999. */
export function limitesDaCompetencia(c: Competencia): {
  inicio: number
  fim: number
} {
  let l = limites.get(c)
  if (!l) {
    const [ano, mes] = c.split("-").map(Number)
    l = { inicio: Date.UTC(ano, mes - 1, 1), fim: Date.UTC(ano, mes, 1) - 1 }
    limites.set(c, l)
  }
  return l
}
/** Poucas competências por sessão (uma por mês); evita refazer o split e o Date.UTC a cada linha. */
const limites = new Map<Competencia, { inicio: number; fim: number }>()

/** Meses de calendário entre o mês da abertura e o Mes Ref. (jan→abr = 3). */
export function mesesAteCompetencia(
  abertura: number,
  competencia: Competencia
): number {
  const [ano, mes] = competencia.split("-").map(Number)
  const d = new Date(abertura)
  return (ano - d.getUTCFullYear()) * 12 + (mes - 1 - d.getUTCMonth())
}

export const tempo = (v: CellValue | undefined): number | null =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v.getTime() : null
export const texto = (v: CellValue | undefined): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === "string") {
    const t = v.trim()
    return t === "" ? null : t
  }
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()
  return s === "" ? null : s
}

/** Linha dentro da foto (aberta até o fim do Mes Ref.), aberta depois dele ou sem Data de Abertura. */
export function classificarLinha(
  row: Row,
  mapa: MapaColunas,
  competencia: Competencia
): PosicaoNaFoto {
  const { fim } = limitesDaCompetencia(competencia)
  const abertura = mapa.abertura ? tempo(row[mapa.abertura]) : null
  if (abertura === null) return "sem-abertura"
  return abertura > fim ? "aberto-depois" : "na-foto"
}

export function classificarLinhas(
  sheet: Sheet,
  competencia: Competencia
): PosicaoNaFoto[] {
  const { mapa } = mapearColunas(sheet)
  return sheet.rows.map((r) => classificarLinha(r, mapa, competencia))
}
