import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { LegendaSimbolos, Selos, SeloSimbolo } from "./selos"

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const ui = (n: React.ReactNode) => <TooltipProvider>{n}</TooltipProvider>

describe("SeloSimbolo", () => {
  it("é um botão focável com o nome do selo e explica no foco", async () => {
    const user = userEvent.setup()
    render(ui(<SeloSimbolo tipo="outros" />))
    const b = screen.getByRole("button", { name: "Agrupado em Outros" })
    expect(b).not.toHaveTextContent("Agrupado em Outros")
    await user.tab()
    expect(b).toHaveFocus()
    expect((await screen.findAllByText(/O total do gráfico se mantém/))[0]).toBeInTheDocument()
  })

  it("Selos mostra só os símbolos, um por tipo", () => {
    render(ui(<Selos tipos={["outros"]} />))
    const lista = screen.getByRole("list", { name: "Origem dos dados" })
    expect(within(lista).getByRole("button", { name: "Agrupado em Outros" })).toBeInTheDocument()
    expect(lista).not.toHaveTextContent("Agrupado em Outros")
  })

  it("os selos de reconstrução, cálculo, exportação e derivação não existem mais (D63/D64)", () => {
    render(ui(<Selos tipos={["outros"]} />))
    for (const nome of ["Reconstruído pelas datas", "Calculado", "Derivado das datas", "Situação na exportação"])
      expect(screen.queryByRole("button", { name: nome })).toBeNull()
  })
})

describe("LegendaSimbolos", () => {
  it("lista só os tipos recebidos, com nome e explicação curta", () => {
    render(ui(<LegendaSimbolos tipos={["outros"]} />))
    const l = screen.getByRole("region", { name: "Legenda dos símbolos" })
    expect(within(l).getByText("Agrupado em Outros")).toBeInTheDocument()
    expect(within(l).getAllByRole("listitem")).toHaveLength(1)
    // símbolo antes do nome, em cada item
    for (const li of within(l).getAllByRole("listitem"))
      expect(li.firstElementChild?.getAttribute("aria-hidden")).toBe("true")
  })

  it("aceita itens extras e some quando não há nada", () => {
    const { rerender } = render(
      ui(<LegendaSimbolos tipos={[]} extras={[{ chave: "t", glifo: <i />, nome: "Extra", texto: "item extra" }]} />)
    )
    expect(screen.getByText("Extra")).toBeInTheDocument()
    rerender(ui(<LegendaSimbolos tipos={[]} />))
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
  })
})
