import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"

import { buildAutoDashboard } from "@/core"
import type { PanelProps } from "@/panels/registry"
import { GenericTable } from "../GenericTable"
import { entryContainer } from "../motion/variants"
import { AutoChartCard } from "./AutoChartCard"
import { KpiStrip } from "./KpiStrip"

/** Painel da aba sem painel específico (D25): KPIs + gráficos automáticos + tabela. */
export function AutoPanel({
  sheet,
  rows,
  entry = false,
}: PanelProps & { entry?: boolean }) {
  const reduce = useReducedMotion()
  const dash = useMemo(() => buildAutoDashboard(sheet, rows), [sheet, rows])
  const [main, ...others] = dash.charts
  const play = entry && !reduce

  return (
    <div className="flex flex-col gap-8">
      {(dash.kpis.length > 0 || main) && (
        <motion.div
          className="flex flex-col gap-4"
          variants={entryContainer}
          initial={play ? "hidden" : false}
          animate="show"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-2xl text-primary">Visão geral</h2>
            <span className="rounded-full border px-3 py-0.5 text-sm text-muted-foreground">
              automático
            </span>
          </div>
          <KpiStrip kpis={dash.kpis} entry={play} />
          {main && <AutoChartCard chart={main} main entry={play} />}
          {others.length > 0 && (
            <div className="grid grid-cols-1 gap-4 min-[1500px]:grid-cols-3 lg:grid-cols-2">
              {others.slice(0, 3).map((c) => (
                <AutoChartCard key={c.id} chart={c} entry={play} />
              ))}
            </div>
          )}
        </motion.div>
      )}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl text-primary">Dados</h2>
        <GenericTable key={sheet.id} sheet={sheet} rows={rows} />
      </div>
    </div>
  )
}
