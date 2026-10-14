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

/** Colunas de prazo/atualização não são eventos do chamado (abertura, solução). */
const NAO_E_EVENTO = /(?<![a-z])(sla|prazo|previst[oa]s?|vencimento|atualizac\w*|modificac\w*|nascimento)(?![a-z])/

/**
 * Mês mais recente com volume significativo de eventos (abertura e solução somados):
 * conta por mês as datas de todas as colunas de evento e pega o último mês com pelo
 * menos max(5, 10% da mediana) eventos.
 */
function mesDasDatas(workbook: Workbook, hoje: Date): Competencia | null {
  const porMes = new Map<Competencia, number>()
  for (const sheet of workbook.sheets) {
    for (const col of sheet.columns) {
      if (NAO_E_EVENTO.test(semAcento(col.label))) continue
      for (const d of datasDaColuna(sheet, col, hoje)) {
        const c = competenciaDe(d)
        porMes.set(c, (porMes.get(c) ?? 0) + 1)
      }
    }
  }
  if (porMes.size === 0) return null
  const contagens = [...porMes.values()].sort((a, b) => a - b)
  const meio = Math.floor(contagens.length / 2)
  const mediana = contagens.length % 2 ? contagens[meio] : (contagens[meio - 1] + contagens[meio]) / 2
  const minimo = Math.max(5, mediana * 0.1)
  const meses = [...porMes.keys()].sort().reverse()
  return meses.find((m) => porMes.get(m)! >= minimo) ?? meses[0]
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
