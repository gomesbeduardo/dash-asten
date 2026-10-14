import type { Workbook } from "@/core"
import type { TipoDeConjunto } from "./types"

const LIMIAR = 0.6

export const TIPO_OUTRO: TipoDeConjunto = {
  id: "outro",
  nome: "Outro",
  descricao: "Planilha que não corresponde a um tipo conhecido.",
  reconhecer: () => 0,
}

let registrados: TipoDeConjunto[] = []

/** Registra (ou substitui, pelo id) um tipo de conjunto. */
export function registrarTipo(t: TipoDeConjunto): void {
  registrados = [...registrados.filter((r) => r.id !== t.id), t]
}

export function tiposRegistrados(): TipoDeConjunto[] {
  return [TIPO_OUTRO, ...registrados]
}

export function limparRegistroParaTeste(): void {
  registrados = []
}

export function reconhecerTipo(workbook: Workbook): { tipo: TipoDeConjunto; pontuacao: number } {
  let melhor = { tipo: TIPO_OUTRO, pontuacao: 0 }
  for (const t of registrados) {
    const p = t.reconhecer(workbook)
    if (p >= LIMIAR && p > melhor.pontuacao) melhor = { tipo: t, pontuacao: p }
  }
  return melhor
}
