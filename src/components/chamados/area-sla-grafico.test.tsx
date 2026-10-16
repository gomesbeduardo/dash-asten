/**
 * Spec 002 (opção A): Área × SLA em dois gráficos de barras, sem tabela.
 *
 * CONTRATO PARA QUEM IMPLEMENTA
 * - `AreaSlaGrafico` exportado de `./cruzamentos-ui`, com as mesmas props `DadosCruzamento` do
 *   antigo `AreaSla` (sem prop `opcao`). Substitui o `AreaSla` e entra em PainelChamados.tsx.
 * - Cartão = `GraficoCartao` com titulo "Área × SLA" (region "Área × SLA"; "Ver dados" como nos outros).
 * - Dois gráficos feitos com `BarrasRefinadas` (cada um com `role="img"`), lado a lado, com as mesmas
 *   áreas na mesma ordem. A série do 1º chama-se "% no SLA" e a do 2º "SLA vencido": o `title` de cada
 *   barra é "<Área>, <série>: <valor>" (já é assim em BarrasRefinadas) e o `aria-label` do gráfico
 *   menciona a série. As barras seguem `data-barra` (sólida) e `data-fantasma` (listrada).
 * - Sobre cada gráfico, um título (heading) "% no SLA · finalizados no mês" e "SLA vencido · não finalizados".
 * - Rótulo da % : "67% (4 de 6)" (% inteira; n = round(slaPct/100 * finalizadosComSla)); sem
 *   finalizados com SLA: "—". Escala fixa 0–100% com a marca "100%" (BarrasRefinadas ganha `escalaFixa`,
 *   e `texto`/`textoBase` por valor, como no protótipo f80df8e).
 * - Nome da área só no gráfico da esquerda (texto uma vez); o da direita não repete (semRotulos).
 * - Ordem: slaVencido decrescente, empate alfabético (pt-BR); troca de ordem após 600 ms (useOrdemAtrasada).
 * - No Painel: a linha dos 3 cruzamentos (Cliente × Situação, Operador × Atraso, Cliente × Tempo médio)
 *   e, numa linha própria logo abaixo (outro contêiner), só o cartão Área × SLA.
 * - Nenhuma cor literal (#hex/rgb) em estilo inline; a barra de vencido usa `var(--vencido)`.
 */
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { EntradaCompetencia } from "@/chamados"
import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { makeXlsx } from "@/test/makeWorkbook"
import { CAB, out, v1, mai, v2, type L } from "@/chamados/fotos-teste"
import { PainelChamados } from "./PainelChamados"
import * as ui from "./cruzamentos-ui"
import type { DadosCruzamento } from "./cruzamentos-ui"

type Area = {
  rotulo: string
  slaPct: number | null
  finalizadosComSla: number
  slaVencido: number
}

// O motor é trocado por dados diretos: o golden dele já existe (motor.txt).
// (entradas reais, como as do Painel, caem no motor de verdade)
vi.mock("@/chamados", async (orig) => {
  const real = await orig<typeof import("@/chamados")>()
  return {
    ...real,
    areaPorSla: (e: { areas?: Area[] } | undefined) =>
      e?.areas ?? real.areaPorSla(e as never),
  }
})
vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  useReducedMotion: () => false,
}))

const entrada = (areas: Area[]) => ({ areas }) as unknown as EntradaCompetencia

const AREAS: Area[] = [
  { rotulo: "Cadastro", slaPct: 80, finalizadosComSla: 5, slaVencido: 11 },
  { rotulo: "Relatórios", slaPct: 66.67, finalizadosComSla: 6, slaVencido: 25 },
  { rotulo: "Financeiro", slaPct: null, finalizadosComSla: 0, slaVencido: 3 },
]

const dados = (over: Partial<DadosCruzamento> = {}): DadosCruzamento => ({
  atual: entrada(AREAS),
  competencia: "2026-10",
  base: null,
  entradaBase: null,
  cores: new Map<string, string>(),
  ...over,
})

function montar(d: DadosCruzamento) {
  const C = (ui as Record<string, unknown>).AreaSlaGrafico as
    | ComponentType<DadosCruzamento>
    | undefined
  if (!C)
    throw new Error(
      "Contrato: `AreaSlaGrafico` não é exportado de ./cruzamentos-ui (ainda não implementado)"
    )
  const r = render(<C {...d} />)
  return { ...r, C }
}

const cartao = () => screen.getByRole("region", { name: "Área × SLA" })
const barras = (serie: "% no SLA" | "SLA vencido", raiz: ParentNode = document) =>
  [...raiz.querySelectorAll<HTMLElement>(`[title*=", ${serie}:"]`)]
const areasDe = (serie: "% no SLA" | "SLA vencido") =>
  barras(serie).map((b) => b.getAttribute("title")!.split(", ")[0])
const barra = (area: string, serie: "% no SLA" | "SLA vencido") =>
  document.querySelector<HTMLElement>(`[title^="${area}, ${serie}:"]`)!

describe("Área × SLA em gráfico: o cartão (critério 2)", () => {
  it("tem dois gráficos com as mesmas áreas na mesma ordem", () => {
    montar(dados())
    const esquerda = areasDe("% no SLA")
    expect(esquerda).toEqual(["Relatórios", "Cadastro", "Financeiro"])
    expect(areasDe("SLA vencido")).toEqual(esquerda)
    expect(within(cartao()).getAllByRole("img")).toHaveLength(2)
  })

  it("títulos '% no SLA · finalizados no mês' e 'SLA vencido · não finalizados'", () => {
    montar(dados())
    const c = within(cartao())
    expect(
      c.getByRole("heading", { name: /% no SLA.*finalizados no mês/ })
    ).toBeInTheDocument()
    expect(
      c.getByRole("heading", { name: /SLA vencido.*não finalizados/ })
    ).toBeInTheDocument()
  })

  it("rótulo com a % inteira e o 'n de N'", () => {
    montar(dados())
    const c = within(cartao())
    expect(c.getByText("67% (4 de 6)")).toBeInTheDocument()
    expect(c.getByText("80% (4 de 5)")).toBeInTheDocument()
  })

  it("o nome da área aparece uma vez no cartão", () => {
    montar(dados())
    for (const a of AREAS)
      expect(within(cartao()).getAllByText(a.rotulo)).toHaveLength(1)
  })

  it("sem tabela no cartão; a tabela só aparece em 'Ver dados'", async () => {
    montar(dados())
    expect(cartao().querySelector("table")).toBeNull()
    expect(within(cartao()).queryByRole("table")).toBeNull()
    await userEvent.setup().click(screen.getByRole("button", { name: /Ver dados/ }))
    expect(within(cartao()).getByRole("table")).toBeInTheDocument()
  })

  it("a escala da % vai a 100%", () => {
    montar(dados())
    const c = within(cartao())
    expect(c.getByText("100%")).toBeInTheDocument()
    expect(c.queryByText(/^1[1-9]\d%$/)).toBeNull()
    // 66,67 de 100: a barra de Relatórios ocupa ~2/3 da trilha
    const larg = parseFloat(
      barra("Relatórios", "% no SLA").querySelector<HTMLElement>("[data-barra]")!
        .style.width
    )
    expect(larg).toBeCloseTo(66.67, 1)
  })
})

describe("Área × SLA em gráfico: sem finalizados com SLA (critério 3)", () => {
  it("mostra '—' na % e a linha continua com o SLA vencido", () => {
    montar(dados())
    expect(
      screen.getByRole("img", { name: /Financeiro: % no SLA —/ })
    ).toBeInTheDocument()
    expect(within(cartao()).getAllByText("—").length).toBeGreaterThan(0)
    expect(
      screen.getByRole("img", { name: /Financeiro: SLA vencido 3/ })
    ).toBeInTheDocument()
    expect(areasDe("SLA vencido")).toContain("Financeiro")
  })
})

describe("Área × SLA em gráfico: com 'Comparar com' ativo (critério 4, D77)", () => {
  const base = { rotulo: "mai/26", situacoes: [], total: 0, distribuicoes: [] }
  const comparado = (): DadosCruzamento =>
    dados({
      base: base as never,
      entradaBase: entrada([
        // maior que o atual na % (80 > 66,67) e menor no vencido (20 < 25)
        { rotulo: "Relatórios", slaPct: 80, finalizadosComSla: 5, slaVencido: 20 },
        // menor na % (78 < 80) e maior no vencido (15 > 11)
        { rotulo: "Cadastro", slaPct: 78, finalizadosComSla: 9, slaVencido: 15 },
        { rotulo: "Financeiro", slaPct: null, finalizadosComSla: 0, slaVencido: 3 },
      ]),
    })
  const fantasma = (area: string, serie: "% no SLA" | "SLA vencido") =>
    barra(area, serie).querySelector<HTMLElement>("[data-fantasma]")!

  it("comparado maior: camada listrada com largura > 0 logo depois da barra sólida", () => {
    montar(comparado())
    const f = fantasma("Relatórios", "% no SLA")
    expect(parseFloat(f.style.width)).toBeGreaterThan(0)
    const solida = barra("Relatórios", "% no SLA").querySelector<HTMLElement>(
      "[data-barra]"
    )!
    expect(f.style.left).toBe(solida.style.width)
    expect(parseFloat(fantasma("Cadastro", "SLA vencido").style.width)).toBeGreaterThan(0)
  })

  it("comparado menor: sem listra e o valor comparado em cinza no rótulo", () => {
    montar(comparado())
    expect(parseFloat(fantasma("Cadastro", "% no SLA").style.width)).toBe(0)
    expect(parseFloat(fantasma("Relatórios", "SLA vencido").style.width)).toBe(0)
    const pct = within(cartao()).getByText("mai 78%")
    const venc = within(cartao()).getByText("mai 20")
    expect(pct.className).toMatch(/muted-foreground/)
    expect(venc.className).toMatch(/muted-foreground/)
  })

  it("comparado igual: sem listra", () => {
    montar(comparado())
    expect(parseFloat(fantasma("Financeiro", "SLA vencido").style.width)).toBe(0)
  })
})

describe("Área × SLA em gráfico: ordem (critério 5, D76/D77)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const A: Area[] = [
    { rotulo: "Relatórios", slaPct: 50, finalizadosComSla: 2, slaVencido: 25 },
    { rotulo: "Cadastro", slaPct: 50, finalizadosComSla: 2, slaVencido: 11 },
    { rotulo: "Alfa", slaPct: 50, finalizadosComSla: 2, slaVencido: 11 },
    { rotulo: "Financeiro", slaPct: 50, finalizadosComSla: 2, slaVencido: 3 },
  ]
  const B: Area[] = [
    { rotulo: "Relatórios", slaPct: 50, finalizadosComSla: 2, slaVencido: 5 },
    { rotulo: "Cadastro", slaPct: 50, finalizadosComSla: 2, slaVencido: 11 },
    { rotulo: "Alfa", slaPct: 50, finalizadosComSla: 2, slaVencido: 11 },
    { rotulo: "Financeiro", slaPct: 50, finalizadosComSla: 2, slaVencido: 30 },
  ]

  it("vencido decrescente e, no empate, ordem alfabética", () => {
    montar(dados({ atual: entrada(A) }))
    expect(areasDe("SLA vencido")).toEqual(["Relatórios", "Alfa", "Cadastro", "Financeiro"])
    expect(areasDe("% no SLA")).toEqual(["Relatórios", "Alfa", "Cadastro", "Financeiro"])
  })

  it("ao trocar os dados, a ordem antiga fica até 599 ms e a nova vale em 600 ms", () => {
    const { rerender, C } = montar(dados({ atual: entrada(A) }))
    rerender(<C {...dados({ atual: entrada(B) })} />)
    const antiga = ["Relatórios", "Alfa", "Cadastro", "Financeiro"]
    const nova = ["Financeiro", "Alfa", "Cadastro", "Relatórios"]
    expect(areasDe("SLA vencido")).toEqual(antiga)
    // o valor já é o novo enquanto a ordem ainda é a antiga
    expect(screen.getByRole("img", { name: /Financeiro: SLA vencido 30/ })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(599))
    expect(areasDe("SLA vencido")).toEqual(antiga)
    expect(areasDe("% no SLA")).toEqual(antiga)
    act(() => vi.advanceTimersByTime(1))
    expect(areasDe("SLA vencido")).toEqual(nova)
    expect(areasDe("% no SLA")).toEqual(nova)
  })
})

describe("Área × SLA em gráfico: cor (critério 6)", () => {
  it("a barra do SLA vencido usa o token de SLA vencido", () => {
    montar(dados())
    const b = barra("Relatórios", "SLA vencido").querySelector<HTMLElement>("[data-barra]")!
    expect(b.style.background).toContain("var(--vencido)")
    const p = barra("Relatórios", "% no SLA").querySelector<HTMLElement>("[data-barra]")!
    expect(p.style.background).not.toContain("var(--vencido)")
  })

  it("nenhum estilo inline do cartão tem cor literal (#hex, rgb, hsl)", () => {
    montar(dados({ base: { rotulo: "mai/26" } as never, entradaBase: entrada(AREAS) }))
    // sem o cartão montado a varredura passaria em vazio
    expect(barras("SLA vencido").length).toBeGreaterThan(0)
    const literais = [...cartao().querySelectorAll<HTMLElement>("[style]")]
      .map((e) => e.getAttribute("style")!)
      .filter((s) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(s))
    expect(literais).toEqual([])
  })
})

// ---- Painel (critério 1) ----
const d = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null)
function xlsx(linhas: L[], mesRef: string) {
  return makeXlsx({
    Dados: [
      CAB,
      ...linhas.map((r) => [
        d(mesRef), d(r[0] as string), r[1], r[2], r[3], r[4], r[5], r[6], r[7],
        d(r[8]), d(r[9]), d(r[10]), d(r[11]), r[12], r[13], r[14], r[15],
      ]),
    ],
  })
}
const FOTOS: [string, L[], string][] = [
  ["2026-04", v1, "2026-04-30"],
  ["2026-04", v2, "2026-04-30"],
  ["2026-05", mai, "2026-05-31"],
  ["2026-10", out, "2026-10-31"],
]

describe("Painel: o cartão Área × SLA numa linha própria (critério 1)", () => {
  beforeEach(() => {
    registrarTiposDoApp()
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Element.prototype.scrollIntoView ??= () => {}
  })

  it("os 3 cruzamentos ficam numa linha de 3 e o Área × SLA, sozinho, na linha de baixo", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    for (const [c, linhas, ref] of FOTOS)
      await repo.salvar({
        tipo: "chamados",
        competencia: c,
        arquivo: `ch-${c}.xlsx`,
        workbook: readWorkbook(xlsx(linhas, ref), `ch-${c}.xlsx`),
      })
    const historico = await repo.listar()
    const meta = historico.find((m) => m.competencia === "2026-10" && m.versao === 1)!
    const carga = (await repo.obter(meta.id)) as Carga
    render(
      <PainelChamados
        carga={carga}
        historico={historico}
        obterCarga={(id: string) => repo.obter(id)}
        entrada={false}
      />
    )
    const get = (n: string) =>
      screen.findByRole("region", { name: n }, { timeout: 10_000 })
    const area = await get("Área × SLA")
    expect(screen.getAllByRole("region", { name: "Área × SLA" })).toHaveLength(1)
    const tres = ["Cliente × Situação", "Operador × Atraso", "Cliente × Tempo médio"]
    const cards = await Promise.all(tres.map(get))
    const linha = cards[0].parentElement!
    // os três na mesma linha, e só eles
    cards.forEach((c) => expect(c.parentElement).toBe(linha))
    expect([...linha.children].map((c) => c.getAttribute("aria-label"))).toEqual(tres)
    // o Área × SLA fica sozinho em outra linha, depois dela
    expect(area.parentElement).not.toBe(linha)
    expect(area.parentElement!.children).toHaveLength(1)
    expect(
      linha.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
