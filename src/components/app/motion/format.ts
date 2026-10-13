import type { ValueFormat } from "@/core"

const nf = (digits: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
const integer = nf(0)
const decimal = nf(1)

/**
 * Formata no padrão pt-BR. `percent` recebe o valor já em pontos percentuais
 * (87.3 -> "87,3%"). null vira "—".
 */
export function formatValue(
  value: number | string | null | undefined,
  format: ValueFormat
): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") return value
  if (!Number.isFinite(value)) return "—"
  if (format === "integer") return integer.format(value)
  if (format === "decimal") return decimal.format(value)
  return `${decimal.format(value)}%`
}
