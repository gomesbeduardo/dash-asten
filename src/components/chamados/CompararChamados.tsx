import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { formatarCompetencia } from "@/cargas"
import {
  compararCompetencias,
  escolherAba,
  gerarLeituras,
  type EntradaCompetencia,
  type FormatoKpi,
} from "@/chamados"
import { entryContainer } from "@/components/app/motion/variants"
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
import { GraficoCartao, LeituraCartao } from "./cartoes"
import { BarrasAxB } from "./graficos"
import { ChipsFiltrosChamados, useFiltrosChamados } from "./filtros"
import { LegendaSimbolos, SeloSimbolo } from "./selos"
import { Carregando } from "./Carregando"
import { useCargasDoTipo } from "./hooks"
import {
  agruparAxB,
  selosDaLeitura,
  temOutros,
  type SeloTipo,
  descreverDelta,
  filtrarSheet,
  formatarKpi,
  opcoesDeCompetencia,
  primeiraCompetencia,
  type OpcaoCompetencia,
} from "./logica"

// O rótulo da opção traz "(reconstruído)"; no seletor ele vira um rótulo secundário.
const SUFIXO_RECONSTRUIDO = / \(reconstruído\)$/
const TOM = {
  bom: "text-[#00694b]",
  ruim: "text-late",
  neutro: "text-muted-foreground",
} as const
const MAX_ITENS = 8

export function CompararChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const reduce = useReducedMotion()
  const cargas = useCargasDoTipo(historico, obterCarga)
  const sheetAtual = useMemo(() => escolherAba(carga.workbook), [carga.workbook])

  const sheets = useMemo(() => {
    const m = new Map(cargas?.map((c) => [c.meta.competencia, c.sheet]))
    if (sheetAtual) m.set(carga.competencia, sheetAtual)
    return m
  }, [cargas, sheetAtual, carga.competencia])

  const opcoes = useMemo(() => {
    if (!cargas || !sheetAtual) return []
    const maisAntiga = cargas[0]?.meta.competencia
    const base = (maisAntiga && sheets.get(maisAntiga)) || sheetAtual
    return opcoesDeCompetencia(historico, primeiraCompetencia(base))
  }, [cargas, historico, sheetAtual, sheets])

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
        <Carregando />
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
      play={entrada && !reduce}
    />
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
  const [escolha, setEscolha] = useState<{ a?: string; b?: string }>({})
  const idxB = Math.max(
    0,
    opcoes.findIndex((o) => o.competencia === (escolha.b ?? competenciaAtual))
  )
  const opB = opcoes[idxB]
  const padraoA = opcoes[idxB + 1] ?? opcoes[idxB === 0 ? 0 : idxB - 1]
  const opA =
    opcoes.find((o) => o.competencia === escolha.a) ?? padraoA ?? opcoes[0]
  const a = opA.competencia
  const b = opB.competencia
  const onA = (v: string) => setEscolha((e) => ({ ...e, a: v }))
  const onB = (v: string) => setEscolha((e) => ({ ...e, b: v }))
  const entradaDe = (o: OpcaoCompetencia): EntradaCompetencia => ({
    sheet: filtrarSheet(
      o.propria
        ? (sheets.get(o.competencia) ?? sheetAtual)
        : ((o.deCarga ? sheets.get(o.deCarga) : undefined) ?? sheetAtual),
      filtros,
      o.competencia
    ),
    competencia: o.competencia,
    cargaPropria: o.propria,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ea = useMemo(() => entradaDe(opA), [opA, sheets, sheetAtual, filtros])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eb = useMemo(() => entradaDe(opB), [opB, sheets, sheetAtual, filtros])
  const rotA = formatarCompetencia(a)
  const rotB = formatarCompetencia(b)
  const algumReconstruido = !opA.propria || !opB.propria
  const nomeA = opA.propria ? rotA : `${rotA} (reconstruído)`
  const nomeB = opB.propria ? rotB : `${rotB} (reconstruído)`
  const selosCmp = (itens: { rotulo: string }[]): SeloTipo[] => [
    ...(algumReconstruido ? (["reconstruido"] as const) : []),
    ...(temOutros(itens) ? (["outros"] as const) : []),
  ]
  const cmp = useMemo(() => compararCompetencias(ea, eb), [ea, eb])
  const leituras = useMemo(() => gerarLeituras(eb, ea), [ea, eb])
  const detalhe = (lado: "a" | "b", id: string) =>
    cmp[lado].kpis.find((k) => k.id === id)?.detalhe
  const fmt = (v: number | null, f: FormatoKpi) => formatarKpi(v, f)
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...(algumReconstruido ? (["reconstruido"] as const) : []),
    ...(cmp.b.kpis.some((k) => k.reconstruivel === false) ? (["calculado"] as const) : []),
    ...leituras.flatMap((l) => selosDaLeitura(l, opA.propria)),
    ...(cmp.distribuicoes.some((d) => d.id !== "situacao" && temOutros(agruparAxB(d.itens, MAX_ITENS)))
      ? (["outros"] as const)
      : []),
  ]

  const dists = cmp.distribuicoes.filter((d) => d.id !== "situacao")
  const envel = cmp.b.envelhecimento.map((i, k) => ({
    rotulo: i.rotulo,
    a: cmp.a.envelhecimento[k]?.valor ?? 0,
    b: i.valor,
  }))
  const tabelaAxB = (itens: { rotulo: string; a: number; b: number }[]) => ({
    colunas: ["Categoria", nomeA, nomeB],
    linhas: itens.map((i) => [i.rotulo, i.a, i.b]),
  })

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-8"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        animate="show"
      >
        <header className="flex flex-col gap-4">
          {cabecalho}
          <ChipsFiltrosChamados />
          <div className="flex flex-wrap items-end gap-6">
            {(
              [
                ["comp-a", "Competência A", a, onA],
                ["comp-b", "Competência B", b, onB],
              ] as const
            ).map(([id, rotulo, valor, onChange]) => (
              <div key={id} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-base font-medium">
                  {rotulo}
                </label>
                <Select value={valor} onValueChange={onChange}>
                  <SelectTrigger id={id} className="min-w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoes.map((o) => (
                      <SelectItem key={o.competencia} value={o.competencia}>
                        {o.rotulo.replace(SUFIXO_RECONSTRUIDO, "")}
                        {!o.propria && (
                          <span className="text-sm font-normal text-muted-foreground">
                            reconstruído
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="pb-2 text-base text-muted-foreground">
              Δ = {rotB} menos {rotA}. Meses “reconstruído” vêm das datas da
              planilha mais recente.
            </p>
          </div>
          <LegendaSimbolos tipos={tiposNaTela} />
        </header>

        <section aria-label="Indicadores lado a lado">
          <table className="w-full text-left text-xl">
            <caption className="sr-only">
              Indicadores de {rotA} e {rotB}
            </caption>
            <thead>
              <tr className="border-b-2 border-primary/30 text-primary">
                <th scope="col" className="px-4 py-3 font-display">
                  Indicador
                </th>
                <th scope="col" className="px-4 py-3 text-right font-display">
                  <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                    {!opA.propria && <SeloSimbolo tipo="reconstruido" />}
                    <span>A · {rotA}</span>
                  </span>
                </th>
                <th scope="col" className="px-4 py-3 text-right font-display">
                  <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                    {!opB.propria && <SeloSimbolo tipo="reconstruido" />}
                    <span>B · {rotB}</span>
                  </span>
                </th>
                <th scope="col" className="px-4 py-3 text-right font-display">
                  Δ
                </th>
              </tr>
            </thead>
            <tbody>
              {cmp.kpis.map((k) => {
                const d = descreverDelta(
                  { delta: k.delta, formato: k.formato, melhorQuando: k.melhorQuando },
                  "",
                  algumReconstruido
                )
                const nota = (v: number | null, lado: "a" | "b") =>
                  v === null
                    ? (detalhe(lado, k.id) ?? "sem dado")
                    : null
                return (
                  <tr key={k.id} className="border-b bg-card">
                    <th scope="row" className="px-4 py-3 font-medium">
                      {/* regra (a): o texto de todas as linhas começa na mesma coluna; o espaço do símbolo é reservado onde ele não aparece */}
                      <span className="flex items-start gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center">
                          {cmp.b.kpis.find((x) => x.id === k.id)?.reconstruivel === false && (
                            <SeloSimbolo tipo="calculado" />
                          )}
                        </span>
                        <span>{k.rotulo}</span>
                      </span>
                    </th>
                    {([["a", k.a], ["b", k.b]] as const).map(([lado, v]) => (
                      <td key={lado} className="num px-4 py-3 text-right font-display font-semibold text-primary">
                        {fmt(v, k.formato)}
                        {nota(v, lado) && (
                          <span className="block font-sans text-sm font-normal text-muted-foreground">
                            {nota(v, lado)}
                          </span>
                        )}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "num px-4 py-3 text-right font-medium",
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
        </section>

        <section aria-labelledby="leituras-b" className="flex flex-col gap-3">
          <h2 id="leituras-b" className="text-3xl text-primary">
            Leituras de {rotB} contra {rotA}
          </h2>
          {leituras.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {leituras.map((l) => (
                <LeituraCartao
                  key={l.id}
                  leitura={l}
                  selos={selosDaLeitura(l, opA.propria)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-lg text-muted-foreground">
              Nenhuma leitura automática para {rotB}.
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <GraficoCartao
            id="cmp-envelhecimento"
            titulo="Envelhecimento do backlog"
            subtitulo={`${nomeA} contra ${nomeB}`}
            tabela={tabelaAxB(envel)}
            selos={selosCmp(envel)}
          >
            <BarrasAxB
              itens={envel}
              rotuloA={nomeA}
              rotuloB={nomeB}
              reconstruidoA={!opA.propria}
              reconstruidoB={!opB.propria}
              animar={play}
            />
          </GraficoCartao>
          {dists.map((d) => {
            const itens = agruparAxB(d.itens, MAX_ITENS)
            return (
              <GraficoCartao
                key={d.id}
                id={`cmp-${d.id}`}
                titulo={d.titulo}
                subtitulo={`${nomeA} contra ${nomeB}`}
                tabela={tabelaAxB(d.itens)}
                selos={selosCmp(itens)}
              >
                <BarrasAxB
                  itens={itens}
                  rotuloA={nomeA}
                  rotuloB={nomeB}
                  reconstruidoA={!opA.propria}
                  reconstruidoB={!opB.propria}
                  animar={play}
                />
              </GraficoCartao>
            )
          })}
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
