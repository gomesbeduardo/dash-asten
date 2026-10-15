import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

import { formatarCompetencia, inferirCompetencia } from "@/cargas"
import { avisoColunasSemFiltro, type Distribuicao } from "@/chamados"
import { entryContainer } from "@/components/app/motion/variants"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao, KpiCartao } from "./cartoes"
import { AvisoFiltroSemColuna, ChipsFiltrosChamados } from "./filtros"
import { BarrasComparar, BarrasFaixas, BarrasRanking } from "./graficos"
import { Carregando } from "./Carregando"
import { useMesDeChamados } from "./hooks"
import { agruparSeries, recorteTexto, temOutros, type SeloTipo } from "./logica"
import { LegendaSimbolos } from "./selos"

const DESTAQUES = ["naoFinalizados", "sla", "atraso", "finalizados"]
const inteiro = new Intl.NumberFormat("pt-BR")
const n = (v: number) => inteiro.format(v)

const tabelaDe = (
  itens: { rotulo: string; valor: number }[],
  total = false
) => ({
  colunas: ["Categoria", "Chamados"],
  linhas: [
    ...itens.map((i) => [i.rotulo, n(i.valor)]),
    ...(total ? [["Total", n(itens.reduce((s, i) => s + i.valor, 0))]] : []),
  ],
})

const SERIES_FOTO = [
  { id: "finalizados", rotulo: "Finalizados no mês" },
  { id: "naoFinalizados", rotulo: "Não finalizados" },
]
const tabelaFoto = (itens: Distribuicao["itens"]) => ({
  colunas: ["Categoria", "Finalizados no mês", "Não finalizados"],
  linhas: itens.map((i) => [i.rotulo, n(i.finalizados), n(i.naoFinalizados)]),
})
/** Itens com as duas séries da D64 (finalizados no mês × não finalizados), no formato do gráfico agrupado. */
const itensFoto = (itens: Distribuicao["itens"], max?: number) => {
  const base = itens.map((i) => ({
    rotulo: i.rotulo,
    valores: [i.finalizados, i.naoFinalizados] as (number | null)[],
  }))
  return max ? agruparSeries(base, max) : base
}

/** Painel estratégico do mês (D31–D36): KPIs com delta e gráficos. Sem tabela de linhas soltas. */
export function PainelChamados({
  carga,
  historico,
  obterCarga,
  entrada,
  irPara,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const { sheet, filtros, metricas, leituras, anterior, semColuna } =
    useMesDeChamados(carga, historico, obterCarga)

  const anoPresumido = useMemo(
    () => inferirCompetencia(carga.workbook, carga.arquivo).anoPresumido,
    [carga.workbook, carga.arquivo]
  )
  const recorte = recorteTexto(filtros)
  const titulo = `Chamados · ${formatarCompetencia(carga.competencia, "longo")}${recorte ? ` · ${recorte}` : ""}`
  const cabecalho = (
    <header className="flex flex-col gap-1">
      <h1 className="text-6xl leading-none text-primary">{titulo}</h1>
      <p className="text-lg text-muted-foreground">
        {carga.versao > 1 && `versão ${carga.versao} · `}carga de{" "}
        {new Date(carga.importadaEm).toLocaleDateString("pt-BR")} ·{" "}
        {carga.arquivo}
        {anoPresumido && " · ano não consta na planilha"}
      </p>
      <ChipsFiltrosChamados />
      <AvisoFiltroSemColuna
        avisos={semColuna.length ? [avisoColunasSemFiltro(semColuna)] : []}
      />
    </header>
  )

  if (!sheet)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei, nesta planilha, uma aba de chamados com as colunas de
          abertura e situação.
        </p>
      </div>
    )
  if (!metricas || anterior === undefined)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <Carregando texto="Carregando o painel…" />
      </div>
    )

  const play = entrada && !reduce
  // o aviso de filtro sem coluna já aparece junto dos chips
  const avisosRodape = metricas.avisos.filter(
    (a) => !a.startsWith("Sem a coluna") && !a.startsWith("Sem as colunas")
  )
  const rotuloAnterior = anterior
    ? formatarCompetencia(anterior.entrada.competencia)
    : "mês anterior"
  const destaques = DESTAQUES.map((id) =>
    metricas.kpis.find((k) => k.id === id)
  ).filter((k) => !!k)
  const demais = metricas.kpis.filter((k) => !DESTAQUES.includes(k.id))
  const naoFinalizados =
    metricas.kpis.find((k) => k.id === "naoFinalizados")?.valor ?? null
  const dist = (id: Distribuicao["id"]) =>
    metricas.distribuicoes.find((d) => d.id === id)
  const mes = formatarCompetencia(carga.competencia, "longo")
  const semDados = semColuna.length > 0
  const vazio = (
    <p className="py-10 text-center text-lg text-muted-foreground">
      Sem dados com este filtro nesta carga
    </p>
  )
  const selosDe = (itens: { rotulo: string }[]): SeloTipo[] =>
    temOutros(itens) ? ["outros"] : []

  const rankings: {
    id: Distribuicao["id"]
    sub: string
    max?: number
  }[] = [
    { id: "atividade", sub: "finalizados no mês × não finalizados, por atividade" },
    {
      id: "areaSuperior",
      sub: "finalizados no mês × não finalizados, por área superior",
    },
    {
      id: "area",
      sub: "finalizados no mês × não finalizados, por área (módulo)",
      max: 8,
    },
    {
      id: "operador",
      sub: "finalizados no mês × não finalizados, por operador",
    },
  ]
  const cliente = dist("cliente")
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...([cliente, ...rankings.map((r) => dist(r.id))].some(
      (d) => d && temOutros(d.itens)
    )
      ? (["outros"] as const)
      : []),
  ]

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-8"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        animate="show"
      >
        {cabecalho}
        <LegendaSimbolos tipos={tiposNaTela} />

        <section aria-label="Indicadores" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
              Variação contra {rotuloAnterior}
              {anterior ? " (carga própria)" : ": sem carga do mês anterior"}
            </p>
            {irPara && (
              <button
                type="button"
                onClick={() => irPara("leituras")}
                className="flex items-center gap-1.5 text-base font-medium text-primary underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {leituras.length === 1
                  ? "1 leitura do mês"
                  : `${leituras.length} leituras do mês`}
                <ArrowRightIcon className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            {destaques.map((k) => (
              <KpiCartao
                key={k.id}
                kpi={k}
                destaque
                rotuloAnterior={rotuloAnterior}
                entrada={play}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {demais.map((k) => (
              <KpiCartao
                key={k.id}
                kpi={k}
                rotuloAnterior={rotuloAnterior}
                entrada={play}
                extra={
                  k.id === "aguardandoAceite" &&
                  k.valor !== null &&
                  naoFinalizados
                    ? `de ${n(naoFinalizados)} não finalizados`
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {cliente && (
            <GraficoCartao
              id="cliente"
              titulo="Por cliente"
              subtitulo={`finalizados no mês × não finalizados · ${mes}`}
              tabela={tabelaFoto(cliente.itens)}
              selos={selosDe(cliente.itens)}
              className="xl:col-span-2"
            >
              <BarrasComparar
                itens={itensFoto(cliente.itens)}
                series={SERIES_FOTO}
                animar={play}
              />
            </GraficoCartao>
          )}
          <GraficoCartao
            id="atrasoFaixas"
            titulo="Em atraso por meses desde a abertura"
            subtitulo="não finalizados abertos antes do mês do Mes Ref."
            tabela={tabelaDe(metricas.atrasoFaixas)}
          >
            {semDados ? (
              vazio
            ) : (
              <BarrasFaixas itens={metricas.atrasoFaixas} animar={play} />
            )}
          </GraficoCartao>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {rankings.map((r) => {
            const d = dist(r.id)
            if (!d) return null
            const itens = itensFoto(d.itens, r.max)
            return (
              <GraficoCartao
                key={r.id}
                id={r.id}
                titulo={d.titulo}
                subtitulo={r.sub}
                tabela={tabelaFoto(d.itens)}
                selos={selosDe(itens)}
              >
                <BarrasComparar itens={itens} series={SERIES_FOTO} animar={play} />
              </GraficoCartao>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <GraficoCartao
            id="situacoes"
            titulo="Chamados por situação"
            subtitulo={
              semDados
                ? "sem dados com este filtro nesta carga"
                : `${n(metricas.totalChamados ?? 0)} chamados na foto de ${mes}`
            }
            nota="Cada situação aparece como vem na planilha. Os chamados abertos depois do Mes Ref. ficam só na nota abaixo, fora destes números."
            tabela={tabelaDe(metricas.situacoes, true)}
            className="xl:col-span-2"
          >
            {semDados ? (
              vazio
            ) : (
              <BarrasRanking itens={metricas.situacoes} animar={play} />
            )}
          </GraficoCartao>
        </div>

        {avisosRodape.length > 0 && (
          <footer
            aria-label="Avisos"
            className="text-base text-muted-foreground"
          >
            <ul className="flex flex-col gap-1">
              {avisosRodape.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </footer>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
