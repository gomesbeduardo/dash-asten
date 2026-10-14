import type { Workbook } from "@/core"
import { competenciaAnterior, competenciaDe } from "./competencia"
import type { Competencia, OrigemCompetencia } from "./types"

const NOMES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Mês em número junto do ano: 2026-07, 2026_07, 2026.07, 202607, 07-2026, 07/2026, 7-2026. */
function mesNumerico(texto: string): Competencia | null {
  const anoMes = texto.match(/(?<!\d)(20\d{2})(?:[-_./ ](0?[1-9]|1[0-2])|(0[1-9]|1[0-2]))(?!\d)/)
  if (anoMes) return `${anoMes[1]}-${pad(Number(anoMes[2] ?? anoMes[3]))}`
  const mesAno = texto.match(/(?<!\d)(0?[1-9]|1[0-2])[-_./ ](20\d{2})(?!\d)/)
  if (mesAno) return `${mesAno[2]}-${pad(Number(mesAno[1]))}`
  return null
}

/** Procura um mês (número+ano ou nome pt-BR por palavra inteira) e, junto do nome, um ano de 4 dígitos. */
function mesNoTexto(texto: string, hoje: Date): Competencia | null {
  const numerico = mesNumerico(texto)
  if (numerico) return numerico
  const tokens = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().match(/[a-z]+|\d+/g) ?? []
  const idx = tokens.findIndex((t) => t in NOMES)
  if (idx < 0) return null
  const mes = NOMES[tokens[idx]]
  const ano4 = tokens.find((t) => /^(19|20)\d{2}$/.test(t))
  if (ano4) return `${ano4}-${pad(mes)}`
  const mesHoje = hoje.getUTCMonth() + 1
  const ano = mes <= mesHoje ? hoje.getUTCFullYear() : hoje.getUTCFullYear() - 1
  return `${ano}-${pad(mes)}`
}

function dataMaxima(workbook: Workbook): Date | null {
  let max: Date | null = null
  for (const sheet of workbook.sheets) {
    for (const col of sheet.columns) {
      if (col.type !== "date") continue
      for (const row of sheet.rows) {
        const v = row[col.key]
        if (!(v instanceof Date) || Number.isNaN(v.getTime()) || v.getUTCFullYear() < 1901) continue
        if (!max || v > max) max = v
      }
    }
  }
  return max
}

export function inferirCompetencia(
  workbook: Workbook,
  arquivo: string,
  hoje: Date = new Date(),
): { competencia: Competencia; origem: OrigemCompetencia } {
  for (const sheet of workbook.sheets) {
    const c = mesNoTexto(sheet.name, hoje)
    if (c) return { competencia: c, origem: "aba" }
  }
  const doArquivo = mesNoTexto(arquivo, hoje)
  if (doArquivo) return { competencia: doArquivo, origem: "arquivo" }

  const atual = competenciaDe(hoje)
  const anterior = competenciaAnterior(atual)
  const max = dataMaxima(workbook)
  if (max) {
    const c = competenciaDe(max)
    if (c === atual || c === anterior) return { competencia: c, origem: "datas" }
  }
  return { competencia: anterior, origem: "mes-anterior" }
}
