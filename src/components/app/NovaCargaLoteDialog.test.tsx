import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { makeXlsx } from "@/test/makeWorkbook"
import { NovaCargaLoteDialog, type ItemLido } from "./NovaCargaLoteDialog"

const OUTRO = [["Área", "Valor"], ["TI", 1], ["RH", 2]]
const CHAMADOS = [
  ["Código", "Data de abertura", "SITUAÇÃO", "Data de Solução", "Sla previsto", "Cliente", "Área Superior", "Atividade"],
  [1, new Date("2026-08-03"), "Finalizado", new Date("2026-08-10"), new Date("2026-08-12"), "A", "X", "Y"],
  [2, new Date("2026-08-05"), "Aberto", null, new Date("2026-08-20"), "B", "X", "Y"],
]
function item(nome: string, linhas = CHAMADOS): ItemLido {
  const original = makeXlsx({ Dados: linhas })
  return { workbook: readWorkbook(original, nome), original }
}
const ITENS = () => [
  item("chamados-agosto-2026.xlsx"),
  item("chamados-setembro-2026.xlsx"),
  item("projetos-agosto-2026.xlsx", OUTRO),
]
const metaDe = (o: Partial<CargaMeta>): CargaMeta =>
  ({ id: "m", tipo: "chamados", competencia: "2026-09", versao: 1, arquivo: "x.xlsx", importadaEm: "2026-10-01T00:00:00Z", ...o }) as CargaMeta

type Props = React.ComponentProps<typeof NovaCargaLoteDialog>
function montar(over: Partial<Props> = {}) {
  const guardar = vi.fn(async (it: ItemLido, e: { tipo: string; competencia: string }) =>
    metaDe({ id: it.workbook.fileName, tipo: e.tipo, competencia: e.competencia, arquivo: it.workbook.fileName })
  )
  const onConcluir = vi.fn<Props["onConcluir"]>()
  const props: Props = { itens: ITENS(), falhas: [], ignorados: [], metas: [], guardar, onConcluir, onCancel: vi.fn(), ...over }
  render(<NovaCargaLoteDialog {...props} />)
  return { guardar: props.guardar as typeof guardar, onConcluir }
}

beforeEach(() => registrarTiposDoApp())

describe("NovaCargaLoteDialog", () => {
  it("tabela com cabeçalhos e uma linha por arquivo, com sugestões e foco no confirmar", async () => {
    montar()
    const dialog = await screen.findByRole("dialog", { name: /Confirmar 3 cargas|Confirmar as cargas/ })
    const tabela = within(dialog).getByRole("table")
    for (const h of ["Arquivo", "Linhas", "Tipo", "Competência"])
      expect(within(tabela).getByRole("columnheader", { name: h })).toBeInTheDocument()
    expect(within(tabela).getAllByRole("row")).toHaveLength(4)
    expect(within(dialog).getByRole("combobox", { name: "Tipo de chamados-agosto-2026.xlsx" })).toHaveTextContent(/chamados/i)
    expect(within(dialog).getByRole("combobox", { name: "Mês de chamados-setembro-2026.xlsx" })).toHaveTextContent("Setembro")
    expect(within(dialog).getByLabelText("Ano de chamados-agosto-2026.xlsx")).toHaveValue("2026")
    expect(within(dialog).getAllByText("pelo nome do arquivo")).toHaveLength(3)
    expect(within(dialog).getByRole("group", { name: "Competência de projetos-agosto-2026.xlsx" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirmar 3 cargas" })).toHaveFocus()
  })

  it("tipo não reconhecido mostra Outro com aviso, e pode ser enviado", async () => {
    montar()
    const linha = (await screen.findByText("projetos-agosto-2026.xlsx")).closest("tr")!
    expect(within(linha).getByRole("combobox", { name: /Tipo de/ })).toHaveTextContent(/outro/i)
    expect(within(linha).getByText(/não reconhecido/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirmar 3 cargas" })).toBeEnabled()
  })

  it("edita a competência de uma linha", async () => {
    const p = montar()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("combobox", { name: "Mês de chamados-agosto-2026.xlsx" }))
    await user.click(await screen.findByRole("option", { name: "Março" }))
    await user.click(screen.getByRole("button", { name: "Confirmar 3 cargas" }))
    await waitFor(() => expect(p.onConcluir).toHaveBeenCalled())
    expect(p.guardar.mock.calls[0][1]).toEqual({ tipo: "chamados", competencia: "2026-03" })
  })

  it("repetida no lote avisa a versão, contando as já existentes e a ordem da lista", async () => {
    montar({
      itens: [item("chamados-setembro-2026.xlsx"), item("chamados-setembro-2026-v2.xlsx")],
      metas: [metaDe({})],
    })
    const l1 = (await screen.findByText("chamados-setembro-2026.xlsx")).closest("tr")!
    const l2 = screen.getByText("chamados-setembro-2026-v2.xlsx").closest("tr")!
    expect(within(l1).getByText(/vira a versão 2/i)).toBeInTheDocument()
    expect(within(l2).getByText(/vira a versão 3/i)).toBeInTheDocument()
  })

  it("tirar uma linha antes de confirmar", async () => {
    const p = montar()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Tirar projetos-agosto-2026.xlsx do lote" }))
    expect(screen.queryByText("projetos-agosto-2026.xlsx")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirmar 2 cargas" }))
    await waitFor(() => expect(p.onConcluir).toHaveBeenCalled())
    expect(p.guardar).toHaveBeenCalledTimes(2)
  })

  it("lista os que ficaram de fora (não-xlsx e ilegíveis)", async () => {
    montar({ ignorados: ["notas.txt"], falhas: [{ nome: "quebrada.xlsx", mensagem: "Esse arquivo não parece ser a planilha da reunião." }] })
    expect(await screen.findByText(/notas\.txt/)).toBeInTheDocument()
    expect(screen.getByText(/quebrada\.xlsx/)).toBeInTheDocument()
  })

  it("envio sequencial: um por vez, na ordem; ao fim chama onConcluir com todas", async () => {
    let ativos = 0
    let maximo = 0
    const ordem: string[] = []
    const guardar = vi.fn(async (it: ItemLido, e: { tipo: string; competencia: string }) => {
      ativos++
      maximo = Math.max(maximo, ativos)
      ordem.push(it.workbook.fileName)
      await new Promise((r) => setTimeout(r, 5))
      ativos--
      return metaDe({ id: it.workbook.fileName, tipo: e.tipo, competencia: e.competencia })
    })
    const p = montar({ guardar })
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar 3 cargas" }))
    await waitFor(() => expect(p.onConcluir).toHaveBeenCalled())
    expect(maximo).toBe(1)
    expect(ordem).toEqual(["chamados-agosto-2026.xlsx", "chamados-setembro-2026.xlsx", "projetos-agosto-2026.xlsx"])
    expect(p.onConcluir.mock.calls[0][0]).toHaveLength(3)
  })

  it("falha numa linha não interrompe as outras; resumo e tentar de novo só as que falharam", async () => {
    let falhar = true
    const guardar = vi.fn(async (it: ItemLido, e: { tipo: string; competencia: string }) => {
      if (it.workbook.fileName.startsWith("chamados-setembro") && falhar) throw new Error("boom")
      return metaDe({ id: it.workbook.fileName, tipo: e.tipo, competencia: e.competencia })
    })
    const p = montar({ guardar })
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Confirmar 3 cargas" }))
    expect(await screen.findByText("2 de 3 guardadas; 1 com erro")).toBeInTheDocument()
    expect(guardar).toHaveBeenCalledTimes(3)
    const linha = screen.getByText("chamados-setembro-2026.xlsx").closest("tr")!
    expect(within(linha).getByText(/Não foi possível guardar/)).toBeInTheDocument()
    expect(p.onConcluir).not.toHaveBeenCalled()

    falhar = false
    await user.click(screen.getByRole("button", { name: "Tentar de novo as que falharam" }))
    await waitFor(() => expect(p.onConcluir).toHaveBeenCalled())
    expect(guardar).toHaveBeenCalledTimes(4)
    expect(p.onConcluir.mock.calls[0][0]).toHaveLength(3)
  })

  it("com erro, dá para concluir só com as guardadas", async () => {
    const guardar = vi.fn(async (it: ItemLido) => {
      if (it.workbook.fileName.startsWith("projetos")) throw new Error("x")
      return metaDe({ id: it.workbook.fileName })
    })
    const p = montar({ guardar })
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Confirmar 3 cargas" }))
    await user.click(await screen.findByRole("button", { name: "Concluir" }))
    expect(p.onConcluir.mock.calls[0][0]).toHaveLength(2)
  })
})
