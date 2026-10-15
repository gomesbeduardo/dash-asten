/** Selo de variação: [seta + valor] colorido, seguido do período em cinza. Cor e seta dizem melhor/pior; o aria-label diz por extenso. */
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
  SparklesIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { DeltaUI } from "./logica"

const TOM = {
  bom: "bg-[color-mix(in_srgb,var(--chart-3)_13%,var(--card))] text-positive",
  ruim: "bg-[color-mix(in_srgb,var(--late)_11%,var(--card))] text-late",
  neutro: "bg-muted text-muted-foreground",
} as const

const ICONE = { alta: ArrowUpIcon, queda: ArrowDownIcon, igual: MinusIcon }

/** O selo em si (a pílula), para quem monta a linha por conta própria. */
export function Pilula({
  tom,
  children,
  className,
}: {
  tom: keyof typeof TOM
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      data-tom={tom}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-base leading-snug font-semibold whitespace-nowrap",
        TOM[tom],
        className
      )}
    >
      {children}
    </span>
  )
}

export function SeloDelta({
  delta,
  grande = false,
  className,
}: {
  delta: Pick<DeltaUI, "sentido" | "tom" | "texto" | "periodo" | "aria">
  grande?: boolean
  className?: string
}) {
  const Seta = ICONE[delta.sentido]
  return (
    <p
      role="group"
      aria-label={delta.aria}
      data-tom={delta.tom}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}
    >
      <Pilula tom={delta.tom} className={grande ? "text-lg" : undefined}>
        <Seta className="size-4 shrink-0" aria-hidden />
        <span className="num">{delta.texto}</span>
      </Pilula>
      <span
        className={cn(
          "text-muted-foreground",
          grande ? "text-lg" : "text-base"
        )}
      >
        {delta.periodo}
      </span>
    </p>
  )
}

/** Variação de uma contagem (sem "melhor/pior"): "+3", "−1", "0". */
export function deltaDeContagem(
  atual: number,
  anterior: number,
  periodo: string
): DeltaUI {
  const dif = atual - anterior
  const texto =
    dif === 0
      ? "0"
      : `${dif > 0 ? "+" : "−"}${new Intl.NumberFormat("pt-BR").format(Math.abs(dif))}`
  return {
    texto,
    periodo,
    aria: `${texto} em relação a ${periodo}`,
    sentido: dif > 0 ? "alta" : dif < 0 ? "queda" : "igual",
    tom: "neutro",
    rotuloTom: "",
  }
}

/** Situação que não existia no período-base. */
export function SeloNova({ periodo }: { periodo: string }) {
  return (
    <p
      role="group"
      aria-label={`nova, não estava em ${periodo}`}
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      <Pilula tom="neutro" className="bg-primary/10 text-primary">
        <SparklesIcon className="size-4 shrink-0" aria-hidden />
        nova
      </Pilula>
      <span className="text-base text-muted-foreground">
        não estava em {periodo}
      </span>
    </p>
  )
}
