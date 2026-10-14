import { expect, test, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import * as XLSX from "xlsx"

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const CAB = [
  "Data Abertura",
  "Código",
  "Cliente",
  "Área Superior",
  "Atividade",
  "Situação",
  "SLA Previsto",
  "SLA Renegociado",
  "Data de Solução",
  "Data de Aceite",
  "Qtd Reabertura",
]
// [abertura, cliente, situação, sla previsto, solução]
type L = [string | null, string, string, string | null, string | null]
const setembro: L[] = [
  ["2026-01-10", "Cli A", "Em Análise", null, null],
  ["2026-01-11", "Cli A", "Em Análise", null, null],
  ["2026-01-12", "Cli A", "Em Análise", null, null],
  ["2026-01-13", "Cli A", "Em Análise", null, null],
  ["2026-08-05", "Cli A", "Em Análise", "2026-08-20", null],
  ["2026-08-10", "Cli B", "Finalizado", "2026-09-01", "2026-09-12"],
  ["2026-08-11", "Cli B", "Aguardando aceite", "2026-09-25", null],
  ["2026-09-03", "Cli B", "Em Análise", "2026-09-30", null],
  ["2026-09-05", "Cli C", "Finalizado", "2026-09-30", "2026-09-20"],
  ["2026-10-02", "Cli C", "Em Análise", null, null],
  [null, "Cli C", "Em Análise", null, null],
]
const agosto: L[] = [
  ...setembro.slice(0, 4),
  ["2026-08-10", "Cli B", "Em Análise", "2026-09-01", null],
  ["2026-08-11", "Cli B", "Em Análise", "2026-09-25", null],
]

function criar(path: string, linhas: L[]) {
  mkdirSync(dirname(path), { recursive: true })
  const rows: unknown[][] = [
    CAB,
    ...linhas.map(([ab, cli, sit, sla, sol], i) => [
      ab ? d(ab) : null,
      i + 1,
      cli,
      "Área 1",
      i % 2 ? "Suporte" : "Projeto",
      sit,
      sla ? d(sla) : null,
      null,
      sol ? d(sol) : null,
      null,
      0,
    ]),
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rows, { cellDates: true }),
    "Chamados"
  )
  writeFileSync(path, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}

const kpi = (page: Page, nome: string) =>
  page.getByRole("article", { name: nome, exact: true })

test("Chamados: KPIs, leituras em modal, filtros, Comparar e Evolução", async ({
  page,
}, testInfo) => {
  const ago = testInfo.outputPath("chamados-agosto-2026.xlsx")
  const set = testInfo.outputPath("chamados-setembro-2026.xlsx")
  criar(ago, agosto)
  criar(set, setembro)

  await page.goto("/")
  await page.getByLabel(/Arquivo da planilha/).setInputFiles(ago)
  const confirmar = page.getByRole("dialog", { name: "Confirmar a carga" })
  await expect(confirmar.getByLabel("Tipo")).toHaveValue("chamados")
  await confirmar.getByRole("button", { name: "Confirmar carga" }).click()
  await expect(kpi(page, "Backlog aberto")).toBeVisible()

  await page.mouse.move(400, 40)
  await page.getByLabel("Arquivo da nova carga (.xlsx)").setInputFiles(set)
  // clicar fora do diálogo não o fecha
  await expect(confirmar).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole("button", { name: "Confirmar carga" }).click()

  // Painel: setembro, com delta contra a carga própria de agosto
  await expect(
    page.getByRole("heading", { level: 1, name: "Chamados · setembro de 2026" })
  ).toBeVisible()
  await expect(kpi(page, "Backlog aberto")).toContainText("7")
  await expect(kpi(page, "Backlog aberto")).toContainText("+1 vs ago/26")
  await expect(kpi(page, "% no SLA")).toContainText("50,0%")
  await expect(kpi(page, "% no SLA").getByRole("button", { name: "Calculado" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Legenda dos símbolos" })).toContainText("Calculado")
  await expect(page.getByRole("table")).toHaveCount(0)
  const situacao = page.getByRole("region", { name: "Situação na competência" })
  await expect(situacao).toContainText("11 chamados na planilha, nenhum excluído")

  // Leituras: visão própria; o clique abre um modal e a página não rola
  await page.keyboard.press("l")
  await expect(
    page.getByRole("heading", { level: 1, name: /^Leituras · setembro/ })
  ).toBeVisible()
  const antes = await page.evaluate(() => window.scrollY)
  await page.getByRole("button", { name: /Crítico.*180 dias/ }).click()
  const modal = page.getByRole("dialog")
  await expect(modal).toContainText("Regra que disparou")
  await expect(modal).toContainText("Números que sustentam")
  expect(await page.evaluate(() => window.scrollY)).toBe(antes)
  await page.keyboard.press("Escape")
  await expect(modal).toBeHidden()

  // Filtros: tecla F, chip visível e recorte no título
  await page.keyboard.press("f")
  const filtros = page.getByRole("dialog", { name: "Filtros" })
  await filtros.getByRole("combobox", { name: "Cliente" }).click()
  await page.getByRole("option", { name: "Cli B" }).click()
  await page.keyboard.press("Escape") // fecha a lista de valores
  await expect(page.getByRole("option", { name: "Cli B" })).toBeHidden()
  await page.keyboard.press("Escape") // fecha o painel
  await expect(filtros).toBeHidden()
  await page.keyboard.press("p")
  await expect(
    page.getByRole("heading", { level: 1, name: /Cliente: Cli B/ })
  ).toBeVisible()
  await expect(kpi(page, "Backlog aberto")).toContainText("2")
  await expect(page.getByRole("list", { name: "Filtros ativos" })).toBeVisible()

  // O filtro persiste em Comparar; trocar os meses mostra o Δ
  await page.keyboard.press("c")
  await expect(page.getByRole("list", { name: "Filtros ativos" })).toContainText("Cli B")
  await expect(page.getByLabel("Competência A")).toHaveValue("2026-08")
  await expect(page.getByLabel("Competência B")).toHaveValue("2026-09")
  await page.getByRole("button", { name: "Limpar filtros" }).first().click()
  const linha = page.getByRole("row", { name: /Backlog aberto/ })
  await expect(linha).toContainText("+1")
  await page.getByLabel("Competência A").selectOption("2026-09")
  await page.getByLabel("Competência B").selectOption("2026-08")
  await expect(linha).toContainText("-1")

  // Evolução: meses sem carga própria vêm marcados como reconstruídos
  await page.keyboard.press("e")
  await expect(page.getByRole("heading", { level: 1, name: "Evolução" })).toBeVisible()
  const card = page.getByRole("region", { name: "Backlog aberto" })
  await expect(card.getByRole("button", { name: "Reconstruído pelas datas" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Legenda dos símbolos" })).toContainText("Tracejado e ponto vazado")
  await card.getByRole("button", { name: /Ver dados/ }).click()
  await expect(card.getByRole("row", { name: /jul\/26 \(reconstruído\)/ })).toBeVisible()
  await expect(card.getByRole("row", { name: /^set\/26 / })).toBeVisible()
})
