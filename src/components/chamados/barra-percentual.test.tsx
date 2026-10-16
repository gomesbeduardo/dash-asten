import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BarraPercentual } from "./cruzamentos-ui"

describe("BarraPercentual (Área × SLA)", () => {
  it("a largura da barra e a posição da meta transitam e voltam secas com movimento reduzido", () => {
    const { container } = render(
      <BarraPercentual rotulo="Suporte" pct={60} meta={90} />
    )
    for (const sel of ["[data-barra-sla]", "[data-meta]"]) {
      const el = container.querySelector(sel) as HTMLElement
      expect(el.className).toMatch(/transicao-valor/)
    }
  })
})
