import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BarraPercentual } from "./cruzamentos-ui"

describe("BarraPercentual (Área × SLA)", () => {
  it("a barra segue a %, na cor dos finalizados, sem o número escrito", () => {
    const { container } = render(
      <BarraPercentual rotulo="Logística" pct={62} />
    )
    const barra = container.querySelector("[data-barra-sla]") as HTMLElement
    expect(barra.style.width).toBe("62%")
    expect(barra.style.background).toContain("var(--serie-finalizados)")
    // o valor fica no aria-label e no tooltip, não no texto visível
    expect(container).not.toHaveTextContent("62")
    expect(
      screen.getByRole("img", {
        name: "Logística: 62% dos finalizados dentro do SLA",
      })
    ).toHaveAttribute("title", "Logística: 62%")
  })
  it("não há marcador de referência (não existe meta de SLA)", () => {
    const { container } = render(
      <BarraPercentual rotulo="Logística" pct={62} />
    )
    expect(container.querySelector("[data-meta]")).toBeNull()
    expect(container).not.toHaveTextContent(/meta|média/i)
  })
  it("uma meta passada depois liga o marcador na posição certa", () => {
    const { container } = render(
      <BarraPercentual rotulo="A" pct={50} meta={90} />
    )
    expect(
      (container.querySelector("[data-meta]") as HTMLElement).style.left
    ).toBe("90%")
  })
  it("sem finalizados com SLA diz isso em palavras, sem barra", () => {
    const { container } = render(<BarraPercentual rotulo="A" pct={null} />)
    expect(container).toHaveTextContent("sem finalizados com SLA")
    expect(container.querySelector("[data-barra-sla]")).toBeNull()
  })
})
