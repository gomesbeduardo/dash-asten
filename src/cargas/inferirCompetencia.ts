import type { Column, Sheet, Workbook } from "@/core"
import { competenciaAnterior, competenciaDe } from "./competencia"
import { dataEmTexto, mesEmTexto } from "./mesEmTexto"
import type { Competencia, OrigemCompetencia } from "./types"

const PALAVRA_CHAVE = /(?<![a-z])(competencia|referencia|mes|periodo)(?![a-z])/
const LINHAS_DE_TITULO = 5
const ROTULO_DE_DATA = /(?<![a-z])(data|dt|date)(?![a-z])/
const MIN_ANO = 2000

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Rótulos de coluna (um único mês, com ano) e células "Competência/Referência/Mês/Período" nas primeiras linhas. */
function mesNosTitulos(workbook: Workbook, hoje: Date): Competencia | null {
  for (const sheet of workbook.sheets) {
    const doRotulo = new Set<Competencia>()
    for (const col of sheet.columns) {
      const c = mesEmTexto(col.label, hoje)
      // sem ano explícito (ex.: colunas Jan, Fev, Mar) não é competência
      if (c && /\d/.test(col.label)) doRotulo.add(c)
    }
    if (doRotulo.size === 1) return [...doRotulo][0]
  }
  for (const sheet of workbook.sheets) {
    for (const row of sheet.rows.slice(0, LINHAS_DE_TITULO)) {
      const celulas = sheet.columns.map((c) => row[c.key])
      for (const [i, v] of celulas.entries()) {
        if (typeof v !== "string" || !PALAVRA_CHAVE.test(semAcento(v))) continue
        const proprio = mesEmTexto(v, hoje)
        if (proprio) return proprio
        for (const outro of [...celulas.slice(i + 1), ...celulas.slice(0, i)]) {
          if (outro instanceof Date && !Number.isNaN(outro.getTime()) && outro.getUTCFullYear() >= MIN_ANO) return competenciaDe(outro)
          const c = typeof outro === "string" ? mesEmTexto(outro, hoje) : null
          if (c) return c
        }
      }
    }
  }
  return null
}

const SERIAL_MIN = 20000
const SERIAL_MAX = 80000
const serialParaData = (n: number) => new Date(Math.round((n - 25569) * 86400000))

/** Datas válidas (>= 2000 e não futuras) de uma coluna, em qualquer dos formatos reconhecidos. */
function datasDaColuna(sheet: Sheet, col: Column, hoje: Date): Date[] {
  const valores = sheet.rows.map((r) => r[col.key]).filter((v) => v !== null && v !== undefined)
  let datas: (Date | null)[]
  if (col.type === "date") {
    datas = valores.map((v) => (v instanceof Date ? v : null))
  } else if (col.type === "text") {
    datas = valores.map((v) => (typeof v === "string" ? dataEmTexto(v, hoje) : null))
    if (datas.filter(Boolean).length < valores.length * 0.8) return []
  } else if (col.type === "number" && ROTULO_DE_DATA.test(semAcento(col.label))) {
    datas = valores.map((v) => (typeof v === "number" && v >= SERIAL_MIN && v <= SERIAL_MAX ? serialParaData(v) : null))
  } else return []
  const limite = hoje.getTime() + 86400000
  return datas.filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= MIN_ANO && d.getTime() < limite)
}

/**
 * Mês mais recente com volume significativo na coluna de evento (a com mais datas válidas):
 * conta por mês e pega o último mês com pelo menos 30% da mediana dos meses com dados.
 */
function mesDasDatas(workbook: Workbook, hoje: Date): Competencia | null {
  let melhor: Date[] = []
  for (const sheet of workbook.sheets) {
    for (const col of sheet.columns) {
      const datas = datasDaColuna(sheet, col, hoje)
      if (datas.length > melhor.length) melhor = datas
    }
  }
  if (melhor.length === 0) return null
  const porMes = new Map<Competencia, number>()
  for (const d of melhor) porMes.set(competenciaDe(d), (porMes.get(competenciaDe(d)) ?? 0) + 1)
  const contagens = [...porMes.values()].sort((a, b) => a - b)
  const meio = Math.floor(contagens.length / 2)
  const mediana = contagens.length % 2 ? contagens[meio] : (contagens[meio - 1] + contagens[meio]) / 2
  const meses = [...porMes.keys()].sort().reverse()
  return meses.find((m) => porMes.get(m)! >= mediana * 0.3) ?? meses[0]
}

export function inferirCompetencia(
  workbook: Workbook,
  arquivo: string,
  hoje: Date = new Date(),
): { competencia: Competencia; origem: OrigemCompetencia } {
  for (const sheet of workbook.sheets) {
    const c = mesEmTexto(sheet.name, hoje)
    if (c) return { competencia: c, origem: "aba" }
  }
  const doArquivo = mesEmTexto(arquivo, hoje)
  if (doArquivo) return { competencia: doArquivo, origem: "arquivo" }

  const doTitulo = mesNosTitulos(workbook, hoje)
  if (doTitulo) return { competencia: doTitulo, origem: "titulo" }

  const dasDatas = mesDasDatas(workbook, hoje)
  if (dasDatas) return { competencia: dasDatas, origem: "datas" }

  return { competencia: competenciaAnterior(competenciaDe(hoje)), origem: "mes-anterior" }
}
