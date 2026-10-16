import { describe, expect, it } from "vitest"
import { gerarLeituras, type Leitura } from "./index"
import { montarSheet, sheetChamados, type LinhaChamado } from "./test-util"

const VELHO = "2026-01-01" // 8 meses antes de set/26: faixa de atraso "7+"
const NOVO = "2026-09-01"
const rep = (n: number, l: LinhaChamado): LinhaChamado[] =>
  Array.from({ length: n }, () => ({ ...l }))
const ent = (linhas: LinhaChamado[], competencia = "2026-09") => ({
  sheet: sheetChamados(linhas),
  competencia,
})
const SLA = { sla: "2026-12-01" }
const diversos = (n: number, l: LinhaChamado): LinhaChamado[] =>
  Array.from({ length: n }, (_, i) => ({ ...l, cliente: `Cli ${i}` }))
const achar = (ls: Leitura[], id: Leitura["id"]) => ls.find((l) => l.id === id)

describe("leitura concentracao (cliente >= 40% dos não finalizados)", () => {
  const com = (n: number, outros: number) => [
    ...rep(n, { abertura: NOVO, cliente: "PMC", ...SLA }),
    ...diversos(outros, { abertura: NOVO, ...SLA }),
  ]
  it("dispara no limite exato (4 de 10)", () => {
    const l = achar(gerarLeituras(ent(com(4, 6))), "concentracao")!
    expect(l.severidade).toBe("atencao")
    expect(l.titulo).toBe("PMC concentra 40% dos não finalizados (4 de 10)")
    expect(l.filtro).toEqual({ campo: "cliente", valores: ["PMC"] })
    expect(l.evidencia).toContain("cliente")
  })
  it("não dispara abaixo (3 de 10; 4 de 11)", () => {
    expect(achar(gerarLeituras(ent(com(3, 7))), "concentracao")).toBeUndefined()
    expect(achar(gerarLeituras(ent(com(4, 7))), "concentracao")).toBeUndefined()
  })
  it("diz quantos do cliente estão em atraso há 7 meses ou mais", () => {
    const linhas = [
      ...rep(2, { abertura: VELHO, cliente: "PMC", ...SLA }),
      ...rep(2, { abertura: NOVO, cliente: "PMC", ...SLA }),
      ...diversos(6, { abertura: NOVO, ...SLA }),
    ]
    expect(achar(gerarLeituras(ent(linhas)), "concentracao")!.texto).toContain(
      "2 deles estão em atraso há 7 meses ou mais"
    )
  })
})

describe("leitura envelhecimento (> 25% dos não finalizados na faixa de atraso 7+)", () => {
  const com = (velhos: number) => [
    ...rep(velhos, { abertura: VELHO, ...SLA }),
    ...rep(20 - velhos, { abertura: NOVO, ...SLA }),
  ]
  it("não dispara em 25% exato (5 de 20)", () =>
    expect(achar(gerarLeituras(ent(com(5))), "envelhecimento")).toBeUndefined())
  it("atencao acima de 25% (6 de 20)", () => {
    const l = achar(gerarLeituras(ent(com(6))), "envelhecimento")!
    expect(l.severidade).toBe("atencao")
    expect(l.titulo).toBe("6 chamados (30%) estão em atraso há 7 meses ou mais")
    expect(l.filtro).toEqual({ campo: "idade", valores: ["7+"] })
  })
  it("o texto usa 'mês de referência', não 'Mes Ref.'", () => {
    const l = achar(gerarLeituras(ent(com(6))), "envelhecimento")!
    expect(l.texto).toContain("do mês de referência.")
    expect(l.texto).not.toMatch(/Mes Ref/)
  })
  it("atencao em 40% exato (8 de 20); critico acima (9 de 20)", () => {
    expect(
      achar(gerarLeituras(ent(com(8))), "envelhecimento")!.severidade
    ).toBe("atencao")
    expect(
      achar(gerarLeituras(ent(com(9))), "envelhecimento")!.severidade
    ).toBe("critico")
  })
})

describe("leitura gargaloCliente (aguardando aceite >= 30% dos não finalizados)", () => {
  const com = (n: number) => [
    ...rep(n, {
      abertura: NOVO,
      situacao: "Aguardando Aceite de Solução",
      ...SLA,
    }),
    ...rep(10 - n, { abertura: NOVO, ...SLA }),
  ]
  it("dispara no limite (3 de 10)", () => {
    const l = achar(gerarLeituras(ent(com(3))), "gargaloCliente")!
    expect(l.severidade).toBe("atencao")
    expect(l.titulo).toBe(
      "30% dos chamados não finalizados estão aguardando aceite do cliente"
    )
    expect(l.acao).toBe("Cobrar aceite dos clientes com mais pendências")
  })
  it("não dispara abaixo (2 de 10)", () =>
    expect(achar(gerarLeituras(ent(com(2))), "gargaloCliente")).toBeUndefined())
  it("todos aguardando aceite: 100%, nunca passa disso", () => {
    const l = achar(gerarLeituras(ent(com(10))), "gargaloCliente")!
    expect(l.titulo).toContain("100%")
    expect(l.texto).toBe(
      "10 de 10 chamados não finalizados estão aguardando aceite."
    )
  })
  it("finalizados não entram na base nem no numerador", () => {
    const linhas = [
      ...com(3),
      ...rep(5, { abertura: "2026-09-01", solucao: "2026-09-10", ...SLA }),
    ]
    expect(achar(gerarLeituras(ent(linhas)), "gargaloCliente")!.texto).toBe(
      "3 de 10 chamados não finalizados estão aguardando aceite."
    )
  })
})

describe("leitura semSla (>= 20% dos não finalizados sem SLA)", () => {
  const com = (n: number) => [
    ...rep(n, { abertura: NOVO }),
    ...rep(10 - n, { abertura: NOVO, ...SLA }),
  ]
  it("dispara no limite (2 de 10)", () => {
    const l = achar(gerarLeituras(ent(com(2))), "semSla")!
    expect(l.severidade).toBe("atencao")
    expect(l.texto).toContain("base menor")
    expect(l.filtro).toBeUndefined()
  })
  it("não dispara abaixo (1 de 10)", () =>
    expect(achar(gerarLeituras(ent(com(1))), "semSla")).toBeUndefined())
})

describe("leitura fluxo (finalizados >= 1,5x entradas e não finalizados caíram)", () => {
  const anterior = (backlog: number) =>
    ent(
      [
        ...rep(backlog, { abertura: "2026-07-01", ...SLA }),
        { abertura: "2026-08-01", solucao: "2026-08-03", ...SLA },
      ],
      "2026-08"
    )
  const atual = (saidas: number, entradas: number, abertos: number) =>
    ent([
      ...rep(abertos, { abertura: "2026-07-01", ...SLA }),
      ...rep(saidas, { abertura: VELHO, solucao: "2026-09-10", ...SLA }),
      ...rep(entradas, { abertura: NOVO, ...SLA }),
    ])
  it("dispara em 3 finalizados vs 2 entradas (1,5x) com não finalizados caindo", () => {
    const l = achar(gerarLeituras(atual(3, 2, 7), anterior(10)), "fluxo")!
    expect(l.severidade).toBe("destaque")
    expect(l.titulo).toBe("Mês de redução de estoque")
    expect(l.texto).toContain("3")
    expect(l.texto).toContain("-1 (-10%)")
  })
  it("acrescenta a nota de tempo médio quando ele subiu", () => {
    const l = achar(gerarLeituras(atual(3, 2, 7), anterior(10)), "fluxo")!
    expect(l.texto).toContain(
      "O tempo médio subiu de 2,0 para 252,0 dias porque foram fechados chamados antigos — isso também pesa no % de SLA."
    )
  })
  it("não dispara com finalizados < 1,5x entradas (4 vs 3)", () => {
    expect(
      achar(gerarLeituras(atual(4, 3, 6), anterior(10)), "fluxo")
    ).toBeUndefined()
  })
  it("não dispara se os não finalizados não caíram", () => {
    expect(
      achar(gerarLeituras(atual(3, 2, 7), anterior(9)), "fluxo")
    ).toBeUndefined()
  })
  it("não dispara sem anterior", () => {
    expect(achar(gerarLeituras(atual(3, 2, 7)), "fluxo")).toBeUndefined()
  })
})

describe("gerarLeituras", () => {
  it("ordena critico > atencao > destaque e limita a 4", () => {
    const anterior = ent(
      [
        ...rep(12, { abertura: "2026-07-01", ...SLA }),
        { abertura: "2026-08-01", solucao: "2026-08-03", ...SLA },
      ],
      "2026-08"
    )
    const atual = ent([
      ...rep(10, {
        abertura: VELHO,
        cliente: "PMC",
        situacao: "Aguardando Aceite de Solução",
      }),
      ...rep(3, { abertura: VELHO, solucao: "2026-09-10", cliente: "Outro" }),
      { abertura: NOVO, cliente: "Outro" },
    ])
    const ls = gerarLeituras(atual, anterior)
    expect(ls).toHaveLength(4)
    expect(ls[0].severidade).toBe("critico")
    expect(ls.map((l) => l.id)).toEqual([
      "envelhecimento",
      "concentracao",
      "gargaloCliente",
      "semSla",
    ])
    expect(ls.every((l) => l.evidencia.length > 0)).toBe(true)
  })
  it("fluxo (destaque) aparece depois das de atenção quando cabe", () => {
    const anterior = ent(
      [
        ...rep(10, { abertura: "2026-07-01", ...SLA }),
        { abertura: "2026-08-01", solucao: "2026-08-03", ...SLA },
      ],
      "2026-08"
    )
    const atual = ent([
      ...rep(7, { abertura: "2026-07-01", cliente: "PMC", ...SLA }),
      ...rep(3, { abertura: "2026-07-01", solucao: "2026-09-10", ...SLA }),
      ...rep(2, { abertura: NOVO, cliente: "PMC", ...SLA }),
    ])
    const ls = gerarLeituras(atual, anterior)
    expect(ls.map((l) => l.id)).toEqual(["concentracao", "fluxo"])
  })
  it("sem coluna de solução e de cliente nada dispara", () => {
    const s = montarSheet(
      ["Data de abertura", "SITUAÇÃO"],
      [[new Date("2026-09-01T00:00:00Z"), "Em Análise"]]
    )
    expect(gerarLeituras({ sheet: s, competencia: "2026-09" })).toEqual([])
  })
})
