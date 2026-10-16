import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

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
  it("o mês comparado aparece como um traço vertical sobre a barra, com o valor dele ao lado do atual", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    // um traço por barra com mês comparado (inclusive o 0 de Beta: o traço fica na base)
    expect(container.querySelectorAll("[data-marca]")).toHaveLength(3)
    expect(screen.getByText("mai 15")).toBeInTheDocument()
    expect(screen.getByText("mai 22")).toBeInTheDocument()
    expect(screen.getByText("mai 0")).toBeInTheDocument()
    // o valor atual fica em destaque, ao lado do comparado
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(container.querySelectorAll("[data-barra]")).toHaveLength(4)
  })

  it("sem comparação só há as barras atuais, sem traço nem rótulo do outro mês", () => {
    const sem = linhas.map((l) => ({
      ...l,
      valores: l.valores.map((v) => ({ valor: v.valor })),
    }))
    const { container } = render(
      <BarrasRefinadas linhas={sem} series={series} animar={false} />
    )
    expect(container.querySelectorAll("[data-marca]")).toHaveLength(0)
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

  it("a base (lado do eixo) é reta e só a ponta tem raio de 4 px", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    for (const el of container.querySelectorAll("[data-barra]")) {
      expect(el.className).toMatch(/rounded-r-\[4px\]/)
      expect(el.className).not.toMatch(/(^|\s)rounded-(full|l-)/)
    }
  })

  it("o traço fica no valor do mês comparado, na mesma escala da barra", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    // eixo até 30: a barra de 12 ocupa 40% e o traço do 15 comparado fica em 50%
    const barra = container.querySelector("[data-barra]") as HTMLElement
    const marca = container.querySelector("[data-marca]") as HTMLElement
    expect(barra.style.width).toBe("40%")
    expect(marca.style.left).toBe("50%")
    expect(marca.getAttribute("aria-hidden")).toBe("true")
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

  it("a largura e a posição do traço e do rótulo transitam do valor antigo ao novo e voltam secas com movimento reduzido", () => {
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
      container.querySelector("[data-marca]"),
    ]) {
      expect(el!.className).toMatch(/transicao-valor/)
    }
    const rotulo = screen.getByText("12").parentElement as HTMLElement
    expect(rotulo.className).toMatch(/transicao-valor/)
  })
})
