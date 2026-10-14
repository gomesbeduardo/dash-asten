import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"

import {
  buildAutoDashboard,
  type Row,
  type Sheet,
  type SheetFilters,
} from "@/core"
import { GenericTable } from "../GenericTable"
import { entryContainer } from "../motion/variants"
import { AutoChartCard } from "./AutoChartCard"
import { complementGridClass } from "./chartTheme"
import { KpiStrip } from "./KpiStrip"

export type PanelProps = {
  sheet: Sheet
  rows: Row[]
  filters: SheetFilters
  /** true na 1ª abertura da aba após importar: toca a entrada única (D26). */
  entry?: boolean
}

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
            <div className={complementGridClass(Math.min(others.length, 3))}>
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
