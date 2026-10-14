import type { Competencia } from "@/cargas/types"
import type { CellValue, Row, Sheet } from "@/core"
import { mapearColunas, type MapaColunas } from "./mapeamento"

export type SituacaoNaCompetencia =
  | "aberto-no-fim"
  | "resolvido-no-mes"
  | "resolvido-antes"
  | "aberto-apos"
  | "sem-abertura"
export const ROTULO_SITUACAO_COMPETENCIA: Record<
  SituacaoNaCompetencia,
  string
> = {
  "aberto-no-fim": "Aberto no fim do mês",
  "resolvido-no-mes": "Resolvido no mês",
  "resolvido-antes": "Resolvido antes do mês",
  "aberto-apos": "Aberto após a competência",
  "sem-abertura": "Sem data de abertura",
}

/** Limites do mês "AAAA-MM" em UTC: início = dia 1 00:00:00; fim = último dia 23:59:59.999. */
export function limitesDaCompetencia(c: Competencia): {
  inicio: number
  fim: number
} {
  const [ano, mes] = c.split("-").map(Number)
  return { inicio: Date.UTC(ano, mes - 1, 1), fim: Date.UTC(ano, mes, 1) - 1 }
}

export const tempo = (v: CellValue | undefined): number | null =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v.getTime() : null
export const texto = (v: CellValue | undefined): string | null => {
  if (v === null || v === undefined) return null
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()
  return s === "" ? null : s
}

/** Situação do chamado no último dia da competência (reconstruída pelas datas). Nenhuma linha é excluída. */
export function classificarLinha(
  row: Row,
  mapa: MapaColunas,
  competencia: Competencia
): SituacaoNaCompetencia {
  const { inicio, fim } = limitesDaCompetencia(competencia)
  const abertura = mapa.abertura ? tempo(row[mapa.abertura]) : null
  if (abertura === null) return "sem-abertura"
  if (abertura > fim) return "aberto-apos"
  const solucao = mapa.solucao ? tempo(row[mapa.solucao]) : null
  if (solucao === null || solucao > fim) return "aberto-no-fim"
  return solucao >= inicio ? "resolvido-no-mes" : "resolvido-antes"
}

export function classificarLinhas(
  sheet: Sheet,
  competencia: Competencia
): SituacaoNaCompetencia[] {
  const { mapa } = mapearColunas(sheet)
  return sheet.rows.map((r) => classificarLinha(r, mapa, competencia))
}
