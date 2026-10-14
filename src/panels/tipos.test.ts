import { describe, expect, it } from "vitest"
import { AutoPanel } from "@/components/app/auto/AutoPanel"
import { PainelOutro } from "@/components/app/PainelOutro"
import { PainelChamados } from "@/components/chamados/PainelChamados"
import { visoesDoTipo } from "./tipos"

describe("visoesDoTipo", () => {
  it("outro: só Painel (experiência genérica), sem Comparar/Evolução", () => {
    const v = visoesDoTipo("outro")
    expect(v.Painel).toBe(PainelOutro)
    expect(v.Comparar).toBeUndefined()
    expect(v.Evolucao).toBeUndefined()
    expect(AutoPanel).toBeDefined()
  })
  it("chamados: Painel, Leituras, Comparar e Evolução", () => {
    const v = visoesDoTipo("chamados")
    expect(v.Painel).toBe(PainelChamados)
    expect(v.Comparar).toBeDefined()
    expect(v.Evolucao).toBeDefined()
    expect(v.Leituras).toBeDefined()
  })
  it("tipo desconhecido cai em outro; nomes herdados do Object não vazam", () => {
    expect(visoesDoTipo("qualquer").Painel).toBe(PainelOutro)
    expect(visoesDoTipo("constructor").Painel).toBe(PainelOutro)
  })
})
