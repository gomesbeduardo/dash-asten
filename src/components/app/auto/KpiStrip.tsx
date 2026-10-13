import type { AutoKpi } from "@/core"
import { KpiCard } from "./KpiCard"

export function KpiStrip({ kpis, entry }: { kpis: AutoKpi[]; entry: boolean }) {
  if (kpis.length === 0) return null
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
      {kpis.slice(0, 6).map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} entry={entry} />
      ))}
    </div>
  )
}
