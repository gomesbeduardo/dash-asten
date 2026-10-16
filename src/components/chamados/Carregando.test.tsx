import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Carregando } from "./Carregando"

describe("Carregando", () => {
  it.each(["painel", "leituras", "comparar", "evolucao", "cruzamentos", "tempo"] as const)(
    "forma %s mantém role=status, aria-busy e o texto acessível",
    (forma) => {
      render(<Carregando forma={forma} texto="Carregando o corpo…" />)
      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-busy", "true")
      expect(status).toHaveTextContent("Carregando o corpo…")
      expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    }
  )

  it("a forma tempo reserva 7 cartões (os 7 gráficos reais) e a cruzamentos 4", () => {
    const { container, rerender } = render(<Carregando forma="tempo" />)
    // 1 título + 7 cartões
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8)
    rerender(<Carregando forma="cruzamentos" />)
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4)
  })

  it("sem forma usa o texto padrão", () => {
    render(<Carregando />)
    expect(screen.getByRole("status")).toHaveTextContent("Carregando competências…")
  })

  it("por padrão aparece sem atraso (o fade cruzado da aba já evita o pisca)", () => {
    render(<Carregando />)
    expect(screen.getByRole("status").className).not.toMatch(/delay/)
  })

  it("com atraso=true entra com fade atrasado (telas sem fade cruzado)", () => {
    render(<Carregando atraso />)
    expect(screen.getByRole("status").className).toMatch(/delay-\[120ms\]/)
  })
})
