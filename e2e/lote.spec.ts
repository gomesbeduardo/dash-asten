import { expect, test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import * as XLSX from "xlsx"

function planilha(path: string, linhas: number) {
  const rows: unknown[][] = [["Área", "Valor"]]
  for (let i = 0; i < linhas; i++) rows.push([i % 2 ? "TI" : "RH", i + 1])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Projetos")
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}

test("envio de duas planilhas de uma vez", async ({ page }, testInfo) => {
  const agosto = testInfo.outputPath("reuniao-agosto-2026.xlsx")
  const setembro = testInfo.outputPath("reuniao-setembro-2026.xlsx")
  planilha(agosto, 5)
  planilha(setembro, 8)

  await page.goto("/")
  await page.getByLabel(/Arquivo da planilha/).setInputFiles([agosto, setembro])

  const dialog = page.getByRole("dialog", { name: "Confirmar as cargas" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("row")).toHaveCount(3)
  await expect(
    dialog.getByRole("combobox", { name: "Mês de reuniao-setembro-2026.xlsx" })
  ).toContainText("Setembro")
  const confirmar = dialog.getByRole("button", { name: "Confirmar 2 cargas" })
  await expect(confirmar).toBeFocused()
  await confirmar.click()

  // Abre a competência mais recente do lote, com o resumo à vista.
  await expect(page.getByRole("button", { name: "Competência" })).toContainText(
    "Setembro de 2026"
  )
  await expect(page.getByText("2 de 2 guardadas")).toBeVisible()
})
