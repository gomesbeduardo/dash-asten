import { useEntrada } from "@/components/app/motion/useEntrada"
import { useMemo, useState } from "react"
import { formatarCompetencia } from "@/cargas"
import { motion, useReducedMotion } from "motion/react"

import { entryContainer } from "@/components/app/motion/variants"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { VisaoTipoProps } from "@/panels/tipos"
import type { FormatoKpi } from "@/chamados"
import { GraficoCartao } from "./cartoes"
import { COR, LinhaMini, type SerieLinha } from "./graficos"
import {
  AvisoFiltroSemColuna,
  ChipsFiltrosChamados,
  useFiltrosChamados,
} from "./filtros"
import { Carregando } from "./Carregando"
import { useCargasDoTipo } from "./hooks"
import {
  formatarKpi,
  linhasDeSerie,
  MAX_CLIENTES,
  MAX_OPERADORES,
  pontosDaEvolucao,
  type PontoEvolucao,
  type SeriesDimensao,
  type SeriesSituacao,
} from "./logica"

type Cartao = { id: string; titulo: string; series: SerieLinha[] }

/** Um cartão por KPI do motor (títulos = rótulos do motor); entradas e finalizados dividem o cartão de fluxo. */
const CARTOES: Cartao[] = [
  {
    id: "naoFinalizados",
    titulo: "Não finalizados",
    series: [
      { id: "naoFinalizados", rotulo: "Não finalizados", cor: COR.principal },
    ],
  },
  {
    id: "fluxo",
    titulo: "Entradas × finalizados",
    series: [
      { id: "entradas", rotulo: "Entradas", cor: COR.laranja },
      { id: "finalizados", rotulo: "Finalizados", cor: COR.principal },
    ],
  },
  {
    id: "atraso",
    titulo: "Em atraso",
    series: [{ id: "atraso", rotulo: "Em atraso", cor: COR.atraso }],
  },
  {
    id: "slaVencido",
    titulo: "SLA vencido",
    series: [{ id: "slaVencido", rotulo: "SLA vencido", cor: COR.cinza }],
  },
  {
    id: "sla",
    titulo: "% no SLA",
    series: [{ id: "sla", rotulo: "% no SLA", cor: COR.verde }],
  },
  {
    id: "tempoMedio",
    titulo: "Tempo médio de resolução",
    series: [{ id: "tempoMedio", rotulo: "Tempo médio", cor: COR.principal }],
  },
  {
    id: "tempoAceite",
    titulo: "Tempo até o aceite",
    series: [
      { id: "tempoAceite", rotulo: "Tempo até o aceite", cor: COR.laranja },
    ],
  },
  {
    id: "reabertos",
    titulo: "% reabertos",
    series: [{ id: "reabertos", rotulo: "% reabertos", cor: COR.roxo }],
  },
  {
    id: "semSla",
    titulo: "Sem SLA",
    series: [{ id: "semSla", rotulo: "Sem SLA", cor: COR.cinza }],
  },
  {
    id: "slaRenegociado",
    titulo: "SLA renegociado",
    series: [
      { id: "slaRenegociado", rotulo: "SLA renegociado", cor: COR.verde },
    ],
  },
  {
    id: "aguardandoAceite",
    titulo: "Aguardando aceite",
    series: [
      { id: "aguardandoAceite", rotulo: "Aguardando aceite", cor: COR.roxo },
    ],
  },
]

/** Grade por largura (D67): 1 / 2 / 3 / 4 (a partir de 2200px, TV; 4 colunas legíveis também em 4K). Os breakpoints 3xl/4xl do tema perdem a ordem no CSS para os de rem, por isso min-[137.5rem]; são 12 cartões, então toda grade fecha as linhas. */
const GRADE_CARTOES =
  "grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3 min-[137.5rem]:grid-cols-4"
const GRADE_DIMENSOES =
  "grid grid-cols-1 gap-5 lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-full"

const JANELAS = [6, 12] as const

/** Célula da tabela de dados: valor, "— (sem foto de …)" ou valor com "(corrigido; era …)". */
function celula(p: PontoEvolucao, id: string, formato: FormatoKpi): string {
  const v = p.valores[id] ?? null
  if (v === null && p.semFoto && p.dica) return `— (${p.dica})`
  const o = p.originais?.[id]
  const base = formatarKpi(v, formato)
  return o !== undefined && o !== null
    ? `${base} (corrigido; era ${formatarKpi(o, formato)})`
    : base
}

export function EvolucaoChamados({
  carga,
  historico,
  obterCarga,
  entrada,
}: VisaoTipoProps) {
  const [meses, setMeses] = useState<(typeof JANELAS)[number]>(6)
  const reduce = useReducedMotion()
  const entradaFixa = useEntrada(entrada)
  const cargas = useCargasDoTipo(historico, obterCarga)
  const { filtros } = useFiltrosChamados()
  const dados = useMemo(
    () =>
      cargas
        ? pontosDaEvolucao(cargas, meses, filtros, carga.competencia)
        : null,
    [cargas, filtros, meses, carga.competencia]
  )
  const titulo = (
    <h1 className="text-6xl leading-none text-primary">Evolução</h1>
  )
  if (!dados)
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <Carregando forma="evolucao" />
      </div>
    )
  const { pontos, kpis, avisosFiltro, dimensoes, situacoes } = dados
  const play = entradaFixa && !reduce
  const formatoDe = (id: string): FormatoKpi =>
    kpis.find((k) => k.id === id)?.formato ?? "inteiro"

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col gap-6"
        variants={entryContainer}
        initial={play ? "hidden" : false}
        data-entrada={play ? "" : undefined}
        animate="show"
      >
        <header className="flex flex-col gap-2">
          {titulo}
          <ChipsFiltrosChamados />
          <AvisoFiltroSemColuna avisos={avisosFiltro} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div role="group" aria-label="Janela" className="flex gap-2">
              {JANELAS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={n === meses ? "default" : "outline"}
                  aria-pressed={n === meses}
                  onClick={() => setMeses(n)}
                >
                  {n} meses
                </Button>
              ))}
            </div>
            <p className="text-lg text-muted-foreground">
              Um ponto por mês até {formatarCompetencia(carga.competencia)}. Mês
              sem foto traz só entradas e finalizados (das datas). Ponto vazado
              = corrigido por foto posterior.
            </p>
          </div>
        </header>

        <div className={GRADE_CARTOES}>
          {CARTOES.map((c) => (
            <CartaoEvolucao
              key={c.id}
              cartao={c}
              pontos={pontos}
              formato={formatoDe(c.series[0].id)}
              play={play}
            />
          ))}
          <CartaoSituacao situacoes={situacoes} play={play} />
        </div>

        {(dimensoes.operador.temColuna || dimensoes.cliente.temColuna) && (
          <div className={GRADE_DIMENSOES}>
            {dimensoes.operador.temColuna && (
              <CartaoDimensao
                id="operador"
                titulo="Não finalizados por operador"
                dim={dimensoes.operador}
                max={MAX_OPERADORES}
                aviso={(d) =>
                  d.total > MAX_OPERADORES
                    ? `${MAX_OPERADORES} maiores operadores nos não finalizados de ${mesRanking(d)}. Carga de trabalho: operador é o responsável na data da foto.`
                    : "Carga de trabalho: operador é o responsável na data da foto."
                }
                play={play}
              />
            )}
            {dimensoes.cliente.temColuna && (
              <CartaoDimensao
                id="cliente"
                titulo="Não finalizados por cliente"
                dim={dimensoes.cliente}
                max={MAX_CLIENTES}
                aviso={(d) =>
                  `${MAX_CLIENTES} maiores clientes nos não finalizados de ${mesRanking(d)}`
                }
                play={play}
              />
            )}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}

function CartaoEvolucao({
  cartao,
  pontos,
  formato,
  play,
}: {
  cartao: Cartao
  pontos: PontoEvolucao[]
  formato: FormatoKpi
  play: boolean
}) {
  const linhas = useMemo(
    () =>
      linhasDeSerie(
        pontos,
        cartao.series.map((s) => s.id)
      ),
    [pontos, cartao]
  )
  const ultimo = pontos[pontos.length - 1]
  const tabela = {
    colunas: ["Mês", ...cartao.series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.rotulo,
      ...cartao.series.map((s) => celula(p, s.id, formato)),
    ]),
  }
  return (
    <GraficoCartao
      id={`evo-${cartao.id}`}
      titulo={cartao.titulo}
      subtitulo={
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {cartao.series.map((s) => (
            <span key={s.id} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="inline-block h-1 w-5 self-center rounded-full"
                style={{ background: s.cor }}
              />
              <span className="num font-display text-4xl font-semibold text-primary">
                {formatarKpi(ultimo?.valores[s.id] ?? null, formato)}
              </span>
              <span>
                {cartao.series.length > 1 ? s.rotulo : ultimo?.rotulo}
              </span>
            </span>
          ))}
        </span>
      }
      tabela={tabela}
    >
      <LinhaMini
        linhas={linhas}
        series={cartao.series}
        formato={formato}
        animar={play}
      />
    </GraficoCartao>
  )
}

/** Paleta categórica (até 8 linhas), distinguível entre si e sobre o fundo claro do cartão. */
const PALETA = [
  "#1f5fa8",
  "#b45f06",
  "#2e7d32",
  "#7b3fa0",
  "#c2185b",
  "#00838f",
  "#6d4c41",
  "#546e7a",
]

function CartaoSituacao({
  situacoes,
  play,
}: {
  situacoes: SeriesSituacao
  play: boolean
}) {
  const series: SerieLinha[] = situacoes.series.map((s, i) => ({
    id: s.id,
    rotulo: s.rotulo,
    cor: PALETA[i % PALETA.length],
  }))
  const { pontos } = situacoes
  const linhas = useMemo(
    () =>
      linhasDeSerie(
        pontos,
        series.map((s) => s.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [situacoes]
  )
  const tabela = {
    colunas: ["Mês", ...series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.rotulo,
      ...series.map((s) => celula(p, s.id, "inteiro")),
    ]),
  }
  return (
    <GraficoCartao
      id="evo-situacao"
      titulo="Chamados por situação"
      subtitulo={
        <span>
          Uma linha por Situação em cada foto; mês sem foto fica sem ponto.
        </span>
      }
      tabela={tabela}
    >
      {series.length === 0 ? (
        <p className="text-lg text-muted-foreground">
          Sem chamados nas fotos da janela.
        </p>
      ) : (
        <LinhaMini
          linhas={linhas}
          series={series}
          formato="inteiro"
          animar={play}
        />
      )}
    </GraficoCartao>
  )
}

const mesRanking = (d: SeriesDimensao) =>
  d.competenciaRanking ? formatarCompetencia(d.competenciaRanking) : "—"

function CartaoDimensao({
  id,
  titulo,
  dim,
  max,
  aviso,
  play,
}: {
  id: string
  titulo: string
  dim: SeriesDimensao
  max: number
  aviso: (d: SeriesDimensao) => string
  play: boolean
}) {
  const series: SerieLinha[] = dim.series.slice(0, max).map((s, i) => ({
    id: s.id,
    rotulo: s.rotulo,
    cor: PALETA[i % PALETA.length],
  }))
  const { pontos } = dim
  const linhas = useMemo(
    () =>
      linhasDeSerie(
        pontos,
        series.map((s) => s.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dim]
  )
  const tabela = {
    colunas: ["Mês", ...series.map((s) => s.rotulo)],
    linhas: pontos.map((p) => [
      p.rotulo,
      ...series.map((s) => celula(p, s.id, "inteiro")),
    ]),
  }
  return (
    <GraficoCartao
      id={`evo-${id}`}
      titulo={titulo}
      subtitulo={<span>{aviso(dim)}</span>}
      tabela={tabela}
    >
      {series.length === 0 ? (
        <p className="text-lg text-muted-foreground">
          Sem chamados não finalizados.
        </p>
      ) : (
        <LinhaMini
          linhas={linhas}
          series={series}
          formato="inteiro"
          animar={play}
        />
      )}
    </GraficoCartao>
  )
}
