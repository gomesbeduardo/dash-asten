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
    render(ui(<SeloSimbolo tipo="calculado" />))
    const b = screen.getByRole("button", { name: "Calculado" })
    expect(b).not.toHaveTextContent("Calculado")
    await user.tab()
    expect(b).toHaveFocus()
    expect((await screen.findAllByText(/colunas da data da exportação/))[0]).toBeInTheDocument()
  })

  it("Selos mostra só os símbolos, um por tipo", () => {
    render(ui(<Selos tipos={["calculado", "outros"]} />))
    const lista = screen.getByRole("list", { name: "Origem dos dados" })
    expect(within(lista).getByRole("button", { name: "Calculado" })).toBeInTheDocument()
    expect(within(lista).getByRole("button", { name: "Agrupado em Outros" })).toBeInTheDocument()
    expect(lista).not.toHaveTextContent("Calculado")
  })
})

describe("LegendaSimbolos", () => {
  it("lista só os tipos recebidos, com nome e explicação curta", () => {
    render(ui(<LegendaSimbolos tipos={["calculado", "derivado"]} />))
    const l = screen.getByRole("region", { name: "Legenda dos símbolos" })
    expect(within(l).getByText("Calculado")).toBeInTheDocument()
    expect(within(l).getByText("Derivado das datas")).toBeInTheDocument()
    expect(within(l).queryByText("Reconstruído pelas datas")).toBeNull()
    expect(within(l).getAllByRole("listitem")).toHaveLength(2)
    // símbolo antes do nome, em cada item
    for (const li of within(l).getAllByRole("listitem"))
      expect(li.firstElementChild?.getAttribute("aria-hidden")).toBe("true")
  })

  it("aceita itens extras (tracejado) e some quando não há nada", () => {
    const { rerender } = render(
      ui(<LegendaSimbolos tipos={[]} extras={[{ chave: "t", glifo: <i />, nome: "Tracejado", texto: "reconstruído" }]} />)
    )
    expect(screen.getByText("Tracejado")).toBeInTheDocument()
    rerender(ui(<LegendaSimbolos tipos={[]} />))
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
  })
})
