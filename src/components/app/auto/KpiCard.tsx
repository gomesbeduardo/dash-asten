import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import type { AutoKpi } from "@/core"
import { AnimatedNumber } from "../motion/AnimatedNumber"
import { entryItem } from "../motion/variants"

const TONE = {
  good: { Icon: CircleCheckIcon, text: "Bom", cls: "text-positive" },
  bad: { Icon: TriangleAlertIcon, text: "Atenção", cls: "text-late" },
} as const

export function KpiCard({ kpi, entry }: { kpi: AutoKpi; entry: boolean }) {
  const reduce = useReducedMotion()
  const tone = kpi.tone && kpi.tone !== "neutral" ? TONE[kpi.tone] : null
  return (
    <motion.article
      variants={reduce ? undefined : entryItem}
      aria-label={kpi.label}
      className="flex min-w-0 flex-col gap-2 rounded-lg bg-card p-5 shadow-(--shadow-card)"
    >
      <h3 className="font-sans text-lg leading-tight font-medium text-muted-foreground">
        {kpi.label}
      </h3>
      <AnimatedNumber
        value={kpi.value}
        format={kpi.format}
        display={kpi.display}
        fromZero={entry}
        className="num font-display text-[2.75rem] leading-none font-semibold [overflow-wrap:anywhere] text-primary"
      />
      {tone && (
        <p
          className={`flex items-center gap-1.5 text-base font-medium ${tone.cls}`}
        >
          <tone.Icon className="size-5" aria-hidden /> {tone.text}
        </p>
      )}
      {kpi.hint && (
        <p className="text-base text-muted-foreground">{kpi.hint}</p>
      )}
    </motion.article>
  )
}
