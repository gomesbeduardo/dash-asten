import { read, utils } from "xlsx"
import { WorkbookError } from "./errors"
import { canonical } from "./format"
import type { CellValue, Column, ColumnType, Row, Sheet, Workbook } from "./types"

const MAX_FILTER_VALUES = 30

function slugify(text: string, fallback: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

function uniqueSlug(text: string, fallback: string, used: Set<string>): string {
  const base = slugify(text, fallback)
  let slug = base
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
  used.add(slug)
  return slug
}

function isXlsxLike(data: ArrayBuffer): boolean {
  const b = new Uint8Array(data, 0, Math.min(4, data.byteLength))
  const zip = b[0] === 0x50 && b[1] === 0x4b // "PK": .xlsx
  const ole = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 // .xls antigo
  return zip || ole
}

function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const text = String(value).trim()
  return text === "" ? null : text
}

function inferType(values: CellValue[]): ColumnType {
  const present = values.filter((v) => v !== null)
  if (present.length === 0) return "empty"
  if (present.every((v) => v instanceof Date)) return "date"
  if (present.every((v) => typeof v === "number")) return "number"
  return "text"
}

const ID_LABEL = /^(id|cod(igo)?|n[o°º]\.?|numero|protocolo|chamado|os)$/

function isTimeOnly(values: CellValue[]): boolean {
  const dates = values.filter((v): v is Date => v instanceof Date)
  if (dates.length === 0 || dates.length !== values.filter((v) => v !== null).length) return false
  return dates.every((d) => d.getUTCFullYear() === 1899 && d.getUTCMonth() === 11 && d.getUTCDate() >= 30)
}

function toHHMM(d: Date): string {
  // arredonda ao minuto mais próximo (a SheetJS pode errar por segundos)
  const t = new Date(Math.round(d.getTime() / 60000) * 60000)
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
}

function isIdColumn(label: string, values: CellValue[]): boolean {
  const nums = values.filter((v) => v !== null)
  if (nums.length === 0 || !nums.every((v) => typeof v === "number" && Number.isInteger(v))) return false
  const plain = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
  if (ID_LABEL.test(plain)) return true
  return nums.every((v) => (v as number) >= 1000) && new Set(nums).size / nums.length >= 0.95
}

function buildSheet(name: string, index: number, matrix: unknown[][], usedIds: Set<string>): Sheet | null {
  const cells = matrix.map((r) => r.map(normalizeCell))
  const nonEmpty = cells.filter((r) => r.some((c) => c !== null))
  if (nonEmpty.length < 2) return null // sem cabeçalho ou sem linhas de dados

  // Cabeçalho = primeira linha (entre as 20 primeiras) com ao menos 50% da maior
  // largura de células preenchidas; linhas acima (títulos) são descartadas.
  const filled = (r: CellValue[]) => r.filter((c) => c !== null).length
  const maxFilled = Math.max(...nonEmpty.slice(0, 20).map(filled))
  const threshold = maxFilled >= 2 ? Math.max(2, Math.ceil(maxFilled / 2)) : 1
  const headerAt = nonEmpty.findIndex((r) => filled(r) >= threshold)
  const [header, ...body] = nonEmpty.slice(headerAt)
  if (body.length < 1) return null
  const width = Math.max(...nonEmpty.map((r) => r.length))
  const usedLabels = new Set<string>()
  const usedKeys = new Set<string>()
  const labels: string[] = []
  const keys: string[] = []
  for (let i = 0; i < width; i++) {
    const raw = header[i]
    const base = raw === null || raw === undefined ? `Coluna ${i + 1}` : String(canonical(raw))
    let label = base
    for (let n = 2; usedLabels.has(label); n++) label = `${base} (${n})`
    usedLabels.add(label)
    labels.push(label)
    keys.push(uniqueSlug(label, "coluna", usedKeys))
  }

  const rawRows = body.map((r) => keys.map((_, i) => r[i] ?? null))
  const columns: Column[] = keys.map((key, i) => {
    if (isTimeOnly(rawRows.map((r) => r[i]))) {
      for (const r of rawRows) if (r[i] instanceof Date) r[i] = toHHMM(r[i])
    }
    const type = inferType(rawRows.map((r) => r[i]))
    if (type === "text") {
      for (const r of rawRows) {
        const v = r[i]
        if (v !== null) r[i] = canonical(v)
      }
    }
    const distinct = new Set(rawRows.map((r) => canonical(r[i])).filter((v) => v !== null))
    const distinctCount = distinct.size
    const filterable =
      type === "date" || (type === "text" && distinctCount >= 2 && distinctCount <= MAX_FILTER_VALUES)
    const column: Column = { key, label: labels[i], type, filterable, distinctCount }
    if (type === "number" && isIdColumn(labels[i], rawRows.map((r) => r[i]))) column.format = "id"
    return column
  })
  const rows: Row[] = rawRows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])))
  return { id: uniqueSlug(name, "aba", usedIds), name, index, columns, rows }
}

export function readWorkbook(data: ArrayBuffer, fileName: string): Workbook {
  if (!isXlsxLike(data)) {
    throw new WorkbookError("not-xlsx", "Este arquivo não parece ser uma planilha do Excel (.xlsx). Escolha a planilha da reunião.")
  }
  let wb: ReturnType<typeof read>
  try {
    wb = read(data, { type: "array", cellDates: true, dense: true })
  } catch {
    throw new WorkbookError("not-xlsx", "Não consegui abrir este arquivo. Escolha a planilha da reunião (.xlsx).")
  }
  const usedIds = new Set<string>()
  const sheets: Sheet[] = []
  wb.SheetNames.forEach((name, index) => {
    const ws = wb.Sheets[name]
    if (!ws) return
    const matrix = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
    const sheet = buildSheet(name, index, matrix, usedIds)
    if (sheet) sheets.push(sheet)
  })
  if (sheets.length === 0) {
    throw new WorkbookError("empty", "A planilha não tem nenhuma aba com dados.")
  }
  return { fileName, importedAt: new Date(), sheets }
}
