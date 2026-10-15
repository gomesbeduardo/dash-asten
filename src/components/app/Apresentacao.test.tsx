import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Carga } from "@/cargas"
import { Apresentacao, type ApresentacaoProps } from "./Apresentacao"
import { useBarra } from "./BarraContext"
import { useEntrada } from "./motion/useEntrada"

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
    return <div data-testid={`visao-${carga.id}`} data-entrada={play ? "" : undefined} />
  }
  return {
    visoesDoTipo: (tipo: string) => ({ Painel: tipo === "entrada" ? PainelEntrada : Painel }),
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

  it("toca na primeira visita, mesmo montando após o esqueleto, e não na revisita", async () => {
    const { rerender } = render(<Apresentacao {...props(cargaA)} />)
    expect(await screen.findByTestId("visao-1")).toHaveAttribute("data-entrada")

    rerender(<Apresentacao {...props(cargaB)} />)
    expect(await screen.findByTestId("visao-2")).toHaveAttribute("data-entrada")

    rerender(<Apresentacao {...props(cargaA)} />)
    expect(await screen.findByTestId("visao-1")).not.toHaveAttribute("data-entrada")
  })
})
