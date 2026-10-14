import { describe, expect, it } from "vitest"
import { escolherAba, mapearColunas, tipoChamados } from "./index"
import { montarSheet, montarWorkbook, ROTULOS_PADRAO } from "./test-util"

describe("mapearColunas", () => {
  it("tolera variações de nome, acento e caixa", () => {
    const s = montarSheet(
      [
        "Data de abertura",
        "SITUAÇÃO",
        "Sla previsto",
        "Hora Abertura",
        "Área Superior",
      ],
      []
    )
    const { mapa, faltando } = mapearColunas(s)
    expect(mapa.abertura).toBe("c0")
    expect(mapa.situacao).toBe("c1")
    expect(mapa.slaPrevisto).toBe("c2")
    expect(mapa.areaSuperior).toBe("c4")
    expect(faltando).toEqual([])
  })

  it("não confunde Hora Abertura nem Situação Ultima Reabertura", () => {
    const s = montarSheet(
      ["Hora Abertura", "Situação Ultima Reabertura", "Data Ultima Reabertura"],
      []
    )
    const { mapa, faltando } = mapearColunas(s)
    expect(mapa.abertura).toBeUndefined()
    expect(mapa.situacao).toBeUndefined()
    expect(faltando).toEqual(["abertura", "situacao"])
  })

  it("separa Área de Área Superior", () => {
    const { mapa } = mapearColunas(montarSheet(["Área Superior", "Área"], []))
    expect(mapa.areaSuperior).toBe("c0")
    expect(mapa.area).toBe("c1")
  })
})

describe("escolherAba e tipoChamados", () => {
  const boa = montarSheet(ROTULOS_PADRAO, [], "Chamados")
  const ruim = montarSheet(["Foo", "Bar"], [], "Outra")

  it("escolhe a aba com mais campos mapeados", () => {
    expect(escolherAba(montarWorkbook(ruim, boa))?.name).toBe("Chamados")
    expect(escolherAba(montarWorkbook(ruim))).toBeNull()
  })

  it("reconhece pela fração de campos essenciais", () => {
    expect(tipoChamados.id).toBe("chamados")
    expect(tipoChamados.nome).toBe("Chamados / OS")
    expect(tipoChamados.reconhecer(montarWorkbook(boa))).toBe(1)
    expect(tipoChamados.reconhecer(montarWorkbook(ruim))).toBe(0)
    const parcial = montarSheet(["Data Abertura", "Situação"], [])
    expect(tipoChamados.reconhecer(montarWorkbook(parcial))).toBeCloseTo(0.4)
  })
})
