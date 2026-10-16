import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Minigrafico } from "./minigrafico"

describe("Minigrafico (6 meses)", () => {
  it("linha fina cinza e o ponto do mês atual na cor da série", () => {
    const { container } = render(
      <Minigrafico valores={[64, 70, 61, 58, 66, 69]} cor="var(--serie-nao-finalizados)" />
    )
    const linha = container.querySelector("polyline") as SVGPolylineElement
    expect(linha.getAttribute("stroke")).toBe("var(--muted-foreground)")
    expect(linha.getAttribute("points")!.trim().split(" ")).toHaveLength(6)
    const ponto = container.querySelector("circle") as SVGCircleElement
    expect(ponto.getAttribute("fill")).toBe("var(--serie-nao-finalizados)")
  })
  it("descreve a série em palavras para leitor de tela", () => {
    render(
      <Minigrafico
        valores={[1, null, 3]}
        rotulos={["ago/26", "set/26", "out/26"]}
        cor="var(--serie-finalizados)"
      />
    )
    expect(
      screen.getByRole("img", { name: "Últimos meses: ago/26 1, set/26 sem posição, out/26 3" })
    ).toBeInTheDocument()
  })
  it("mês sem posição quebra a linha em vez de virar zero", () => {
    const { container } = render(
      <Minigrafico valores={[1, 2, null, 4, 5]} cor="var(--serie-finalizados)" />
    )
    expect(container.querySelectorAll("polyline")).toHaveLength(2)
  })
  it("sem nenhum dado não desenha nada", () => {
    const { container } = render(<Minigrafico valores={[null, null]} cor="x" />)
    expect(container.querySelector("svg")).toBeNull()
  })
})
