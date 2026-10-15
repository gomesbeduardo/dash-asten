import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

import { formatarCompetencia, inferirCompetencia } from "@/cargas"
import { formatValue } from "@/components/app/motion/format"
import { avisoColunasSemFiltro, type Distribuicao } from "@/chamados"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import { GraficoCartao, KpiCartao } from "./cartoes"
import { AvisoFiltroSemColuna, ChipsFiltrosChamados } from "./filtros"
import { BarrasFaixas } from "./graficos"
import { Carregando } from "./Carregando"
import { ANTERIOR, usePainelComparado } from "./comparar-com"
import { useMesDeChamados } from "./hooks"
import { recorteTexto, temOutros, type SeloTipo } from "./logica"
import { CartoesSituacao, GraficoFoto } from "./painel-foto"
import { LEGENDA_CORRIGIDO, LegendaSimbolos, MarcaCorrigido } from "./selos"

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
  const { metricas, entradaAtual, base, opcoes, corrigidoPor } = comparado
  // o aviso de filtro sem coluna já aparece junto dos chips
  const avisosRodape = metricas.avisos.filter(
    (a) => !a.startsWith("Sem a coluna") && !a.startsWith("Sem as colunas")
  )
  const rotuloAnterior = comparado.rotuloBase ?? "mês anterior"
  const marcaDe = (k: (typeof metricas.kpis)[number]) =>
    k.original !== undefined && corrigidoPor ? (
      <MarcaCorrigido
        por={corrigidoPor}
        era={formatValue(
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
        <LegendaSimbolos
          tipos={tiposNaTela}
          extras={corrigidoPor ? [LEGENDA_CORRIGIDO] : []}
        />

        {metricas.totalChamados === null ? (
          <section aria-label="Chamados por situação">{vazio}</section>
        ) : (
          <CartoesSituacao
            total={metricas.totalChamados}
            situacoes={metricas.situacoes}
            anterior={base}
            mes={mes}
            entrada={play}
            corrigidoPor={corrigidoPor}
          />
        )}

        <section aria-label="Indicadores" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
              <p>
                Variação contra {rotuloAnterior}
                {base?.semFoto
                  ? " (sem foto: só entradas e finalizados)"
                  : base
                    ? " (carga própria)"
                    : ": sem carga do mês anterior"}
              </p>
              <label className="flex items-center gap-2">
                Comparar com
                <select
                  value={escolha}
                  onChange={(e) =>
                    setEscolha({ carga: carga.id, valor: e.target.value })
                  }
                  className="h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {opcoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </label>
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
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            {destaques.map((k) => (
              <KpiCartao
                key={k.id}
                kpi={k}
                destaque
                rotuloAnterior={rotuloAnterior}
                entrada={play}
                marca={marcaDe(k)}
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
                marca={marcaDe(k)}
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
              corrigidoPor={corrigidoPor}
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
                corrigidoPor={corrigidoPor}
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
