// Tokens de movimento (D26). Espelhados como variáveis CSS em index.css (--motion-*).
export const duration = { fast: 0.15, base: 0.25, slow: 0.4 } as const
export const ease = {
  standard: [0.4, 0, 0.2, 1],
  emphasized: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>
export const stagger = 0.11
export const crossfade = 0.2 // troca de aba
export const saida = 0.08 // s, saída curta do fade cruzado (some rápido, sem tela vazia)
export const countUp = 1 // contagem dos números
export const chartGrow = 600 // ms, crescimento de barras e linhas
export const rise = 10 // px, subida da entrada (8–12)

type Bezier = [number, number, number, number]
export const standard = ease.standard as unknown as Bezier
export const emphasized = ease.emphasized as unknown as Bezier

// Mola do indicador da aba ativa (TopBar): assenta suave, com um leve esticar.
// Mais firme que antes (380/30): o indicador chega a ±1 px do destino em ~230 ms
// (era ~310), antes de o conteúdo novo começar a montar (~345 ms).
export const molaAba = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.9,
} as const

// Teto da espera pelo indicador da aba antes de montar o conteúdo novo (ms).
export const esperaTrocaAba = 300
