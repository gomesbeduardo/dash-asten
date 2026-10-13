import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, CircleSlash, TriangleAlert } from "lucide-react"
import type { IndicatorRow } from "@/data/mock"
import { fmtMonth, fmtNum, fmtPct, MISSING } from "@/lib/format"

export type Situacao = "na-meta" | "abaixo" | "sem-dado"

export type DetailRow = IndicatorRow & { ating: number | null; situacao: Situacao }

export function toDetailRows(rows: IndicatorRow[]): DetailRow[] {
  return rows.map((r) => {
    const ok = r.meta !== null && r.realizado !== null
    const ating = ok && r.meta !== 0 ? ((r.realizado as number) / (r.meta as number)) * 100 : null
    const situacao: Situacao = !ok ? "sem-dado" : (r.realizado as number) >= (r.meta as number) ? "na-meta" : "abaixo"
    return { ...r, ating, situacao }
  })
}

const SITUACAO = {
  "na-meta": { text: "Na meta", cls: "text-chart-3", Icon: CheckCircle2 },
  abaixo: { text: "Abaixo da meta", cls: "text-late", Icon: TriangleAlert },
  "sem-dado": { text: "Sem dado", cls: "text-muted-foreground", Icon: CircleSlash },
} as const

const rank: Record<Situacao, number> = { abaixo: 0, "sem-dado": 1, "na-meta": 2 }

export const detailColumns: ColumnDef<DetailRow, unknown>[] = [
  { accessorKey: "area", header: "Área" },
  { accessorKey: "indicador", header: "Indicador" },
  { accessorKey: "mes", header: "Mês", cell: ({ row }) => fmtMonth(row.original.mes) },
  {
    accessorKey: "meta",
    header: "Meta",
    cell: ({ row }) => <span className="num">{fmtNum(row.original.meta)}</span>,
  },
  {
    accessorKey: "realizado",
    header: "Realizado",
    cell: ({ row }) => <span className="num">{fmtNum(row.original.realizado)}</span>,
  },
  {
    accessorKey: "ating",
    header: "Atingimento %",
    cell: ({ row }) => <span className="num">{row.original.ating === null ? MISSING : fmtPct(row.original.ating, 1)}</span>,
  },
  {
    accessorKey: "situacao",
    header: "Situação",
    sortingFn: (a, b) => rank[a.original.situacao] - rank[b.original.situacao],
    cell: ({ row }) => {
      const s = SITUACAO[row.original.situacao]
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium ${s.cls}`}>
          <s.Icon className="size-4" aria-hidden />
          {s.text}
        </span>
      )
    },
  },
]
