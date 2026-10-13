import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { App } from "./App"

function xlsxFile(): File {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Área", "Valor"],
      ["TI", 1],
      ["RH", 2],
      ["TI", 3],
    ]),
    "Projetos"
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["X"], ["a"]]),
    "Outra"
  )
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return new File([buf], "reuniao.xlsx")
}

describe("App", () => {
  it("importa, mostra a aba, troca com a seta e abre os filtros com F", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText(/Arquivo da planilha/), xlsxFile())
    expect(
      await screen.findByRole("heading", { level: 1, name: "Projetos" })
    ).toBeInTheDocument()
    expect(screen.getByText("3 linhas")).toBeInTheDocument()
    await user.keyboard("{ArrowRight}")
    expect(
      screen.getByRole("heading", { level: 1, name: "Outra" })
    ).toBeInTheDocument()
    await user.keyboard("1")
    expect(
      screen.getByRole("heading", { level: 1, name: "Projetos" })
    ).toBeInTheDocument()
    await user.keyboard("f")
    expect(
      await screen.findByRole("dialog", { name: "Filtros" })
    ).toBeInTheDocument()
  })

  it("mostra mensagem simples para arquivo que não é a planilha", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(
      screen.getByLabelText(/Arquivo da planilha/),
      new File(["texto"], "x.xlsx")
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse arquivo não parece ser a planilha da reunião."
    )
  })
})
