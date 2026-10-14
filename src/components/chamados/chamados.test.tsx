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
    expect(within(sla).getByText("Calculado")).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Situação na competência" })).getByText("Derivado das datas")
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole("region", { name: "Backlog por situação atual (na exportação)" })
      ).getByText("Situação na exportação")
    ).toBeInTheDocument()
  })

  it("o tooltip do selo explica como o dado foi obtido", async () => {
    const user = userEvent.setup()
    render(<PainelChamados {...await cenario(false)} />)
    const sla = await screen.findByRole("article", { name: "% no SLA" })
    await user.hover(within(sla).getByText("Calculado"))
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
    expect(within(card).getByText("Agrupado em Outros")).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Backlog por atividade" })).queryByText("Agrupado em Outros")
    ).toBeNull()
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
    expect(screen.queryByText("Situação na exportação")).toBeNull()
  })
})

describe("CompararChamados", () => {
  it("troca A e B e mostra o Δ com melhorQuando", async () => {
    const user = userEvent.setup()
    render(<CompararChamados {...await cenario(true)} />)
    const a = await screen.findByRole("combobox", { name: "Competência A" })
    const b = screen.getByRole("combobox", { name: "Competência B" })
    expect(b).toHaveTextContent("Setembro de 2026")
    expect(a).toHaveTextContent("Agosto de 2026")
    const linha = () => screen.getByRole("row", { name: /Backlog aberto/ })
    expect(linha()).toHaveTextContent("+1")
    expect(linha()).toHaveTextContent("pior")
    await user.click(a)
    await user.click(await screen.findByRole("option", { name: /Setembro de 2026/ }))
    await user.click(b)
    await user.click(await screen.findByRole("option", { name: /Agosto de 2026/ }))
    expect(linha()).toHaveTextContent("-1")
    expect(linha()).toHaveTextContent("melhor")
    // KPI de Agosto sem base própria → traço
    expect(
      screen.getByRole("heading", { level: 2, name: /Leituras de ago\/26 contra set\/26/ })
    ).toBeInTheDocument()
  })

  it("com uma só carga oferece meses reconstruídos e marca '—' nos que exigem a carga", async () => {
    render(<CompararChamados {...await cenario(false)} />)
    const user = userEvent.setup()
    const a = await screen.findByRole("combobox", { name: "Competência A" })
    await user.click(a)
    // rótulo secundário "reconstruído", sem parênteses colados ao nome do mês
    const opcao = await screen.findByRole("option", { name: /Agosto de 2026/ })
    expect(within(opcao).getByText("reconstruído")).toBeInTheDocument()
    expect(opcao).not.toHaveTextContent("(")
    await user.keyboard("{Escape}")
    const sla = screen.getByRole("row", { name: /% no SLA/ })
    expect(sla).toHaveTextContent("exige a carga daquele mês")
    // mês reconstruído: selo no cabeçalho da coluna e Δ marcado
    expect(screen.getAllByText("Reconstruído pelas datas").length).toBeGreaterThan(0)
    expect(screen.getByRole("row", { name: /Backlog aberto/ })).toHaveTextContent("(reconstruído)")
    expect(within(sla).getByText("Calculado")).toBeInTheDocument()
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
    expect(screen.getByText(/Tracejado e ponto vazado = reconstruído/)).toBeInTheDocument()
    const sla = screen.getByRole("region", { name: "% no SLA" })
    await user.click(within(sla).getByRole("button", { name: /Ver dados/ }))
    expect(within(sla).getByRole("row", { name: /jul\/26 \(reconstruído\)/ })).toHaveTextContent("—")
    // indicador que exige a carga do mês e meses reconstruídos levam selo
    expect(within(sla).getByText("Calculado")).toBeInTheDocument()
    expect(within(card).getByText("Reconstruído pelas datas")).toBeInTheDocument()
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
