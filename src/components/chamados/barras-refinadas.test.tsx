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
  it("o mês comparado aparece como contorno tracejado atrás da barra, com o valor dele ao lado do atual", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    // um contorno por barra com base maior que zero (Beta finalizados tem base 0: sem contorno)
    expect(container.querySelectorAll("[data-contorno]")).toHaveLength(3)
    expect(screen.getByText("mai 15")).toBeInTheDocument()
    expect(screen.getByText("mai 22")).toBeInTheDocument()
    expect(screen.getByText("mai 0")).toBeInTheDocument()
    // o valor atual fica em destaque, ao lado do comparado
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(container.querySelectorAll("[data-barra]")).toHaveLength(4)
  })

  it("sem comparação só há as barras atuais, sem contorno nem rótulo do outro mês", () => {
    const sem = linhas.map((l) => ({
      ...l,
      valores: l.valores.map((v) => ({ valor: v.valor })),
    }))
    const { container } = render(
      <BarrasRefinadas linhas={sem} series={series} animar={false} />
    )
    expect(container.querySelectorAll("[data-contorno]")).toHaveLength(0)
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

  it("a base (lado do eixo) é reta e só a ponta é arredondada, na barra e no contorno", () => {
    const { container } = render(
      <BarrasRefinadas
        linhas={linhas}
        series={series}
        rotuloBase="mai/26"
        animar={false}
      />
    )
    for (const el of container.querySelectorAll("[data-barra], [data-contorno]")) {
      expect(el.className).toMatch(/rounded-r-full/)
      expect(el.className).not.toMatch(/(^|\s)rounded-full/)
    }
  })
})
