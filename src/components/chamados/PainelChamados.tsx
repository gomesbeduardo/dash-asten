import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

import { formatarCompetencia, inferirCompetencia } from "@/cargas"
import {
  avisoColunasSemFiltro,
  calcularMetricas,
  type Distribuicao,
  type EntradaCompetencia,
} from "@/chamados"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao, KpiCartao } from "./cartoes"
import { AvisoFiltroSemColuna, ChipsFiltrosChamados } from "./filtros"
import { BarrasFaixas } from "./graficos"
import { Carregando } from "./Carregando"
import { useMesDeChamados } from "./hooks"
import {
  colunasAusentes,
  filtrarSheet,
  recorteTexto,
  temOutros,
  type SeloTipo,
} from "./logica"
import { CartoesSituacao, GraficoFoto, type BaseAnterior } from "./painel-foto"
import { LegendaSimbolos } from "./selos"

/** Entrada do painel: mais curta que a padrão (são ~25 itens; ~110 ms cada deixaria a tela quase vazia). */
const entradaRapida = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}
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

/** Painel estratégico do mês (D31–D36): KPIs com delta e gráficos. Sem tabela de linhas soltas. */
export function PainelChamados({
  carga,
  historico,
  obterCarga,
  entrada,
  irPara,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  const { sheet, filtros, metricas, leituras, anterior, semColuna } =
    useMesDeChamados(carga, historico, obterCarga)

  const anoPresumido = useMemo(
    () => inferirCompetencia(carga.workbook, carga.arquivo).anoPresumido,
    [carga.workbook, carga.arquivo]
  )
  // mês da carga com o recorte dos filtros: base do cálculo por período dos gráficos
  const entradaAtual = useMemo<EntradaCompetencia | null>(
    () =>
      sheet
        ? {
            sheet: filtrarSheet(sheet, filtros, carga.competencia),
            competencia: carga.competencia,
            colunasSemFiltro: colunasAusentes(sheet, filtros),
          }
        : null,
    [sheet, filtros, carga.competencia]
  )
  // situações do mês anterior (carga própria) para o Δ de cada card; sem base, sem Δ
  const baseAnterior = useMemo<BaseAnterior>(() => {
    if (!anterior || (anterior.entrada.colunasSemFiltro ?? []).length > 0)
      return null
    const m = calcularMetricas(anterior.entrada)
    return m.totalChamados === null
      ? null
      : {
          situacoes: m.situacoes,
          total: m.totalChamados,
          rotulo: formatarCompetencia(anterior.entrada.competencia),
        }
  }, [anterior])
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
        <Carregando texto="Carregando o painel…" forma="painel" />
      </div>
    )

  const play = entradaFixa && !reduce
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
  const rankings: { id: Distribuicao["id"]; sub: string; max?: number }[] = [
    { id: "operador", sub: "por operador" },
    { id: "area", sub: "por área (módulo)", max: 8 },
    { id: "atividade", sub: "por atividade" },
    { id: "areaSuperior", sub: "por área superior" },
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
        variants={entradaRapida}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        {cabecalho}
        <LegendaSimbolos tipos={tiposNaTela} />

        {metricas.totalChamados === null ? (
          <section aria-label="Chamados por situação">{vazio}</section>
        ) : (
          <CartoesSituacao
            total={metricas.totalChamados}
            situacoes={metricas.situacoes}
            anterior={baseAnterior}
            mes={mes}
            entrada={play}
          />
        )}

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
          <div className="grid grid-cols-2 gap-5 3xl:grid-cols-8 md:grid-cols-4">
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
            <GraficoFoto
              dist={cliente}
              entrada={entradaAtual}
              competencia={carga.competencia}
              sub="por cliente"
              animar={play}
              className="xl:col-span-2"
            />
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
            return (
              <GraficoFoto
                key={r.id}
                dist={d}
                entrada={entradaAtual}
                competencia={carga.competencia}
                sub={r.sub}
                max={r.max}
                animar={play}
              />
            )
          })}
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
