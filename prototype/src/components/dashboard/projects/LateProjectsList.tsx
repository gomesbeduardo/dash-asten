import { AlertTriangle } from "lucide-react"
import type { ProjectRow } from "@/data/mock"
import { daysLate } from "@/lib/projects"
import { fmtPct } from "@/lib/format"

export const LATE_TOP = 5

export function LateProjectsList({ late }: { late: ProjectRow[] }) {
  const top = late.slice(0, LATE_TOP)
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {top.map((p, i) => {
          const pct = p.conclusao ?? 0
          const n = daysLate(p)
          return (
            <li key={p.id} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-x-3 gap-y-1">
              <span className="num pt-0.5 text-sm text-muted-foreground">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.nome}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.area} · {p.responsavel}
                </p>
              </div>
              <p className="flex items-center gap-1 text-sm font-semibold text-[var(--late)]">
                <AlertTriangle aria-hidden className="size-4" />
                <span className="num">{n}</span> {n === 1 ? "dia" : "dias"} de atraso
              </p>
              <span />
              <div className="col-span-2 flex items-center gap-2">
                <div
                  role="progressbar"
                  aria-label={`Conclusão de ${p.nome}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${pct}%` }} />
                </div>
                <span className="num w-12 text-right text-sm">{fmtPct(p.conclusao)}</span>
              </div>
            </li>
          )
        })}
      </ol>
      {late.length > LATE_TOP && (
        <a href="#projetos-tabela" className="text-sm font-medium text-[var(--brand)] underline underline-offset-4">
          Ver todos os {late.length} na tabela
        </a>
      )}
    </div>
  )
}
