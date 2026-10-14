/** Peças visuais de Chamados: KPI, leitura, cartão de gráfico com "Ver dados". */
import { useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartColumnIcon,
  CircleCheckIcon,
  InfoIcon,
  MaximizeIcon,
  MinusIcon,
  OctagonAlertIcon,
  TableIcon,
  TriangleAlertIcon,
} from "lucide-react"

import type { KpiChamados, Leitura, Severidade } from "@/chamados"
import { AnimatedNumber } from "@/components/app/motion/AnimatedNumber"
import { entryItem } from "@/components/app/motion/variants"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import {
  descreverDelta,
  idAlvo,
  motivoSemDelta,
  type SeloTipo,
} from "./logica"
import { SeloSimbolo, Selos } from "./selos"

const TOM = {
  bom: "text-[#00694b]",
  ruim: "text-late",
  neutro: "text-muted-foreground",
} as const

export function KpiCartao({
  kpi,
  destaque = false,
  rotuloAnterior,
  anteriorPropria,
  entrada,
  extra,
}: {
  kpi: KpiChamados
  destaque?: boolean
  rotuloAnterior: string
  anteriorPropria: boolean
  entrada: boolean
  extra?: string
}) {
  const reduce = useReducedMotion()
  const delta = descreverDelta(kpi, rotuloAnterior, !anteriorPropria)
  const Seta =
    delta?.sentido === "alta"
      ? ArrowUpIcon
      : delta?.sentido === "queda"
        ? ArrowDownIcon
        : MinusIcon
  const formato =
    kpi.formato === "inteiro"
      ? "integer"
      : kpi.formato === "percentual"
        ? "percent"
        : "decimal"
  return (
    <motion.article
      id={idAlvo(kpi.id)}
      variants={reduce ? undefined : entryItem}
      aria-label={kpi.rotulo}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-t-4 border-t-brand bg-card shadow-(--shadow-card)",
        destaque ? "p-6" : "p-5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "font-sans leading-tight font-medium text-muted-foreground",
            destaque ? "text-xl" : "text-lg"
          )}
        >
          {kpi.reconstruivel ? (
            kpi.rotulo
          ) : (
            <>
              {kpi.rotulo.replace(/\s*\S+$/, "")}{" "}
              {/* última palavra + símbolo juntos: o símbolo nunca cai sozinho na linha de baixo */}
              <span className="whitespace-nowrap">
                {kpi.rotulo.match(/\S+$/)?.[0]}{" "}
                <SeloSimbolo tipo="calculado" className="-my-1" />
              </span>
            </>
          )}
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Definição de ${kpi.rotulo}`}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <InfoIcon className="size-5" aria-hidden />
            </button>
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
            destaque ? "text-[72px]" : "text-[44px]"
          )}
        />
        {kpi.formato === "dias" && kpi.valor !== null && (
          <span className="text-xl text-muted-foreground">dias</span>
        )}
      </div>
      {kpi.valor === null ? (
        <p className="text-base text-muted-foreground">
          {motivoSemDelta(kpi, true)}
        </p>
      ) : delta ? (
        <p
          className={cn(
            "flex items-start gap-1.5 font-medium",
            destaque ? "text-xl" : "text-base",
            TOM[delta.tom]
          )}
        >
          <Seta className="size-5 shrink-0" aria-hidden />
          <span>
            {delta.texto}
            {delta.rotuloTom && (
              <span className="font-normal"> · {delta.rotuloTom}</span>
            )}
          </span>
        </p>
      ) : (
        <p className="text-base text-muted-foreground">
          <span aria-hidden>—</span> vs {rotuloAnterior}
          <span className="block">{motivoSemDelta(kpi, anteriorPropria)}</span>
        </p>
      )}
      {extra && <p className="text-base text-muted-foreground">{extra}</p>}
    </motion.article>
  )
}

const SEV: Record<
  Severidade,
  { Icon: typeof OctagonAlertIcon; rotulo: string; texto: string; borda: string }
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
    texto: "text-[#9a4f00]",
    borda: "border-l-[#b45f06]",
  },
  destaque: {
    Icon: CircleCheckIcon,
    rotulo: "Destaque",
    texto: "text-[#00694b]",
    borda: "border-l-[#00805d]",
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
  nota,
  tabela,
  selos = [],
  className,
  children,
}: {
  id: string
  titulo: string
  subtitulo?: ReactNode
  nota?: ReactNode
  tabela: TabelaDados
  selos?: SeloTipo[]
  className?: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const [verTabela, setVerTabela] = useState(false)
  return (
    <motion.section
      id={idAlvo(id)}
      variants={reduce ? undefined : entryItem}
      aria-label={titulo}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-5 shadow-(--shadow-card)",
        className
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-semibold text-primary">
              {titulo}
            </h3>
            <Selos tipos={selos} />
          </div>
          {subtitulo && (
            <p className="text-base text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        <Toggle
          variant="outline"
          pressed={verTabela}
          onPressedChange={setVerTabela}
          className="press shrink-0 gap-2"
        >
          {verTabela ? (
            <ChartColumnIcon className="size-5" aria-hidden />
          ) : (
            <TableIcon className="size-5" aria-hidden />
          )}
          Ver dados
        </Toggle>
      </header>
      {verTabela && <Tabela titulo={titulo} tabela={tabela} />}
      <div hidden={verTabela}>{children}</div>
      {nota && <p className="text-base text-muted-foreground">{nota}</p>}
    </motion.section>
  )
}
