/** Aparência comum das barras: base reta, ponta arredondada, gradiente leve, sombra suave e grade tracejada. */
export type Orientacao = "horizontal" | "vertical"

/** Raio das barras do Recharts: a base (no eixo) fica reta e só a ponta é arredondada (meia espessura). */
export function raioBarra(
  espessura: number,
  orientacao: Orientacao = "horizontal"
): [number, number, number, number] {
  const r = espessura / 2
  return orientacao === "horizontal" ? [0, r, r, 0] : [r, r, 0, 0]
}

/** Tom 12% mais claro na base, cor cheia na ponta. */
export const gradienteBarra = (
  cor: string,
  orientacao: Orientacao = "horizontal"
) =>
  `linear-gradient(${orientacao === "horizontal" ? "90deg" : "0deg"}, color-mix(in srgb, ${cor} 88%, var(--card)), ${cor})`

export const SOMBRA_BARRA =
  "0 3px 7px -1px color-mix(in srgb, var(--foreground) 22%, transparent)"

/** Mesma sombra para as barras desenhadas em SVG pelo Recharts. */
export const SOMBRA_BARRA_SVG =
  "[&_.recharts-bar-rectangle_path]:[filter:drop-shadow(0_3px_3px_color-mix(in_srgb,var(--foreground)_20%,transparent))]"

/** Linha de grade tracejada e discreta (CartesianGrid do Recharts). */
export const TRACEJADO_GRADE = "2 4"

/** Grade vertical tracejada (CSS) para as barras em HTML: linhas a cada quarto da trilha. */
export const GRADE_HTML = [0, 25, 50, 75]
  .map(
    (x) =>
      `repeating-linear-gradient(to bottom, color-mix(in srgb, var(--muted-foreground) 28%, transparent) 0 3px, transparent 3px 7px) ${x}% 0 / 1px 100% no-repeat`
  )
  .join(", ")
