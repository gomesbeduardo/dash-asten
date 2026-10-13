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
