import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

import { formatarCompetencia, inferirCompetencia } from "@/cargas"
import { formatValue } from "@/components/app/motion/format"
import { avisoColunasSemFiltro, type Distribuicao } from "@/chamados"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { KpiCartao } from "./cartoes"
import { AvisoFiltroSemColuna, ChipsFiltrosChamados } from "./filtros"
import { BlocoTempo } from "./BlocoTempo"
import { Carregando } from "./Carregando"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import { useMesDeChamados } from "./hooks"
import { recorteTexto, temOutros, type SeloTipo } from "./logica"
import {
  AtrasoMes,
  coresDasSituacoes,
  FaixaSituacao,
  GraficoMes,
} from "./painel-foto"
import {
  AreaSla,
  ClienteSituacao,
  ClienteTempo,
  OperadorAtraso,
} from "./cruzamentos-ui"
import { LegendaSimbolos, MarcaCorrigido } from "./selos"

/** Entrada do painel: mais curta que a padrão (são ~25 itens; ~110 ms cada deixaria a tela quase vazia). */
const entradaRapida = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}
const DESTAQUES = ["naoFinalizados", "sla", "atraso", "finalizados"]
const inteiro = new Intl.NumberFormat("pt-BR")
const n = (v: number) => inteiro.format(v)

/** Colunas de uma linha fechada de N cartões: nenhum cartão fica sozinho nem sobra vazio em nenhuma largura. */
const COLUNAS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 xl:grid-cols-2",
  3: "grid-cols-1 xl:grid-cols-3",
  4: "grid-cols-1 xl:max-[2199px]:grid-cols-2 min-[2200px]:grid-cols-4",
}
const linha = (n: number) =>
  `grid items-stretch gap-5 ${COLUNAS[Math.min(Math.max(n, 1), 4)]}`

function TituloBloco({
  id,
  titulo,
  texto,
}: {
  id: string
  titulo: string
  texto: string
}) {
  return (
    <header className="flex flex-col gap-0.5 border-b pb-2">
      <h2
        id={id}
        className="font-display text-4xl leading-tight font-semibold text-primary"
      >
        {titulo}
      </h2>
      <p className="text-lg text-muted-foreground">{texto}</p>
    </header>
  )
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
  const entradaFixa = useEntrada(entrada)
  // leituras e filtros vêm do hook de sempre (a aba Leituras usa a mesma conta)
  const { sheet, filtros, leituras, semColuna } = useMesDeChamados(
    carga,
    historico,
    obterCarga
  )
  const [escolhaDe, setEscolha] = useState({ carga: carga.id, valor: ANTERIOR })
  const escolha = escolhaDe.carga === carga.id ? escolhaDe.valor : ANTERIOR
  const comparado = usePainelComparado({
    carga,
    historico,
    obterCarga,
    sheet,
    filtros,
    escolha,
  })

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
  if (!comparado)
    return (
      <div className="flex flex-col gap-6">
        {cabecalho}
        <Carregando texto="Carregando o painel…" forma="painel" />
      </div>
    )

  const play = entradaFixa && !reduce
  const { metricas, entradaAtual, base, entradaBase, opcoes, corrigidoPor } =
    comparado
  // o aviso de filtro sem coluna já aparece junto dos chips
  const avisosRodape = metricas.avisos.filter(
    (a) => !a.startsWith("Sem a coluna") && !a.startsWith("Sem as colunas")
  )
  const rotuloAnterior = comparado.rotuloBase ?? "mês anterior"
  const marcaDe = (k: (typeof metricas.kpis)[number]) =>
    k.original !== undefined && corrigidoPor.length ? (
      <MarcaCorrigido
        por={corrigidoPor}
        original={formatValue(
          k.original,
          k.formato === "inteiro"
            ? "integer"
            : k.formato === "percentual"
              ? "percent"
              : "decimal"
        )}
      />
    ) : undefined
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
    { id: "operador", sub: "por operador", max: 8 },
    { id: "area", sub: "por área (módulo)", max: 8 },
    { id: "atividade", sub: "por atividade", max: 8 },
    { id: "areaSuperior", sub: "por área superior", max: 8 },
  ]
  const cliente = dist("cliente")
  const rankingsAqui = rankings.filter((r) => dist(r.id))
  // sem cliente, o atraso entra na linha dos rankings (nenhuma linha fica com um cartão só)
  const cartoesLinha2 = rankingsAqui.length + (cliente ? 0 : 1)
  // símbolos que aparecem nesta tela, para a legenda
  const tiposNaTela: SeloTipo[] = [
    ...([cliente, ...rankings.map((r) => dist(r.id))].some(
      (d) => d && temOutros(d.itens)
    )
      ? (["outros"] as const)
      : []),
    ...(corrigidoPor.length ? (["corrigido"] as const) : []),
  ]
  const cores = coresDasSituacoes([
    ...metricas.situacoes.map((s) => s.rotulo),
    ...(base?.situacoes.map((s) => s.rotulo) ?? []),
  ])
  const cruz = {
    atual: entradaAtual,
    competencia: carga.competencia,
    base,
    entradaBase,
    cores,
  }
  const graficoRanking = (r: (typeof rankings)[number]) => {
    const d = dist(r.id)
    if (!d) return null
    return (
      <GraficoMes
        key={r.id}
        dist={d}
        base={base}
        entrada={entradaAtual}
        competencia={carga.competencia}
        sub={r.sub}
        max={r.max}
        animar={play}
        corrigidoPor={corrigidoPor}
      />
    )
  }
  const atraso = (
    <AtrasoMes
      key="atraso"
      faixas={metricas.atrasoFaixas}
      base={base}
      competencia={carga.competencia}
      animar={play}
      tabelaVazia={semDados}
    />
  )

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

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-base text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 font-medium text-foreground">
              Comparar com
              <select
                value={escolha}
                onChange={(e) =>
                  setEscolha({ carga: carga.id, valor: e.target.value })
                }
                className="h-11 rounded-lg border border-input bg-card px-3 text-base font-normal text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Variação contra {rotuloAnterior}
              {base?.semFoto
                ? " (sem foto: só entradas e finalizados)"
                : base
                  ? " (carga própria)"
                  : ": sem carga do mês anterior"}
              . Vale para o topo, os indicadores e os gráficos.
            </p>
          </div>
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

        {metricas.totalChamados === null ? (
          <section aria-label="Chamados por situação">{vazio}</section>
        ) : (
          <FaixaSituacao
            total={metricas.totalChamados}
            situacoes={metricas.situacoes}
            anterior={base}
            mes={mes}
            entrada={play}
            corrigidoPor={corrigidoPor}
            cores={cores}
          />
        )}

        <section aria-label="Indicadores">
          <div className="grid grid-cols-2 gap-5 min-[2200px]:grid-cols-[repeat(24,minmax(0,1fr))] md:max-[2199px]:grid-cols-4">
            {destaques.map((k) => (
              <KpiCartao
                key={k.id}
                kpi={k}
                destaque
                rotuloAnterior={rotuloAnterior}
                entrada={play}
                marca={marcaDe(k)}
                className="min-[2200px]:col-span-6"
              />
            ))}
            {demais.map((k) => (
              <KpiCartao
                key={k.id}
                kpi={k}
                rotuloAnterior={rotuloAnterior}
                entrada={play}
                marca={marcaDe(k)}
                className="min-[2200px]:col-span-3"
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

        <section aria-labelledby="bloco-no-mes" className="flex flex-col gap-5">
          <TituloBloco
            id="bloco-no-mes"
            titulo="No mês"
            texto={`${mes} ao lado de ${comparado.rotuloBase ?? "outro mês (escolha em “Comparar com”)"}`}
          />
          {cliente && (
            <div className={linha(3)}>
              <GraficoMes
                dist={cliente}
                base={base}
                entrada={entradaAtual}
                competencia={carga.competencia}
                sub="por cliente"
                max={8}
                animar={play}
                corrigidoPor={corrigidoPor}
                className="xl:col-span-2"
              />
              {atraso}
            </div>
          )}
          {cartoesLinha2 > 0 && (
            <div className={linha(cartoesLinha2)}>
              {!cliente && atraso}
              {rankingsAqui.map(graficoRanking)}
            </div>
          )}
          <div className={linha(4)}>
            <ClienteSituacao {...cruz} />
            <OperadorAtraso {...cruz} />
            <AreaSla {...cruz} />
            <ClienteTempo {...cruz} />
          </div>
        </section>

        {/* 3º bloco: a Evolução, com os mesmos filtros do Painel */}
        <BlocoTempo
          carga={carga}
          historico={historico}
          obterCarga={obterCarga}
          entrada={entrada}
        />

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
