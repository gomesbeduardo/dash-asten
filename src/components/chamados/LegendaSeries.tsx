import { useState } from "react"

import { cn } from "@/lib/utils"

export type ItemLegenda = {
  id: string
  rotulo: string
  cor: string
  tracejado?: boolean
}

/**
 * Estado de séries ocultas de um gráfico. Volta a "tudo visível" quando a
 * `chave` muda (competência/visão/séries diferentes). Não persiste.
 * Nunca deixa todas ocultas.
 */
export function useSeriesOcultas(chave: string, ids: string[]) {
  const [estado, setEstado] = useState<{ chave: string; ocultas: string[] }>({
    chave,
    ocultas: [],
  })
  const ocultas = estado.chave === chave ? estado.ocultas : []
  const visiveis = ids.filter((i) => !ocultas.includes(i))
  const alternar = (id: string) => {
    const atuais = estado.chave === chave ? estado.ocultas : []
    if (atuais.includes(id)) {
      setEstado({ chave, ocultas: atuais.filter((x) => x !== id) })
    } else if (ids.filter((i) => !atuais.includes(i)).length > 1) {
      setEstado({ chave, ocultas: [...atuais, id] })
    }
  }
  return { ocultas, visiveis, alternar }
}

/** Legenda clicável (liga/desliga série). Só aparece com 2+ séries; mesma interação do AutoChartCard. */
export function LegendaSeries({
  itens,
  ocultas,
  onAlternar,
}: {
  itens: ItemLegenda[]
  ocultas: string[]
  onAlternar: (id: string) => void
}) {
  if (itens.length < 2) return null
  const restantes = itens.filter((i) => !ocultas.includes(i.id)).length
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Séries">
      {itens.map((i) => {
        const oculta = ocultas.includes(i.id)
        const ultima = !oculta && restantes <= 1
        return (
          <li key={i.id}>
            <button
              type="button"
              aria-pressed={!oculta}
              aria-disabled={ultima || undefined}
              title={ultima ? "Ao menos uma série fica visível" : undefined}
              onClick={() => {
                if (!ultima) onAlternar(i.id)
              }}
              className={cn(
                "press flex min-h-11 items-center gap-2 rounded-md border px-3 text-base focus-visible:outline-2 focus-visible:outline-ring",
                oculta
                  ? "text-muted-foreground line-through"
                  : "bg-accent/50 font-medium",
                ultima && "cursor-not-allowed"
              )}
            >
              <span
                aria-hidden
                className="inline-block h-0 w-6 border-t-[4px]"
                style={{
                  borderColor: i.cor,
                  borderTopStyle: i.tracejado ? "dashed" : "solid",
                }}
              />
              {i.rotulo}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
