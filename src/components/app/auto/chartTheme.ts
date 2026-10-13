/** Funções puras de tema dos gráficos automáticos (cor por status, domínio Y, grade). */

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#b45f06",
]

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Ordem de empilhamento = ordem desta lista. Rank 5 = resto. */
const STATUS: { re: RegExp; color: string }[] = [
  { re: /conclu|finaliz|feito|entregue/, color: "var(--chart-3)" },
  { re: /andamento|execu|progresso|aberta|aberto/, color: "var(--chart-1)" },
  { re: /pausad|bloque|espera|suspens/, color: "var(--chart-4)" },
  { re: /nao inici|pendente|backlog|a fazer/, color: "var(--chart-5)" },
  { re: /atras|vencid|critic/, color: "var(--late)" },
]

function statusRank(label: string): number {
  const n = norm(label)
  const i = STATUS.findIndex((s) => s.re.test(n))
  return i === -1 ? STATUS.length : i
}

/** Cor por série: status conhecido pela semântica; resto pela paleta sem repetir. */
export function statusColors(series: { label: string }[]): string[] {
  const colors = series.map((s) => {
    const r = statusRank(s.label)
    return r < STATUS.length ? STATUS[r].color : null
  })
  const used = new Set(colors.filter((c): c is string => c !== null))
  const free = PALETTE.filter((c) => !used.has(c))
  let k = 0
  return colors.map((c) => {
    if (c) return c
    const pick = free.length ? free[k % free.length] : PALETTE[k % PALETTE.length]
    k += 1
    return pick
  })
}

/** Índices das séries na ordem de empilhamento (estável dentro do mesmo rank). */
export function statusOrder(series: { label: string }[]): number[] {
  return series
    .map((s, i) => ({ i, r: statusRank(s.label) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.i)
}

/** Domínio Y de linhas: folga de 5% da amplitude; nunca abaixo de 0 se tudo >= 0. */
export function lineDomain(values: number[]): [number, number] {
  const v = values.filter((x) => Number.isFinite(x))
  if (v.length === 0) return [0, 1]
  const min = Math.min(...v)
  const max = Math.max(...v)
  const amp = max - min
  const pad = amp === 0 ? 1 : amp * 0.05
  let lo = Math.floor(min - pad)
  const hi = Math.ceil(max + pad)
  if (min >= 0 && lo < 0) lo = 0
  return [lo, hi]
}

/** Classes da grade dos gráficos complementares conforme a quantidade. */
export function complementGridClass(count: number): string {
  const base = "grid grid-cols-1 gap-4"
  if (count <= 1) return base
  if (count === 2) return `${base} lg:grid-cols-2`
  return `${base} lg:grid-cols-2 min-[1280px]:grid-cols-3 lg:[&>*:last-child]:col-span-2 min-[1280px]:[&>*:last-child]:col-span-1`
}
