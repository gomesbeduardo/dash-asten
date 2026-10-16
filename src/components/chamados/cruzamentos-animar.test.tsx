import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EntradaCompetencia } from "@/chamados"

const props = vi.hoisted(() => ({ pilhas: [] as { animar?: boolean }[] }))
vi.mock("./barras-html", async (orig) => ({
  ...(await orig<typeof import("./barras-html")>()),
  BarrasHtml: (p: { animar?: boolean }) => {
    props.pilhas.push(p)
    return null
  },
}))
vi.mock("@/chamados", async (orig) => ({
  ...(await orig<typeof import("@/chamados")>()),
  clientePorSituacao: () => ({
    itens: [{ rotulo: "A", total: 1, porSituacao: { Aberto: 1 } }],
    situacoes: ["Aberto"],
  }),
  operadorPorAtraso: () => [{ rotulo: "Ana", total: 1, porFaixa: { "1": 1 } }],
}))

import { ClienteSituacao, OperadorAtraso } from "./cruzamentos-ui"

const dados = (animar?: boolean) => ({
  atual: {} as EntradaCompetencia,
  competencia: "2026-10",
  base: null,
  entradaBase: null,
  cores: new Map<string, string>(),
  animar,
})

describe("cruzamentos repassam animar às pilhas", () => {
  beforeEach(() => {
    props.pilhas.length = 0
  })
  it.each([
    ["Cliente × Situação", ClienteSituacao],
    ["Operador × Atraso", OperadorAtraso],
  ])("%s", (_nome, Cruz) => {
    render(<Cruz {...dados(true)} />)
    expect(props.pilhas.at(-1)?.animar).toBe(true)
    render(<Cruz {...dados()} />)
    expect(props.pilhas.at(-1)?.animar).toBeFalsy()
  })
})
