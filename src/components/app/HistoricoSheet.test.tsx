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
  linhas: 5,
  ...p,
})
const A = meta({ id: "a", arquivo: "setembro.xlsx" })
const B = meta({ id: "b", competencia: "2026-08", arquivo: "agosto.xlsx" })
const C = meta({ id: "c", competencia: "2026-07", arquivo: "julho.xlsx" })

function montar(metas: CargaMeta[], onAbrir = vi.fn()) {
  render(
    <HistoricoSheet
      open
      onOpenChange={() => {}}
      metas={metas}
      atualId="a"
      onAbrir={onAbrir}
    />
  )
  return { onAbrir }
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
})
