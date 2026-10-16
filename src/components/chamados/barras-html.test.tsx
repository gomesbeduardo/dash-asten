import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BarrasHtml } from "./barras-html"

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

describe("BarrasHtml (pilha)", () => {
  it("só a ponta externa da pilha é arredondada; a base é reta e os segmentos internos ficam retos, separados por 2 px", () => {
    const { container } = render(
      <BarrasHtml
        grupos={grupos}
        colunas={[{ maximo: 3 }]}
        descricao="teste"
      />
    )
    const pilha = container.querySelector("[title='A: 2']")!
      .parentElement as HTMLElement
    expect(pilha.className).toMatch(/rounded-r-\[4px\]/)
    expect(pilha.className).not.toMatch(/(^|\s)rounded-(full|sm|md|l-)/)
    // segmentos separados por 2 px da cor do fundo (o gap mostra o cartão)
    expect(pilha.className).toMatch(/(^|\s)gap-0\.5(\s|$)/)
    for (const seg of pilha.children) expect(seg.className).not.toMatch(/rounded/)
    // sombra suave na própria barra
    expect(pilha.style.boxShadow).not.toBe("")
  })

  it("mostra o valor dentro do segmento quando cabe e omite nos segmentos estreitos", () => {
    const g = JSON.parse(JSON.stringify(grupos))
    g[0].linhas[0].celulas[0].segmentos = [
      { id: "a", rotulo: "A", valor: 40, cor: "var(--chart-1)" },
      { id: "b", rotulo: "B", valor: 1, cor: "var(--chart-3)" },
    ]
    g[0].linhas[0].celulas[0].texto = "41"
    const { container } = render(
      <BarrasHtml grupos={g} colunas={[{ maximo: 41 }]} descricao="teste" />
    )
    const larga = container.querySelector("[title='A: 40']") as HTMLElement
    const estreita = container.querySelector("[title='B: 1']") as HTMLElement
    expect(larga).toHaveTextContent("40")
    expect(estreita).not.toHaveTextContent("1")
  })
})
