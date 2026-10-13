import { utils, write } from "xlsx"

/** Gera um .xlsx em memória. Chave = nome da aba, valor = linhas (array de arrays). */
export function makeXlsx(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    utils.book_append_sheet(wb, utils.aoa_to_sheet(rows, { cellDates: true }), name)
  }
  return write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
}
