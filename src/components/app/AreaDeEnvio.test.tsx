import { createEvent, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AreaDeEnvio } from "./AreaDeEnvio"

const x = (n: string) => new File(["x"], n)

function soltar(alvo: Element, files: File[]) {
  const ev = createEvent.drop(alvo)
  Object.defineProperty(ev, "dataTransfer", { value: { files, types: ["Files"] } })
  fireEvent(alvo, ev)
}
const montar = (props = {}) => {
  const onFiles = vi.fn()
  const r = render(<AreaDeEnvio onFiles={onFiles} {...props} />)
  return { onFiles, area: r.container.querySelector("[data-area-envio]")! }
}

describe("AreaDeEnvio em lote", () => {
  it("o input aceita vários arquivos", () => {
    montar()
    expect(screen.getByLabelText(/Arquivo da planilha/)).toHaveAttribute("multiple")
  })

  it("soltar vários .xlsx entrega todos de uma vez", () => {
    const { onFiles, area } = montar()
    soltar(area, [x("a.xlsx"), x("b.xlsx")])
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(["a.xlsx", "b.xlsx"])
  })

  it("escolher vários pelo input entrega todos", async () => {
    const { onFiles } = montar()
    await userEvent.upload(screen.getByLabelText(/Arquivo da planilha/), [x("a.xlsx"), x("b.xlsx")])
    expect(onFiles.mock.calls[0][0]).toHaveLength(2)
  })

  it("mais de 12: mensagem clara e nada é entregue", () => {
    const { onFiles, area } = montar()
    soltar(area, Array.from({ length: 13 }, (_, i) => x(`a${i}.xlsx`)))
    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/no máximo 12.*nada foi lido/i)
  })

  it("não-xlsx no meio fica fora com aviso e os outros seguem", () => {
    const { onFiles, area } = montar()
    soltar(area, [x("a.xlsx"), x("notas.txt")])
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(["a.xlsx"])
    expect(onFiles.mock.calls[0][1]).toEqual(["notas.txt"])
    expect(screen.getByRole("status")).toHaveTextContent("notas.txt")
  })

  it("só não-xlsx: erro e nada entregue", () => {
    const { onFiles, area } = montar()
    soltar(area, [x("notas.txt")])
    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/\.xlsx/)
  })

  it("mostra o progresso de leitura", () => {
    montar({ loading: true, progresso: { atual: 3, total: 8 } })
    expect(screen.getByText("Lendo 3 de 8…")).toBeInTheDocument()
  })
})
