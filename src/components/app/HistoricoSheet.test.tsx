import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import { registrarEnvio } from "@/cargas/enviados"
import { HistoricoSheet } from "./HistoricoSheet"

const meta = (p: Partial<CargaMeta>): CargaMeta => ({
  id: "a",
  tipo: "outro",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-14T15:00:00.000Z",
  arquivo: "a.xlsx",
  linhas: 5, nome: null, arquivadaEm: null,
  ...p,
})
const A = meta({ id: "a", arquivo: "setembro.xlsx" })
const B = meta({ id: "b", competencia: "2026-08", arquivo: "agosto.xlsx" })
const C = meta({ id: "c", competencia: "2026-07", arquivo: "julho.xlsx" })

function montar(metas: CargaMeta[], onAbrir = vi.fn(), onAlterar = vi.fn(async () => {})) {
  render(
    <HistoricoSheet
      open
      onOpenChange={() => {}}
      metas={metas}
      atualId="a"
      onAbrir={onAbrir}
      onAlterar={onAlterar}
    />
  )
  return { onAbrir, onAlterar }
}

beforeEach(() => localStorage.clear())

describe("HistoricoSheet", () => {
  it("tem as abas Enviados e Geral e nenhuma ação de excluir", async () => {
    montar([A, B])
    expect(screen.getByRole("tab", { name: "Enviados" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Geral" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Excluir/ })).toBeNull()
  })

  it("Enviados vazio explica e não lista cargas de outros navegadores", () => {
    montar([A, B])
    expect(
      screen.getByText("Nada enviado deste navegador ainda.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Limpar enviados/ })).toBeNull()
  })

  it("Enviados lista só as enviadas por este navegador e abre ao clicar", async () => {
    const user = userEvent.setup()
    registrarEnvio("b")
    const { onAbrir } = montar([A, B])
    const aba = screen.getByRole("tabpanel")
    expect(within(aba).getByText("agosto.xlsx")).toBeInTheDocument()
    expect(within(aba).queryByText("setembro.xlsx")).toBeNull()
    await user.click(
      within(aba).getByRole("button", { name: "Abrir Agosto de 2026 v1" })
    )
    expect(onAbrir).toHaveBeenCalledWith("b")
  })

  it("Tirar da lista e Limpar enviados só escondem; a Geral mantém tudo", async () => {
    const user = userEvent.setup()
    registrarEnvio("a")
    registrarEnvio("b")
    registrarEnvio("c")
    montar([A, B, C])
    const aba = () => screen.getByRole("tabpanel")
    await user.click(
      within(aba()).getByRole("button", {
        name: "Tirar da lista Setembro de 2026 v1",
      })
    )
    expect(within(aba()).queryByText("setembro.xlsx")).toBeNull()

    await user.click(
      within(aba()).getByRole("button", { name: "Limpar enviados" })
    )
    expect(within(aba()).getByText(/2 cargas/)).toBeInTheDocument()
    await user.click(
      within(aba()).getByRole("button", { name: "Confirmar limpeza" })
    )
    expect(within(aba()).getByText("Lista limpa.")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Geral" }))
    for (const n of ["setembro.xlsx", "agosto.xlsx", "julho.xlsx"])
      expect(within(aba()).getByText(n)).toBeInTheDocument()
    expect(within(aba()).queryByText("Lista limpa.")).toBeNull()
  })

  it("Geral mostra etiquetas, marca as enviadas e filtra pela busca", async () => {
    const user = userEvent.setup()
    registrarEnvio("b")
    const { onAbrir } = montar([A, B, C])
    await user.click(screen.getByRole("tab", { name: "Geral" }))
    const aba = screen.getByRole("tabpanel")
    expect(within(aba).getAllByText("enviada deste navegador")).toHaveLength(1)

    await user.type(within(aba).getByLabelText("Buscar"), "08/2026")
    expect(within(aba).getByText("agosto.xlsx")).toBeInTheDocument()
    expect(within(aba).queryByText("julho.xlsx")).toBeNull()

    await user.clear(within(aba).getByLabelText("Buscar"))
    await user.type(within(aba).getByLabelText("Buscar"), "zzz")
    expect(within(aba).getByText(/Nenhuma carga encontrada/)).toBeInTheDocument()

    await user.clear(within(aba).getByLabelText("Buscar"))
    await user.click(
      within(aba).getByRole("button", { name: "Abrir Julho de 2026 v1" })
    )
    expect(onAbrir).toHaveBeenCalledWith("c")
  })

  it("Geral agrupa as versões (mais recente por cima, anteriores recolhidas) e a busca mostra a versão que casou", async () => {
    const user = userEvent.setup()
    const A2 = meta({ id: "a2", versao: 2, arquivo: "setembro-novo.xlsx" })
    const { onAbrir } = montar([A, A2, B])
    await user.click(screen.getByRole("tab", { name: "Geral" }))
    const aba = screen.getByRole("tabpanel")
    expect(within(aba).getByText("setembro-novo.xlsx")).toBeInTheDocument()
    expect(within(aba).queryByText("setembro.xlsx")).toBeNull()

    await user.type(within(aba).getByLabelText("Buscar"), "v1")
    // a versão 1 casou: o grupo aparece com ela visível
    expect(within(aba).getByText("setembro.xlsx")).toBeInTheDocument()
    await user.click(
      within(aba).getByRole("button", { name: "Abrir Setembro de 2026 v1" })
    )
    expect(onAbrir).toHaveBeenCalledWith("a")
  })

  it("Enviados agrupa só as enviadas e Tirar da lista tira só aquela versão", async () => {
    const user = userEvent.setup()
    const A2 = meta({ id: "a2", versao: 2, arquivo: "setembro-novo.xlsx" })
    registrarEnvio("a")
    registrarEnvio("a2")
    registrarEnvio("b")
    montar([A, A2, B, C])
    const aba = () => screen.getByRole("tabpanel")
    expect(within(aba()).queryByText("julho.xlsx")).toBeNull()
    await user.click(
      within(aba()).getByRole("button", { name: /1 versão anterior/ })
    )
    await user.click(
      within(aba()).getByRole("button", {
        name: "Tirar da lista Setembro de 2026 v1",
      })
    )
    expect(within(aba()).queryByText("setembro.xlsx")).toBeNull()
    expect(within(aba()).getByText("setembro-novo.xlsx")).toBeInTheDocument()
    expect(within(aba()).getByText("agosto.xlsx")).toBeInTheDocument()
  })

  describe("gestão: editar, arquivar, restaurar (D58)", () => {
    const ARQ = meta({ id: "z", competencia: "2026-06", arquivo: "junho.xlsx", arquivadaEm: "2026-10-10T00:00:00Z" })
    const geral = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("tab", { name: "Geral" }))
      return screen.getByRole("tabpanel")
    }

    it("arquivadas somem do Enviados e da Geral; Mostrar arquivadas as traz com Restaurar (sem Abrir)", async () => {
      const user = userEvent.setup()
      registrarEnvio("z")
      const { onAlterar } = montar([A, ARQ])
      expect(screen.getByText("Nada enviado deste navegador ainda.")).toBeInTheDocument()
      const aba = await geral(user)
      expect(within(aba).queryByText("junho.xlsx")).toBeNull()

      await user.click(within(aba).getByRole("checkbox", { name: "Mostrar arquivadas" }))
      expect(within(aba).getByText("junho.xlsx")).toBeInTheDocument()
      expect(within(aba).queryByRole("button", { name: "Abrir Junho de 2026 v1" })).toBeNull()
      await user.click(within(aba).getByRole("button", { name: "Restaurar Junho de 2026 v1" }))
      expect(onAlterar).toHaveBeenCalledWith("z", { arquivada: false })
    })

    it("Arquivar chama onAlterar só com arquivada: true", async () => {
      const user = userEvent.setup()
      const { onAlterar } = montar([A, B])
      const aba = await geral(user)
      await user.click(within(aba).getByRole("button", { name: "Arquivar Agosto de 2026 v1" }))
      expect(onAlterar).toHaveBeenCalledWith("b", { arquivada: true })
    })

    it("Editar o nome: salva só o nome, sem aviso de versão", async () => {
      const user = userEvent.setup()
      const { onAlterar } = montar([A, B])
      const aba = await geral(user)
      await user.click(within(aba).getByRole("button", { name: "Editar Agosto de 2026 v1" }))
      const dialog = await screen.findByRole("dialog", { name: "Editar carga" })
      expect(within(dialog).queryByText(/vai virar a versão/)).toBeNull()
      await user.type(within(dialog).getByLabelText("Nome (opcional)"), "Fechamento")
      await user.click(within(dialog).getByRole("button", { name: "Salvar" }))
      expect(onAlterar).toHaveBeenCalledWith("b", { nome: "Fechamento" })
    })

    it("Editar a competência avisa em qual versão vai cair e salva só o que mudou", async () => {
      const user = userEvent.setup()
      const { onAlterar } = montar([A, B])
      const aba = await geral(user)
      await user.click(within(aba).getByRole("button", { name: "Editar Agosto de 2026 v1" }))
      const dialog = await screen.findByRole("dialog", { name: "Editar carga" })
      await user.click(within(dialog).getByRole("combobox", { name: "Mês" }))
      await user.click(await screen.findByRole("option", { name: "Setembro" }))
      expect(within(dialog).getByText(/vai virar a versão 2 de Setembro/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Salvar" }))
      expect(onAlterar).toHaveBeenCalledWith("b", { competencia: "2026-09" })
    })

    it("a versão do aviso conta também as arquivadas do destino", async () => {
      const user = userEvent.setup()
      montar([A, B, meta({ id: "y", competencia: "2026-09", versao: 2, arquivadaEm: "2026-10-10T00:00:00Z", arquivo: "y.xlsx" })])
      const aba = await geral(user)
      await user.click(within(aba).getAllByRole("button", { name: /^Editar Agosto/ })[0])
      const dialog = await screen.findByRole("dialog", { name: "Editar carga" })
      await user.click(within(dialog).getByRole("combobox", { name: "Mês" }))
      await user.click(await screen.findByRole("option", { name: "Setembro" }))
      expect(within(dialog).getByText(/vai virar a versão 3 de Setembro/)).toBeInTheDocument()
    })
  })
})
