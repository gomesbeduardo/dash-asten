import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo, useRef, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, EqualIcon, PlusIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { formatarCompetencia } from "@/cargas"
import {
  calcularMetricas,
  escolherAba,
  gerarLeituras,
  type EntradaCompetencia,
  type FormatoKpi,
  avisoColunasSemFiltro,
} from "@/chamados"
import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Sheet } from "@/core"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao } from "./cartoes"
import { BarrasComparar } from "./graficos"
import { ListaLeituras } from "./ListaLeituras"
import { ModalKpi } from "./ModalKpi"
import {
  AvisoFiltroSemColuna,
  ChipsFiltrosChamados,
  useFiltrosChamados,
} from "./filtros"
import { LegendaSimbolos } from "./selos"
import { Carregando } from "./Carregando"
import { useCargasDoTipo } from "./hooks"
import {
  agruparSeries,
  compararN,
  proximaParaAdicionar,
  type Sentido,
  temOutros,
  type SeloTipo,
  descreverDelta,
  colunasAusentes,
  filtrarSheet,
  formatarKpi,
  opcoesDeCompetencia,
  type OpcaoCompetencia,
} from "./logica"

const TOM = {
  bom: "text-[#00694b]",
  ruim: "text-late",
  neutro: "text-muted-foreground",
} as const
const MAX_ITENS = 8
const MIN_COMPETENCIAS = 2
const MAX_COMPETENCIAS = 6

export function CompararChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  const cargas = useCargasDoTipo(historico, obterCarga)
  const sheetAtual = useMemo(
    () => escolherAba(carga.workbook),
    [carga.workbook]
  )

  const sheets = useMemo(() => {
    const m = new Map(cargas?.map((c) => [c.meta.competencia, c.sheet]))
    if (sheetAtual) m.set(carga.competencia, sheetAtual)
    return m
  }, [cargas, sheetAtual, carga.competencia])

  const opcoes = useMemo(
    () => (cargas && sheetAtual ? opcoesDeCompetencia(historico) : []),
    [cargas, historico, sheetAtual]
  )

  const cabecalho = (
    <h1 className="text-6xl leading-none text-primary">
      Comparar competências
    </h1>
  )
  if (!sheetAtual)
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <p role="alert" className="text-xl text-destructive">
          Não encontrei uma aba de chamados nesta planilha.
        </p>
      </div>
    )
  if (!cargas)
    return (
      <div className="flex flex-col gap-4">
        {cabecalho}
        <Carregando forma="comparar" />
      </div>
    )
  if (opcoes.length === 0)
    return <div className="flex flex-col gap-4">{cabecalho}</div>

  return (
    <ComparacaoVisao
      cabecalho={cabecalho}
      opcoes={opcoes}
      sheets={sheets}
      sheetAtual={sheetAtual}
      competenciaAtual={carga.competencia}
      play={entradaFixa && !reduce}
    />
  )
}

const ICONE_SENTIDO = {
  alta: ArrowUpIcon,
  queda: ArrowDownIcon,
  igual: EqualIcon,
} as const
const VERBO_SENTIDO = { alta: "subiu", queda: "caiu", igual: "igual" } as const

/** Setinha discreta contra a coluna anterior; o espaço fica reservado para os números alinharem. */
function SetaVs({
  sentido,
  rotuloAnterior,
}: {
  sentido: Sentido | null
  rotuloAnterior: string
}) {
  const Icone = sentido ? ICONE_SENTIDO[sentido] : null
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      {Icone && sentido && (
        <span
          role="img"
          aria-label={`${VERBO_SENTIDO[sentido]} em relação a ${rotuloAnterior}`}
          className="flex"
        >
          <Icone className="size-4" aria-hidden />
        </span>
      )}
    </span>
  )
}

function ComparacaoVisao({
  cabecalho,
  opcoes,
  sheets,
  sheetAtual,
  competenciaAtual,
  play,
}: {
  cabecalho: React.ReactNode
  opcoes: OpcaoCompetencia[]
  sheets: Map<string, Sheet>
  sheetAtual: Sheet
  competenciaAtual: string
  play: boolean
}) {
  const { filtros } = useFiltrosChamados()
  const [escolha, setEscolha] = useState<string[] | null>(null)
  const minimo = Math.min(MIN_COMPETENCIAS, opcoes.length)
  // padrão: a anterior e a atual
  const padrao = useMemo(() => {
    const idxB = Math.max(
      0,
      opcoes.findIndex((o) => o.competencia === competenciaAtual)
    )
    const anterior =
      opcoes[idxB + 1] ?? (idxB === 0 ? undefined : opcoes[idxB - 1])
    return [anterior?.competencia, opcoes[idxB].competencia].filter(
      (c): c is string => !!c
    )
  }, [opcoes, competenciaAtual])
  const validas = (escolha ?? padrao).filter((c) =>
    opcoes.some((o) => o.competencia === c)
  )
  const selecao = validas.length >= minimo ? validas : padrao
  const onTrocar = (indice: number, v: string) =>
    setEscolha(selecao.map((c, i) => (i === indice ? v : c)))
  const onAdicionar = () => {
    const proxima = proximaParaAdicionar(opcoes, selecao)
    if (proxima) setEscolha([...selecao, proxima])
  }
  const onRemover = (indice: number) =>
    setEscolha(selecao.filter((_, i) => i !== indice))
  const podeAdicionar =
    selecao.length < MAX_COMPETENCIAS && selecao.length < opcoes.length

  // colunas em ordem cronológica, independente da ordem dos seletores
  const ordenadas = useMemo(
    () =>
      selecao
        .map((c) => opcoes.find((o) => o.competencia === c)!)
        .sort((x, y) => x.competencia.localeCompare(y.competencia)),
    [selecao, opcoes]
  )
  const entradas = useMemo(
    () =>
      ordenadas.map((o): EntradaCompetencia => {
        const bruta = sheets.get(o.competencia) ?? sheetAtual
        return {
          sheet: filtrarSheet(bruta, filtros, o.competencia),
          competencia: o.competencia,
          colunasSemFiltro: colunasAusentes(bruta, filtros),
        }
      }),
    [ordenadas, sheets, sheetAtual, filtros]
  )
  const avisosFiltro = useMemo(() => {
    const rotulos = [
      ...new Set(entradas.flatMap((e) => e.colunasSemFiltro ?? [])),
    ]
    return rotulos.length ? [avisoColunasSemFiltro(rotulos)] : []
  }, [entradas])
  const metricas = useMemo(
    () => entradas.map((e) => calcularMetricas(e)),
    [entradas]
  )
  const cmp = useMemo(() => compararN(metricas), [metricas])
  const n = ordenadas.length
  const rotulos = ordenadas.map((o) => formatarCompetencia(o.competencia))
  const nomes = rotulos

  // Leituras: a competência mais recente contra a anterior a ela na seleção
  const entradaRecente = entradas[n - 1]
  const entradaAnterior = n >= 2 ? entradas[n - 2] : undefined
  const leituras = useMemo(
    () =>
      entradaAnterior ? gerarLeituras(entradaRecente, entradaAnterior) : [],
    [entradaRecente, entradaAnterior]
  )
  const metricasLeitura = useMemo(
    () => calcularMetricas(entradaRecente, entradaAnterior),
    [entradaRecente, entradaAnterior]
  )

  const selosCmp = (itens: { rotulo: string }[]): SeloTipo[] =>
    temOutros(itens) ? ["outros"] : []
  const fmt = (v: number | null, f: FormatoKpi) => formatarKpi(v, f)
  const [kpiAberto, setKpiAberto] = useState<string | null>(null)
  const ultimoKpi = useRef<string | null>(null)
  const kpiModal = cmp.kpis.find((x) => x.id === kpiAberto)
  const deltaDe = (k: (typeof cmp.kpis)[number]) =>
    descreverDelta(
      { delta: k.delta, formato: k.formato, melhorQuando: k.melhorQuando },
      ""
    )
  const maxItens = n > 3 ? 6 : MAX_ITENS
  const dists = cmp.distribuicoes.filter((d) => d.id !== "operador")
  const series = ordenadas.map((o, i) => ({
    id: o.competencia,
    rotulo: nomes[i],
  }))
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...(dists.some((d) => temOutros(agruparSeries(d.itens, maxItens)))
      ? (["outros"] as const)
      : []),
  ]
  const tabelaSeries = (
    itens: { rotulo: string; valores: (number | null)[] }[]
  ) => ({
    colunas: ["Categoria", ...nomes],
    linhas: itens.map((i) => [i.rotulo, ...i.valores.map((v) => v ?? "—")]),
  })

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-8"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        <header className="flex flex-col gap-4">
          {cabecalho}
          <ChipsFiltrosChamados />
          <AvisoFiltroSemColuna avisos={avisosFiltro} />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            {selecao.map((valor, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`comp-${i + 1}`}
                  className="text-base font-medium"
                >
                  Competência {i + 1}
                </label>
                <div className="flex items-center gap-2">
                  <Select value={valor} onValueChange={(v) => onTrocar(i, v)}>
                    <SelectTrigger id={`comp-${i + 1}`} className="min-w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoes.map((o) => (
                        <SelectItem
                          key={o.competencia}
                          value={o.competencia}
                          disabled={
                            o.competencia !== valor &&
                            selecao.includes(o.competencia)
                          }
                        >
                          {o.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Remover competência ${i + 1}`}
                      disabled={selecao.length <= MIN_COMPETENCIAS}
                      onClick={() => onRemover(i)}
                    >
                      Remover
                    </Button>
                  }
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={!podeAdicionar}
              onClick={onAdicionar}
            >
              <PlusIcon aria-hidden /> Adicionar competência
            </Button>
          </div>
          <p className="text-base text-muted-foreground">
            De {MIN_COMPETENCIAS} a {MAX_COMPETENCIAS} competências, em ordem
            cronológica. Δ = {rotulos[n - 1]} menos {rotulos[0]}; a setinha de
            cada valor compara com a coluna anterior. Só aparecem os meses com
            carga (foto) própria.
          </p>
          <LegendaSimbolos tipos={tiposNaTela} />
        </header>

        <ModalKpi
          aberto={!!kpiModal}
          titulo={kpiModal?.rotulo ?? ""}
          formato={kpiModal?.formato ?? "inteiro"}
          pontos={(kpiModal?.valores ?? []).map((v, i) => ({
            competencia: ordenadas[i].competencia,
            rotulo: rotulos[i],
            valor: v,
            nota:
              v === null
                ? (metricas[i].kpis.find((x) => x.id === kpiModal?.id)
                    ?.detalhe ?? "sem dado")
                : null,
          }))}
          delta={kpiModal ? deltaDe(kpiModal) : null}
          animar={play}
          onFechar={() => setKpiAberto(null)}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            document
              .querySelector<HTMLElement>(
                `[data-kpi-cartao="${ultimoKpi.current}"]`
              )
              ?.focus()
          }}
        />

        <section aria-label="Indicadores lado a lado" className="min-w-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cmp.kpis.map((k) => {
              const d = descreverDelta(
                {
                  delta: k.delta,
                  formato: k.formato,
                  melhorQuando: k.melhorQuando,
                },
                ""
              )
              return (
                <article
                  key={k.id}
                  aria-label={k.rotulo}
                  className="relative flex min-w-0 flex-col gap-4 rounded-lg bg-card p-6 shadow-(--shadow-card) transition-shadow has-[button:hover]:shadow-(--shadow-card-hover)"
                >
                  <button
                    type="button"
                    data-kpi-cartao={k.id}
                    aria-label={`Ver gráfico de ${k.rotulo}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
                    onClick={() => {
                      ultimoKpi.current = k.id
                      setKpiAberto(k.id)
                    }}
                  />
                  <h3 className="flex items-start gap-2 font-sans text-xl leading-tight font-medium text-muted-foreground">
                    <span>{k.rotulo}</span>
                  </h3>
                  <ul className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    {k.valores.map((v, i) => {
                      const ultimo = i === n - 1
                      const nota =
                        v === null
                          ? (metricas[i].kpis.find((x) => x.id === k.id)
                              ?.detalhe ?? "sem dado")
                          : null
                      return (
                        <li
                          key={ordenadas[i].competencia}
                          className={cn(
                            "flex min-w-0 flex-col",
                            ultimo && "order-first basis-full"
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span>{rotulos[i]}</span>
                          </span>
                          <span
                            className={cn(
                              "num flex items-center gap-1.5 font-display text-primary",
                              ultimo
                                ? "text-6xl leading-none font-bold"
                                : "text-3xl leading-none font-semibold opacity-80"
                            )}
                          >
                            <SetaVs
                              sentido={k.setas[i]}
                              rotuloAnterior={rotulos[i - 1] ?? ""}
                            />
                            <span>{fmt(v, k.formato)}</span>
                          </span>
                          {nota && (
                            <span className="max-w-40 font-sans text-sm text-muted-foreground">
                              {nota}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p
                    className={cn(
                      "num mt-auto border-t pt-3 text-xl font-medium",
                      d ? TOM[d.tom] : "text-muted-foreground"
                    )}
                  >
                    <span className="mr-2 text-sm font-normal text-muted-foreground">
                      Δ
                    </span>
                    {d ? (
                      <>
                        {d.texto.replace(/ vs\s*/, " ").trim()}
                        {d.rotuloTom && (
                          <span className="ml-2 text-base font-normal">
                            {d.sentido === "alta" ? "↑" : "↓"} {d.rotuloTom}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </article>
              )
            })}
          </div>
          <div className="sr-only">
            <table className="w-full text-left text-xl">
              <caption className="sr-only">
                Indicadores de {rotulos.join(", ")}
              </caption>
              <thead>
                <tr className="border-b-2 border-primary/30 text-primary">
                  <th scope="col" className="px-3 py-3 font-display">
                    Indicador
                  </th>
                  {ordenadas.map((o, i) => (
                    <th
                      key={o.competencia}
                      scope="col"
                      className="px-3 py-3 text-right font-display"
                    >
                      <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                        <span>{rotulos[i]}</span>
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-right font-display">
                    Δ
                  </th>
                </tr>
              </thead>
              <tbody>
                {cmp.kpis.map((k) => {
                  const d = descreverDelta(
                    {
                      delta: k.delta,
                      formato: k.formato,
                      melhorQuando: k.melhorQuando,
                    },
                    ""
                  )
                  return (
                    <tr key={k.id} className="border-b bg-card">
                      <th scope="row" className="px-3 py-3 font-medium">
                        {k.rotulo}
                      </th>
                      {k.valores.map((v, i) => {
                        const nota =
                          v === null
                            ? (metricas[i].kpis.find((x) => x.id === k.id)
                                ?.detalhe ?? "sem dado")
                            : null
                        return (
                          <td
                            key={ordenadas[i].competencia}
                            className="num px-3 py-3 text-right font-display font-semibold whitespace-nowrap text-primary"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <SetaVs
                                sentido={k.setas[i]}
                                rotuloAnterior={rotulos[i - 1] ?? ""}
                              />
                              <span>{fmt(v, k.formato)}</span>
                            </div>
                            {nota && (
                              <span className="block font-sans text-sm font-normal whitespace-normal text-muted-foreground">
                                {nota}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td
                        className={cn(
                          "num px-3 py-3 text-right font-medium whitespace-nowrap",
                          d ? TOM[d.tom] : "text-muted-foreground"
                        )}
                      >
                        {d ? (
                          <>
                            {d.texto.replace(/ vs\s*/, " ").trim()}
                            {d.rotuloTom && (
                              <span className="ml-2 text-base font-normal">
                                {d.sentido === "alta" ? "↑" : "↓"} {d.rotuloTom}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {n >= 2 && (
          <section aria-labelledby="leituras-b" className="flex flex-col gap-3">
            <h2 id="leituras-b" className="text-3xl text-primary">
              Leituras de {rotulos[n - 1]} contra {rotulos[n - 2]}
            </h2>
            {leituras.length > 0 ? (
              <ListaLeituras leituras={leituras} metricas={metricasLeitura} />
            ) : (
              <p className="text-lg text-muted-foreground">
                Nenhuma leitura automática para {rotulos[n - 1]}.
              </p>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <GraficoCartao
            id="cmp-atrasoFaixas"
            titulo="Em atraso por meses desde a abertura"
            subtitulo={nomes.join(" · ")}
            tabela={tabelaSeries(cmp.atrasoFaixas)}
            selos={selosCmp(cmp.atrasoFaixas)}
          >
            <BarrasComparar
              itens={cmp.atrasoFaixas}
              series={series}
              animar={play}
            />
          </GraficoCartao>
          {dists.map((d) => {
            const itens = agruparSeries(d.itens, maxItens)
            return (
              <GraficoCartao
                key={d.id}
                id={`cmp-${d.id}`}
                titulo={`Não finalizados ${d.titulo.toLowerCase()}`}
                subtitulo={nomes.join(" · ")}
                tabela={tabelaSeries(d.itens)}
                selos={selosCmp(itens)}
              >
                <BarrasComparar itens={itens} series={series} animar={play} />
              </GraficoCartao>
            )
          })}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
