import type { ReactNode } from "react"
import { HistoryIcon, LayersIcon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SeloTipo } from "./logica"

export const SELOS: Record<
  SeloTipo,
  { texto: string; Icon: typeof LayersIcon; explicacao: string; curta: string }
> = {
  outros: {
    curta: "itens além dos maiores somados em “Outros”; o total se mantém",
    texto: "Agrupado em Outros",
    Icon: LayersIcon,
    explicacao:
      "Os itens além dos maiores foram somados em “Outros”. O total do gráfico se mantém.",
  },
  corrigido: {
    curta:
      "valor ajustado por uma foto de mês posterior; o original aparece como “era N”",
    texto: "Corrigido",
    Icon: HistoryIcon,
    explicacao:
      "Uma foto de mês posterior mostra que chamados desta foto já estavam finalizados no fim do mês. O valor foi corrigido; a planilha não foi alterada e o valor original aparece como “era N”.",
  },
}

/** Marca de dado que não é original puro: ícone + texto sempre visíveis; o tooltip explica a origem. */
export function Selo({ tipo }: { tipo: SeloTipo }) {
  const { texto, Icon, explicacao } = SELOS[tipo]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-selo={tipo}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#9a4f00]/60 bg-brand-soft px-2.5 py-0.5 text-sm font-medium text-[#7a3d00] focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {texto}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-md text-base">
        {explicacao}
      </TooltipContent>
    </Tooltip>
  )
}

const CLASSE_SIMBOLO =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#9a4f00]/60 bg-brand-soft align-middle text-[#7a3d00] focus-visible:outline-2 focus-visible:outline-ring"

/**
 * Só o símbolo do selo, para lugares apertados: mesmo ícone e tom do selo com texto, nome acessível
 * e explicação no foco/hover. A legenda da visão (`LegendaSimbolos`) é obrigatória ao usá-lo (D41).
 */
export function SeloSimbolo({
  tipo,
  className,
}: {
  tipo: SeloTipo
  className?: string
}) {
  const { texto, Icon, explicacao } = SELOS[tipo]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-selo={tipo}
          aria-label={texto}
          className={cn(CLASSE_SIMBOLO, className)}
        >
          <Icon className="size-5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-md text-base">
        {explicacao}
      </TooltipContent>
    </Tooltip>
  )
}

/** Símbolos de origem lado a lado, na mesma linha do rótulo (sem texto). */
export function Selos({ tipos }: { tipos: SeloTipo[] }) {
  if (tipos.length === 0) return null
  return (
    <ul
      className="inline-flex items-center gap-1.5 align-middle"
      aria-label="Origem dos dados"
    >
      {tipos.map((t) => (
        <li key={t} className="inline-flex">
          <SeloSimbolo tipo={t} />
        </li>
      ))}
    </ul>
  )
}

export type ItemLegenda = {
  chave: string
  glifo: ReactNode
  nome: string
  texto: string
}

/** Legenda visível dos símbolos usados numa visão; vazia, não renderiza nada. */
export function LegendaSimbolos({
  tipos,
  extras = [],
}: {
  tipos: SeloTipo[]
  extras?: ItemLegenda[]
}) {
  const unicos = ORDEM.filter((t) => tipos.includes(t))
  if (unicos.length === 0 && extras.length === 0) return null
  return (
    <section
      aria-label="Legenda dos símbolos"
      className="rounded-md border border-dashed border-[#9a4f00]/40 bg-card px-4 py-2"
    >
      <ul className="flex flex-wrap items-start gap-x-6 gap-y-1 text-base text-muted-foreground">
        {unicos.map((t) => {
          const { texto, Icon, curta } = SELOS[t]
          return (
            <li key={t} className="flex items-start gap-1.5">
              <span className={cn(CLASSE_SIMBOLO, "mt-px")} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span>
                <strong className="font-medium text-foreground">{texto}</strong>
                {": "}
                {curta}
              </span>
            </li>
          )
        })}
        {extras.map((x) => (
          <li key={x.chave} className="flex items-start gap-1.5">
            <span aria-hidden className="mt-1 inline-flex shrink-0">
              {x.glifo}
            </span>
            <span>
              <strong className="font-medium text-foreground">{x.nome}</strong>
              {": "}
              {x.texto}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const ORDEM: SeloTipo[] = ["outros", "corrigido"]

/**
 * Marca de valor corrigido (D65), discreta e sempre visível: ícone + "corrigido pela foto de out/26 · era 1".
 * Estática (sem botão), para caber dentro de cartões clicáveis; a explicação está na legenda da visão.
 */
export function MarcaCorrigido({
  por,
  original,
  className,
}: {
  /** Rótulos das fotos que corrigiram, ex.: ["out/26"]. */
  por: string[]
  /** Valor da foto como está, já formatado (ex.: "1", "50,0%", "—"). */
  original: string
  className?: string
}) {
  const { Icon } = SELOS.corrigido
  return (
    <span
      data-selo="corrigido"
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-dashed border-[#9a4f00]/50 bg-brand-soft px-2 py-0.5 font-sans text-sm font-medium text-[#7a3d00]",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>
        corrigido pela foto de {por.join(" e ")} · era {original}
      </span>
    </span>
  )
}
