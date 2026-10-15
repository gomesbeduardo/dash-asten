import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import { ListaCargasAgrupada } from "./ListaCargasAgrupada"

const meta = (p: Partial<CargaMeta>): CargaMeta => ({
  id: "x",
  tipo: "chamados",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-14T15:00:00.000Z",
  arquivo: "x.xlsx",
  linhas: 5, nome: null, arquivadaEm: null,
  ...p,
})
const S1 = meta({ id: "s1", versao: 1, arquivo: "set-1.xlsx" })
const S2 = meta({ id: "s2", versao: 2, arquivo: "set-2.xlsx" })
const S3 = meta({ id: "s3", versao: 3, arquivo: "set-3.xlsx" })
const A1 = meta({ id: "a1", competencia: "2026-08", arquivo: "ago.xlsx" })
const O1 = meta({ id: "o1", tipo: "outro", arquivo: "outro.xlsx" })
const nomeDoTipo = (id: string) => (id === "outro" ? "Outro" : "Chamados")

function montar(metas: CargaMeta[], extra = {}) {
  const onAbrir = vi.fn()
  render(
    <ListaCargasAgrupada
      metas={metas}
      nomeDoTipo={nomeDoTipo}
      onAbrir={onAbrir}
      {...extra}
    />
  )
  return { onAbrir }
}

describe("ListaCargasAgrupada", () => {
  it("versões do mesmo tipo e competência formam um grupo com a mais recente no topo e as anteriores recolhidas", async () => {
    const user = userEvent.setup()
    const { onAbrir } = montar([S1, S3, S2, A1])
    expect(screen.getByText("set-3.xlsx")).toBeInTheDocument()
    expect(screen.queryByText("set-2.xlsx")).toBeNull()
    expect(screen.queryByText("set-1.xlsx")).toBeNull()
    // agosto não tem versões anteriores: sem botão de expandir
    const botao = screen.getByRole("button", { name: /2 versões anteriores/ })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    expect(screen.getAllByRole("button", { name: /versões? anteriores?/ })).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Abrir Setembro de 2026 v3" }))
    expect(onAbrir).toHaveBeenCalledWith("s3")

    await user.click(botao)
    expect(botao).toHaveAttribute("aria-expanded", "true")
    const itens = screen.getAllByText(/^set-\d\.xlsx$/).map((e) => e.textContent)
    expect(itens).toEqual(["set-3.xlsx", "set-2.xlsx", "set-1.xlsx"])
    await user.click(screen.getByRole("button", { name: "Abrir Setembro de 2026 v1" }))
    expect(onAbrir).toHaveBeenLastCalledWith("s1")
  })

  it("singular para uma versão anterior e competência mais recente primeiro", () => {
    montar([A1, S1, S2])
    expect(screen.getByRole("button", { name: /1 versão anterior/ })).toBeInTheDocument()
    const arqs = screen.getAllByText(/\.xlsx$/).map((e) => e.textContent)
    expect(arqs).toEqual(["set-2.xlsx", "ago.xlsx"])
  })

  it("com mais de um tipo agrupa por tipo com cabeçalho; com um só, sem cabeçalho", () => {
    const { unmount } = render(
      <ListaCargasAgrupada metas={[S1]} nomeDoTipo={nomeDoTipo} onAbrir={() => {}} />
    )
    expect(screen.queryByRole("heading", { name: "Chamados" })).toBeNull()
    unmount()
    montar([S1, O1])
    expect(screen.getByRole("heading", { name: "Chamados" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Outro" })).toBeInTheDocument()
  })

  it("expandirTodos mostra as versões anteriores sem clicar", () => {
    montar([S1, S2], { expandirTodos: true })
    expect(screen.getByText("set-1.xlsx")).toBeInTheDocument()
  })

  it("ações por versão: a ação da linha age só naquela versão", async () => {
    const user = userEvent.setup()
    const tirar = vi.fn()
    montar([S1, S2], {
      expandirTodos: true,
      acoes: (m: CargaMeta) => (
        <button onClick={() => tirar(m.id)}>Tirar {m.versao}</button>
      ),
    })
    const lista = screen.getByRole("list", { name: /Cargas/ })
    await user.click(within(lista).getByRole("button", { name: "Tirar 1" }))
    expect(tirar).toHaveBeenCalledWith("s1")
  })

  it("mostra o nome da versão ao lado do número (v2 · Correção do Líder)", () => {
    montar([S1, meta({ id: "s2n", versao: 2, arquivo: "set-2.xlsx", nome: "Correção do Líder" })])
    expect(screen.getByText(/v2 · Correção do Líder/)).toBeInTheDocument()
  })

  it("carga arquivada traz a marca e, com podeAbrir falso, sem o botão Abrir", () => {
    const arq = meta({ id: "arq", arquivo: "velha.xlsx", arquivadaEm: "2026-10-10T00:00:00Z" })
    montar([arq], { podeAbrir: (m: CargaMeta) => !m.arquivadaEm })
    expect(screen.getByText("arquivada")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Abrir/ })).toBeNull()
  })

  it("recolher as versões anteriores as remove do DOM depois da saída", async () => {
    const user = userEvent.setup()
    montar([S1, S2])
    const botao = screen.getByRole("button", { name: /1 versão anterior/ })
    await user.click(botao)
    expect(await screen.findByText("set-1.xlsx")).toBeInTheDocument()
    await user.click(botao)
    await waitFor(() => expect(screen.queryByText("set-1.xlsx")).toBeNull())
  })
})
