import { describe, expect, it } from "vitest"

import {
  complementGridClass,
  lineDomain,
  statusColors,
  statusOrder,
} from "./chartTheme"

const labels = (l: string[]) => l.map((label) => ({ label }))

describe("statusColors", () => {
  it("mapeia status conhecidos, com e sem acento", () => {
    const c = statusColors(
      labels([
        "Concluído",
        "Em andamento",
        "Pausada",
        "Não iniciado",
        "Atrasado",
      ])
    )
    expect(c).toEqual([
      "var(--chart-3)",
      "var(--chart-1)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--late)",
    ])
    expect(statusColors(labels(["concluido", "NAO INICIADO", "Bloqueado"]))).toEqual([
      "var(--chart-3)",
      "var(--chart-5)",
      "var(--chart-4)",
    ])
  })
  it("séries sem casamento usam a paleta sem repetir cores usadas", () => {
    const c = statusColors(labels(["Concluído", "Outro", "Mais um"]))
    expect(c[0]).toBe("var(--chart-3)")
    expect(new Set(c).size).toBe(3)
    expect(c[1]).not.toBe("var(--chart-3)")
  })
})

describe("statusOrder", () => {
  it("empilha concluído, andamento, pausado, não iniciado, atrasado, resto", () => {
    const order = statusOrder(
      labels(["Atrasado", "X", "Não iniciado", "Em andamento", "Concluído", "Pausado"])
    )
    expect(order.map((i) => ["Atrasado", "X", "Não iniciado", "Em andamento", "Concluído", "Pausado"][i])).toEqual([
      "Concluído",
      "Em andamento",
      "Pausado",
      "Não iniciado",
      "Atrasado",
      "X",
    ])
  })
})

describe("lineDomain", () => {
  it("valores 70-80 não começam em 0 e ficam dentro de [69, 81]", () => {
    const [lo, hi] = lineDomain([70, 75, 80])
    expect(lo).toBeGreaterThanOrEqual(69)
    expect(lo).toBeLessThanOrEqual(70)
    expect(hi).toBeGreaterThanOrEqual(80)
    expect(hi).toBeLessThanOrEqual(81)
  })
  it("tudo zero vira [0, 1]", () => {
    expect(lineDomain([0, 0])).toEqual([0, 1])
  })
  it("amplitude 0 usa ±1 e não desce de 0 se tudo >= 0", () => {
    expect(lineDomain([5, 5])).toEqual([4, 6])
    expect(lineDomain([0.5, 0.5])[0]).toBe(0)
  })
  it("sem valores devolve [0, 1]", () => {
    expect(lineDomain([])).toEqual([0, 1])
  })
})

describe("complementGridClass", () => {
  it("1 largura cheia, 2 duas colunas, 3 três colunas >=1280", () => {
    expect(complementGridClass(1)).toContain("grid-cols-1")
    expect(complementGridClass(1)).not.toContain("lg:grid-cols-2")
    expect(complementGridClass(2)).toContain("lg:grid-cols-2")
    const three = complementGridClass(3)
    expect(three).toContain("lg:grid-cols-2")
    expect(three).toContain("min-[1280px]:grid-cols-3")
    expect(three).toContain("lg:[&>*:last-child]:col-span-2")
    expect(three).toContain("min-[1280px]:[&>*:last-child]:col-span-1")
  })
})
