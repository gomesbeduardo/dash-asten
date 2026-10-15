import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Carga } from "@/cargas"
import { Apresentacao, type ApresentacaoProps } from "./Apresentacao"

const mocks = vi.hoisted(() => ({ reduzido: false, montadas: [] as string[] }))

vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  useReducedMotion: () => mocks.reduzido,
}))

vi.mock("@/panels/tipos", async () => {
  const React = await import("react")
  const visao = (nome: string) => () => {
    React.useEffect(() => {
      mocks.montadas.push(nome)
    }, [])
    return <div data-testid={`visao-${nome}`} />
  }
  const Painel = visao("painel")
  const Comparar = visao("comparar")
  const Leituras = visao("leituras")
  return { visoesDoTipo: () => ({ Painel, Comparar, Leituras }) }
})

const carga = {
  id: "1",
  tipo: "x",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T00:00:00Z",
  arquivo: "a.xlsx",
  linhas: 0,
  nome: null,
  arquivadaEm: null,
  workbook: { sheets: [] },
} as unknown as Carga

const props: ApresentacaoProps = {
  carga,
  metas: [carga],
  metasTodas: [carga],
  onAlterar: async () => {},
  obterCarga: async () => carga,
  onAbrir: () => {},
  onNovaCarga: () => {},
  onFecharCarga: () => {},
  erro: null,
  onDismissErro: () => {},
}

const aba = (nome: string) => screen.getByRole("tab", { name: nome })

beforeEach(() => {
  localStorage.clear()
  mocks.reduzido = false
  mocks.montadas.length = 0
})

describe("Apresentacao: troca de aba em duas fases", () => {
  it("o conteúdo antigo fica na tela até o indicador assentar; depois entra o novo", async () => {
    render(<Apresentacao {...props} />)
    await screen.findByTestId("visao-painel")

    await userEvent.click(aba("Comparar"))
    expect(aba("Comparar")).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("visao-painel")).toBeInTheDocument()
    expect(screen.queryByTestId("visao-comparar")).not.toBeInTheDocument()

    expect(await screen.findByTestId("visao-comparar")).toBeInTheDocument()
    expect(screen.queryByTestId("visao-painel")).not.toBeInTheDocument()
  })

  it("com movimento reduzido a troca é imediata", async () => {
    mocks.reduzido = true
    render(<Apresentacao {...props} />)
    await screen.findByTestId("visao-painel")

    await userEvent.click(aba("Comparar"))
    expect(
      await screen.findByTestId("visao-comparar", {}, { timeout: 100 })
    ).toBeInTheDocument()
  })

  it("cliques rápidos Painel, Comparar, Leituras montam só Leituras", async () => {
    render(<Apresentacao {...props} />)
    await screen.findByTestId("visao-painel")
    mocks.montadas.length = 0

    await userEvent.click(aba("Comparar"))
    await userEvent.click(aba("Leituras"))

    expect(await screen.findByTestId("visao-leituras")).toBeInTheDocument()
    expect(mocks.montadas).toEqual(["leituras"])
  })
})
