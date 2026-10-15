import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CargaMeta } from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { makeXlsx } from "@/test/makeWorkbook"
import { NovaCargaDialog } from "./NovaCargaDialog"

const OUTRO = [["Área", "Valor"], ["TI", 1], ["RH", 2]]
const workbook = (nome: string) => readWorkbook(makeXlsx({ Projetos: OUTRO }), nome)
const metaDe = (p: Partial<CargaMeta> = {}): CargaMeta => ({
  id: "m", tipo: "outro", competencia: "2026-09", versao: 1, arquivo: "x.xlsx",
  importadaEm: "2026-10-01T00:00:00Z", linhas: 3, nome: null, arquivadaEm: null, ...p,
})

function montar(metas: CargaMeta[], nome = "reuniao-setembro-2026.xlsx") {
  const onConfirm = vi.fn()
  render(<NovaCargaDialog workbook={workbook(nome)} metas={metas} onConfirm={onConfirm} onCancel={() => {}} />)
  return { onConfirm }
}

beforeEach(() => registrarTiposDoApp())

describe("NovaCargaDialog: Nome (opcional)", () => {
  it("versão 1: sem campo e sem nome na confirmação", async () => {
    const { onConfirm } = montar([])
    expect(screen.queryByLabelText("Nome (opcional)")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar carga" }))
    expect(onConfirm).toHaveBeenCalledWith({ tipo: "outro", competencia: "2026-09" })
  })

  it("versão 2: campo com o nome do arquivo sem extensão, editável, enviado na confirmação", async () => {
    const { onConfirm } = montar([metaDe()])
    const campo = screen.getByLabelText("Nome (opcional)")
    expect(campo).toHaveValue("reuniao-setembro-2026")
    await userEvent.clear(campo)
    await userEvent.type(campo, "Correção do Líder")
    await userEvent.click(screen.getByRole("button", { name: "Confirmar carga" }))
    expect(onConfirm).toHaveBeenCalledWith({ tipo: "outro", competencia: "2026-09", nome: "Correção do Líder" })
  })

  it("arquivadas também contam como versão existente", () => {
    montar([metaDe({ arquivadaEm: "2026-10-02T00:00:00Z" })])
    expect(screen.getByLabelText("Nome (opcional)")).toBeInTheDocument()
  })

  it("mudar para um mês sem versões esconde o campo", async () => {
    const { onConfirm } = montar([metaDe()])
    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: "Mês" }))
    await user.click(await screen.findByRole("option", { name: "Março" }))
    expect(screen.queryByLabelText("Nome (opcional)")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Confirmar carga" }))
    expect(onConfirm).toHaveBeenCalledWith({ tipo: "outro", competencia: "2026-03" })
  })
})

describe("NovaCargaDialog: ano presumido", () => {
  const AVISO = "Ano não encontrado na planilha — confira"

  it("avisa quando o ano não está na planilha, e trocar o ano tira o aviso", async () => {
    montar([], "reuniao-setembro.xlsx")
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    const ano = screen.getByLabelText("Ano")
    await userEvent.clear(ano)
    await userEvent.type(ano, "2025")
    expect(screen.queryByText(AVISO)).toBeNull()
  })

  it("confirmar sem mudar continua permitido; com ano explícito não há aviso", async () => {
    const { onConfirm } = montar([], "reuniao-setembro.xlsx")
    await userEvent.click(screen.getByRole("button", { name: "Confirmar carga" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("ano explícito no arquivo: sem aviso", () => {
    montar([])
    expect(screen.queryByText(AVISO)).toBeNull()
  })
})

describe("NovaCargaDialog: confirmação pendente", () => {
  function montarAssincrono() {
    let resolver!: () => void
    let rejeitar!: (e: Error) => void
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((res, rej) => {
          resolver = res
          rejeitar = rej
        })
    )
    render(<NovaCargaDialog workbook={workbook("reuniao-setembro-2026.xlsx")} metas={[]} onConfirm={onConfirm} onCancel={() => {}} />)
    return { resolver: () => resolver(), rejeitar: (e: Error) => rejeitar(e) }
  }

  it("enquanto a promessa pende: botão desabilitado, 'Guardando…' e aria-busy; volta ao resolver", async () => {
    const { resolver } = montarAssincrono()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar carga" }))
    const botao = await screen.findByRole("button", { name: /Guardando…/ })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute("aria-busy", "true")
    resolver()
    expect(await screen.findByRole("button", { name: "Confirmar carga" })).toBeEnabled()
  })

  it("volta ao normal também quando a promessa é rejeitada", async () => {
    const { rejeitar } = montarAssincrono()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar carga" }))
    await screen.findByRole("button", { name: /Guardando…/ })
    rejeitar(new Error("falhou"))
    expect(await screen.findByRole("button", { name: "Confirmar carga" })).toBeEnabled()
  })
})
