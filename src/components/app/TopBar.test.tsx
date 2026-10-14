import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CargaMeta } from "@/cargas"
import { TopBar } from "./TopBar"

const atual = {
  id: "1",
  tipo: "chamados",
  competencia: "2026-09",
  versao: 1,
  importadaEm: "2026-10-01T00:00:00Z",
} as unknown as CargaMeta

function barra(visible: boolean) {
  return render(
    <TopBar
      visible={visible}
      tipoNome="Chamados"
      atual={atual}
      grupos={[]}
      visoes={["painel"]}
      visao="painel"
      onSlot={() => {}}
      onAbrir={() => {}}
      onVisao={() => {}}
      onPickFile={() => {}}
      onHistorico={() => {}}
      podeApagar={false}
      onClear={() => {}}
      onSelectorOpenChange={() => {}}
      dica={null}
    />
  ).container.querySelector("header")!
}

describe("TopBar", () => {
  it("escondida sai inteira para cima (-100%), sem eventos de ponteiro", () => {
    const h = barra(false)
    expect(h.dataset.visible).toBe("false")
    expect(h.style.transform).toContain("-100%")
    expect(h.className).toContain("pointer-events-none")
  })

  it("visível fica na posição, sobreposta ao conteúdo", () => {
    const h = barra(true)
    expect(h.style.transform).not.toContain("-100%")
    expect(h.className).toContain("fixed")
  })
})
