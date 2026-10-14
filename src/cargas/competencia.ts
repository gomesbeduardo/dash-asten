import type { Competencia } from "./types"

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
const ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const pad = (n: number) => String(n).padStart(2, "0")

function partes(c: Competencia): [number, number] {
  const [a, m] = c.split("-")
  return [Number(a), Number(m)]
}

export function ehCompetencia(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

export function competenciaDe(date: Date): Competencia {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function competenciaAnterior(c: Competencia): Competencia {
  const [a, m] = partes(c)
  return m === 1 ? `${a - 1}-12` : `${a}-${pad(m - 1)}`
}

export function inicioDaCompetencia(c: Competencia): Date {
  const [a, m] = partes(c)
  return new Date(Date.UTC(a, m - 1, 1))
}

export function fimDaCompetencia(c: Competencia): Date {
  const [a, m] = partes(c)
  return new Date(Date.UTC(a, m, 1) - 1)
}

export function formatarCompetencia(c: Competencia, estilo: "curto" | "longo" = "curto"): string {
  const [a, m] = partes(c)
  return estilo === "longo" ? `${MESES[m - 1]} de ${a}` : `${ABREV[m - 1]}/${String(a).slice(-2)}`
}

export function listarEntre(a: Competencia, b: Competencia): Competencia[] {
  const out: Competencia[] = []
  let [ano, mes] = partes(a)
  const [fa, fm] = partes(b)
  while (ano < fa || (ano === fa && mes <= fm)) {
    out.push(`${ano}-${pad(mes)}`)
    if (++mes > 12) { mes = 1; ano++ }
  }
  return out
}
