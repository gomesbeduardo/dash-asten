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
import { BarrasFaixas, BarrasRanking, COR } from "./graficos"
import { Carregando } from "./Carregando"
import { useMesDeChamados } from "./hooks"
import { limitarItens, recorteTexto, temOutros, type SeloTipo } from "./logica"
import { LegendaSimbolos, Selo } from "./selos"

const DESTAQUES = ["backlog", "sla", "atraso", "saidas"]
const inteiro = new Intl.NumberFormat("pt-BR")
const n = (v: number) => inteiro.format(v)

const COR_SITUACAO: Record<string, string> = {
  "Aberto no fim do mês": COR.principal,
  "Resolvido no mês": COR.verde,
  "Resolvido antes do mês": COR.cinza,
  "Aberto após a competência": COR.roxo,
  "Sem data de abertura": COR.laranja,
}

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
  const anteriorPropria = anterior?.propria ?? false
  const destaques = DESTAQUES.map((id) =>
    metricas.kpis.find((k) => k.id === id)
  ).filter((k) => !!k)
  const demais = metricas.kpis.filter((k) => !DESTAQUES.includes(k.id))
  const dist = (id: Distribuicao["id"]) =>
    metricas.distribuicoes.find((d) => d.id === id)
  const totalLinhas = metricas.porSituacaoNaCompetencia.reduce(
    (s, i) => s + i.valor,
    0
  )
  const mes = formatarCompetencia(carga.competencia, "longo")
  const semDados = semColuna.length > 0
  const vazio = (
    <p className="py-10 text-center text-lg text-muted-foreground">
      Sem dados com este filtro nesta carga
    </p>
  )
  const selosDe = (itens: { rotulo: string }[], ...mais: SeloTipo[]) => [
    ...mais,
    ...(temOutros(itens) ? (["outros"] as const) : []),
  ]

  const rankings: {
    id: Distribuicao["id"]
    sub: string
    max?: number
    exportacao?: boolean
  }[] = [
    { id: "atividade", sub: "chamados abertos no fim do mês, por atividade" },
    {
      id: "areaSuperior",
      sub: "chamados abertos no fim do mês, por área superior",
    },
    {
      id: "area",
      sub: "chamados abertos no fim do mês, por área (módulo)",
      max: 8,
    },
    {
      id: "operador",
      sub: "carga de trabalho: chamados abertos no fim do mês, por responsável atual",
      exportacao: true,
    },
  ]
  const itensDe = (r: (typeof rankings)[number]) => {
    const d = dist(r.id)
    return d && r.max ? limitarItens(d.itens, r.max) : d?.itens
  }
  const cliente = dist("cliente")
  const situacaoAtual = dist("situacao")
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...(metricas.kpis.some((k) => !k.reconstruivel)
      ? (["calculado"] as const)
      : []),
    "derivado",
    ...(situacaoAtual ? (["exportacao"] as const) : []),
    ...(rankings.some((r) => dist(r.id) && r.exportacao)
      ? (["exportacao"] as const)
      : []),
    ...([
      cliente?.itens,
      ...rankings.map(itensDe),
    ].some((itens) => itens && temOutros(itens))
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
              {anteriorPropria ? (
                " (carga própria)"
              ) : (
                <Selo tipo="reconstruido" />
              )}
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
                anteriorPropria={anteriorPropria}
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
                anteriorPropria={anteriorPropria}
                entrada={play}
                extra={
                  k.id === "aguardandoAceite" &&
                  k.valor !== null &&
                  metricas.baseAguardandoAceite
                    ? `de ${n(metricas.baseAguardandoAceite)} (backlog + resolvidos sem aceite)`
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
              titulo="Backlog por cliente"
              subtitulo={`maiores clientes no backlog · ${mes}`}
              tabela={tabelaDe(cliente.itens)}
              selos={selosDe(cliente.itens)}
              className="xl:col-span-2"
            >
              <BarrasRanking itens={cliente.itens} animar={play} />
            </GraficoCartao>
          )}
          <GraficoCartao
            id="envelhecimento"
            titulo="Envelhecimento do backlog"
            subtitulo="dias desde a abertura até o fim do mês"
            tabela={tabelaDe(metricas.envelhecimento)}
          >
            {semDados ? (
              vazio
            ) : (
              <BarrasFaixas itens={metricas.envelhecimento} animar={play} />
            )}
          </GraficoCartao>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {rankings.map((r) => {
            const d = dist(r.id)
            const itens = itensDe(r)
            return d && itens ? (
              <GraficoCartao
                key={r.id}
                id={r.id}
                titulo={d.titulo}
                subtitulo={r.sub}
                tabela={tabelaDe(d.itens)}
                selos={selosDe(
                  itens,
                  ...(r.exportacao ? (["exportacao"] as const) : [])
                )}
              >
                <BarrasRanking itens={itens} animar={play} />
              </GraficoCartao>
            ) : null
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <GraficoCartao
            id="situacaoCompetencia"
            titulo="Situação na competência"
            subtitulo={
              semDados
                ? "sem dados com este filtro nesta carga"
                : totalLinhas === sheet.rows.length
                  ? `${n(totalLinhas)} chamados na planilha, nenhum excluído`
                  : `${n(totalLinhas)} chamados no recorte, de ${n(sheet.rows.length)} na planilha; nenhum excluído`
            }
            nota="Todas as linhas da planilha aparecem aqui, classificadas pelas datas. Os abertos após a competência pertencem ao mês seguinte e ficam só como referência."
            tabela={tabelaDe(metricas.porSituacaoNaCompetencia, true)}
            selos={["derivado"]}
            className="xl:col-span-2"
          >
            {semDados ? (
              vazio
            ) : (
              <BarrasRanking
                itens={metricas.porSituacaoNaCompetencia}
                corDoItem={(i) => COR_SITUACAO[i.rotulo] ?? COR.principal}
                animar={play}
              />
            )}
          </GraficoCartao>
          {situacaoAtual && (
            <GraficoCartao
              id="situacao"
              titulo="Backlog por situação atual (na exportação)"
              subtitulo="chamados do backlog, por situação"
              nota="Esta situação é a da data da exportação da planilha, não a do fim do mês."
              tabela={tabelaDe(situacaoAtual.itens)}
              selos={selosDe(situacaoAtual.itens, "exportacao")}
            >
              <BarrasRanking itens={situacaoAtual.itens} animar={play} />
            </GraficoCartao>
          )}
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
