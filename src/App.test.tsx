import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { criarRepositorioMemoria, type RepositorioDeCargas } from "@/cargas"
import { foiEnviada } from "@/cargas/enviados"
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

/** A página sempre abre na tela de envio; abre a carga pela lista "Abrir a última". */
async function montarAberto(repo: RepositorioDeCargas) {
  montar(repo)
  await userEvent.click(
    await screen.findByRole("button", { name: /^Abrir a última/ })
  )
}

/** O título pode ser remontado quando os dados terminam de carregar: confere na tela, não no nó. */
const tituloVisivel = (name: string | RegExp) =>
  waitFor(() =>
    expect(
      screen.getByRole("heading", { level: 1, name })
    ).toBeInTheDocument()
  )
const h1 = (name: string | RegExp) => screen.findByRole("heading", { level: 1, name })

beforeEach(() => {
  registrarTiposDoApp()
  localStorage.clear()
})

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
    expect(within(dialog).getByRole("combobox", { name: "Tipo" })).toHaveTextContent(/outro/i)
    expect(within(dialog).getByRole("combobox", { name: "Mês" })).toHaveTextContent("Agosto")
    expect(within(dialog).getByLabelText("Ano")).toHaveValue("2026")
    expect(within(dialog).getByText("pelo nome do arquivo")).toBeInTheDocument()
    expect(
      within(dialog).getByText(/reuniao-agosto-2026\.xlsx/)
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole("combobox", { name: "Mês" }))
    await user.click(await screen.findByRole("option", { name: "Setembro" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar carga" })
    )

    expect(await h1("Projetos")).toBeInTheDocument()
    expect(
      screen.queryByRole("table", { name: /Tabela da aba/ })
    ).not.toBeInTheDocument()
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
    expect(within(dialog).getByRole("combobox", { name: "Tipo" })).toHaveTextContent(/chamados/i)
    expect(
      within(dialog).getByText("reconhecido pelas colunas")
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar carga" })
    )

    await screen.findByRole("article", { name: "Não finalizados" })
    expect(
      screen.getByRole("heading", { level: 1, name: /^Chamados · / })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Leituras" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Comparar" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Evolução" })).toBeInTheDocument()
    await user.keyboard("l")
    await tituloVisivel(/^Leituras · /)
    await user.keyboard("c")
    await tituloVisivel("Comparar competências")
    await user.keyboard("e")
    await tituloVisivel("Evolução")
    await user.keyboard("p")
    await screen.findByRole("article", { name: "Não finalizados" })
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

    await user.click(screen.getByRole("button", { name: /Nova carga/ }))
    await user.upload(
      await screen.findByLabelText(/Arquivo da nova carga/),
      outro()
    )
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

  it("Nova carga abre o modal de envio; atalhos ficam ignorados e o envio fecha o modal", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "reuniao-julho-2026.xlsx", "outro", "2026-07")
    await montarAberto(repo)
    await h1("Projetos")
    await user.click(screen.getByRole("button", { name: /Nova carga/ }))
    const envio = await screen.findByRole("dialog", { name: "Nova carga" })
    expect(envio).toHaveTextContent("Arraste o arquivo .xlsx para cá")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Nova carga/ }))
    await screen.findByRole("dialog", { name: "Nova carga" })
    await user.upload(screen.getByLabelText(/Arquivo da nova carga/), outro())
    await screen.findByRole("dialog", { name: "Confirmar a carga" })
    expect(
      screen.queryByRole("dialog", { name: "Nova carga" })
    ).not.toBeInTheDocument()
  })

  it("o diálogo não fecha ao clicar fora; fecha com Esc", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar a carga",
    })
    // clique no fundo (overlay) fora do conteúdo
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    await user.click(overlay)
    expect(
      screen.getByRole("dialog", { name: "Confirmar a carga" })
    ).toBe(dialog)
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(await repo.listar()).toEqual([])
  })

  it("salva os bytes do arquivo original junto da carga", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    const salvarOriginal = vi.spyOn(repo, "salvar")
    montar(repo)
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )
    await user.click(
      await screen.findByRole("button", { name: "Confirmar carga" })
    )
    await h1("Projetos")
    const nova = salvarOriginal.mock.calls[0][0]
    expect(nova.original).toBeInstanceOf(ArrayBuffer)
    expect(nova.original!.byteLength).toBeGreaterThan(0)
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
  it("com cargas, abre na tela de envio, não baixa nenhuma carga e mostra a lista agrupada", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ch-08.xlsx", "chamados", "2026-08", { Dados: CHAMADOS })
    await salvar(repo, "ch-09a.xlsx", "chamados", "2026-09", { Dados: CHAMADOS })
    await salvar(repo, "ch-09b.xlsx", "chamados", "2026-09", { Dados: CHAMADOS })
    const obter = vi.spyOn(repo, "obter")
    montar(repo)
    expect(
      await screen.findByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", {
        name: "Abrir a última: Chamados / OS · setembro de 2026 v2",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /1 versão anterior/ })
    ).toBeInTheDocument()
    expect(screen.getByText("ch-08.xlsx")).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 120))
    expect(obter).not.toHaveBeenCalled()
  })

  it("abrir uma versão anterior pela lista abre aquela carga", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ago1.xlsx", "outro", "2026-08", { Agosto1: OUTRO })
    await salvar(repo, "ago2.xlsx", "outro", "2026-08", { Agosto2: OUTRO })
    montar(repo)
    await user.click(
      await screen.findByRole("button", { name: /1 versão anterior/ })
    )
    await user.click(
      screen.getByRole("button", { name: "Abrir Agosto de 2026 v1" })
    )
    expect(await h1("Agosto1")).toBeInTheDocument()
  })

  it("sem histórico mostra a tela de importação", async () => {
    montar()
    expect(
      await screen.findByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
  })

  it("com histórico abre a competência mais recente do tipo da última carga pela lista, nunca sozinho", async () => {
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ch-07.xlsx", "chamados", "2026-07", { Dados: CHAMADOS })
    await salvar(repo, "ch-08.xlsx", "chamados", "2026-08", { Dados: CHAMADOS })
    await salvar(repo, "ch-06.xlsx", "chamados", "2026-06", { Dados: CHAMADOS }) // carregada por último
    await salvar(repo, "ch-08b.xlsx", "chamados", "2026-08", {
      Dados: CHAMADOS,
    })
    await montarAberto(repo)
    await screen.findByRole("article", { name: "Não finalizados" })
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
    await montarAberto(repo)
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
    await montarAberto(repo)
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
  it("sem limparTudo (banco compartilhado) o botão vira Fechar carga e não apaga nada", async () => {
    const user = userEvent.setup()
    const base = criarRepositorioMemoria()
    const repo: RepositorioDeCargas = {
      listar: () => base.listar(),
      obter: (id) => base.obter(id),
      salvar: (n) => base.salvar(n),
      excluir: (id) => base.excluir(id),
      alterar: (id, a) => base.alterar(id, a),
    }
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    await montarAberto(repo)
    await h1("Agosto")
    expect(
      screen.queryByRole("button", { name: /Limpar/ })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Fechar carga/ }))
    expect(
      screen.queryByText("Apagar o histórico deste navegador")
    ).not.toBeInTheDocument()
    expect(
      await screen.findByText("Carregar a planilha da competência")
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: /^Abrir a última/ })
    ).toBeInTheDocument()
    expect(await repo.listar()).toHaveLength(1)
  })

  it("Histórico não oferece excluir e a Geral lista todas as cargas", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    const excluir = vi.spyOn(repo, "excluir")
    await salvar(repo, "jul.xlsx", "outro", "2026-07", { Antigo: OUTRO })
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    await montarAberto(repo)
    await h1("Agosto")

    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    const painel = await screen.findByRole("dialog", { name: "Histórico" })
    await user.click(within(painel).getByRole("tab", { name: "Geral" }))
    expect(within(painel).getByText("jul.xlsx")).toBeInTheDocument()
    expect(within(painel).getByText("ago.xlsx")).toBeInTheDocument()
    expect(within(painel).queryByRole("button", { name: /Excluir/ })).toBeNull()
    expect(excluir).not.toHaveBeenCalled()
    expect(await repo.listar()).toHaveLength(2)
  })

  it("Histórico abre uma carga antiga", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "jul.xlsx", "outro", "2026-07", { Antigo: OUTRO })
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    await montarAberto(repo)
    await h1("Agosto")
    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    await user.click(await screen.findByRole("tab", { name: "Geral" }))
    await user.click(
      await screen.findByRole("button", { name: "Abrir Julho de 2026 v1" })
    )
    expect(await h1("Antigo")).toBeInTheDocument()
  })

  it("guardar registra o envio deste navegador e não baixa a carga de novo", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    const listar = vi.spyOn(repo, "listar")
    const excluir = vi.spyOn(repo, "excluir")
    montar(repo)
    await user.upload(
      await screen.findByLabelText(/Arquivo da planilha/),
      outro()
    )
    await user.click(
      await screen.findByRole("button", { name: "Confirmar carga" })
    )
    expect(await h1("Projetos")).toBeInTheDocument()
    // abertura + uma relistagem depois de guardar (D58); a carga em si não é baixada de novo
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2))
    const [meta] = await repo.listar()
    expect(foiEnviada(meta.id)).toBe(true)
    expect(excluir).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    const painel = await screen.findByRole("dialog", { name: "Histórico" })
    expect(
      within(painel).getByRole("button", { name: /Abrir Setembro de 2026 v1|Abrir Agosto de 2026 v1/ })
    ).toBeInTheDocument()
  })

  it("Limpar apaga o histórico e volta à importação", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ago.xlsx", "outro", "2026-08", { Agosto: OUTRO })
    await montarAberto(repo)
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

describe("lote de planilhas", () => {
  const trio = () => [
    outro("reuniao-julho-2026.xlsx"),
    outro("reuniao-setembro-2026.xlsx"),
    outro("reuniao-setembro-2026-v2.xlsx"),
  ]

  it("2 ou mais arquivos abrem a confirmação em lote; guardar registra em Enviados e abre a competência mais recente", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), trio())

    const dialog = await screen.findByRole("dialog", { name: "Confirmar as cargas" })
    expect(within(dialog).getAllByRole("row")).toHaveLength(4)
    expect(within(dialog).getByText(/vira a versão 2/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Confirmar 3 cargas" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Competência" })).toHaveTextContent(
        "Setembro de 2026"
      )
    )
    expect(screen.getByRole("button", { name: "Competência" })).toHaveTextContent("v2")
    const metas = await repo.listar()
    expect(metas.map((m) => `${m.competencia} v${m.versao}`).sort()).toEqual([
      "2026-07 v1",
      "2026-09 v1",
      "2026-09 v2",
    ])
    for (const m of metas) expect(foiEnviada(m.id)).toBe(true)
    expect(screen.getByText("3 de 3 guardadas")).toBeInTheDocument()
  })

  it("1 arquivo continua no fluxo de sempre", async () => {
    const user = userEvent.setup()
    montar()
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), [outro()])
    expect(await screen.findByRole("dialog", { name: "Confirmar a carga" })).toBeInTheDocument()
  })

  it("mais de 12 arquivos: aviso e nenhum diálogo", async () => {
    const user = userEvent.setup()
    montar()
    const muitos = Array.from({ length: 13 }, (_, i) => outro(`reuniao-agosto-2026-${i}.xlsx`))
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), muitos)
    expect(await screen.findByRole("alert")).toHaveTextContent(/no máximo 12/)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("falha numa linha não interrompe as outras; tentar de novo só as que falharam", async () => {
    const user = userEvent.setup()
    const base = criarRepositorioMemoria()
    let falhar = true
    const repo: RepositorioDeCargas = {
      ...base,
      salvar: async (n) => {
        if (n.arquivo.includes("setembro") && falhar) throw new Error("rede")
        return base.salvar(n)
      },
    }
    montar(repo)
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), [
      outro("reuniao-julho-2026.xlsx"),
      outro("reuniao-setembro-2026.xlsx"),
      outro("reuniao-agosto-2026.xlsx"),
    ])
    await user.click(await screen.findByRole("button", { name: "Confirmar 3 cargas" }))
    expect(await screen.findByText("2 de 3 guardadas; 1 com erro")).toBeInTheDocument()
    expect(await base.listar()).toHaveLength(2)

    falhar = false
    await user.click(screen.getByRole("button", { name: "Tentar de novo as que falharam" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Competência" })).toHaveTextContent(
        "Setembro de 2026"
      )
    )
    expect(await base.listar()).toHaveLength(3)
  })
})


describe("gestão das cargas (D58)", () => {
  const agora = { t: Date.UTC(2026, 9, 14, 12) }
  beforeEach(() => {
    agora.t = Date.UTC(2026, 9, 14, 12)
    vi.spyOn(Date, "now").mockImplementation(() => agora.t)
  })
  afterEach(() => vi.restoreAllMocks())

  /** Repositório de memória com `listar` espiável. */
  function comEspiao(base = criarRepositorioMemoria()) {
    const listar = vi.fn(() => base.listar())
    return { base, listar, repo: { ...base, listar } as RepositorioDeCargas }
  }
  const voltarAbaVisivel = () => {
    document.dispatchEvent(new Event("visibilitychange"))
  }

  it("Nome (opcional) só aparece na versão 2 e vai para o banco; o seletor mostra v2 · nome", async () => {
    const user = userEvent.setup()
    const repo = montar()
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), outro())
    let dialog = await screen.findByRole("dialog", { name: "Confirmar a carga" })
    expect(within(dialog).queryByLabelText("Nome (opcional)")).toBeNull()
    await user.click(within(dialog).getByRole("button", { name: "Confirmar carga" }))
    await h1("Projetos")

    await user.click(screen.getByRole("button", { name: /Nova carga/ }))
    await user.upload(await screen.findByLabelText(/Arquivo da nova carga/), outro("correcao-lider-agosto-2026.xlsx"))
    dialog = await screen.findByRole("dialog", { name: "Confirmar a carga" })
    const nome = within(dialog).getByLabelText("Nome (opcional)")
    expect(nome).toHaveValue("correcao-lider-agosto-2026")
    await user.clear(nome)
    await user.type(nome, "Correção do Líder")
    await user.click(within(dialog).getByRole("button", { name: "Confirmar carga" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Competência" })).toHaveTextContent("v2 · Correção do Líder")
    )
    expect((await repo.listar()).map((m) => [m.versao, m.nome])).toEqual([[2, "Correção do Líder"], [1, null]])
  })

  it("arquivadas não aparecem na tela de envio nem no seletor", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ago.xlsx", "outro", "2026-08")
    const jul = await salvar(repo, "jul.xlsx", "outro", "2026-07")
    await repo.alterar(jul.id, { arquivada: true })
    montar(repo)
    expect(await screen.findByRole("button", { name: /^Abrir a última/ })).toBeInTheDocument()
    expect(screen.queryByText("jul.xlsx")).toBeNull()
    await user.click(screen.getByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await user.click(await screen.findByRole("button", { name: /Competência/ }))
    expect(screen.queryByRole("button", { name: /Julho de 2026/ })).toBeNull()
  })

  it("arquivar a carga aberta pelo Histórico abre a mais recente ativa; restaurar a traz de volta", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    const jul = await salvar(repo, "jul.xlsx", "outro", "2026-07")
    await salvar(repo, "ago.xlsx", "outro", "2026-08")
    montar(repo)
    await user.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await user.click(screen.getByRole("button", { name: /Competência/ }))
    await user.click(await screen.findByRole("button", { name: "Julho de 2026, versão 1" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Competência", hidden: true })).toHaveTextContent("Julho"))

    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    const painel = await screen.findByRole("dialog", { name: "Histórico" })
    await user.click(within(painel).getByRole("tab", { name: "Geral" }))
    await user.click(within(painel).getByRole("button", { name: "Arquivar Julho de 2026 v1" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Competência", hidden: true })).toHaveTextContent("Agosto"))
    expect((await repo.listar()).find((m) => m.id === jul.id)?.arquivadaEm).not.toBeNull()
    expect(await repo.obter(jul.id)).not.toBeNull()

    await user.click(within(painel).getByRole("checkbox", { name: "Mostrar arquivadas" }))
    await user.click(within(painel).getByRole("button", { name: "Restaurar Julho de 2026 v1" }))
    await waitFor(async () =>
      expect((await repo.listar()).find((m) => m.id === jul.id)?.arquivadaEm).toBeNull()
    )
    await waitFor(() =>
      expect(within(painel).getByRole("button", { name: "Arquivar Julho de 2026 v1" })).toBeInTheDocument()
    )
  })

  it("corrigir a competência pelo Histórico vira a versão do destino e a barra usa os metadados da lista", async () => {
    const user = userEvent.setup()
    const repo = criarRepositorioMemoria()
    await salvar(repo, "ago.xlsx", "outro", "2026-08")
    await salvar(repo, "set.xlsx", "outro", "2026-09")
    montar(repo)
    await user.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await user.click(screen.getByRole("button", { name: /Histórico/ }))
    const painel = await screen.findByRole("dialog", { name: "Histórico" })
    await user.click(within(painel).getByRole("tab", { name: "Geral" }))
    await user.click(within(painel).getByRole("button", { name: "Editar Setembro de 2026 v1" }))
    const dlg = await screen.findByRole("dialog", { name: "Editar carga" })
    await user.click(within(dlg).getByRole("combobox", { name: "Mês" }))
    await user.click(await screen.findByRole("option", { name: "Agosto" }))
    expect(within(dlg).getByText(/vai virar a versão 2 de Agosto/)).toBeInTheDocument()
    await user.click(within(dlg).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Competência", hidden: true })).toHaveTextContent("Agosto de 2026")
    )
    expect(screen.getByRole("button", { name: "Competência", hidden: true })).toHaveTextContent("v2")
  })

  it("relista ao voltar para a aba, no máximo uma vez a cada 30 s", async () => {
    const { repo, base, listar } = comEspiao()
    await salvar(repo, "ago.xlsx", "outro", "2026-08")
    montar(repo)
    await screen.findByRole("button", { name: /^Abrir a última/ })
    const chamadasIniciais = listar.mock.calls.length

    agora.t += 10_000
    voltarAbaVisivel()
    await new Promise((r) => setTimeout(r, 20))
    expect(listar).toHaveBeenCalledTimes(chamadasIniciais)

    await salvar(base, "set.xlsx", "outro", "2026-09")
    agora.t += 31_000
    voltarAbaVisivel()
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(chamadasIniciais + 1))
    await userEvent.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await tituloVisivel("Projetos")
    await userEvent.click(screen.getByRole("button", { name: /Competência/ }))
    expect(await screen.findByRole("button", { name: "Setembro de 2026, versão 1" })).toBeInTheDocument()

    agora.t += 5_000
    window.dispatchEvent(new Event("focus"))
    await new Promise((r) => setTimeout(r, 20))
    expect(listar).toHaveBeenCalledTimes(chamadasIniciais + 1)
  })

  it("a lista é refeita depois de enviar uma carga", async () => {
    const user = userEvent.setup()
    const { repo, listar } = comEspiao()
    montar(repo)
    await user.upload(await screen.findByLabelText(/Arquivo da planilha/), outro())
    const antes = listar.mock.calls.length
    await user.click(await screen.findByRole("button", { name: "Confirmar carga" }))
    await h1("Projetos")
    await waitFor(() => expect(listar.mock.calls.length).toBeGreaterThan(antes))
  })

  it("carga aberta apagada por outra pessoa: avisa e volta à tela de envio", async () => {
    const user = userEvent.setup()
    const { repo, base } = comEspiao()
    const c = await salvar(repo, "ago.xlsx", "outro", "2026-08")
    montar(repo)
    await user.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await base.excluir(c.id)
    agora.t += 31_000
    voltarAbaVisivel()
    expect(await screen.findByText("Esta carga não existe mais.")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { level: 1, name: /Carregar a planilha/ })).toBeInTheDocument()
  })

  it("carga aberta arquivada por outra pessoa: avisa e volta à tela de envio quando não sobra outra do tipo", async () => {
    const user = userEvent.setup()
    const { repo, base } = comEspiao()
    const c = await salvar(repo, "ago.xlsx", "outro", "2026-08")
    montar(repo)
    await user.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await base.alterar(c.id, { arquivada: true })
    agora.t += 31_000
    voltarAbaVisivel()
    expect(await screen.findByText("Esta carga foi arquivada.")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { level: 1, name: /Carregar a planilha/ })).toBeInTheDocument()
  })

  it("renomeada por outra pessoa: a barra passa a mostrar o novo nome depois de relistar", async () => {
    const user = userEvent.setup()
    const { repo, base } = comEspiao()
    const c = await salvar(repo, "ago.xlsx", "outro", "2026-08")
    montar(repo)
    await user.click(await screen.findByRole("button", { name: /^Abrir a última/ }))
    await h1("Projetos")
    await base.alterar(c.id, { nome: "Fechamento" })
    agora.t += 31_000
    voltarAbaVisivel()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Competência" })).toHaveTextContent("Fechamento")
    )
  })
})
