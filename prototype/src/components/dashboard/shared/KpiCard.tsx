import { CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { KpiCardProps } from "./contracts"

const TONE = {
  good: { text: "Bom", cls: "text-chart-3", Icon: CheckCircle2 },
  bad: { text: "Atenção", cls: "text-late", Icon: AlertTriangle },
} as const

export function KpiCard({ label, value, hint, tone = "neutral", icon }: KpiCardProps) {
  const t = tone === "neutral" ? null : TONE[tone]
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border bg-card shadow-[var(--shadow-card)] p-5">
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        {icon && <span aria-hidden>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="num font-display text-5xl leading-none font-semibold text-brand-ink">{value}</div>
      <div className="flex min-h-6 items-center gap-2 text-base">
        {t && (
          <span className={cn("inline-flex items-center gap-1 font-medium", t.cls)}>
            <t.Icon className="size-4" aria-hidden />
            {t.text}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}
