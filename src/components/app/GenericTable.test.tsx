import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { Sheet } from "@/core"
import { GenericTable } from "./GenericTable"

const sheet: Sheet = {
  id: "s1",
  name: "Projetos",
  index: 0,
  columns: [
    {
      key: "nome",
      label: "Nome",
      type: "text",
      filterable: true,
      distinctCount: 2,
    },
    {
      key: "valor",
      label: "Valor",
      type: "number",
      filterable: false,
      distinctCount: 2,
    },
    {
      key: "prazo",
      label: "Prazo",
      type: "date",
      filterable: true,
      distinctCount: 1,
    },
  ],
  rows: [
    { nome: "Alfa", valor: 10, prazo: new Date(2026, 0, 5) },
    { nome: null, valor: 3, prazo: null },
  ],
}

describe("GenericTable", () => {
  it("mostra a contagem e traço para valores vazios", () => {
    render(<GenericTable sheet={sheet} rows={sheet.rows} />)
    expect(screen.getByText("2 linhas")).toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    expect(within(rows[2]).getAllByText("—").length).toBe(2)
  })

  it("usa singular para 1 linha", () => {
    render(<GenericTable sheet={sheet} rows={[sheet.rows[0]]} />)
    expect(screen.getByText("1 linha")).toBeInTheDocument()
  })

  it("alinha números à direita com tabular-nums", () => {
    render(<GenericTable sheet={sheet} rows={sheet.rows} />)
    const cell = screen.getByText("10")
    expect(cell.className).toMatch(/text-right/)
    expect(cell.className).toMatch(/tabular-nums/)
  })

  it("oculta uma coluna pelo menu Colunas", async () => {
    const user = userEvent.setup()
    render(<GenericTable sheet={sheet} rows={sheet.rows} />)
    expect(
      screen.getByRole("columnheader", { name: /Valor/ })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Colunas/ }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Valor" }))
    await user.keyboard("{Escape}")
    expect(
      screen.queryByRole("columnheader", { name: /Valor/ })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /Nome/ })
    ).toBeInTheDocument()
  })

  it("ordena ao clicar no cabeçalho e expõe aria-sort", async () => {
    const user = userEvent.setup()
    render(<GenericTable sheet={sheet} rows={sheet.rows} />)
    const header = screen.getByRole("columnheader", { name: /Valor/ })
    expect(header).toHaveAttribute("aria-sort", "none")
    await user.click(within(header).getByRole("button"))
    expect(header).toHaveAttribute("aria-sort", "ascending")
    const firstDataRow = screen.getAllByRole("row")[1]
    expect(within(firstDataRow).getByText("3")).toBeInTheDocument()
  })

  it("pagina de 50 em 50", () => {
    const many: Sheet = {
      ...sheet,
      rows: Array.from({ length: 120 }, (_, i) => ({
        nome: `L${i}`,
        valor: i,
        prazo: null,
      })),
    }
    render(<GenericTable sheet={many} rows={many.rows} />)
    expect(screen.getAllByRole("row").length).toBe(51)
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument()
  })
})
