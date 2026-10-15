import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import type { KpiChamados } from "@/chamados"
import { TooltipProvider } from "@/components/ui/tooltip"
import { KpiCartao } from "./cartoes"

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const kpi = (p: Partial<KpiChamados>): KpiChamados => ({
  id: "sla",
  rotulo: "% no SLA",
  valor: 50,
  formato: "percentual",
  anterior: 66.7,
  delta: -16.7,
  melhorQuando: "maior",
  definicao: "def",
  ...p,
})
const renderiza = (k: KpiChamados, rotulo = "abr/26 v1") =>
  render(
    <TooltipProvider>
      <KpiCartao kpi={k} rotuloAnterior={rotulo} entrada={false} />
    </TooltipProvider>
  )

describe("selo de Δ dos KPIs", () => {
  it("mostra seta, valor e período em linha, sem 'vs', '·' nem 'pior' visíveis", () => {
    renderiza(kpi({}))
    const card = screen.getByRole("article", { name: "% no SLA" })
    const selo = within(card).getByRole("group", {
      name: "−16,7 p.p. em relação a abr/26 v1, pior",
    })
    expect(selo).toHaveTextContent("−16,7 p.p.")
    expect(selo).toHaveTextContent("abr/26 v1")
    expect(selo.textContent).not.toMatch(/vs|·|pior|melhor/)
  })

  it("o aria-label diz 'melhor' quando o sentido é bom", () => {
    renderiza(kpi({ delta: 5, melhorQuando: "maior" }), "mai/26")
    expect(
      screen.getByRole("group", {
        name: "+5,0 p.p. em relação a mai/26, melhor",
      })
    ).toBeInTheDocument()
  })

  it("Δ zero ganha selo neutro, sem 'pior' nem 'melhor'", () => {
    renderiza(kpi({ delta: 0, formato: "inteiro", valor: 3 }), "mai/26")
    const selo = screen.getByRole("group", {
      name: "0 em relação a mai/26",
    })
    expect(selo).toHaveAttribute("data-tom", "neutro")
  })

  it("sem base: nenhum texto 'sem base' nem selo no cartão", () => {
    renderiza(kpi({ delta: null, anterior: null }))
    const card = screen.getByRole("article", { name: "% no SLA" })
    expect(card).not.toHaveTextContent(/sem base|vs/)
    expect(within(card).queryByRole("group")).toBeNull()
  })
})
