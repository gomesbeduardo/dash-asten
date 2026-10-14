import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { registrarTiposDoApp } from "@/app/bootstrap"
import type { CargaMeta } from "@/cargas"
import { ImportScreen } from "./ImportScreen"

beforeEach(() => registrarTiposDoApp())

const meta = (id: string, competencia: string, extra = {}) =>
  ({
    id,
    tipo: "chamados",
    competencia,
    versao: 1,
    arquivo: `${id}.xlsx`,
    importadaEm: `2026-10-0${id}T00:00:00Z`,
    ...extra,
  }) as unknown as CargaMeta

const metas = [meta("1", "2026-07"), meta("2", "2026-08"), meta("3", "2026-09")]
const tela = (props = {}) =>
  render(
    <ImportScreen
      state={{ status: "idle" }}
      onFiles={() => {}}
      metas={metas}
      onAbrir={() => {}}
      {...props}
    />
  )

describe("ImportScreen: abrir a última", () => {
  it("sem lembrança, abre a mais recente", async () => {
    const onAbrir = vi.fn()
    tela({ onAbrir })
    await userEvent.click(screen.getByRole("button", { name: /^Abrir a última/ }))
    expect(onAbrir).toHaveBeenCalledWith("3")
  })

  it("com a carga lembrada neste navegador, abre ela", async () => {
    const onAbrir = vi.fn()
    tela({ onAbrir, lembradaId: "1" })
    const b = screen.getByRole("button", { name: /^Abrir a última/ })
    expect(b).toHaveTextContent(/julho de 2026/i)
    await userEvent.click(b)
    expect(onAbrir).toHaveBeenCalledWith("1")
  })

  it("a lembrada que não existe mais ou está arquivada cai na mais recente", () => {
    tela({ lembradaId: "99" })
    expect(screen.getByRole("button", { name: /^Abrir a última/ })).toHaveTextContent(/setembro de 2026/i)
  })

  it("lembrada arquivada é ignorada", () => {
    tela({
      lembradaId: "1",
      metas: [meta("1", "2026-07", { arquivadaEm: "2026-10-05T00:00:00Z" }), meta("3", "2026-09")],
    })
    expect(screen.getByRole("button", { name: /^Abrir a última/ })).toHaveTextContent(/setembro de 2026/i)
  })

  it("abrindo uma carga mostra o indicador e desabilita o botão", () => {
    tela({ abrindo: true })
    expect(screen.getByText("Abrindo a carga…")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Abrir a última/ })).toBeDisabled()
  })
})
