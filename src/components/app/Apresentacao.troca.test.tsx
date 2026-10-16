import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Carga } from "@/cargas"
import { Apresentacao, type ApresentacaoProps } from "./Apresentacao"
import { esperaTrocaAba } from "./motion/tokens"

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

// Relógio falso: nada depende de tempo real. O avanço roda dentro de act para
// o React processar o setTimeout da espera e os efeitos resultantes.
const avancar = async (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
  // Deixa as promessas pendentes e o useDeferredValue resolverem.
  await act(async () => {})
}

// Clique síncrono (a aba reage a onClick): não passa pelo asyncWrapper do
// userEvent, que espera um setTimeout e travaria com o relógio falso.
const clicar = (nome: string) => fireEvent.click(aba(nome))

const abrir = async () => {
  render(<Apresentacao {...props} />)
  // Primeira montagem: a visão inicial entra sem espera de troca.
  await avancar(esperaTrocaAba)
  expect(screen.getByTestId("visao-painel")).toBeInTheDocument()
  mocks.montadas.length = 0
}

beforeEach(() => {
  // setImmediate/MessageChannel ficam reais: o act do React os usa para
  // terminar, e fakeá-los trava o teste.
  vi.useFakeTimers({
    shouldAdvanceTime: false,
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  })
  localStorage.clear()
  mocks.reduzido = false
  mocks.montadas.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Apresentacao: troca de aba em duas fases", () => {
  it("o conteúdo antigo fica na tela até o indicador assentar; depois entra o novo", async () => {
    await abrir()

    clicar("Comparar")
    expect(aba("Comparar")).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("visao-painel")).toBeInTheDocument()
    expect(screen.queryByTestId("visao-comparar")).not.toBeInTheDocument()

    // Assentou: o teto de espera passou (ou a TopBar chamou onAssentou).
    await avancar(esperaTrocaAba)
    expect(screen.getByTestId("visao-comparar")).toBeInTheDocument()
    expect(screen.queryByTestId("visao-painel")).not.toBeInTheDocument()
  })

  it("o conteúdo antigo fica com aria-busy enquanto a troca está pendente", async () => {
    await abrir()
    const ocupado = (id: string) =>
      screen.getByTestId(id).closest("[aria-busy]")

    expect(ocupado("visao-painel")).toHaveAttribute("aria-busy", "false")

    clicar("Comparar")
    expect(ocupado("visao-painel")).toHaveAttribute("aria-busy", "true")

    await avancar(esperaTrocaAba)
    expect(ocupado("visao-comparar")).toHaveAttribute("aria-busy", "false")
  })

  it("com movimento reduzido a troca é imediata", async () => {
    mocks.reduzido = true
    await abrir()

    clicar("Comparar")
    // Sem avançar o relógio além de um flush: não há espera de troca.
    await avancar(0)
    expect(screen.getByTestId("visao-comparar")).toBeInTheDocument()
    expect(screen.queryByTestId("visao-painel")).not.toBeInTheDocument()
  })

  it("cliques rápidos Painel, Comparar, Leituras montam só Leituras", async () => {
    await abrir()

    // Os dois cliques são síncronos e o relógio falso só anda em avancar():
    // ambos acontecem antes de qualquer espera de troca vencer.
    clicar("Comparar")
    clicar("Leituras")
    expect(mocks.montadas).toEqual([])

    await avancar(esperaTrocaAba)
    expect(screen.getByTestId("visao-leituras")).toBeInTheDocument()
    expect(mocks.montadas).toEqual(["leituras"])
  })
})
