import { describe, expect, it } from "vitest"
import type { Sheet } from "@/core"
import { getPanel, panels } from "./registry"

const sheet = (name: string): Sheet => ({
  id: name,
  name,
  index: 0,
  columns: [],
  rows: [],
})

describe("registro de painéis", () => {
  it("devolve null para aba sem painel", () => {
    expect(getPanel(sheet("Qualquer"))).toBeNull()
    expect(getPanel(sheet("constructor"))).toBeNull()
  })
  it("devolve o painel registrado pelo nome da aba", () => {
    const Panel = () => null
    panels["Projetos"] = Panel
    expect(getPanel(sheet("Projetos"))).toBe(Panel)
    delete panels["Projetos"]
  })
})

describe("painel padrão", () => {
  it("painel registrado tem prioridade; sem ele, AutoPanel", async () => {
    const { resolvePanel } = await import("./registry")
    const { AutoPanel } = await import("@/components/app/auto/AutoPanel")
    const Panel = () => null
    expect(resolvePanel(sheet("Sem painel"))).toBe(AutoPanel)
    panels["Com painel"] = Panel
    expect(resolvePanel(sheet("Com painel"))).toBe(Panel)
    delete panels["Com painel"]
  })
})
