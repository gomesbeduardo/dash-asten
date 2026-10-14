import { useState } from "react"

import { ToggleSerie } from "@/components/ui/toggle-serie"

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
            <ToggleSerie
              ligada={!oculta}
              ultima={ultima}
              cor={i.cor}
              tracejado={i.tracejado}
              rotulo={i.rotulo}
              onAlternar={() => onAlternar(i.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}
