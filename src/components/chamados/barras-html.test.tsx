import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { chartGrow } from "@/components/app/motion/tokens"

import { BarrasHtml, type GrupoBarras } from "./barras-html"

const grupos: GrupoBarras[] = [
  {
    rotulo: "Cliente A",
    linhas: [
      {
        mes: "set/26",
        destaque: true,
        celulas: [
          {
            segmentos: [
              { id: "x", rotulo: "Aberto", valor: 5, cor: "#123456" },
            ],
            texto: "5",
          },
        ],
      },
    ],
  },
]

const cena = (animar?: boolean) => (
  <BarrasHtml
    grupos={grupos}
    colunas={[{ maximo: 5 }]}
    descricao="Cliente × Situação"
    animar={animar}
  />
)

const animate = vi.fn(() => ({ cancel: vi.fn() }))
beforeEach(() => {
  animate.mockClear()
  Element.prototype.animate = animate as unknown as Element["animate"]
})
afterEach(() => {
  // @ts-expect-error o jsdom não tem Element.animate
  delete Element.prototype.animate
})

describe("BarrasHtml: crescimento da barra", () => {
  it("com `animar`, a barra cresce de scaleX(0) a scaleX(1), em chartGrow e ease-out", () => {
    const { container } = render(cena(true))
    const barra = container.querySelector<HTMLElement>("[data-barra]")!
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate).toHaveBeenCalledWith(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      expect.objectContaining({ duration: chartGrow, easing: "ease-out" })
    )
    expect(barra.style.transformOrigin).toMatch(/^(left|0%)/)
  })

  it("sem `animar`, a barra aparece pronta, sem animação", () => {
    const { container } = render(cena())
    const barra = container.querySelector<HTMLElement>("[data-barra]")!
    expect(animate).not.toHaveBeenCalled()
    expect(barra.style.transform).toBe("")
    expect(barra.style.width).not.toBe("")
  })

  it("o rótulo do valor fica fora do elemento escalado (nunca distorce)", () => {
    const { container } = render(cena(true))
    const barra = container.querySelector("[data-barra]")!
    expect(barra.textContent).toBe("")
    expect(container.textContent).toContain("5")
  })
})
