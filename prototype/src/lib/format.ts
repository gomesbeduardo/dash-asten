export const MISSING = "—"

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return MISSING
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return MISSING
  return `${fmtNum(v, digits)}%`
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-")
  return `${MONTH_NAMES[Number(m) - 1]}/${y.slice(2)}`
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return MISSING
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
