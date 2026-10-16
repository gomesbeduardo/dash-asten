import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ListaDeChips } from "./FilterChips"

const chip = { key: "area", label: "Área", text: "Financeiro" }
const montar = (chips: (typeof chip)[]) => (
  <ListaDeChips chips={chips} onRemove={() => {}} onClearAll={() => {}} />
)
// O invólucro que anima a altura: o pai direto da lista.
const envoltorio = () =>
  screen.getByText(/Financeiro/).closest("ul")!.parentElement!.parentElement!

describe("ListaDeChips: entra e sai sem empurrar seco", () => {
  it("com filtros o invólucro está aberto (1fr) e a altura transita", () => {
    render(montar([chip]))
    const el = envoltorio()
    expect(el.className).toMatch(/grid-rows-\[1fr\]/)
    expect(el.className).toMatch(/transition-\[grid-template-rows/)
  })

  it("com movimento reduzido a transição é seca", () => {
    render(montar([chip]))
    expect(envoltorio().className).toMatch(/motion-reduce:transition-none/)
  })

  it("ao aplicar o 1º filtro o invólucro já existia fechado (0fr) e abre: a altura transita, não salta", () => {
    const { container, rerender } = render(montar([]))
    const antes = container.firstElementChild!
    expect(antes.className).toMatch(/grid-rows-\[0fr\]/)
    rerender(montar([chip]))
    expect(container.firstElementChild).toBe(antes)
    expect(antes.className).toMatch(/grid-rows-\[1fr\]/)
    expect(antes).not.toHaveAttribute("inert")
  })

  it("sem filtros nada aparece (nem para leitor de tela) e não sobra espaço", () => {
    render(montar([]))
    expect(screen.queryByRole("list", { name: "Filtros ativos" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("ao limpar, fecha (0fr) mantendo os chips até a altura recolher, escondidos de todos", () => {
    const { rerender } = render(montar([chip]))
    rerender(montar([]))
    const el = envoltorio()
    expect(el.className).toMatch(/grid-rows-\[0fr\]/)
    expect(el).toHaveAttribute("aria-hidden", "true")
    expect(el).toHaveAttribute("inert")
    expect(screen.queryByRole("list", { name: "Filtros ativos" })).toBeNull()
  })
})
