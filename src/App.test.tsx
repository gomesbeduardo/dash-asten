import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { criarRepositorioMemoria, type RepositorioDeCargas } from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"
import { makeXlsx } from "@/test/makeWorkbook"
import { App } from "./App"

const OUTRO = [
  ["Área", "Valor"],
  ["TI", 1],
  ["RH", 2],
  ["TI", 3],
]
const CHAMADOS = [
  [
    "Código",
    "Data de abertura",
    "SITUAÇÃO",
    "Data de Solução",
    "Sla previsto",
    "Cliente",
    "Área Superior",
    "Atividade",
  ],
  [
    1,
    new Date("2026-08-03"),
    "Finalizado",
    new Date("2026-08-10"),
    new Date("2026-08-12"),
    "A",
    "X",
    "Y",
  ],
  [
    2,
    new Date("2026-08-05"),
    "Aberto",
    null,
    new Date("2026-08-20"),
    "B",
    "X",
    "Y",
  ],
]

function arquivo(nome: string, abas: Record<string, unknown[][]>): File {
  return new File([makeXlsx(abas)], nome)
}
const outro = (nome = "reuniao-agosto-2026.xlsx") =>
  arquivo(nome, { Projetos: OUTRO, Outra: [["X"], ["a"], ["b"]] })
const chamados = (nome: string) => arquivo(nome, { Dados: CHAMADOS })

async function salvar(
  repo: RepositorioDeCargas,
  nome: string,
  tipo: string,
  competencia: string,
  abas: Record<string, unknown[][]> = { Projetos: OUTRO }
) {
  const workbook = readWorkbook(makeXlsx(abas), nome)
  return repo.salvar({ tipo, competencia, arquivo: nome, workbook })
}

function montar(repo = criarRepositorioMemoria()) {
  render(
    <RepositorioProvider repositorio={repo}>
      <App />
    </RepositorioProvider>
  )
  return repo
}

const h1 = (name: string) => screen.findByRole("heading", { level: 1, name })

beforeEach(() => registrarTiposDoApp())

describe("nova carga", () => {
  it("passo de confirmação: competência inferida do arquivo, tipo Outro, troca de mês e salvar abre a carga", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )

    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar a carga",
    })
    expect(within(dialog).getByLabelText("Tipo")).toHaveValue("outro")
    expect(within(dialog).getByLabelText("Mês")).toHaveValue("8")
    expect(within(dialog).getByLabelText("Ano")).toHaveValue("2026")
    expect(within(dialog).getByText("pelo nome do arquivo")).toBeInTheDocument()
    expect(
      within(dialog).getByText(/reuniao-agosto-2026\.xlsx/)
    ).toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText("Mês"), "9")
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar carga" })
    )

    expect(await h1("Projetos")).toBeInTheDocument()
    expect(screen.getByText("3 linhas")).toBeInTheDocument()
    const [meta] = await repo.listar()
    expect(meta).toMatchObject({
      tipo: "outro",
      competencia: "2026-09",
      versao: 1,
    })
    expect(
      screen.getByRole("button", { name: "Competência" })
    ).toHaveTextContent("Setembro de 2026")
  })

  it("tipo Chamados reconhecido pelas colunas; abre o painel do tipo com as 3 visões", async () => {
    const user = userEvent.setup()
    montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      chamados("chamados-agosto-2026.xlsx")
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar a carga",
    })
    expect(within(dialog).getByLabelText("Tipo")).toHaveValue("chamados")
    expect(
      within(dialog).getByText("reconhecido pelas colunas")
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar carga" })
    )

    expect(await h1("Painel de chamados")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Comparar" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Evolução" })).toBeInTheDocument()
    await user.keyboard("c")
    expect(await h1("Comparar competências")).toBeInTheDocument()
    await user.keyboard("e")
    expect(await h1("Evolução")).toBeInTheDocument()
    await user.keyboard("p")
    expect(await h1("Painel de chamados")).toBeInTheDocument()
  })

  it("segunda carga do mesmo mês avisa a versão e cria a v2", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )
    await user.click(
      await screen.findByRole("button", { name: "Confirmar carga" })
    )
    await h1("Projetos")
    expect(screen.queryByText(/Será a versão/)).not.toBeInTheDocument()

    await user.upload(screen.getByLabelText(/Arquivo da nova carga/), outro())
    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar a carga",
    })
    expect(
      within(dialog).getByText(
        "Será a versão 2 deste mês (as anteriores continuam guardadas)."
      )
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar carga" })
    )

    await user.click(await screen.findByRole("button", { name: /Competência/ }))
    expect(
      await screen.findByRole("button", { name: "Agosto de 2026, versão 1" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Competência" })
    ).toHaveTextContent("v2")
    expect((await repo.listar()).map((m) => m.versao)).toEqual([2, 1])
  })

  it("cancelar volta sem salvar", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )
    await user.click(await screen.findByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(await repo.listar()).toEqual([])
    expect(
      screen.getByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
  })

  it("mostra mensagem simples para arquivo que não é a planilha", async () => {
    const user = userEvent.setup()
    montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      new File(["texto"], "x.xlsx")
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse arquivo não parece ser a planilha da reunião."
    )
  })
})

describe("abertura e navegação", () => {
  it("sem histórico mostra a tela de importação", async () => {
    montar()
    expect(
      await screen.findByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
  })

  it("com histórico abre a competência mais recente do tipo da última carga", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ch-07.xlsx", "chamados", "2026-07", { Dados: CHAMADOS })
    await salvar(repo, "ch-08.xlsx", "chamados", "2026-08", { Dados: CHAMADOS })
    await salvar(repo, "ch-06.xlsx", "chamados", "2026-06", { Dados: CHAMADOS }) // carregada por último
    await salvar(repo, "ch-08b.xlsx", "chamados", "2026-08", {
      Dados: CHAMADOS,
    })
    montar(repo)
    expect(await h1("Painel de chamados")).toBeInTheDocument()
    const sel = screen.getByRole("button", { name: "Competência" })
    expect(sel).toHaveTextContent("Agosto de 2026")
    expect(sel).toHaveTextContent("v2")
  })

  it("o seletor troca de competência e de versão", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "jul.xlsx", "outro", "2026-07", { Antigo: OUTRO })
    await salvar(repo, "ago1.xlsx", "outro", "2026-08", { Agosto1: OUTRO })
    await salvar(repo, "ago2.xlsx", "outro", "2026-08", { Agosto2: OUTRO })
    montar(repo)
    expect(await h1("Agosto2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Competência" }))
    await user.click(
      await screen.findByRole("button", { name: "Agosto de 2026, versão 1" })
    )
    expect(await h1("Agosto1")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Competência" })
    ).not.toHaveTextContent("v2")

    await user.click(screen.getByRole("button", { name: "Competência" }))
    await user.click(
      await screen.findByRole("button", { name: "Julho de 2026, versão 1" })
    )
    expect(await h1("Antigo")).toBeInTheDocument()
  })

  it("setas só trocam abas da planilha no tipo outro", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "a.xlsx", "outro", "2026-08", {
      Projetos: OUTRO,
      Outra: [["X"], ["a"], ["b"]],
    })
    montar(repo)
    await h1("Projetos")
    await user.keyboard("{ArrowRight}")
    expect(await h1("Outra")).toBeInTheDocument()
    await user.keyboard("1")
    expect(await h1("Projetos")).toBeInTheDocument()
    await user.keyboard("f")
    expect(
      await screen.findByRole("dialog", { name: "Filtros" })
    ).toBeInTheDocument()
    // sem Comparar/Evolução no tipo outro
    expect(
      screen.queryByRole("tab", { name: "Comparar" })
    ).not.toBeInTheDocument()
  })
})

describe("histórico e limpeza", () => {
  it("Histórico lista por tipo/competência/versão e exclui com confirmação", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "jul.xlsx", "outro", "2026-07", { Antigo: OUTRO })
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    montar(repo)
    await h1("Agosto")

    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    const painel = await screen.findByRole("dialog", { name: "Histórico" })
    await user.click(
      within(painel).getByRole("button", { name: "Excluir Julho de 2026 v1" })
    )
    expect(await repo.listar()).toHaveLength(2) // ainda não confirmou
    await user.click(
      within(painel).getByRole("button", {
        name: "Confirmar exclusão de Julho de 2026 v1",
      })
    )
    expect((await repo.listar()).map((m) => m.competencia)).toEqual(["2026-08"])
    expect(within(painel).queryByText("Julho de 2026")).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 1, name: "Agosto", hidden: true })
    ).toBeInTheDocument()
  })

  it("Histórico abre uma carga antiga; excluir a aberta cai na sucessora", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "jul.xlsx", "outro", "2026-07", { Antigo: OUTRO })
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    montar(repo)
    await h1("Agosto")
    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    await user.click(
      await screen.findByRole("button", { name: "Abrir Julho de 2026 v1" })
    )
    expect(await h1("Antigo")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    await user.click(
      await screen.findByRole("button", { name: "Excluir Julho de 2026 v1" })
    )
    await user.click(
      screen.getByRole("button", {
        name: "Confirmar exclusão de Julho de 2026 v1",
      })
    )
    expect(await h1("Agosto")).toBeInTheDocument()
  })

  it("Limpar apaga o histórico e volta à importação", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    montar(repo)
    await h1("Agosto")
    await user.click(screen.getByRole("button", { name: /Limpar/ }))
    expect(await repo.listar()).toHaveLength(1)
    await user.click(
      await screen.findByRole("button", {
        name: "Apagar o histórico deste navegador",
      })
    )
    expect(
      await screen.findByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
    expect(await repo.listar()).toEqual([])
  })
})
