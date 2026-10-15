import { describe, expect, it } from "vitest"
import type { EntradaCompetencia } from "./tipos"
import { corrigirFoto, metricasCorrigidas } from "./fotos"
import { dia, montarSheet } from "./test-util"

/** Correção entre fotos considera o aceite (D65 + decisão de 15/10): Aguardando aceite não vira Finalizado retroativamente. */
const CAB = [
  "Mes Ref.",
  "Data Abertura",
  "Código",
  "Situação",
  "Data de Solução",
  "Data de Aceite",
]
const CAB_SEM_ACEITE = CAB.slice(0, 5)

type Lin = {
  sit: string
  sol?: string
  aceite?: string
}
const foto = (mesRef: string, l: Lin, comAceite = true): EntradaCompetencia => {
  const linha = [
    dia(mesRef),
    dia("2026-04-01"),
    7000,
    l.sit,
    l.sol ? dia(l.sol) : null,
    l.aceite ? dia(l.aceite) : null,
  ]
  return {
    sheet: montarSheet(
      comAceite ? CAB : CAB_SEM_ACEITE,
      [comAceite ? linha : linha.slice(0, 5)]
    ),
    competencia: mesRef.slice(0, 7),
  }
}
const abr = (l: Lin) => foto("2026-04-01", l)
const sit = (r: ReturnType<typeof corrigirFoto>) => {
  const k = r.entrada.sheet.columns.find((c) => c.label === "Situação")!.key
  return r.entrada.sheet.rows[0][k]
}
const aceiteDe = (r: ReturnType<typeof corrigirFoto>) => {
  const k = r.entrada.sheet.columns.find((c) => c.label === "Data de Aceite")!.key
  return r.entrada.sheet.rows[0][k]
}

describe("corrigirFoto considera o aceite", () => {
  it("1: aguardando aceite em abr, aceite em 03/05 em out: abr não é corrigido e segue aguardando", () => {
    const a = abr({ sit: "Aguardando aceite", sol: "2026-04-28" })
    const o = foto("2026-10-01", {
      sit: "Finalizado",
      sol: "2026-04-28",
      aceite: "2026-05-03",
    })
    const r = corrigirFoto(a, [o])
    expect(r.corrigidos).toBe(0)
    expect(sit(r)).toBe("Aguardando aceite")
    const m = metricasCorrigidas(a, [o])
    expect(m.kpis.find((k) => k.id === "aguardandoAceite")!.valor).toBe(1)
  })
  it("2: aceite em 29/04: abr é corrigido, com o aceite copiado", () => {
    const a = abr({ sit: "Aguardando aceite", sol: "2026-04-28" })
    const o = foto("2026-10-01", {
      sit: "Finalizado",
      sol: "2026-04-28",
      aceite: "2026-04-29",
    })
    const r = corrigirFoto(a, [o])
    expect(r.corrigidos).toBe(1)
    expect(sit(r)).toBe("Finalizado")
    expect(aceiteDe(r)).toEqual(dia("2026-04-29"))
  })
  it("3: aguardando aceite em abr, aceite vazio em out: abr não é corrigido", () => {
    const a = abr({ sit: "Aguardando aceite", sol: "2026-04-28" })
    const o = foto("2026-10-01", { sit: "Finalizado", sol: "2026-04-28" })
    const r = corrigirFoto(a, [o])
    expect(r.corrigidos).toBe(0)
    expect(sit(r)).toBe("Aguardando aceite")
  })
  it("4: Em Análise em abr, solução 25/04 sem aceite: abr é corrigido (D65)", () => {
    const a = abr({ sit: "Em Análise" })
    const o = foto("2026-10-01", { sit: "Finalizado", sol: "2026-04-25" })
    const r = corrigirFoto(a, [o])
    expect(r.corrigidos).toBe(1)
    expect(sit(r)).toBe("Finalizado")
  })
  it("5: Em Análise em abr, solução 25/04 e aceite 05/05: abr não é corrigido", () => {
    const a = abr({ sit: "Em Análise" })
    const o = foto("2026-10-01", {
      sit: "Finalizado",
      sol: "2026-04-25",
      aceite: "2026-05-05",
    })
    const r = corrigirFoto(a, [o])
    expect(r.corrigidos).toBe(0)
    expect(sit(r)).toBe("Em Análise")
  })
  it("6: out sem a coluna de aceite: aguardando aceite não corrige; Em Análise corrige pela solução", () => {
    const o = foto("2026-10-01", { sit: "Finalizado", sol: "2026-04-25" }, false)
    const ag = corrigirFoto(
      abr({ sit: "Aguardando aceite", sol: "2026-04-25" }),
      [o]
    )
    expect(ag.corrigidos).toBe(0)
    expect(sit(ag)).toBe("Aguardando aceite")
    const an = corrigirFoto(abr({ sit: "Em Análise" }), [o])
    expect(an.corrigidos).toBe(1)
    expect(sit(an)).toBe("Finalizado")
  })
})
