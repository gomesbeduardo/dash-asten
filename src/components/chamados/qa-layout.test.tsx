import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EntradaCompetencia } from "@/chamados"

const cap = vi.hoisted(() => ({
  grupos: [] as {
    rotulo: string
    linhas: { celulas: { segmentos: { rotulo: string; id: string }[] }[] }[]
  }[],
}))
vi.mock("./barras-html", async (orig) => {
  const real = await orig<typeof import("./barras-html")>()
  return {
    ...real,
    BarrasHtml: (p: { grupos: typeof cap.grupos }) => {
      cap.grupos = p.grupos
      return null
    },
  }
})
vi.mock("@/chamados", async (orig) => ({
  ...(await orig<typeof import("@/chamados")>()),
  operadorPorAtraso: () => [{ rotulo: "Ana", total: 1, porFaixa: { "1": 1 } }],
}))

import { OperadorAtraso } from "./cruzamentos-ui"
import { BarrasHtml } from "./barras-html"
import { rotuloFinalAbaixo } from "./graficos"
import { KpiCartao } from "./cartoes"
import { TooltipProvider } from "@/components/ui/tooltip"

const dados = {
  atual: {} as EntradaCompetencia,
  competencia: "2026-10",
  base: null,
  entradaBase: null,
  cores: new Map<string, string>(),
}

beforeEach(() => {
  cap.grupos = []
})

describe("barras HTML (item 2)", () => {
  it("o nome do cliente não é cortado com reticências e o nome completo é lido no gráfico (role img), não num aria-label solto", async () => {
    const real =
      await vi.importActual<typeof import("./barras-html")>("./barras-html")
    const nome = "Cliente Épsilon Comércio e Serviços Ltda"
    const { container } = render(
      <real.BarrasHtml
        grupos={[
          {
            rotulo: nome,
            linhas: [
              {
                mes: "out/26",
                destaque: true,
                celulas: [{ texto: "1", segmentos: [] }],
              },
            ],
          },
        ]}
        colunas={[{ maximo: 1 }]}
        descricao={`Cliente × Situação: ${nome} out/26 1`}
      />
    )
    // o nome acessível vem do role="img"; um aria-label dentro dele nunca é anunciado
    expect(
      screen.getByRole("img", { name: new RegExp(nome) })
    ).toBeInTheDocument()
    const r = container.querySelector(`[title="${nome}"]`) as HTMLElement
    expect(r).not.toHaveAttribute("aria-label")
    expect(r.className).not.toMatch(/truncate/)
    expect(r.className).toMatch(/break-words|wrap/)
    void BarrasHtml
  })
})

describe("rótulo do último ponto (item 3)", () => {
  it("com duas séries terminando juntas, a de menor valor vai para baixo e a outra fica em cima", () => {
    expect(rotuloFinalAbaixo([164, 157], 0)).toBe(false)
    expect(rotuloFinalAbaixo([164, 157], 1)).toBe(true)
  })
  it("empate: só a segunda desce; série única nunca desce", () => {
    expect(rotuloFinalAbaixo([70, 70], 0)).toBe(false)
    expect(rotuloFinalAbaixo([70, 70], 1)).toBe(true)
    expect(rotuloFinalAbaixo([70], 0)).toBe(false)
  })
})

describe("textos (itens 4 e 8)", () => {
  it("legenda das faixas de atraso: '1 mês' no singular", () => {
    render(<OperadorAtraso {...dados} />)
    const rotulos = cap.grupos[0].linhas[0].celulas[0].segmentos.map(
      (s) => s.rotulo
    )
    expect(rotulos).toContain("1 mês")
    expect(rotulos).not.toContain("1 meses")
    expect(rotulos).toContain("2–3 meses")
  })
})

describe("KPI (item 6)", () => {
  it("o título reserva 2 linhas para os números alinharem na mesma linha de base", () => {
    render(
      <TooltipProvider>
        <KpiCartao
          kpi={
            {
              id: "tempoMedio",
              rotulo: "Tempo médio de resolução",
              valor: 13.4,
              formato: "dias",
              definicao: "d",
            } as never
          }
          rotuloAnterior="set/26"
          entrada={false}
        />
      </TooltipProvider>
    )
    const h = screen.getByRole("heading", { name: "Tempo médio de resolução" })
    expect(h.className).toMatch(/min-h-\[2\.5em\]/)
  })
})
