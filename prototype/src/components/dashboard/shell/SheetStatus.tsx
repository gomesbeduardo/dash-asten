import { CheckCircle2, CircleAlert, ListChecks, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SHEETS, type DiagnosticState } from "@/config/sheets"

const ICON: Record<DiagnosticState, { Icon: typeof CheckCircle2; cls: string; label: string }> = {
  ok: { Icon: CheckCircle2, cls: "text-chart-3", label: "Reconhecida" },
  partial: { Icon: CircleAlert, cls: "text-chart-4", label: "Parcial" },
  incompatible: { Icon: XCircle, cls: "text-late", label: "Incompatível" },
}

export function SheetStatus() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 px-3 text-base">
          <ListChecks aria-hidden /> Status das abas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-3 p-4">
        <p className="text-lg font-semibold">Status das abas</p>
        <ul className="flex flex-col gap-3">
          {SHEETS.map((s) => {
            const { Icon, cls, label } = ICON[s.diagnostic.state]
            return (
              <li key={s.id} className="flex items-start gap-3 text-base">
                <Icon className={`mt-0.5 size-5 shrink-0 ${cls}`} aria-hidden />
                <div>
                  <p className="font-medium">
                    {s.name} <span className="font-normal text-muted-foreground">({label})</span>
                  </p>
                  <p className="text-muted-foreground">{s.diagnostic.summary}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
