/** Indicadores do Painel e do Comparar: uma fonte só para os destaques e os grupos com rótulo. */
export const DESTAQUES = ["naoFinalizados", "finalizados", "atraso", "sla"] as const

/** Os 8 indicadores compactos, em dois grupos com rótulo (os destaques ficam à parte). */
export const GRUPOS_KPI = [
  {
    titulo: "Fluxo",
    ids: ["entradas", "reabertos", "aguardandoAceite", "semSla"],
  },
  {
    titulo: "Prazo",
    ids: ["slaVencido", "slaRenegociado", "tempoMedio", "tempoAceite"],
  },
] as const
