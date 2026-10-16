import { describe, expect, it } from "vitest"
import { AutoPanel } from "@/components/app/auto/AutoPanel"
import { PainelChamados } from "@/components/chamados/PainelChamados"
import { visoesDoTipo } from "./tipos"

describe("visoesDoTipo", () => {
  it("outro: só Painel (experiência genérica), sem Comparar", () => {
    const v = visoesDoTipo("outro")
    expect(v.Painel).not.toBe(PainelChamados)
    expect(v.Comparar).toBeUndefined()
    expect(AutoPanel).toBeDefined()
  })
  it("chamados: Painel, Leituras e Comparar (a Evolução virou o bloco Ao longo do tempo do Painel)", () => {
    const v = visoesDoTipo("chamados")
    expect(v.Painel).toBe(PainelChamados)
    expect(v.Comparar).toBeDefined()
    expect(v.Leituras).toBeDefined()
  })
  it("tipo desconhecido cai em outro; nomes herdados do Object não vazam", () => {
    const outro = visoesDoTipo("outro").Painel
    expect(visoesDoTipo("qualquer").Painel).toBe(outro)
    expect(visoesDoTipo("constructor").Painel).toBe(outro)
  })
})
