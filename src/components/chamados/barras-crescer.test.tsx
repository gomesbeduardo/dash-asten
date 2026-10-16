import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { chartGrow } from "@/components/app/motion/tokens"
import { BarrasHtml } from "./barras-html"
import { BarrasRefinadas } from "./barras-refinadas"
import { BarraPercentual } from "./cruzamentos-ui"

let reduzido = false
vi.mock("motion/react", async () => ({
  ...(await vi.importActual<typeof import("motion/react")>("motion/react")),
  useReducedMotion: () => reduzido,
}))

const animate = vi.fn(() => ({ cancel: vi.fn() }))
beforeEach(() => {
  reduzido = false
  animate.mockClear()
  HTMLElement.prototype.animate = animate as never
})
afterEach(() => {
  // @ts-expect-error o jsdom não traz WAAPI
  delete HTMLElement.prototype.animate
})

const series = [{ id: "a", rotulo: "A", cor: "var(--chart-1)" }]
const linhas = [{ rotulo: "X", valores: [{ valor: 5, base: 3 }] }]
const grupos = [
  {
    rotulo: "Cliente Alfa",
    linhas: [
      {
        mes: "out/26",
        destaque: true,
        celulas: [
          {
            texto: "3",
            segmentos: [
              { id: "a", rotulo: "A", valor: 2, cor: "var(--chart-1)" },
              { id: "b", rotulo: "B", valor: 1, cor: "var(--chart-3)" },
            ],
          },
        ],
      },
    ],
  },
]

function revelacao(el: Element) {
  const chamada = animate.mock.calls[0] as unknown as [
    Keyframe[],
    KeyframeAnimationOptions,
  ]
  expect(chamada).toBeDefined()
  const [quadros, opcoes] = chamada
  // a ponta não é esticada: nada de scale; entra deslizando e o clip esconde só o que está antes da base
  expect(JSON.stringify(quadros)).not.toMatch(/scale/)
  expect(quadros[0].transform).toBe("translateX(-100%)")
  expect(quadros[0].clipPath).toMatch(/^inset\(.*100%\)$/)
  expect(quadros[1].transform).toBe("translateX(0)")
  expect(opcoes.duration).toBe(chartGrow)
  expect(opcoes.easing).toBe("ease-out")
  expect(el.getAttribute("style") ?? "").not.toMatch(/scale|transform/)
}

describe("barras crescem revelando a barra pronta (sem scaleX)", () => {
  it("barra refinada: com animar, anima o clip no próprio elemento da barra", () => {
    const { container } = render(
      <BarrasRefinadas linhas={linhas} series={series} animar />
    )
    expect(animate).toHaveBeenCalledTimes(1)
    revelacao(container.querySelector("[data-barra]")!)
    expect(animate.mock.instances[0]).toBe(
      container.querySelector("[data-barra]")
    )
  })

  it("pilha: um clip só, no contêiner da pilha", () => {
    const { container } = render(
      <BarrasHtml
        grupos={grupos}
        colunas={[{ maximo: 3 }]}
        descricao="x"
        animar
      />
    )
    expect(animate).toHaveBeenCalledTimes(1)
    const pilha = container.querySelector("[aria-hidden] .overflow-hidden")!
    expect(animate.mock.instances[0]).toBe(pilha)
    revelacao(pilha)
  })

  it("barra percentual: anima o clip da barra", () => {
    const { container } = render(<BarraPercentual rotulo="A" pct={50} animar />)
    expect(animate.mock.instances[0]).toBe(
      container.querySelector("[data-barra-sla]")
    )
    revelacao(container.querySelector("[data-barra-sla]")!)
  })

  it("sem animar ou com movimento reduzido, aparece pronta, sem animação", () => {
    render(<BarrasRefinadas linhas={linhas} series={series} animar={false} />)
    render(
      <BarrasHtml grupos={grupos} colunas={[{ maximo: 3 }]} descricao="x" />
    )
    render(<BarraPercentual rotulo="A" pct={50} />)
    reduzido = true
    render(<BarrasRefinadas linhas={linhas} series={series} animar />)
    render(
      <BarrasHtml
        grupos={grupos}
        colunas={[{ maximo: 3 }]}
        descricao="x"
        animar
      />
    )
    render(<BarraPercentual rotulo="A" pct={50} animar />)
    expect(animate).not.toHaveBeenCalled()
  })
})
