import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/**
 * Liga/desliga uma série do gráfico. Legenda neutra (marcador de cor + nome, sem cara de botão
 * de ação); desligada: contorno tracejado e texto riscado (a forma muda além da cor).
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
        "press min-w-0 gap-2 rounded-md border border-transparent bg-transparent px-2.5 text-base font-normal text-foreground hover:bg-muted data-[state=off]:border-dashed data-[state=off]:border-input data-[state=off]:text-muted-foreground data-[state=off]:line-through data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:hover:bg-muted",
        ultima && "cursor-not-allowed"
      )}
    >
      <span
        aria-hidden
        className="inline-block h-0 w-5 shrink-0 border-t-[4px]"
        style={{
          borderColor: cor,
          borderTopStyle: tracejado ? "dashed" : "solid",
        }}
      />
      {rotulo}
    </Toggle>
  )
}
