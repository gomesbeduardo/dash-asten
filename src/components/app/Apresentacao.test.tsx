import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Carga } from "@/cargas"
import { Apresentacao, type ApresentacaoProps } from "./Apresentacao"
import { useBarra } from "./BarraContext"
import { AnimatedNumber } from "./motion/AnimatedNumber"
import { useEntrada } from "./motion/useEntrada"

// Conta quantas vezes a visão montou (a identidade do nó também prova, mas o contador é direto).
const mocks = vi.hoisted(() => ({ montagens: 0 }))

vi.mock("@/panels/tipos", () => {
  const Painel = () => {
    const { setHold } = useBarra()
    return (
      <button onClick={() => setHold(true)} type="button">
        segurar barra
      </button>
    )
  }
  // Painel que expõe a `entrada` travada na montagem, como os reais.
  const PainelEntrada = ({ entrada, carga }: { entrada: boolean; carga: Carga }) => {
    const play = useEntrada(entrada)
    useEffect(() => {
      mocks.montagens++
    }, [])
    return <div data-testid={`visao-${carga.id}`} data-entrada={play ? "" : undefined} />
  }
  // Painel com um número como o KPI real: nasce do zero só com `entrada`.
  const PainelNumero = ({ entrada, carga }: { entrada: boolean; carga: Carga }) => {
    const play = useEntrada(entrada)
    return (
      <div data-testid="visao-numero">
        <AnimatedNumber value={carga.linhas} format="integer" fromZero={play} />
      </div>
    )
  }
  return {
    visoesDoTipo: (tipo: string) => ({
      Painel: tipo === "entrada" ? PainelEntrada : tipo === "numero" ? PainelNumero : Painel,
    }),
  }
})

const carga = {
  id: "1",
  tipo: "outro",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T00:00:00Z",
  arquivo: "a.xlsx",
  linhas: 0,
  nome: null,
  arquivadaEm: null,
  workbook: { sheets: [] },
} as unknown as Carga

function montar(extra: Partial<ApresentacaoProps> = {}) {
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
    ...extra,
  }
  render(<Apresentacao {...props} />)
  return screen.getByRole("main")
}

beforeAll(() => {
  // jsdom não faz layout: dá uma altura à barra para o respiro aparecer.
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 100,
  })
})
afterEach(() => vi.restoreAllMocks())

describe("Apresentacao: barra e erro não empurram o conteúdo", () => {
  it("gaveta segurando a barra não dá respiro ao conteúdo", async () => {
    const main = montar()
    await userEvent.click(await screen.findByRole("button", { name: "segurar barra" }))
    expect(main.style.paddingTop).toBe("")
  })

  it("barra fixada pela tecla H reserva o respiro", async () => {
    const main = montar()
    await userEvent.keyboard("h")
    expect(main.style.paddingTop).toBe("calc(100px + 1rem)")
  })

  it("erro fica fora do fluxo do main e some ao Fechar", async () => {
    const onDismissErro = vi.fn()
    const main = montar({ erro: "Falhou.", onDismissErro })
    const alerta = screen.getByRole("alert")
    expect(alerta).toHaveTextContent("A carga atual continua aberta.")
    expect(main.contains(alerta)).toBe(false)
    expect(alerta.className).toMatch(/fixed|absolute/)
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(onDismissErro).toHaveBeenCalled()
  })
})

describe("Apresentacao: entrada animada na primeira visita", () => {
  const cargaB = { ...carga, id: "2", tipo: "entrada" } as unknown as Carga
  const cargaA = { ...carga, id: "1", tipo: "entrada" } as unknown as Carga
  const props = (c: Carga): ApresentacaoProps => ({
    carga: c,
    metas: [cargaA, cargaB],
    metasTodas: [cargaA, cargaB],
    onAlterar: async () => {},
    obterCarga: async () => c,
    onAbrir: () => {},
    onNovaCarga: () => {},
    onFecharCarga: () => {},
    erro: null,
    onDismissErro: () => {},
  })

  it("toca na primeira visita, mesmo montando após o esqueleto", async () => {
    render(<Apresentacao {...props(cargaA)} />)
    expect(await screen.findByTestId("visao-1")).toHaveAttribute("data-entrada")
  })

  it("trocar a competência na mesma visão não remonta a visão nem toca a entrada de novo", async () => {
    mocks.montagens = 0
    const { rerender } = render(<Apresentacao {...props(cargaA)} />)
    const no = await screen.findByTestId("visao-1")
    expect(mocks.montagens).toBe(1)

    rerender(<Apresentacao {...props(cargaB)} />)
    // Mesmo nó, mesma montagem: a visão recebe a carga nova e transita.
    expect(await screen.findByTestId("visao-2")).toBe(no)
    rerender(<Apresentacao {...props(cargaA)} />)
    expect(await screen.findByTestId("visao-1")).toBe(no)
    expect(mocks.montagens).toBe(1)
  })
})

describe("Apresentacao: números na troca de competência", () => {
  const com = (id: string, linhas: number) =>
    ({ ...carga, id, tipo: "numero", linhas }) as unknown as Carga
  const props = (c: Carga): ApresentacaoProps => ({
    carga: c,
    metas: [c],
    metasTodas: [c],
    onAlterar: async () => {},
    obterCarga: async () => c,
    onAbrir: () => {},
    onNovaCarga: () => {},
    onFecharCarga: () => {},
    erro: null,
    onDismissErro: () => {},
  })

  it("o número vai do valor antigo ao novo, não do zero", async () => {
    const { rerender } = render(<Apresentacao {...props(com("1", 100))} />)
    const numero = () => screen.getByTestId("visao-numero").textContent
    await waitFor(() => expect(numero()).toBe("100"), { timeout: 4000 })

    rerender(<Apresentacao {...props(com("2", 300))} />)
    // Espera o conteúdo trocar para a carga nova (o rótulo acessível já é o final).
    await waitFor(
      () =>
        expect(screen.getByRole("img", { name: "300" })).toBeInTheDocument(),
      { timeout: 4000 }
    )
    // Nunca passou por zero: o primeiro texto visível já é um valor entre 100 e 300.
    expect(Number(numero()!.replace(/\D/g, ""))).toBeGreaterThanOrEqual(100)
    await waitFor(() => expect(numero()).toBe("300"), { timeout: 4000 })
  })
})

describe("Apresentacao: sem esqueleto quando a visão monta direto", () => {
  const nova = (id: string) => ({ ...carga, id, tipo: "entrada" }) as unknown as Carga
  const props = (c: Carga): ApresentacaoProps => ({
    carga: c,
    metas: [nova("1"), nova("2")],
    metasTodas: [nova("1"), nova("2")],
    onAlterar: async () => {},
    obterCarga: async () => c,
    onAbrir: () => {},
    onNovaCarga: () => {},
    onFecharCarga: () => {},
    erro: null,
    onDismissErro: () => {},
  })

  it("abrir e trocar de competência não mostram o esqueleto em nenhum momento", async () => {
    let esqueletos = 0
    const olho = new MutationObserver(() => {
      if (document.querySelector('[aria-busy="true"]')) esqueletos++
    })
    olho.observe(document.body, { childList: true, subtree: true })
    const { rerender } = render(<Apresentacao {...props(nova("1"))} />)
    await screen.findByTestId("visao-1")
    rerender(<Apresentacao {...props(nova("2"))} />)
    await screen.findByTestId("visao-2")
    rerender(<Apresentacao {...props(nova("1"))} />)
    await screen.findByTestId("visao-1")
    await new Promise((r) => setTimeout(r, 50))
    olho.disconnect()
    expect(esqueletos).toBe(0)
  })
})
