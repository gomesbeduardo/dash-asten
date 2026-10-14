import { expect, test, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import * as XLSX from "xlsx"

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day))

function buildWorkbook(path: string) {
  const indicadores: unknown[][] = [
    ["Relatório semanal"],
    [],
    ["Indicador", "Área", "Mês", "Meta", "Realizado"],
  ]
  for (let i = 0; i < 12; i++) {
    indicadores.push([
      `Indicador ${i + 1}`,
      i % 2 ? "Comercial" : "Operações",
      d(2025, (i % 12) + 1, 1),
      100 + i,
      i === 3 ? null : 90 + i,
    ])
  }
  const status = ["Planejado", "Em andamento", "Concluído", "Atrasado"]
  const projetos: unknown[][] = [
    ["Projeto", "Área", "Responsável", "Status", "Prazo"],
  ]
  for (let i = 0; i < 20; i++) {
    projetos.push([
      `Projeto ${i + 1}`,
      i % 2 ? "TI" : "RH",
      `Pessoa ${(i % 5) + 1}`,
      status[i % 4],
      d(2025, (i % 12) + 1, 15),
    ])
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(indicadores, { cellDates: true }), "Indicadores")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projetos, { cellDates: true }), "Projetos")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Leia antes de abrir"]]), "Instruções")
  writeFileSync(path, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}

const h1 = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name, exact: true })

test("fluxo completo de apresentação", async ({ page }, testInfo) => {
  const xlsxPath = testInfo.outputPath("reuniao.xlsx")
  mkdirSync(dirname(xlsxPath), { recursive: true })
  buildWorkbook(xlsxPath)
  const txtPath = testInfo.outputPath("nao-e-planilha.txt")
  writeFileSync(txtPath, "isto não é uma planilha")

  await page.goto("/")
  await page.getByLabel(/Arquivo da planilha/).setInputFiles(xlsxPath)

  // Passo de confirmação: tipo e competência (inferida) antes de guardar.
  const confirmar = page.getByRole("dialog", { name: "Confirmar a carga" })
  await expect(confirmar).toBeVisible()
  await expect(confirmar.getByLabel("Tipo")).toHaveValue("outro")
  await confirmar.getByRole("button", { name: "Confirmar carga" }).click()

  // Aba com título acima do cabeçalho: cabeçalho real detectado.
  await expect(h1(page, "Indicadores")).toBeVisible()
  await expect(page.getByRole("columnheader", { name: /Meta/ })).toBeVisible()
  await expect(page.getByText("12 linhas")).toBeVisible()
  await expect(page.getByRole("cell", { name: "—" })).toHaveCount(1)
  // "Instruções" (1 linha) foi omitida.
  await expect(page.getByRole("tab", { name: /Instruções/ })).toHaveCount(0)

  await page.keyboard.press("ArrowRight")
  await expect(h1(page, "Projetos")).toBeVisible()
  await expect(page.getByText("20 linhas")).toBeVisible()

  await page.keyboard.press("f")
  const panel = page.getByRole("dialog", { name: "Filtros" })
  await expect(panel).toBeVisible()
  await panel
    .locator("div")
    .filter({ has: page.getByText("Status", { exact: true }) })
    .last()
    .getByRole("combobox")
    .click()
  await page.getByRole("option", { name: "Atrasado" }).click()
  await page.keyboard.press("Escape") // fecha a lista de valores
  await expect(page.getByRole("option", { name: "Atrasado" })).toBeHidden()
  await page.keyboard.press("Escape") // fecha o painel
  await expect(panel).toBeHidden()

  await expect(page.getByText("5 linhas")).toBeVisible()
  const chips = page.getByRole("list", { name: "Filtros ativos" })
  await expect(chips).toContainText("Status: Atrasado")

  // Filtro é por aba.
  await page.keyboard.press("ArrowLeft")
  await expect(h1(page, "Indicadores")).toBeVisible()
  await expect(page.getByRole("list", { name: "Filtros ativos" })).toHaveCount(0)
  await page.keyboard.press("ArrowRight")
  await expect(h1(page, "Projetos")).toBeVisible()
  await expect(page.getByRole("list", { name: "Filtros ativos" })).toContainText("Atrasado")

  // Ocultar a aba "Indicadores" pelo menu "Abas".
  await page.mouse.move(400, 40)
  await page.getByRole("button", { name: "Abas" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Indicadores" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("tab", { name: /Indicadores/ })).toHaveCount(0)
  await expect(page.getByRole("tab", { name: /Projetos/ })).toBeVisible()

  // Arquivo inválido: mensagem, e a planilha atual continua.
  await page.getByLabel("Arquivo da nova carga (.xlsx)").setInputFiles(txtPath)
  await expect(page.getByRole("alert")).toContainText("não parece ser a planilha")
  await expect(page.getByRole("alert")).toContainText("A carga atual continua aberta")
  await expect(h1(page, "Projetos")).toBeVisible()
})

test("duas competências: recarregar abre a mais recente e o seletor troca", async ({ page }, testInfo) => {
  const cria = (nome: string, linhas: number) => {
    const path = testInfo.outputPath(nome)
    mkdirSync(dirname(path), { recursive: true })
    const rows: unknown[][] = [["Item", "Valor"]]
    for (let i = 0; i < linhas; i++) rows.push([`Item ${i + 1}`, i + 1])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Resumo")
    writeFileSync(path, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
    return path
  }
  const agosto = cria("painel-agosto-2026.xlsx", 4)
  const setembro = cria("painel-setembro-2026.xlsx", 6)

  await page.goto("/")
  await page.getByLabel(/Arquivo da planilha/).setInputFiles(agosto)
  const confirmar = page.getByRole("dialog", { name: "Confirmar a carga" })
  await expect(confirmar.getByLabel("Mês")).toHaveValue("8")
  await confirmar.getByRole("button", { name: "Confirmar carga" }).click()
  await expect(h1(page, "Resumo")).toBeVisible()
  await expect(page.getByText("4 linhas")).toBeVisible()

  await page.mouse.move(400, 40)
  await page.getByLabel("Arquivo da nova carga (.xlsx)").setInputFiles(setembro)
  await expect(confirmar.getByLabel("Mês")).toHaveValue("9")
  await confirmar.getByRole("button", { name: "Confirmar carga" }).click()
  await expect(page.getByText("6 linhas")).toBeVisible()

  // Recarregar: abre direto a competência mais recente.
  await page.reload()
  await expect(h1(page, "Resumo")).toBeVisible()
  await expect(page.getByText("6 linhas")).toBeVisible()
  await page.mouse.move(400, 40)
  const seletor = page.getByRole("button", { name: "Competência" })
  await expect(seletor).toContainText("Setembro de 2026")

  await seletor.click()
  await page.getByRole("button", { name: "Agosto de 2026, versão 1" }).click()
  await expect(seletor).toContainText("Agosto de 2026")
  await expect(page.getByText("4 linhas")).toBeVisible()
})
