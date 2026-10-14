import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { criarRepositorioMemoria, type RepositorioDeCargas } from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"
import { makeXlsx } from "@/test/makeWorkbook"
import { App } from "./App"

const CHAMADOS = [
  ["Código", "Data de abertura", "SITUAÇÃO", "Data de Solução", "Sla previsto", "Cliente", "Área Superior", "Atividade"],
  [1, new Date("2026-08-03"), "Finalizado", new Date("2026-08-10"), new Date("2026-08-12"), "A", "X", "Y"],
  [2, new Date("2026-08-05"), "Aberto", null, new Date("2026-08-20"), "B", "X", "Y"],
]
const bytes = () => makeXlsx({ Dados: CHAMADOS })
const arquivo = (nome: string) => new File([bytes()], nome)

async function salvar(repo: RepositorioDeCargas, nome: string, competencia: string) {
  const workbook = readWorkbook(bytes(), nome)
  return repo.salvar({ tipo: "chamados", competencia, arquivo: nome, workbook })
}
function montar(repo: RepositorioDeCargas) {
  render(
    <RepositorioProvider repositorio={repo}>
      <App />
    </RepositorioProvider>
  )
}
const abrirUltima = async () =>
  userEvent.click(await screen.findByRole("button", { name: /^Abrir a última/ }))

function disparar(tipo: "dragEnter" | "drop", dt: object, alvo: Element = document.body) {
  const ev = createEvent[tipo](alvo)
  Object.defineProperty(ev, "dataTransfer", { value: dt })
  act(() => {
    fireEvent(alvo, ev)
  })
  return ev
}

beforeEach(() => registrarTiposDoApp())
afterEach(() => vi.restoreAllMocks())

describe("soltar em qualquer lugar da tela inicial", () => {
  it("arrastar arquivos mostra o aviso de página inteira; texto não", async () => {
    montar(criarRepositorioMemoria())
    await screen.findByText("Cargas que já existem")
    disparar("dragEnter", { files: [], types: ["text/plain"] })
    expect(screen.queryByText("Solte para carregar")).toBeNull()
    disparar("dragEnter", { files: [arquivo("a.xlsx")], types: ["Files"] })
    expect(screen.getByText("Solte para carregar")).toBeInTheDocument()
  })

  it("soltar num canto, fora da caixa, chega à confirmação", async () => {
    montar(criarRepositorioMemoria())
    await screen.findByText("Cargas que já existem")
    disparar("drop", { files: [arquivo("chamados-agosto-2026.xlsx")], types: ["Files"] })
    expect(await screen.findByRole("dialog", { name: "Confirmar a carga" })).toBeInTheDocument()
  })

  it("com a confirmação aberta, soltar outro arquivo não abre o navegador nem troca nada", async () => {
    montar(criarRepositorioMemoria())
    await screen.findByText("Cargas que já existem")
    disparar("drop", { files: [arquivo("a-agosto-2026.xlsx")], types: ["Files"] })
    await screen.findByRole("dialog", { name: "Confirmar a carga" })
    const ev = disparar("drop", { files: [arquivo("b-agosto-2026.xlsx")], types: ["Files"] })
    expect(ev.defaultPrevented).toBe(true)
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })
})

describe("envio em andamento", () => {
  it("pede confirmação ao fechar a aba só enquanto guarda", async () => {
    const repo = criarRepositorioMemoria()
    let liberar!: () => void
    const salvarReal = repo.salvar.bind(repo)
    repo.salvar = (n) => new Promise((r) => (liberar = () => r(salvarReal(n))))
    montar(repo)
    const sair = () => {
      const ev = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(ev)
      return ev.defaultPrevented
    }
    expect(sair()).toBe(false)
    await userEvent.upload(await screen.findByLabelText(/Arquivo da planilha/), arquivo("chamados-agosto-2026.xlsx"))
    const d = await screen.findByRole("dialog", { name: "Confirmar a carga" })
    await userEvent.click(within(d).getByRole("button", { name: "Confirmar carga" }))
    await waitFor(() => expect(sair()).toBe(true))
    liberar()
    await screen.findByRole("heading", { level: 1 })
    expect(sair()).toBe(false)
  })
})

describe("abrir uma carga", () => {
  it("mostra o indicador e ignora cliques repetidos até terminar", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "2026-08")
    let liberar!: () => void
    const obter = repo.obter.bind(repo)
    const spy = vi.fn((id: string) => new Promise<Awaited<ReturnType<typeof obter>>>((r) => (liberar = () => r(obter(id)))))
    repo.obter = spy
    montar(repo)
    const botao = await screen.findByRole("button", { name: /^Abrir a última/ })
    await userEvent.click(botao)
    expect(await screen.findByText("Abrindo a carga…")).toBeInTheDocument()
    expect(botao).toBeDisabled()
    fireEvent.click(botao)
    expect(spy).toHaveBeenCalledTimes(1)
    liberar()
    await screen.findByRole("button", { name: "Competência" })
    expect(screen.queryByText("Abrindo a carga…")).toBeNull()
  })
})

describe("lembrar visão e carga neste navegador", () => {
  it("Abrir a última volta na carga e na visão lembradas", async () => {
    const base = criarRepositorioMemoria()
    const antiga = await salvar(base, "a.xlsx", "2026-07")
    await salvar(base, "b.xlsx", "2026-09")
    // Sem limparTudo (banco compartilhado), o botão vira "Fechar carga".
    montar({ ...base, limparTudo: undefined } as RepositorioDeCargas)
    // abre a mais recente, vai para Comparar e fecha
    await abrirUltima()
    await userEvent.click(await screen.findByRole("tab", { name: "Comparar" }))
    localStorage.setItem(
      "dash-asten:ultima-abertura",
      JSON.stringify({ cargaId: antiga.id, visao: "comparar" })
    )
    await userEvent.click(screen.getByRole("button", { name: /Fechar carga/ }))
    await abrirUltima()
    expect(await screen.findByRole("button", { name: "Competência" })).toHaveTextContent("Julho de 2026")
    expect(screen.getByRole("tab", { name: "Comparar" })).toHaveAttribute("aria-selected", "true")
  })

  it("trocar de visão guarda a escolha", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "2026-07")
    montar(repo)
    await abrirUltima()
    await userEvent.click(await screen.findByRole("tab", { name: "Evolução" }))
    expect(JSON.parse(localStorage.getItem("dash-asten:ultima-abertura")!)).toMatchObject({ visao: "evolucao" })
  })
})

describe("tela cheia", () => {
  afterEach(() => {
    // @ts-expect-error limpeza do mock
    delete document.documentElement.requestFullscreen
  })

  it("sem suporte, não há botão", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "2026-07")
    montar(repo)
    await abrirUltima()
    await screen.findByRole("tab", { name: "Painel" })
    expect(screen.queryByRole("button", { name: /tela cheia/i })).toBeNull()
  })

  it("com suporte, o botão e a tecla T pedem tela cheia", async () => {
    const req = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = req
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "2026-07")
    montar(repo)
    await abrirUltima()
    await userEvent.click(await screen.findByRole("button", { name: "Tela cheia" }))
    expect(req).toHaveBeenCalledTimes(1)
    await userEvent.keyboard("t")
    expect(req).toHaveBeenCalledTimes(2)
  })
})

describe("a barra fixa não cobre o conteúdo", () => {
  it("com a barra fixada (H) ou a gaveta de filtros aberta, o conteúdo ganha respiro igual à altura da barra", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(96)
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "2026-07")
    montar(repo)
    await abrirUltima()
    await screen.findByRole("tab", { name: "Painel" })
    const conteudo = () => document.querySelector("main[data-barra-segura]") as HTMLElement
    expect(conteudo().dataset.barraSegura).toBe("false")
    await userEvent.keyboard("h")
    await waitFor(() => expect(conteudo().dataset.barraSegura).toBe("true"))
    expect(conteudo().style.paddingTop).toContain("96px")
    await userEvent.keyboard("h")
    await waitFor(() => expect(conteudo().dataset.barraSegura).toBe("false"))
    await userEvent.keyboard("f")
    await waitFor(() => expect(conteudo().dataset.barraSegura).toBe("true"))
  })
})
