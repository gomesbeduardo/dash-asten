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

function xlsx(linhas: L[]) {
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
  ])
  return makeXlsx({ Dados: [CAB, ...rows] })
}

async function cenario(comAgosto: boolean) {
  const repo: RepositorioDeCargas = criarRepositorioMemoria()
  const salvar = (competencia: string, linhas: L[]) =>
    repo.salvar({
      tipo: "chamados",
      competencia,
      arquivo: `ch-${competencia}.xlsx`,
      workbook: readWorkbook(xlsx(linhas), `ch-${competencia}.xlsx`),
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

/** Cargas próprias de vários meses (a última é a atual). Jul e anteriores: só o backlog antigo (4). */
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

/** O símbolo vem antes do texto no DOM (D41). */
const antes = (simbolo: Node, texto: Node) =>
  expect(simbolo.compareDocumentPosition(texto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

describe("PainelChamados", () => {
  it("mostra o cabeçalho, KPIs com delta colorido+ícone e '—' com o detalhe", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    const backlog = await screen.findByRole("article", {
      name: "Backlog aberto",
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

  it("sem carga do mês anterior reconstrói e explica o que exige a carga", async () => {
    render(<PainelChamados {...await cenario(false)} />)
    const sla = await screen.findByRole("article", { name: "% no SLA" })
    expect(sla).toHaveTextContent("— vs ago/26")
    expect(sla).toHaveTextContent("exige a carga daquele mês")
    expect(screen.getAllByText("Reconstruído pelas datas").length).toBeGreaterThan(0)
    expect(screen.getByRole("article", { name: "Backlog aberto" })).toHaveTextContent(
      "vs ago/26"
    )
  })

  it("a definição do indicador aparece no tooltip", async () => {
    const user = userEvent.setup()
    render(<PainelChamados {...await cenario(true)} />)
    await screen.findByRole("article", { name: "Backlog aberto" })
    await user.tab()
    await user.hover(
      screen.getByRole("button", { name: "Definição de Backlog aberto" })
    )
    expect(
      (await screen.findAllByText(/Chamados abertos até o fim do mês/))[0]
    ).toBeInTheDocument()
  })

  it("as leituras não ficam no painel: só um indicador discreto leva à visão Leituras", async () => {
    const user = userEvent.setup()
    const irPara = vi.fn()
    render(<PainelChamados {...await cenario(true)} irPara={irPara} />)
    await screen.findByRole("article", { name: "Backlog aberto" })
    expect(screen.queryByRole("heading", { name: "Leituras do mês" })).toBeNull()
    expect(screen.queryByText(/abertos há mais de 180 dias/)).toBeNull()
    await user.click(screen.getByRole("button", { name: /\d+ leituras? do mês/ }))
    expect(irPara).toHaveBeenCalledWith("leituras")
  })

  it("selos: mês anterior reconstruído, indicador calculado, situação derivada e da exportação", async () => {
    render(<PainelChamados {...await cenario(false)} />)
    const backlog = await screen.findByRole("article", { name: "Backlog aberto" })
    // variação contra mês reconstruído aparece escrita no próprio delta
    expect(backlog).toHaveTextContent(/vs ago\/26 \(reconstruído\)/)
    const indicadores = screen.getByRole("region", { name: "Indicadores" })
    expect(within(indicadores).getAllByText("Reconstruído pelas datas").length).toBeGreaterThan(0)
    const sla = screen.getByRole("article", { name: "% no SLA" })
    // KPI apertado: só o símbolo, na linha do rótulo, e nada de texto do selo no cartão
    expect(within(sla).getByRole("button", { name: "Calculado" })).toBeInTheDocument()
    expect(within(sla).queryByText("Calculado")).toBeNull()
    antes(within(sla).getByRole("button", { name: "Calculado" }), within(sla).getByText(/^%\s*no SLA/))
    expect(
      within(screen.getByRole("region", { name: "Situação na competência" })).getByRole("button", {
        name: "Derivado das datas",
      })
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole("region", { name: "Backlog por situação atual (na exportação)" })
      ).getByRole("button", { name: "Situação na exportação" })
    ).toBeInTheDocument()
    // a legenda visível diz o que cada símbolo da tela significa
    const legenda = screen.getByRole("region", { name: "Legenda dos símbolos" })
    for (const nome of ["Calculado", "Derivado das datas", "Situação na exportação"]) {
      expect(within(legenda).getByText(nome)).toBeInTheDocument()
    }
    expect(within(legenda).queryByText("Agrupado em Outros")).toBeNull()
  })

  it("o tooltip do selo explica como o dado foi obtido", async () => {
    const user = userEvent.setup()
    render(<PainelChamados {...await cenario(false)} />)
    const sla = await screen.findByRole("article", { name: "% no SLA" })
    await user.hover(within(sla).getByRole("button", { name: "Calculado" }))
    expect(
      (await screen.findAllByText(/colunas da data da exportação/))[0]
    ).toBeInTheDocument()
  })

  it("com a carga do mês anterior não há selo de reconstruído nem no delta", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    const backlog = await screen.findByRole("article", { name: "Backlog aberto" })
    expect(backlog).not.toHaveTextContent("(reconstruído)")
    expect(screen.queryByText("Reconstruído pelas datas")).toBeNull()
    // o selo explica a origem também no tooltip
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
    const card = await screen.findByRole("region", { name: "Backlog por cliente" })
    expect(within(card).getByRole("button", { name: "Agrupado em Outros" })).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Backlog por atividade" })).queryByRole("button", {
        name: "Agrupado em Outros",
      })
    ).toBeNull()
    expect(
      within(screen.getByRole("region", { name: "Legenda dos símbolos" })).getByText("Agrupado em Outros")
    ).toBeInTheDocument()
  })

  it("'Situação na competência' soma o total de linhas da planilha (nenhuma excluída)", async () => {
    const user = userEvent.setup()
    render(<PainelChamados {...await cenario(true)} />)
    const card = await screen.findByRole("region", {
      name: "Situação na competência",
    })
    expect(card).toHaveTextContent("11 chamados na planilha, nenhum excluído")
    await user.click(within(card).getByRole("button", { name: /Ver dados/ }))
    const total = within(card).getByRole("row", { name: /Total/ })
    expect(total).toHaveTextContent("11")
    expect(within(card).getByRole("row", { name: /Sem data de abertura/ })).toHaveTextContent("1")
    expect(within(card).getByRole("row", { name: /Aberto após a competência/ })).toHaveTextContent("1")
  })

  it("não mostra tabela de linhas soltas (D36); 'Ver dados' só tem os números do gráfico", async () => {
    render(<PainelChamados {...await cenario(true)} />)
    await screen.findByRole("article", { name: "Backlog aberto" })
    expect(screen.queryByRole("heading", { name: "Dados" })).toBeNull()
    expect(screen.queryByRole("columnheader", { name: "Código" })).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(
      screen.getByText(/Esta situação é a da data da exportação/)
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
    const crit = await screen.findByRole("button", { name: /Crítico.*abertos há mais de 180 dias/s })
    expect(screen.getByRole("button", { name: /Atenção.*concentra/s })).toBeInTheDocument()
    const rolagem = vi.spyOn(Element.prototype, "scrollIntoView")
    await user.click(crit)
    const modal = await screen.findByRole("dialog")
    expect(modal).toHaveTextContent("Regra que disparou")
    expect(modal).toHaveTextContent(/180 dias/)
    expect(within(modal).getByRole("region", { name: "Números que sustentam" })).toHaveTextContent("Abertos há mais de 180 dias")
    expect(within(modal).getByRole("region", { name: "Evidência" })).toHaveTextContent("Envelhecimento do backlog")
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
    expect(within(modal).getByRole("region", { name: "Evidência" })).toHaveTextContent("Backlog por cliente")
    await user.click(within(modal).getByRole("button", { name: /Filtrar por isto/ }))
    expect(await screen.findByRole("list", { name: "Filtros ativos" })).toHaveTextContent("Cliente: Cli A")
    expect(screen.queryByRole("dialog")).toBeNull()
    // as leituras passam a refletir o recorte: só há Cli A no backlog
    expect(await screen.findByText(/Cli A concentra 100%/)).toBeInTheDocument()
  })

  it("leitura que usa a situação da exportação leva o selo", async () => {
    const props = await cenario(true)
    render(<LeiturasChamados {...props} />)
    await screen.findByRole("button", { name: /Crítico/ })
    // gargalo de aceite só aparece se atingir o limite; aqui não: nenhum selo indevido
    expect(screen.queryByRole("button", { name: "Situação na exportação" })).toBeNull()
    expect(screen.queryByRole("region", { name: "Legenda dos símbolos" })).toBeNull()
  })
})

describe("CompararChamados", () => {
  const cabecalhos = () =>
    screen.getAllByRole("columnheader").map((c) => c.textContent?.trim())
  const seletores = () => screen.getAllByRole("combobox", { name: /^Competência \d$/ })

  it("começa com duas competências (anterior e atual), mostra o Δ e não deixa remover", async () => {
    render(<CompararChamados {...await cenarioN(["2026-07", "2026-08", "2026-09"])} />)
    const [um, dois] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    expect(um).toHaveAccessibleName("Competência 1")
    expect(um).toHaveTextContent("Agosto de 2026")
    expect(dois).toHaveTextContent("Setembro de 2026")
    expect(cabecalhos()).toEqual(["Indicador", "ago/26", "set/26", "Δ"])
    const linha = screen.getByRole("row", { name: /Backlog aberto/ })
    expect(linha).toHaveTextContent("+1")
    expect(linha).toHaveTextContent("pior")
    expect(screen.getByRole("button", { name: "Adicionar competência" })).toBeEnabled()
    for (const r of screen.getAllByRole("button", { name: /^Remover competência/ }))
      expect(r).toBeDisabled()
    expect(
      screen.getByRole("heading", { level: 2, name: "Leituras de set/26 contra ago/26" })
    ).toBeInTheDocument()
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
    const linha = screen.getByRole("row", { name: /Backlog aberto/ })
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

  it("com uma só carga oferece meses reconstruídos e marca '—' nos que exigem a carga", async () => {
    render(<CompararChamados {...await cenario(false)} />)
    const user = userEvent.setup()
    const [um] = await screen.findAllByRole("combobox", { name: /^Competência \d$/ })
    await user.click(um)
    // rótulo secundário "reconstruído", sem parênteses colados ao nome do mês
    const opcao = await screen.findByRole("option", { name: /Agosto de 2026/ })
    expect(within(opcao).getByText("reconstruído")).toBeInTheDocument()
    expect(opcao).not.toHaveTextContent("(")
    await user.keyboard("{Escape}")
    const sla = screen.getByRole("row", { name: /% no SLA/ })
    expect(sla).toHaveTextContent("exige a carga daquele mês")
    // mês reconstruído: selo no cabeçalho da coluna e Δ marcado
    const cabA = screen.getByRole("columnheader", { name: /^ago\/26/ })
    const cabB = screen.getByRole("columnheader", { name: /^set\/26/ })
    expect(within(cabA).getByRole("button", { name: "Reconstruído pelas datas" })).toBeInTheDocument()
    expect(within(cabA).queryByText("Reconstruído pelas datas")).toBeNull()
    antes(within(cabA).getByRole("button"), within(cabA).getByText(/^ago\/26/))
    // set é carga própria: sem símbolo, e nenhuma das duas células empilha nada abaixo do rótulo
    expect(within(cabB).queryByRole("button")).toBeNull()
    for (const cab of [cabA, cabB]) expect(cab.querySelector("div, p, span.flex, span.block")).toBeNull()
    expect(screen.getByRole("row", { name: /Backlog aberto/ })).toHaveTextContent("(reconstruído)")
    expect(within(sla).getByRole("button", { name: "Calculado" })).toBeInTheDocument()
    const rotuloSla = within(sla).getByRole("rowheader")
    antes(within(rotuloSla).getByRole("button"), within(rotuloSla).getByText("% no SLA"))
    const legenda = screen.getByRole("region", { name: "Legenda dos símbolos" })
    expect(within(legenda).getByText("Reconstruído pelas datas")).toBeInTheDocument()
    expect(within(legenda).getByText("Calculado")).toBeInTheDocument()
  })
})

describe("EvolucaoChamados", () => {
  it("marca como reconstruídos os meses sem carga e deixa a carga própria sem marca", async () => {
    const user = userEvent.setup()
    render(<EvolucaoChamados {...await cenario(true)} />)
    const card = await screen.findByRole("region", { name: "Backlog aberto" })
    await user.click(within(card).getByRole("button", { name: /Ver dados/ }))
    await waitFor(() =>
      expect(within(card).getByRole("row", { name: /jul\/26/ })).toBeInTheDocument()
    )
    expect(within(card).getByRole("row", { name: /jul\/26 \(reconstruído\)/ })).toBeInTheDocument()
    expect(within(card).getByRole("row", { name: /^ago\/26 / })).toBeInTheDocument() // carga própria
    expect(within(card).getByRole("row", { name: /^set\/26 / })).toBeInTheDocument()
    const legenda = screen.getByRole("region", { name: "Legenda dos símbolos" })
    expect(within(legenda).getByText(/Tracejado e ponto vazado/)).toBeInTheDocument()
    expect(within(legenda).getByText("Reconstruído pelas datas")).toBeInTheDocument()
    const sla = screen.getByRole("region", { name: "% no SLA" })
    await user.click(within(sla).getByRole("button", { name: /Ver dados/ }))
    expect(within(sla).getByRole("row", { name: /jul\/26 \(reconstruído\)/ })).toHaveTextContent("—")
    // indicador que exige a carga do mês e meses reconstruídos levam selo
    expect(within(sla).getByRole("button", { name: "Calculado" })).toBeInTheDocument()
    expect(within(card).getByRole("button", { name: "Reconstruído pelas datas" })).toBeInTheDocument()
    antes(
      within(card).getByRole("button", { name: "Reconstruído pelas datas" }),
      within(card).getByRole("heading", { name: "Backlog aberto" })
    )
    antes(
      within(sla).getByRole("button", { name: "Calculado" }),
      within(sla).getByRole("heading", { name: "% no SLA" })
    )
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
    const backlog = await screen.findByRole("article", { name: "Backlog aberto" })
    expect(within(backlog).getByLabelText("7")).toBeInTheDocument()

    await filtrarPorCliente(user, "Cli B")
    const depois = await screen.findByRole("article", { name: "Backlog aberto" })
    await waitFor(() => expect(within(depois).getByLabelText("2")).toBeInTheDocument())
    expect(
      screen.getByRole("heading", { level: 1, name: "Chamados · setembro de 2026 · Cliente: Cli B" })
    ).toBeInTheDocument()
    const chips = screen.getByRole("list", { name: "Filtros ativos" })
    expect(chips).toHaveTextContent("Cliente: Cli B")
    // a situação na competência passa a mostrar o recorte e o total da planilha
    expect(
      screen.getByRole("region", { name: "Situação na competência" })
    ).toHaveTextContent("de 11 na planilha")

    await user.click(within(chips).getByRole("button", { name: "Remover filtro Cliente" }))
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Backlog aberto" })).getByLabelText("7")
      ).toBeInTheDocument()
    )
    expect(screen.queryByRole("list", { name: "Filtros ativos" })).toBeNull()
  })

  it("o filtro persiste ao trocar de visão e vale na comparação e na evolução", async () => {
    const user = userEvent.setup()
    const props = await cenario(true)
    const { rerender } = render(<Visao props={props} qual="painel" />)
    await screen.findByRole("article", { name: "Backlog aberto" })
    await filtrarPorCliente(user, "Cli B")

    rerender(<Visao props={props} qual="comparar" />)
    const linha = await screen.findByRole("row", { name: /Backlog aberto/ })
    expect(screen.getByRole("list", { name: "Filtros ativos" })).toHaveTextContent("Cliente: Cli B")
    // Ago (Cli B: 2) → Set (Cli B: 2): sem variação
    await waitFor(() => expect(linha).toHaveTextContent(/2\s*2\s*0/))

    rerender(<Visao props={props} qual="evolucao" />)
    const card = await screen.findByRole("region", { name: "Backlog aberto" })
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
    await screen.findByRole("row", { name: /Backlog aberto/ })
    await user.keyboard("f")
    const painel = await screen.findByRole("dialog", { name: "Filtros" })
    await user.click(within(painel).getByRole("combobox", { name: "Autarquia" }))
    await user.click(await screen.findByRole("option", { name: "SPPrev" }))
    await user.keyboard("{Escape}")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Filtros" })).toBeNull()
    )
    const linha = await screen.findByRole("row", { name: /Backlog aberto/ })
    await waitFor(() => expect(linha).toHaveTextContent("—"))
    expect(linha).toHaveTextContent("7")
    expect(
      screen.getByText("Sem a coluna Autarquia nesta carga: filtro não se aplica")
    ).toBeInTheDocument()
    // envelhecimento da carga antiga: "—", nunca 0 (D61)
    const env = screen.getByRole("region", { name: "Envelhecimento do backlog" })
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
    await screen.findByRole("row", { name: /Backlog aberto/ })
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
      name: "Envelhecimento do backlog",
    })
    expect(env).toHaveTextContent("Sem dados com este filtro nesta carga")
    expect(env.querySelector("[role=img]")).toBeNull()
    const sit = screen.getByRole("region", { name: "Situação na competência" })
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
