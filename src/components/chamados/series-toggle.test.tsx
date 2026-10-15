import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { BarrasComparar, LinhaMini, type SerieLinha } from "./graficos"
import type { LinhaSerie } from "./logica"

const comp = (n: number) => ({ ano: 2026, mes: n }) as never
const linhas = [1, 2, 3].map((n) => ({
  competencia: comp(n),
  rotulo: `m${n}`,
  a: n,
  b: n * 2,
})) as LinhaSerie[]
const duas: SerieLinha[] = [
  { id: "a", rotulo: "Não finalizados", cor: "#111" },
  { id: "b", rotulo: "Em atraso", cor: "#222" },
]

describe("legenda de séries na Evolução", () => {
  it("mostra um botão por série com 2+ séries", () => {
    render(
      <LinhaMini
        linhas={linhas}
        series={duas}
        formato="inteiro"
        animar={false}
      />
    )
    expect(screen.getByRole("button", { name: "Não finalizados" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Em atraso" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("não mostra legenda com 1 série", () => {
    render(
      <LinhaMini
        linhas={linhas}
        series={[duas[0]]}
        formato="inteiro"
        animar={false}
      />
    )
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("clicar oculta e mostra a série; a última visível não oculta", async () => {
    const u = userEvent.setup()
    render(
      <LinhaMini
        linhas={linhas}
        series={duas}
        formato="inteiro"
        animar={false}
      />
    )
    const a = screen.getByRole("button", { name: "Não finalizados" })
    const b = screen.getByRole("button", { name: "Em atraso" })
    await u.click(a)
    expect(a).toHaveAttribute("aria-pressed", "false")
    expect(b).toHaveAttribute("aria-pressed", "true")
    expect(b).toHaveAttribute("aria-disabled", "true")
    await u.click(b)
    expect(b).toHaveAttribute("aria-pressed", "true")
    await u.click(a)
    expect(a).toHaveAttribute("aria-pressed", "true")
    // dados/descrição intactos
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Em atraso"
    )
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Não finalizados"
    )
  })
})

describe("legenda de séries no Comparar", () => {
  const itens = [{ rotulo: "Cli A", valores: [3, 5] }]
  const serie = (id: string, rotulo: string) => ({ id, rotulo })
  const duas = [serie("2026-08", "Ago"), serie("2026-09", "Set")]
  it("liga e desliga as séries, mantendo ao menos uma", async () => {
    const u = userEvent.setup()
    render(<BarrasComparar itens={itens} series={duas} animar={false} />)
    const a = screen.getByRole("button", { name: "Ago" })
    const b = screen.getByRole("button", { name: "Set" })
    await u.click(b)
    expect(b).toHaveAttribute("aria-pressed", "false")
    expect(a).toHaveAttribute("aria-disabled", "true")
    await u.click(a)
    expect(a).toHaveAttribute("aria-pressed", "true")
    await u.click(b)
    expect(b).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Cli A 3, 5"
    )
  })

  it("aceita até 6 séries, uma legenda clicável para cada uma", async () => {
    const u = userEvent.setup()
    const seis = ["02", "03", "04", "05", "06", "07"].map((m) =>
      serie(`2026-${m}`, `m${m}`)
    )
    render(
      <BarrasComparar
        itens={[{ rotulo: "Cli A", valores: [1, 2, 3, 4, 5, 6] }]}
        series={seis}
        animar={false}
      />
    )
    expect(within(screen.getByRole("list", { name: "Séries" })).getAllByRole("button")).toHaveLength(6)
    await u.click(screen.getByRole("button", { name: "m04" }))
    expect(screen.getByRole("button", { name: "m04" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "m05" })).toHaveAttribute("aria-pressed", "true")
  })

  it("volta ao padrão ao trocar de competência", async () => {
    const u = userEvent.setup()
    const { rerender } = render(
      <BarrasComparar itens={itens} series={duas} animar={false} />
    )
    await u.click(screen.getByRole("button", { name: "Set" }))
    rerender(
      <BarrasComparar
        itens={itens}
        series={[serie("2026-08", "Ago"), serie("2026-10", "Out")]}
        animar={false}
      />
    )
    expect(screen.getByRole("button", { name: "Out" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })
})
