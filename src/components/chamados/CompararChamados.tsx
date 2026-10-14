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
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Sheet } from "@/core"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao, LeituraCartao } from "./cartoes"
import { BarrasAxB } from "./graficos"
import { ChipsFiltrosChamados, useFiltrosChamados } from "./filtros"
import { Selo } from "./selos"
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

const campo =
  "h-11 rounded-md border border-input bg-card px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
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
  if (!cargas || opcoes.length === 0)
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
      o.propria ? (sheets.get(o.competencia) ?? sheetAtual) : sheetAtual,
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
                <select
                  id={id}
                  className={cn(campo, "min-w-64")}
                  value={valor}
                  onChange={(e) => onChange(e.target.value)}
                >
                  {opcoes.map((o) => (
                    <option key={o.competencia} value={o.competencia}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="pb-2 text-base text-muted-foreground">
              Δ = {rotB} menos {rotA}. Meses “reconstruído” vêm das datas da
              planilha mais recente.
            </p>
          </div>
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
                  A · {rotA}
                  {!opA.propria && (
                    <span className="mt-1 flex justify-end font-sans">
                      <Selo tipo="reconstruido" />
                    </span>
                  )}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-display">
                  B · {rotB}
                  {!opB.propria && (
                    <span className="mt-1 flex justify-end font-sans">
                      <Selo tipo="reconstruido" />
                    </span>
                  )}
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
                      {k.rotulo}
                      {cmp.b.kpis.find((x) => x.id === k.id)?.reconstruivel === false && (
                        <span className="mt-1 flex font-sans">
                          <Selo tipo="calculado" />
                        </span>
                      )}
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
