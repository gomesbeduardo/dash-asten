import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BarrasRefinadas } from "./barras-refinadas"

const series = [
  { id: "fin", rotulo: "Finalizados no mês", cor: "var(--serie-finalizados)" },
  {
    id: "nao",
    rotulo: "Não finalizados",
    cor: "var(--serie-nao-finalizados)",
  },
]
const linhas = [
  {
    rotulo: "Cliente Alfa",
    valores: [
      { valor: 12, base: 15 },
      { valor: 30, base: 22 },
    ],
  },
  {
    rotulo: "Cliente Beta",
    valores: [
      { valor: 4, base: 0 },
      { valor: 9, base: 9 },
    ],
  },
]

describe("BarrasRefinadas", () => {
  it("com comparação cada barra tem a camada listrada montada e o valor do mês comparado ao lado do atual", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    // a camada listrada fica montada em toda barra quando há comparação (com largura 0 se a base for 0)
    expect(container.querySelectorAll("[data-fantasma]")).toHaveLength(4)
    expect(container.querySelectorAll("[data-marca]")).toHaveLength(0)
    expect(screen.getByText("mai 15")).toBeInTheDocument()
    expect(screen.getByText("mai 22")).toBeInTheDocument()
    expect(screen.getByText("mai 0")).toBeInTheDocument()
    // o valor atual fica em destaque, ao lado do comparado
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(container.querySelectorAll("[data-barra]")).toHaveLength(4)
  })

  it("comparado maior: as listras continuam a barra do fim da sólida até o comparado, na mesma espessura", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    // eixo até 30: Alfa, finalizados, 12 (40%) contra 15 no comparado: listras de 40% a 50%
    const barra = container.querySelector("[data-barra]") as HTMLElement
    const lista = container.querySelector("[data-fantasma]") as HTMLElement
    expect(barra.style.width).toBe("40%")
    expect(barra.style.height).toBe("1.25rem")
    expect(lista.style.left).toBe("40%")
    expect(lista.style.width).toBe("10%")
    expect(lista.style.height).toBe("1.25rem")
    expect(lista.getAttribute("aria-hidden")).toBe("true")
    expect(lista.style.background).toMatch(/repeating-linear-gradient\(45deg/)
  })

  it("comparado menor ou igual não tem listra: a sólida fica inteira e o comparado só no rótulo", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    const barras = [...container.querySelectorAll("[data-barra]")].filter(
      (b) => !b.classList.contains("hidden")
    ) as HTMLElement[]
    for (const b of barras) expect(b.style.height).toBe("1.25rem")
    const fantasmas = [
      ...container.querySelectorAll("[data-fantasma]"),
    ] as HTMLElement[]
    // Alfa não finalizados 30 contra 22; Beta 4 contra 0 e 9 contra 9
    for (const [k, inicio] of [
      [1, "100%"],
      [2, "13.333333333333334%"],
      [3, "30%"],
    ] as const) {
      expect(fantasmas[k].style.width).toBe("0%")
      expect(fantasmas[k].style.left).toBe(inicio)
      expect(fantasmas[k].style.minWidth).toMatch(/^0(px)?$/)
    }
    expect(screen.getByText("mai 22")).toBeInTheDocument()
  })

  it("sem comparação a barra sólida tem a espessura cheia", () => {
    const sem = linhas.map((l) => ({
      ...l,
      valores: l.valores.map((v) => ({ valor: v.valor })),
    }))
    const { container } = render(
      <BarrasRefinadas linhas={sem} series={series} animar={false} />
    )
    for (const b of container.querySelectorAll("[data-barra]")) {
      expect((b as HTMLElement).style.height).toBe("1.25rem")
    }
  })

  it("sem comparação só há as barras atuais, sem camada listrada nem rótulo do outro mês", () => {
    const sem = linhas.map((l) => ({
      ...l,
      valores: l.valores.map((v) => ({ valor: v.valor })),
    }))
    const { container } = render(
      <BarrasRefinadas linhas={sem} series={series} animar={false} />
    )
    expect(container.querySelectorAll("[data-fantasma]")).toHaveLength(0)
    expect(screen.queryByText(/^mai/)).toBeNull()
    expect(container.querySelectorAll("[data-barra]")).toHaveLength(4)
    expect(
      screen.getByTitle("Cliente Alfa, Não finalizados: 30")
    ).toHaveTextContent("30")
  })

  it("a imagem descreve os valores em palavras para leitor de tela", () => {
    render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    const img = screen.getByRole("img")
    expect(img.getAttribute("aria-label")).toBe(
      "Cliente Alfa: Finalizados no mês 12 (mai/26: 15), Não finalizados 30 (mai/26: 22); Cliente Beta: Finalizados no mês 4 (mai/26: 0), Não finalizados 9 (mai/26: 9)"
    )
  })

  it("a base (lado do eixo) é reta e só a ponta da barra inteira tem raio de 4 px", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    const barras = [...container.querySelectorAll("[data-barra]")].filter(
      (b) => !b.classList.contains("hidden")
    )
    for (const el of [
      ...barras,
      ...container.querySelectorAll("[data-fantasma]"),
    ])
      expect(el.className).not.toMatch(/(^|\s)rounded-(full|l-)/)
    // Alfa, finalizados: as listras continuam a barra, então a ponta arredondada é a delas
    expect(barras[0].className).not.toMatch(/rounded-r-\[4px\]/)
    expect(container.querySelector("[data-fantasma]")!.className).toMatch(
      /rounded-r-\[4px\]/
    )
    for (const el of barras.slice(1))
      expect(el.className).toMatch(/rounded-r-\[4px\]/)
  })

  it("sem comparação a barra sólida tem a espessura cheia", () => {
    const sem = linhas.map((l) => ({
      ...l,
      valores: l.valores.map((v) => ({ valor: v.valor })),
    }))
    const { container } = render(
      <BarrasRefinadas linhas={sem} series={series} animar={false} />
    )
    const barra = container.querySelector("[data-barra]") as HTMLElement
    expect(barra.style.height).toBe("1.25rem")
    expect(barra.style.top).toMatch(/^(0|0px)?$/)
  })

  it("o rótulo do eixo com unidade fica numa linha só ('5 d' não quebra)", () => {
    render(
      <BarrasRefinadas
        linhas={[{ rotulo: "A", valores: [{ valor: 13 }, { valor: 2 }] }]}
        series={series}
        animar={false}
        formatar={(v) => `${v} d`}
      />
    )
    const tick = screen.getByText("5 d")
    expect(tick.className).toMatch(/whitespace-nowrap/)
  })

  it("a largura das duas camadas e a posição do rótulo transitam do valor antigo ao novo e voltam secas com movimento reduzido", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    for (const el of [
      container.querySelector("[data-barra][style*='width']"),
      container.querySelector("[data-fantasma]"),
    ]) {
      expect(el!.className).toMatch(/transicao-valor/)
    }
    const rotulo = screen.getByText("12").parentElement as HTMLElement
    expect(rotulo.className).toMatch(/transicao-valor/)
  })

  describe("entrada", () => {
    let animate: ReturnType<typeof vi.fn>
    beforeEach(() => {
      animate = vi.fn(() => ({ cancel() {} }))
      Object.defineProperty(HTMLElement.prototype, "animate", {
        configurable: true,
        value: animate,
      })
    })
    afterEach(() => {
      // @ts-expect-error remove o stub do jsdom
      delete HTMLElement.prototype.animate
    })

    it("linha que aparece depois da primeira montagem entra pronta, sem atraso nem entrada do zero", async () => {
      const { rerender } = render(
        <BarrasRefinadas linhas={[linhas[0]]} series={series} animar />
      )
      expect(animate).toHaveBeenCalledTimes(2)
      await act(() => new Promise((r) => setTimeout(r, 10)))
      rerender(<BarrasRefinadas linhas={linhas} series={series} animar />)
      expect(animate).toHaveBeenCalledTimes(2)
    })

    it("as listras entram depois que a sólida termina de crescer", () => {
      render(
        <BarrasRefinadas
          linhas={[linhas[0]]}
          series={series.slice(0, 1)}
          rotuloBase="mai/26"
          animar
        />
      )
      const atrasos = animate.mock.calls.map(
        (c) => (c as unknown as [unknown, { delay: number }])[1].delay
      )
      // a camada listrada vem antes no DOM: listras em 600 ms, sólida em 0
      expect(atrasos).toEqual([600, 0])
    })
  })
})
