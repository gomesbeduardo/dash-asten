import { describe, expect, it } from "vitest"

import apresentacao from "./components/app/Apresentacao.tsx?raw"
import cartoes from "./components/chamados/cartoes.tsx?raw"
import kpiCard from "./components/app/auto/KpiCard.tsx?raw"

describe("layout fluido para telas grandes (D67)", () => {
  it("o container da apresentação não tem teto fixo de 1760 px", () => {
    const src = apresentacao
    expect(src).not.toContain("max-w-[1760px]")
    expect(src).toContain("px-[clamp(")
  })
  it("números de KPI não usam px fixo", () => {
    expect(cartoes).not.toMatch(/text-\[\d+px\]/)
    expect(kpiCard).not.toMatch(/text-\[\d+px\]/)
  })
})
