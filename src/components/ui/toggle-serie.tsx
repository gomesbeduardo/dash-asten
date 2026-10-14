import { CheckIcon } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/**
 * Liga/desliga uma série do gráfico. Ligada: preenchida com check; desligada:
 * contorno tracejado, texto riscado e sem check (a forma muda além da cor).
 */
export function ToggleSerie({
  ligada,
  onAlternar,
  ultima,
  cor,
  tracejado,
  rotulo,
}: {
  ligada: boolean
  onAlternar: () => void
  /** Última série visível: não pode ser desligada. */
  ultima?: boolean
  cor: string
  tracejado?: boolean
  rotulo: string
}) {
  return (
    <Toggle
      pressed={ligada}
      aria-disabled={ultima || undefined}
      title={ultima ? "Ao menos uma série fica visível" : undefined}
      onPressedChange={() => {
        if (!ultima) onAlternar()
      }}
      className={cn(
        "press gap-2 rounded-lg border-2 bg-card px-3 data-[state=on]:border-ring data-[state=on]:bg-brand-soft data-[state=on]:font-semibold data-[state=on]:text-brand-ink data-[state=on]:hover:bg-brand-soft data-[state=off]:border-dashed data-[state=off]:border-input data-[state=off]:text-muted-foreground data-[state=off]:line-through",
        ultima && "cursor-not-allowed"
      )}
    >
      <CheckIcon
        aria-hidden
        className={cn("size-5", !ligada && "invisible")}
      />
      <span
        aria-hidden
        className="inline-block h-0 w-6 border-t-[4px]"
        style={{
          borderColor: cor,
          borderTopStyle: tracejado ? "dashed" : "solid",
        }}
      />
      {rotulo}
    </Toggle>
  )
}
