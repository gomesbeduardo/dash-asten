// Tokens de movimento (D26). Espelhados como variáveis CSS em index.css (--motion-*).
export const duration = { fast: 0.15, base: 0.25, slow: 0.4 } as const
export const ease = {
  standard: [0.4, 0, 0.2, 1],
  emphasized: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>
export const stagger = 0.11
export const crossfade = 0.2 // troca de aba
export const countUp = 1 // contagem dos números
export const chartGrow = 600 // ms, crescimento de barras e linhas
export const rise = 10 // px, subida da entrada (8–12)

type Bezier = [number, number, number, number]
export const standard = ease.standard as unknown as Bezier
export const emphasized = ease.emphasized as unknown as Bezier
