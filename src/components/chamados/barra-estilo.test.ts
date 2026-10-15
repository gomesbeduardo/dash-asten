import { describe, expect, it } from "vitest"

import { raioBarra } from "./barra-estilo"

describe("raioBarra", () => {
  it("barra horizontal: reta à esquerda (base) e arredondada à direita, em meia altura", () => {
    expect(raioBarra(20)).toEqual([0, 10, 10, 0])
  })
  it("coluna vertical: reta embaixo (base) e arredondada em cima", () => {
    expect(raioBarra(20, "vertical")).toEqual([10, 10, 0, 0])
  })
})
