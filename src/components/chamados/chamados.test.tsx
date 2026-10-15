import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { readWorkbook } from "@/core"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { makeXlsx } from "@/test/makeWorkbook"
import type { VisaoTipoProps } from "@/panels/tipos"
import { CompararChamados } from "./CompararChamados"
import { EvolucaoChamados } from "./EvolucaoChamados"
import { LeiturasChamados } from "./LeiturasChamados"
import { PainelChamados } from "./PainelChamados"
import { FiltrosChamadosProvider } from "./filtros"

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const CAB = [
  "Data Abertura",
  "Código",
  "Cliente",
  "Área Superior",
  "Atividade",
  "Situação",
  "SLA Previsto",
  "SLA Renegociado",
  "Data de Solução",
  "Data de Aceite",
  "Qtd Reabertura",
]
// [abertura, cliente, situacao, slaPrevisto, solucao]
type L = [string | null, string, string, string | null, string | null]
const base: L[] = [
  ["2026-01-10", "Cli A", "Em Análise", null, null],
  ["2026-01-11", "Cli A", "Em Análise", null, null],
  ["2026-01-12", "Cli A", "Em Análise", null, null],
  ["2026-01-13", "Cli A", "Em Análise", null, null],
  ["2026-08-05", "Cli A", "Em Análise", "2026-08-20", null],
  ["2026-08-10", "Cli B", "Finalizado", "2026-09-01", "2026-09-12"],
  ["2026-08-11", "Cli B", "Aguardando aceite", "2026-09-25", null],
  ["2026-09-03", "Cli B", "Em Análise", "2026-09-30", null],
  ["2026-09-05", "Cli C", "Finalizado", "2026-09-30", "2026-09-20"],
  ["2026-10-02", "Cli C", "Em Análise", null, null],
  [null, "Cli C", "Em Análise", null, null],
]
const aug: L[] = [
  ...base.slice(0, 4),
  ["2026-08-10", "Cli B", "Em Análise", "2026-09-01", null],
  ["2026-08-11", "Cli B", "Em Análise", "2026-09-25", null],
]

function xlsx(linhas: L[], comOperador = false) {
  const rows = linhas.map(([ab, cli, sit, sla, sol], i) => [
    ab ? d(ab) : null,
    i + 1,
    cli,
    "Área 1",
    i % 2 ? "Suporte" : "Projeto",
    sit,
    sla ? d(sla) : null,
    null,
    sol ? d(sol) : null,
    null,
    0,
    ...(comOperador ? [i % 2 ? "Bia" : "Ana"] : []),
  ])
  return makeXlsx({
    Dados: [comOperador ? [...CAB, "Operador"] : CAB, ...rows],
  })
}

async function cenario(comAgosto: boolean, comOperador = false) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  const salvar = (competencia: string, linhas: L[]) =>
    repo.salvar({
      tipo: "chamados",
      competencia,
      arquivo: `ch-${competencia}.xlsx`,
      workbook: readWorkbook(xlsx(linhas, comOperador), `ch-${competencia}.xlsx`),
    })
  if (comAgosto) await salvar("2026-08", aug)
  const meta = await salvar("2026-09", base)
  const carga = (await repo.obter(meta.id)) as Carga
  const props: VisaoTipoProps = {
    carga,
    historico: await repo.listar(),
    obterCarga: (id) => repo.obter(id),
    entrada: false,
  }
  return props
}

/** Cargas próprias de vários meses (a última é a atual). Jul e anteriores: só os 4 chamados antigos, ainda não finalizados. */
async function cenarioN(competencias: string[]) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  const dados = (c: string): L[] =>
    c === "2026-09" ? base : c === "2026-08" ? aug : base.slice(0, 4)
  let ultima = ""
  for (const c of competencias) {
    const m = await repo.salvar({
      tipo: "chamados",
      competencia: c,
      arquivo: `ch-${c}.xlsx`,
      workbook: readWorkbook(xlsx(dados(c)), `ch-${c}.xlsx`),
    })
    ultima = m.id
  }
  const carga = (await repo.obter(ultima)) as Carga
  const props: VisaoTipoProps = {
    carga,
    historico: await repo.listar(),
    obterCarga: (id) => repo.obter(id),
    entrada: false,
  }
  return props
}

beforeEach(() => {
  registrarTiposDoApp()
  // Radix (tooltip) mede o conteúdo com ResizeObserver, que o jsdom não tem.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

describe("PainelChamados", () => {
  it("mostra o cabeçalho, KPIs com delta colorido+ícone e '—' com o detalhe", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    const backlog = await screen.findByRole("article", {
      name: "Não finalizados",
    })
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Chamados · setembro de 2026",
      })
    ).toBeInTheDocument()
    expect(within(backlog).getByLabelText("7")).toBeInTheDocument()
    expect(backlog).toHaveTextContent("+1 vs ago/26")
    expect(backlog).toHaveTextContent("pior") // cor nunca sozinha
    const sla = screen.getByRole("article", { name: "% no SLA" })
    expect(within(sla).getByLabelText("50,0%")).toBeInTheDocument()
  })

  it("mostra os KPIs Tempo até o aceite e SLA renegociado", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    await screen.findByRole("article", { name: "Não finalizados" })
    expect(
      screen.getByRole("article", { name: "Tempo até o aceite" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("article", { name: "SLA renegociado" })
    ).toBeInTheDocument()
  })

  it("sem carga do mês anterior não há Δ e nada é reconstruído", async () => {
    render(<PainelChamados {...await cenario(false)} />)
    const sla = await screen.findByRole("article", { name: "% no SLA" })
    expect(sla).toHaveTextContent("— vs mês anterior")
    expect(sla).toHaveTextContent("sem base no mês anterior")
    const nao = screen.getByRole("article", { name: "Não finalizados" })
    expect(within(nao).getByLabelText("7")).toBeInTheDocument()
    expect(nao).toHaveTextContent("— vs mês anterior")
    expect(screen.getByText(/sem carga do mês anterior/)).toBeInTheDocument()
    expect(screen.queryByText(/reconstru/i)).toBeNull()
  })

  it("a definição do indicador aparece no tooltip", async () => {
    const user = userEvent.setup()
    render(<PainelChamados {...await cenario(true)} />)
    await screen.findByRole("article", { name: "Não finalizados" })
    await user.tab()
    await user.hover(
      screen.getByRole("button", { name: "Definição de Não finalizados" })
    )
    expect(
      (await screen.findAllByText(/Situação diferente de Finalizado/))[0]
    ).toBeInTheDocument()
  })

  it("as leituras não ficam no painel: só um indicador discreto leva à visão Leituras", async () => {
    const user = userEvent.setup()
    const irPara = vi.fn()
    render(<PainelChamados {...await cenario(true)} irPara={irPara} />)
    await screen.findByRole("article", { name: "Não finalizados" })
    expect(screen.queryByRole("heading", { name: "Leituras do mês" })).toBeNull()
    expect(screen.queryByText(/em atraso há 7 meses/)).toBeNull()
    await user.click(screen.getByRole("button", { name: /\d+ leituras? do mês/ }))
    expect(irPara).toHaveBeenCalledWith("leituras")
  })

  it("não há selos de reconstrução, cálculo, derivação nem de exportação (D63/D64)", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    const nao = await screen.findByRole("article", { name: "Não finalizados" })
    expect(nao).not.toHaveTextContent("(reconstruído)")
    for (const nome of [
      "Reconstruído pelas datas",
      "Calculado",
      "Derivado das datas",
      "Situação na exportação",
    ]) {
      expect(screen.queryByRole("button", { name: nome })).toBeNull()
      expect(screen.queryByText(nome)).toBeNull()
    }
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
  })

  it("'Agrupado em Outros' marca o gráfico cujo total virou Outros", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const linhas = Array.from({ length: 12 }, (_, i) => [
      d("2026-09-02"), i + 1, `Cliente ${i + 1}`, "Área 1", "Suporte", "Em Análise", null, null, null, null, 0,
    ])
    const meta = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-09",
      arquivo: "x.xlsx",
      workbook: readWorkbook(makeXlsx({ Dados: [CAB, ...linhas] }), "x.xlsx"),
    })
    const carga = (await repo.obter(meta.id)) as Carga
    render(
      <PainelChamados
        carga={carga}
        historico={await repo.listar()}
        obterCarga={(id) => repo.obter(id)}
        entrada={false}
      />
    )
    const card = await screen.findByRole("region", { name: "Por cliente" })
    expect(within(card).getByRole("button", { name: "Agrupado em Outros" })).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Por atividade" })).queryByRole("button", {
        name: "Agrupado em Outros",
      })
    ).toBeNull()
    expect(
      within(screen.getByRole("region", { name: "Legenda dos símbolos" })).getByText("Agrupado em Outros")
    ).toBeInTheDocument()
  })

  it("mostra não finalizados por operador e por área (8 maiores + Outros), com as duas séries", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const cab = [...CAB, "Área", "Operador"]
    const linhas = Array.from({ length: 12 }, (_, i) => [
      d("2026-09-02"), i + 1, "Cliente 1", "Área 1", "Suporte", "Em Análise", null, null, null, null, 0,
      `Módulo ${i + 1}`, i < 6 ? "Ana" : "Bia",
    ])
    const meta = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-09",
      arquivo: "x.xlsx",
      workbook: readWorkbook(makeXlsx({ Dados: [cab, ...linhas] }), "x.xlsx"),
    })
    const carga = (await repo.obter(meta.id)) as Carga
    render(
      <PainelChamados
        carga={carga}
        historico={await repo.listar()}
        obterCarga={(id) => repo.obter(id)}
        entrada={false}
      />
    )
    const area = await screen.findByRole("region", { name: "Por área" })
    expect(within(area).getByRole("button", { name: "Agrupado em Outros" })).toBeInTheDocument()
    expect(within(area).getByRole("img").getAttribute("aria-label")).toMatch(
      /Finalizados no mês contra Não finalizados:.*Outros 0, 4/
    )
    expect(within(area).getByRole("img").getAttribute("aria-label")).not.toMatch(/Módulo 9/)
    const op = screen.getByRole("region", { name: "Por operador" })
    expect(op).toHaveTextContent(/finalizados no mês × não finalizados, por operador/)
    expect(within(op).queryByRole("button", { name: "Agrupado em Outros" })).toBeNull()
  })

  it("aviso sutil no cabeçalho quando o ano não consta na planilha da carga", async () => {
    const semData: L[] = [[null, "Cli A", "Em Análise", null, null]]
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const salvar = async (arquivo: string) => {
      const meta = await repo.salvar({
        tipo: "chamados",
        competencia: "2025-09",
        arquivo,
        workbook: readWorkbook(xlsx(semData), arquivo),
      })
      return (await repo.obter(meta.id)) as Carga
    }
    const props = async (carga: Carga) => ({
      carga,
      historico: await repo.listar(),
      obterCarga: (id: string) => repo.obter(id),
      entrada: false,
    })
    const { unmount } = render(<PainelChamados {...await props(await salvar("setembro.xlsx"))} />)
    expect(await screen.findByText(/ano não consta na planilha/)).toBeInTheDocument()
    unmount()
    render(<PainelChamados {...await props(await salvar("setembro-2025.xlsx"))} />)
    await screen.findByText(/setembro-2025\.xlsx/)
    expect(screen.queryByText(/ano não consta na planilha/)).toBeNull()
  })

  it("os cards por situação mostram cada situação como vem e o total da foto; os abertos depois ficam em notas", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    const topo = await screen.findByRole("region", {
      name: "Chamados por situação",
    })
    const valor = (nome: string) =>
      within(within(topo).getByRole("article", { name: nome }))
    expect(valor("Total de chamados").getByLabelText("9")).toBeInTheDocument()
    expect(valor("Situação: Em Análise").getByLabelText("6")).toBeInTheDocument()
    expect(valor("Situação: Aguardando aceite").getByLabelText("1")).toBeInTheDocument()
    expect(valor("Situação: Finalizado").getByLabelText("2")).toBeInTheDocument()
    // nenhuma linha é excluída: as duas que ficam de fora dos números viram notas
    const avisos = screen.getByRole("contentinfo", { name: "Avisos" })
    expect(avisos).toHaveTextContent("1 aberto depois do Mes Ref.")
    expect(avisos).toHaveTextContent("1 chamado(s) sem Data de Abertura")
  })

  it("não mostra tabela de linhas soltas (D36); 'Ver dados' só tem os números do gráfico", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    await screen.findByRole("article", { name: "Não finalizados" })
    expect(screen.queryByRole("heading", { name: "Dados" })).toBeNull()
    expect(screen.queryByRole("columnheader", { name: "Código" })).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(
      screen.getByText(/Cada situação aparece como vem na planilha/)
    ).toBeInTheDocument()
  })
})

describe("LeiturasChamados", () => {
  it("lista os cartões por severidade; o clique abre o detalhe num modal, sem rolar nem navegar", async () => {
    const user = userEvent.setup()
    render(
      <FiltrosChamadosProvider carga={(await cenario(true)).carga}>
        <LeiturasChamados {...await cenario(true)} />
      </FiltrosChamadosProvider>
    )
    const crit = await screen.findByRole("button", { name: /Crítico.*em atraso há 7 meses/s })
    expect(screen.getByRole("button", { name: /Atenção.*concentra/s })).toBeInTheDocument()
    const rolagem = vi.spyOn(Element.prototype, "scrollIntoView")
    await user.click(crit)
    const modal = await screen.findByRole("dialog")
    expect(modal).toHaveTextContent("Regra que disparou")
    expect(modal).toHaveTextContent(/7 meses/)
    expect(within(modal).getByRole("region", { name: "Números que sustentam" })).toHaveTextContent("Abertos há 7 meses ou mais")
    expect(within(modal).getByRole("region", { name: "Evidência" })).toHaveTextContent("Em atraso por meses desde a abertura")
    expect(rolagem).not.toHaveBeenCalled()
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await user.click(crit)
    await user.click(await screen.findByRole("button", { name: "Fechar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("'Filtrar por isto' no modal aplica o filtro e a leitura passa a refletir o recorte", async () => {
    const user = userEvent.setup()
    const props = await cenario(true)
    render(
      <FiltrosChamadosProvider carga={props.carga}>
        <LeiturasChamados {...props} />
      </FiltrosChamadosProvider>
    )
    await user.click(await screen.findByRole("button", { name: /Atenção.*concentra/s }))
    const modal = await screen.findByRole("dialog")
    expect(within(modal).getByRole("region", { name: "Evidência" })).toHaveTextContent("Não finalizados por cliente")
    await user.click(within(modal).getByRole("button", { name: /Filtrar por isto/ }))
    expect(await screen.findByRole("list", { name: "Filtros ativos" })).toHaveTextContent("Cliente: Cli A")
    expect(screen.queryByRole("dialog")).toBeNull()
    // as leituras passam a refletir o recorte: só há Cli A entre os não finalizados
    expect(await screen.findByText(/Cli A concentra 100%/)).toBeInTheDocument()
  })

  it("nenhuma leitura leva selo de origem (a Situação é a da foto)", async () => {
    const props = await cenario(true)
    render(<LeiturasChamados {...props} />)
    await screen.findByRole("button", { name: /Crítico/ })
    expect(screen.queryByRole("button", { name: "Situação na exportação" })).toBeNull()
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
  })
})

describe("CompararChamados", () => {
  const cabecalhos = () =>
    screen.getAllByRole("columnheader").map((c) => c.textContent?.trim())
  const seletores = () => screen.getAllByRole("combobox", { name: /^Competência \d$/ })

  it("compara os não finalizados por área, mas não por operador (responsável da foto)", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const cab = [...CAB, "Área", "Operador"]
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) => [
        d("2026-06-02"), i + 1, "Cliente 1", "Área 1", "Suporte", "Em Análise", null, null, null, null, 0,
        `Módulo ${i + 1}`, "Ana",
      ])
    let ultima = ""
    for (const [c, n] of [["2026-08", 2], ["2026-09", 3]] as const) {
      const m = await repo.salvar({
        tipo: "chamados",
        competencia: c,
        arquivo: `ch-${c}.xlsx`,
        workbook: readWorkbook(makeXlsx({ Dados: [cab, ...mk(n)] }), `ch-${c}.xlsx`),
      })
      ultima = m.id
    }
    render(
      <CompararChamados
        carga={(await repo.obter(ultima)) as Carga}
        historico={await repo.listar()}
        obterCarga={(id) => repo.obter(id)}
        entrada={false}
      />
    )
    expect(await screen.findByRole("region", { name: "Não finalizados por área" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: /por operador/ })).toBeNull()
  })

  it("começa com duas competências (anterior e atual), mostra o Δ e não deixa remover", async () => {
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    const [um, dois] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    expect(um).toHaveAccessibleName("Competência 1")
    expect(um).toHaveTextContent("Agosto de 2026")
    expect(dois).toHaveTextContent("Setembro de 2026")
    expect(cabecalhos()).toEqual(["Indicador", "ago/26", "set/26", "Δ"])
    const linha = screen.getByRole("row", { name: /Não finalizados/ })
    expect(linha).toHaveTextContent("+1")
    expect(linha).toHaveTextContent("pior")
    expect(screen.getByRole("button", { name: "Adicionar competência" })).toBeEnabled()
    for (const r of screen.getAllByRole("button", { name: /^Remover competência/ }))
      expect(r).toBeDisabled()
    expect(
      screen.getByRole("heading", { level: 2, name: "Leituras de set/26 contra ago/26" })
    ).toBeInTheDocument()
  })

  it("mostra um card por indicador com os valores de cada competência e o Δ com o tom", async () => {
    const user = userEvent.setup()
    render(
      <CompararChamados
        {...await cenarioN(["2026-07", "2026-08", "2026-09"])}
      />
    )
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(
      screen.getByRole("button", { name: "Adicionar competência" })
    )
    const secao = screen.getByRole("region", {
      name: "Indicadores lado a lado",
    })
    const cards = within(secao).getAllByRole("article")
    expect(cards).toHaveLength(12)
    const backlog = within(secao).getByRole("article", {
      name: /Não finalizados/,
    })
    for (const r of ["jul/26", "ago/26", "set/26"])
      expect(within(backlog).getByText(r)).toBeInTheDocument()
    expect(backlog).toHaveTextContent(/jul\/26\s*4.*ago\/26\s*6.*set\/26\s*7/s)
    expect(within(backlog).getByText(/\+3/)).toBeInTheDocument()
    expect(within(backlog).getByText(/pior/)).toBeInTheDocument()
  })

  it("adiciona a próxima mais antiga, em ordem cronológica, com Δ = última − primeira e setas vs anterior", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(screen.getByRole("button", { name: "Adicionar competência" }))
    const tres = seletores()
    expect(tres).toHaveLength(3)
    expect(tres[2]).toHaveTextContent("Julho de 2026")
    // colunas cronológicas, independente da ordem dos seletores
    expect(cabecalhos()).toEqual(["Indicador", "jul/26", "ago/26", "set/26", "Δ"])
    const linha = screen.getByRole("row", { name: /Não finalizados/ })
    expect(linha).toHaveTextContent(/4\s*6\s*7\s*\+3/) // Δ = set (7) − jul (4)
    const celulas = within(linha).getAllByRole("cell")
    expect(within(celulas[0]).queryByRole("img")).toBeNull() // primeira coluna sem seta
    expect(within(celulas[1]).getByRole("img", { name: "subiu em relação a jul/26" })).toBeInTheDocument()
    expect(within(celulas[2]).getByRole("img", { name: "subiu em relação a ago/26" })).toBeInTheDocument()
    // leituras: a mais recente contra a anterior a ela na seleção
    expect(
      screen.getByRole("heading", { level: 2, name: "Leituras de set/26 contra ago/26" })
    ).toBeInTheDocument()
  })

  it("respeita os limites de 2 e 6 e remove pelo seletor extra", async () => {
    const user = userEvent.setup()
    render(
      <CompararChamados
        {...await cenarioN(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"])}
      />
    )
    await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    const adicionar = screen.getByRole("button", { name: "Adicionar competência" })
    for (let k = 0; k < 4; k++) await user.click(adicionar)
    expect(seletores()).toHaveLength(6)
    expect(adicionar).toBeDisabled()
    expect(cabecalhos()).toEqual(["Indicador", "abr/26", "mai/26", "jun/26", "jul/26", "ago/26", "set/26", "Δ"])
    await user.click(screen.getByRole("button", { name: "Remover competência 6" }))
    expect(seletores()).toHaveLength(5)
    expect(adicionar).toBeEnabled()
    while (seletores().length > 2)
      await user.click(screen.getAllByRole("button", { name: /^Remover competência/ }).at(-1)!)
    for (const r of screen.getAllByRole("button", { name: /^Remover competência/ }))
      expect(r).toBeDisabled()
  })

  it("não deixa escolher a mesma competência duas vezes", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    const [um] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(um)
    expect(await screen.findByRole("option", { name: /Setembro de 2026/ })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("option", { name: /Julho de 2026/ })).not.toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("option", { name: /Julho de 2026/ }))
    expect(cabecalhos()).toEqual(["Indicador", "jul/26", "set/26", "Δ"])
  })

  it("as colunas seguem a ordem cronológica mesmo com o seletor fora de ordem", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    const [um] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(um)
    await user.click(await screen.findByRole("option", { name: /Julho de 2026/ }))
    await user.click(screen.getByRole("button", { name: "Adicionar competência" }))
    // seletores: jul, set, ago (a sugerida é a mais recente livre)
    expect(seletores().map((x) => x.textContent)).toEqual([
      expect.stringContaining("Julho"),
      expect.stringContaining("Setembro"),
      expect.stringContaining("Agosto"),
    ])
    expect(cabecalhos()).toEqual(["Indicador", "jul/26", "ago/26", "set/26", "Δ"])
  })

  it("leitura do Comparar abre o mesmo modal de detalhe e o Esc devolve o foco ao cartão", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenario(true)} />)
    const cartao = await screen.findByRole("button", { name: /Atenção.*concentra/s })
    await user.click(cartao)
    const modal = await screen.findByRole("dialog")
    expect(within(modal).getByRole("region", { name: "Regra que disparou" })).toBeInTheDocument()
    expect(within(modal).getByRole("region", { name: "Números que sustentam" })).toBeInTheDocument()
    expect(within(modal).getByRole("region", { name: "Evidência" })).toBeInTheDocument()
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(cartao).toHaveFocus())
  })

  it("clicar no cartão do indicador abre o modal com os valores por competência e o Esc devolve o foco", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    const cartao = await screen.findByRole("button", { name: /Ver gráfico de Não finalizados/ })
    await user.click(cartao)
    const modal = await screen.findByRole("dialog", { name: "Não finalizados" })
    const lista = within(modal).getByRole("list", { name: "Valores por competência" })
    const itens = within(lista).getAllByRole("listitem")
    expect(itens).toHaveLength(2)
    // do mais recente (destaque, "atual") para o mais antigo
    expect(itens[0]).toHaveTextContent("set/26")
    expect(itens[0]).toHaveTextContent("atual")
    expect(itens[0]).toHaveAttribute("aria-current", "true")
    expect(itens[0]).toHaveTextContent("7")
    expect(itens[1]).toHaveTextContent("ago/26")
    expect(itens[1]).toHaveTextContent("6")
    expect(itens[1]).not.toHaveAttribute("aria-current")
    expect(within(modal).getByText(/\+1/)).toBeInTheDocument()
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(cartao).toHaveFocus())
  })

  it("com uma só carga só oferece a própria competência: mês sem foto não é reconstruído", async () => {
    render(<CompararChamados {...await cenario(false)} />)
    const user = userEvent.setup()
    const [um] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(um)
    expect(await screen.findAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option", { name: /Setembro de 2026/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Agosto de 2026/ })).toBeNull()
    await user.keyboard("{Escape}")
    expect(screen.queryByText(/reconstru/i)).toBeNull()
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
    expect(cabecalhos()).toEqual(["Indicador", "set/26", "Δ"])
  })
})

describe("EvolucaoChamados", () => {
  it("um ponto por foto: mês sem carga não é reconstruído nem ganha marca", async () => {
    const user = userEvent.setup()
    render(<EvolucaoChamados {...await cenario(true)} />)
    const card = await screen.findByRole("region", { name: "Não finalizados" })
    await user.click(within(card).getByRole("button", { name: /Ver dados/ }))
    await waitFor(() =>
      expect(within(card).getByRole("row", { name: /^ago\/26 / })).toBeInTheDocument()
    )
    expect(within(card).getByRole("row", { name: /^set\/26 / })).toBeInTheDocument()
    expect(within(card).queryByRole("row", { name: /jul\/26/ })).toBeNull()
    expect(screen.queryByText(/reconstru/i)).toBeNull()
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
    const sla = screen.getByRole("region", { name: "% no SLA" })
    await user.click(within(sla).getByRole("button", { name: /Ver dados/ }))
    expect(within(sla).getByRole("row", { name: /^ago\/26 / })).toHaveTextContent("—") // agosto não tem finalizados com SLA
    expect(within(sla).queryByRole("button", { name: "Calculado" })).toBeNull()
  })
})

describe("EvolucaoChamados por dimensão", () => {
  it("mostra não finalizados por operador e por cliente, com toggles e sem selos de reconstrução", async () => {
    const user = userEvent.setup()
    render(<EvolucaoChamados {...await cenario(false, true)} />)
    const op = await screen.findByRole("region", { name: "Não finalizados por operador" })
    expect(within(op).getByRole("button", { name: "Ana" })).toHaveAttribute("aria-pressed", "true")
    expect(within(op).getByRole("button", { name: "Bia" })).toBeInTheDocument()
    expect(within(op).queryByRole("button", { name: "Situação na exportação" })).toBeNull()
    expect(within(op).queryByRole("button", { name: "Reconstruído pelas datas" })).toBeNull()
    await user.click(within(op).getByRole("button", { name: "Ana" }))
    expect(within(op).getByRole("button", { name: "Ana" })).toHaveAttribute("aria-pressed", "false")
    await user.click(within(op).getByRole("button", { name: /Ver dados/ }))
    expect(within(op).getByRole("row", { name: /^set\/26 / })).toBeInTheDocument()
    expect(within(op).queryByRole("row", { name: /reconstruído/ })).toBeNull()
    const cli = screen.getByRole("region", { name: "Não finalizados por cliente" })
    expect(cli).toHaveTextContent("5 maiores clientes nos não finalizados de set/26")
    expect(within(cli).getByRole("button", { name: "Cli A" })).toBeInTheDocument()
  })

  it("some quando nenhuma carga da janela tem a coluna", async () => {
    render(<EvolucaoChamados {...await cenario(true)} />)
    await screen.findByRole("region", { name: "Não finalizados" })
    expect(screen.queryByRole("region", { name: "Não finalizados por operador" })).toBeNull()
    expect(screen.getByRole("region", { name: "Não finalizados por cliente" })).toBeInTheDocument()
  })
})

describe("filtros de Chamados", () => {
  const Visao = ({
    props,
    qual,
  }: {
    props: VisaoTipoProps
    qual: "painel" | "comparar" | "evolucao"
  }) => (
    <FiltrosChamadosProvider carga={props.carga}>
      {qual === "painel" ? (
        <PainelChamados {...props} />
      ) : qual === "comparar" ? (
        <CompararChamados {...props} />
      ) : (
        <EvolucaoChamados {...props} />
      )}
    </FiltrosChamadosProvider>
  )

  async function filtrarPorCliente(user: ReturnType<typeof userEvent.setup>, valor: string) {
    await user.keyboard("f")
    const painel = await screen.findByRole("dialog", { name: "Filtros" })
    await user.click(within(painel).getByRole("combobox", { name: "Cliente" }))
    await user.click(await screen.findByRole("option", { name: valor }))
    await user.keyboard("{Escape}")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Filtros" })).toBeNull()
    )
  }

  it("filtrar por cliente recorta KPIs, título e mostra chips removíveis", async () => {
    const user = userEvent.setup()
    render(<Visao props={await cenario(true)} qual="painel" />)
    const backlog = await screen.findByRole("article", { name: "Não finalizados" })
    expect(within(backlog).getByLabelText("7")).toBeInTheDocument()

    await filtrarPorCliente(user, "Cli B")
    const depois = await screen.findByRole("article", { name: "Não finalizados" })
    await waitFor(() => expect(within(depois).getByLabelText("2")).toBeInTheDocument())
    expect(
      screen.getByRole("heading", { level: 1, name: "Chamados · setembro de 2026 · Cliente: Cli B" })
    ).toBeInTheDocument()
    const chips = screen.getByRole("list", { name: "Filtros ativos" })
    expect(chips).toHaveTextContent("Cliente: Cli B")
    // os cards por situação passam a mostrar só o recorte
    const topo = screen.getByRole("region", { name: "Chamados por situação" })
    expect(
      within(within(topo).getByRole("article", { name: "Total de chamados" })).getByLabelText("3")
    ).toBeInTheDocument()
    expect(topo).toHaveTextContent("na foto de setembro de 2026")

    await user.click(within(chips).getByRole("button", { name: "Remover filtro Cliente" }))
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Não finalizados" })).getByLabelText("7")
      ).toBeInTheDocument()
    )
    expect(screen.queryByRole("list", { name: "Filtros ativos" })).toBeNull()
  })

  it("o filtro persiste ao trocar de visão e vale na comparação e na evolução", async () => {
    const user = userEvent.setup()
    const props = await cenario(true)
    const { rerender } = render(<Visao props={props} qual="painel" />)
    await screen.findByRole("article", { name: "Não finalizados" })
    await filtrarPorCliente(user, "Cli B")

    rerender(<Visao props={props} qual="comparar" />)
    const linha = await screen.findByRole("row", { name: /Não finalizados/ })
    expect(screen.getByRole("list", { name: "Filtros ativos" })).toHaveTextContent("Cliente: Cli B")
    // Ago (Cli B: 2) → Set (Cli B: 2): sem variação
    await waitFor(() => expect(linha).toHaveTextContent(/2\s*2\s*0/))

    rerender(<Visao props={props} qual="evolucao" />)
    const card = await screen.findByRole("region", { name: "Não finalizados" })
    expect(screen.getByRole("list", { name: "Filtros ativos" })).toBeInTheDocument()
    await user.click(within(card).getByRole("button", { name: /Ver dados/ }))
    expect(within(card).getByRole("row", { name: /^set\/26 / })).toHaveTextContent("2")
  })

  it("filtro de Autarquia: a carga antiga (sem a coluna) mostra '—' e aviso, não zero", async () => {
    const user = userEvent.setup()
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const comAutarquia = (linhas: L[]) =>
      makeXlsx({
        Dados: [
          [...CAB, "Autarquia"],
          ...linhas.map(([ab, cli, sit, sla, sol], i) => [
            ab ? d(ab) : null,
            i + 1,
            cli,
            "Área 1",
            "Suporte",
            sit,
            sla ? d(sla) : null,
            null,
            sol ? d(sol) : null,
            null,
            0,
            "SPPrev",
          ]),
        ],
      })
    await repo.salvar({
      tipo: "chamados",
      competencia: "2026-08",
      arquivo: "ago.xlsx",
      workbook: readWorkbook(xlsx(aug), "ago.xlsx"),
    })
    const meta = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-09",
      arquivo: "set.xlsx",
      workbook: readWorkbook(comAutarquia(base), "set.xlsx"),
    })
    const props: VisaoTipoProps = {
      carga: (await repo.obter(meta.id)) as Carga,
      historico: await repo.listar(),
      obterCarga: (id) => repo.obter(id),
      entrada: false,
    }
    render(<Visao props={props} qual="comparar" />)
    await screen.findByRole("row", { name: /Não finalizados/ })
    await user.keyboard("f")
    const painel = await screen.findByRole("dialog", { name: "Filtros" })
    await user.click(within(painel).getByRole("combobox", { name: "Autarquia" }))
    await user.click(await screen.findByRole("option", { name: "SPPrev" }))
    await user.keyboard("{Escape}")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Filtros" })).toBeNull()
    )
    const linha = await screen.findByRole("row", { name: /Não finalizados/ })
    await waitFor(() => expect(linha).toHaveTextContent("—"))
    expect(linha).toHaveTextContent("7")
    expect(
      screen.getByText("Sem a coluna Autarquia nesta carga: filtro não se aplica")
    ).toBeInTheDocument()
    // atraso por faixa da carga antiga: "—", nunca 0 (D61)
    const env = screen.getByRole("region", { name: "Em atraso por meses desde a abertura" })
    await user.click(within(env).getByRole("button", { name: /Ver dados/ }))
    const linhas = within(env).getAllByRole("row").slice(1)
    expect(linhas.length).toBeGreaterThan(0)
    for (const l of linhas) {
      const cel = within(l).getAllByRole("cell")
      expect(cel[0]).toHaveTextContent("—")
    }
  })

  it("filtro de Autarquia numa carga sem a coluna: painel não mostra barras com 0 nem '0 chamados'", async () => {
    const user = userEvent.setup()
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const comAutarquia = makeXlsx({
      Dados: [
        [...CAB, "Autarquia"],
        ...base.map(([ab, cli, sit, sla, sol], i) => [
          ab ? d(ab) : null,
          i + 1,
          cli,
          "Área 1",
          "Suporte",
          sit,
          sla ? d(sla) : null,
          null,
          sol ? d(sol) : null,
          null,
          0,
          "SPPrev",
        ]),
      ],
    })
    const antiga = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-08",
      arquivo: "ago.xlsx",
      workbook: readWorkbook(xlsx(aug), "ago.xlsx"),
    })
    const nova = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-09",
      arquivo: "set.xlsx",
      workbook: readWorkbook(comAutarquia, "set.xlsx"),
    })
    const mk = async (m: typeof nova): Promise<VisaoTipoProps> => ({
      carga: (await repo.obter(m.id)) as Carga,
      historico: await repo.listar(),
      obterCarga: (id) => repo.obter(id),
      entrada: false,
    })
    const { rerender } = render(<Visao props={await mk(nova)} qual="comparar" />)
    await screen.findByRole("row", { name: /Não finalizados/ })
    await user.keyboard("f")
    const dlg = await screen.findByRole("dialog", { name: "Filtros" })
    await user.click(within(dlg).getByRole("combobox", { name: "Autarquia" }))
    await user.click(await screen.findByRole("option", { name: "SPPrev" }))
    await user.keyboard("{Escape}")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Filtros" })).toBeNull()
    )
    rerender(<Visao props={await mk(antiga)} qual="painel" />)
    const env = await screen.findByRole("region", {
      name: "Em atraso por meses desde a abertura",
    })
    expect(env).toHaveTextContent("Sem dados com este filtro nesta carga")
    expect(env.querySelector("[role=img]")).toBeNull()
    const sit = screen.getByRole("region", { name: "Chamados por situação" })
    expect(sit).toHaveTextContent("Sem dados com este filtro nesta carga")
    expect(sit.querySelector("[role=img]")).toBeNull()
    expect(sit).not.toHaveTextContent(/0 chamados/)
  })
})

describe("estado de carregamento", () => {
  // Carga que nunca chega: a visão tem de mostrar que está carregando, nunca a área vazia.
  const pendente = async () => {
    const props = await cenario(true)
    return { ...props, obterCarga: () => new Promise<Carga | null>(() => {}) }
  }

  it.each([
    ["Comparar", CompararChamados, "Comparar competências"],
    ["Evolução", EvolucaoChamados, "Evolução"],
  ])("%s mostra título e 'Carregando competências…' com aria-busy", async (_n, Visao, titulo) => {
    const props = await pendente()
    render(
      <FiltrosChamadosProvider carga={props.carga}>
        <Visao {...props} />
      </FiltrosChamadosProvider>
    )
    expect(screen.getByRole("heading", { level: 1, name: titulo })).toBeInTheDocument()
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Carregando competências…")
    expect(status).toHaveAttribute("aria-busy", "true")
  })

  it.each([
    ["Painel", PainelChamados],
    ["Leituras", LeiturasChamados],
  ])("%s mostra o carregando enquanto o mês anterior não chega", async (_n, Visao) => {
    const props = await pendente()
    render(
      <FiltrosChamadosProvider carga={props.carga}>
        <Visao {...props} />
      </FiltrosChamadosProvider>
    )
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent(/Carregando/)
  })
})

describe("entrada com dados que chegam depois do 1º render", () => {
  it("Evolução mantém a entrada ligada mesmo que o prop vire false antes dos dados", async () => {
    const props = await cenario(true)
    let liberar!: () => void
    const porta = new Promise<void>((r) => (liberar = r))
    const obterCarga = async (id: string) => {
      await porta
      return props.obterCarga(id)
    }
    const arvore = (entrada: boolean) => (
      <FiltrosChamadosProvider carga={props.carga}>
        <EvolucaoChamados {...props} obterCarga={obterCarga} entrada={entrada} />
      </FiltrosChamadosProvider>
    )
    const { container, rerender } = render(arvore(true))
    expect(screen.getByRole("status")).toBeInTheDocument()
    rerender(arvore(false))
    liberar()
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
    expect(container.querySelector("[data-entrada]")).not.toBeNull()
  })
})
