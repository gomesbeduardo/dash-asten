/** Peças visuais de Chamados: KPI, leitura, cartão de gráfico com "Ver dados". */
import { useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ChartColumnIcon,
  CircleCheckIcon,
  InfoIcon,
  MaximizeIcon,
  OctagonAlertIcon,
  TableIcon,
  TriangleAlertIcon,
} from "lucide-react"

import type { KpiChamados, Leitura, Severidade } from "@/chamados"
import { AnimatedNumber } from "@/components/app/motion/AnimatedNumber"
import { entryItem, entryItemPagina } from "@/components/app/motion/variants"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { descreverDelta, idAlvo, motivoSemDelta, type SeloTipo } from "./logica"
import { Selos } from "./selos"
import { Minigrafico } from "./minigrafico"
import { Button } from "@/components/ui/button"
import { SeloDelta } from "./selo-delta"

export function KpiCartao({
  kpi,
  destaque = false,
  rotuloAnterior,
  entrada,
  extra,
  marca,
  serie,
  className,
}: {
  kpi: KpiChamados
  destaque?: boolean
  rotuloAnterior: string
  entrada: boolean
  extra?: string
  /** Marca de valor corrigido (D65), abaixo do Δ. */
  marca?: ReactNode
  /** Tendência dos últimos meses (só nos indicadores em destaque): minigráfico com o mês atual na cor da série. */
  serie?: { valores: (number | null)[]; rotulos: string[]; cor: string }
  className?: string
}) {
  const reduce = useReducedMotion()
  const delta = descreverDelta(kpi, rotuloAnterior)
  const formato =
    kpi.formato === "inteiro"
      ? "integer"
      : kpi.formato === "percentual"
        ? "percent"
        : "decimal"
  return (
    <motion.article
      id={idAlvo(kpi.id)}
      variants={reduce ? undefined : entryItemPagina}
      aria-label={kpi.rotulo}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg bg-card shadow-(--shadow-card)",
        destaque ? "p-6" : "p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "font-sans leading-tight font-medium text-muted-foreground",
            destaque ? "text-xl" : "min-h-[2.5em] text-lg"
          )}
        >
          {kpi.rotulo}
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Definição de ${kpi.rotulo}`}
              className="shrink-0 rounded-full text-muted-foreground"
            >
              <InfoIcon className="size-5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-md text-base">
            {kpi.definicao}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline gap-2">
        <AnimatedNumber
          value={kpi.valor}
          format={formato}
          display={kpi.valor === null ? "—" : undefined}
          fromZero={entrada}
          className={cn(
            "num font-display leading-none font-semibold text-primary",
            destaque ? "text-7xl" : "text-4xl"
          )}
        />
        {kpi.formato === "dias" && kpi.valor !== null && (
          <span className="text-xl text-muted-foreground">dias</span>
        )}
      </div>
      {serie && <Minigrafico {...serie} />}
      {kpi.valor === null ? (
        <p className="text-base text-muted-foreground">{motivoSemDelta(kpi)}</p>
      ) : delta ? (
        <SeloDelta delta={delta} grande={destaque} />
      ) : kpi.detalhe ? (
        <p className="text-base text-muted-foreground">{kpi.detalhe}</p>
      ) : (
        // sem base: o aviso aparece uma vez, junto de "Comparar com"; aqui só um traço discreto
        <p className="text-base text-muted-foreground/70">
          <span aria-hidden>—</span>
          <span className="sr-only">sem comparação</span>
        </p>
      )}
      {extra && <p className="text-base text-muted-foreground">{extra}</p>}
      {marca}
    </motion.article>
  )
}

const SEV: Record<
  Severidade,
  {
    Icon: typeof OctagonAlertIcon
    rotulo: string
    texto: string
    borda: string
  }
> = {
  critico: {
    Icon: OctagonAlertIcon,
    rotulo: "Crítico",
    texto: "text-late",
    borda: "border-l-late",
  },
  atencao: {
    Icon: TriangleAlertIcon,
    rotulo: "Atenção",
    texto: "text-atencao",
    borda: "border-l-atencao-borda",
  },
  destaque: {
    Icon: CircleCheckIcon,
    rotulo: "Destaque",
    texto: "text-positive",
    borda: "border-l-positive-borda",
  },
}

export function LeituraCartao({
  leitura,
  selos = [],
  onAbrir,
  grande = false,
}: {
  leitura: Leitura
  selos?: SeloTipo[]
  /** Sem `onAbrir` o cartão é só leitura (ex.: Comparar). */
  onAbrir?: (l: Leitura) => void
  grande?: boolean
}) {
  const reduce = useReducedMotion()
  const s = SEV[leitura.severidade]
  const corpo = (
    <>
      <span
        className={cn("flex items-center gap-2 text-lg font-semibold", s.texto)}
      >
        <s.Icon className="size-6" aria-hidden /> {s.rotulo}
      </span>
      <span
        className={cn(
          "font-display leading-snug font-semibold text-primary",
          grande ? "text-3xl" : "text-2xl"
        )}
      >
        {leitura.titulo}
      </span>
      <span className={cn("text-foreground", grande ? "text-xl" : "text-lg")}>
        {leitura.texto}
      </span>
      {leitura.acao && (
        <span className="text-lg font-medium text-foreground">
          Ação sugerida: {leitura.acao}
        </span>
      )}
      {onAbrir && (
        <span className="mt-1 flex items-center gap-1.5 text-base text-primary underline">
          <MaximizeIcon className="size-5" aria-hidden /> Ver detalhe
        </span>
      )}
    </>
  )
  const base = cn(
    "flex h-full w-full flex-col items-start gap-2 rounded-lg border border-l-8 bg-card p-5 text-left shadow-(--shadow-card)",
    s.borda
  )
  return (
    <motion.li
      variants={reduce ? undefined : entryItem}
      className="relative flex min-w-0 flex-col gap-2"
      data-leitura={leitura.id}
    >
      {onAbrir ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => onAbrir(leitura)}
          className={cn(
            base,
            "press cursor-pointer hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
          )}
        >
          {corpo}
        </button>
      ) : (
        <article className={base}>{corpo}</article>
      )}
      {/* símbolos sobre o canto do cartão, na linha da severidade: não mudam a altura nem alinham diferente */}
      <div className="absolute top-4 right-4">
        <Selos tipos={selos} />
      </div>
    </motion.li>
  )
}

export type TabelaDados = { colunas: string[]; linhas: (string | number)[][] }

function Tabela({ titulo, tabela }: { titulo: string; tabela: TabelaDados }) {
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-left text-base">
        <caption className="sr-only">{titulo}: dados do gráfico</caption>
        <thead>
          <tr className="border-b-2 border-primary/30 text-primary">
            {tabela.colunas.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "px-3 py-2 font-display font-semibold",
                  i > 0 && "text-right"
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((l, r) => (
            <tr key={r} className="border-b">
              {l.map((v, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-3 py-2 font-normal">
                    {v}
                  </th>
                ) : (
                  <td key={i} className="num px-3 py-2 text-right">
                    {v}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GraficoCartao({
  id,
  titulo,
  subtitulo,
  contexto,
  nota,
  tabela,
  selos = [],
  acoes,
  className,
  children,
}: {
  id: string
  titulo: string
  subtitulo?: ReactNode
  /** O que está sendo comparado ("out/26 ao lado de mai/26"), em linha própria, abaixo do subtítulo. */
  contexto?: ReactNode
  nota?: ReactNode
  tabela: TabelaDados
  selos?: SeloTipo[]
  /** Controles do próprio card (ex.: comparar período), abaixo do cabeçalho. */
  acoes?: ReactNode
  className?: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const [verTabela, setVerTabela] = useState(false)
  return (
    <motion.section
      id={idAlvo(id)}
      variants={reduce ? undefined : entryItemPagina}
      aria-label={titulo}
      className={cn(
        "flex h-full min-w-0 flex-col gap-4 rounded-lg bg-card p-6 shadow-(--shadow-card)",
        className
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            {/* símbolos antes do título, centrados na 1ª linha (leading-8 = h-8) */}
            {selos.length > 0 && (
              <span className="flex h-8 shrink-0 items-center">
                <Selos tipos={selos} />
              </span>
            )}
            <h3 className="font-display text-xl leading-8 font-semibold text-primary">
              {titulo}
            </h3>
          </div>
          {subtitulo && (
            <p className="mt-0.5 text-base text-muted-foreground">
              {subtitulo}
            </p>
          )}
          {contexto && (
            <p className="text-base font-medium text-foreground/75">
              {contexto}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {acoes}
          <Toggle
            pressed={verTabela}
            onPressedChange={setVerTabela}
            className="press h-10 shrink-0 gap-2 text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            {verTabela ? (
              <ChartColumnIcon className="size-5" aria-hidden />
            ) : (
              <TableIcon className="size-5" aria-hidden />
            )}
            Ver dados
          </Toggle>
        </div>
      </header>
      {verTabela && <Tabela titulo={titulo} tabela={tabela} />}
      <div
        className={cn("flex min-h-0 flex-1 flex-col", verTabela && "hidden")}
      >
        {children}
      </div>
      {nota && (
        <p className="border-t border-border/60 pt-3 text-base text-muted-foreground">
          {nota}
        </p>
      )}
    </motion.section>
  )
}

/** Título de seção (nível 1 da escala interna): presença sem gritar, sem filete; o texto de apoio vem logo abaixo. */
export function TituloBloco({
  id,
  titulo,
  texto,
  acao,
}: {
  id?: string
  titulo: string
  texto?: ReactNode
  /** Controle da seção (ex.: janela de meses), alinhado à direita. */
  acao?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pt-2">
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          id={id}
          className="font-display text-4xl leading-tight font-semibold tracking-tight text-primary"
        >
          {titulo}
        </h2>
        {texto && <p className="text-lg text-muted-foreground">{texto}</p>}
      </div>
      {acao}
    </header>
  )
}
