import { useId, useState } from "react"
import { BarChart3, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChartCardProps } from "./contracts"

export function ChartCard({ title, subtitle, isEmpty, dataView, children, className }: ChartCardProps) {
  const [showData, setShowData] = useState(false)
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-3 rounded-[12px] border bg-card shadow-[var(--shadow-card)] p-5", className)}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={titleId} className="font-display text-xl leading-tight font-semibold text-brand-ink">
            {title}
          </h3>
          <p className="mt-0.5 text-base text-muted-foreground">{subtitle}</p>
        </div>
        {!isEmpty && (
          <Button
            variant="outline"
            aria-pressed={showData}
            onClick={() => setShowData((v) => !v)}
            className="h-10 shrink-0 gap-2 px-3 text-base"
          >
            {showData ? <BarChart3 aria-hidden /> : <Table2 aria-hidden />}
            {showData ? "Ver gráfico" : "Ver dados"}
          </Button>
        )}
      </header>
      {isEmpty ? (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-base text-muted-foreground">
          Sem dados para este filtro
        </div>
      ) : showData ? (
        <div className="min-w-0 flex-1 overflow-auto">{dataView}</div>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </section>
  )
}
