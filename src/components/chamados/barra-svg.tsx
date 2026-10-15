/** Peças SVG das barras do Recharts: degradê leve e coluna de base reta com ponta arredondada. */
import type { Orientacao } from "./barra-estilo"

const slug = (cor: string) => cor.replace(/[^a-z0-9]/gi, "")
export const idGradiente = (cor: string, o: Orientacao = "horizontal") =>
  `gb-${o[0]}-${slug(cor)}`
export const urlGradiente = (cor: string, o: Orientacao = "horizontal") =>
  `url(#${idGradiente(cor, o)})`

/** Um degradê por cor: do tom 12% mais claro (base) à cor cheia (ponta). */
export function DefsGradiente({
  cores,
  orientacao = "horizontal",
}: {
  cores: string[]
  orientacao?: Orientacao
}) {
  const h = orientacao === "horizontal"
  return (
    <defs>
      {[...new Set(cores)].map((cor) => (
        <linearGradient
          key={cor}
          id={idGradiente(cor, orientacao)}
          x1={h ? "0" : "0"}
          y1={h ? "0" : "1"}
          x2={h ? "1" : "0"}
          y2="0"
        >
          <stop
            offset="0"
            style={{ stopColor: `color-mix(in srgb, ${cor} 88%, white)` }}
          />
          <stop offset="1" style={{ stopColor: cor }} />
        </linearGradient>
      ))}
    </defs>
  )
}

/** Coluna vertical: reta embaixo (base), arredondada em cima. */
export function ColunaTopoArredondada({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  fill: string
}) {
  if (height <= 0 || width <= 0) return null
  const r = Math.min(width / 2, height)
  return (
    <path
      data-coluna=""
      d={`M${x},${y + height} L${x},${y + r} A${r},${r} 0 0 1 ${x + r},${y} L${x + width - r},${y} A${r},${r} 0 0 1 ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={fill}
    />
  )
}
