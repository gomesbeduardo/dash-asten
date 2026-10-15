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
  it("só a ponta externa da pilha é arredondada; a base é reta e os segmentos internos ficam retos e encostados", () => {
    const { container } = render(
      <BarrasHtml
        grupos={grupos}
        colunas={[{ maximo: 3 }]}
        descricao="teste"
      />
    )
    const pilha = container.querySelector("[title='A: 2']")!
      .parentElement as HTMLElement
    expect(pilha.className).toMatch(/rounded-r-full/)
    expect(pilha.className).not.toMatch(/(^|\s)rounded-(full|sm|md)/)
    // encostados: sem espaço entre segmentos
    expect(pilha.className).not.toMatch(/gap-/)
    for (const seg of pilha.children) expect(seg.className).not.toMatch(/rounded/)
    // sombra suave na própria barra
    expect(pilha.style.boxShadow).not.toBe("")
  })
})
