import type { ReactNode } from "react"
import {
  CalculatorIcon,
  FileClockIcon,
  HistoryIcon,
  LayersIcon,
  SplitIcon,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SeloTipo } from "./logica"

export const SELOS: Record<
  SeloTipo,
  { texto: string; Icon: typeof HistoryIcon; explicacao: string; curta: string }
> = {
  reconstruido: {
    curta:
      "sem carga própria do mês; calculado pelas datas da planilha mais recente",
    texto: "Reconstruído pelas datas",
    Icon: HistoryIcon,
    explicacao:
      "Calculado a partir das datas de abertura e solução da planilha mais recente, porque não há carga própria daquele mês. Indicadores que dependem da data da exportação ficam sem valor.",
  },
  calculado: {
    curta:
      "usa colunas da data da exportação; só vale para a carga do próprio mês",
    texto: "Calculado",
    Icon: CalculatorIcon,
    explicacao:
      "Usa colunas da data da exportação (Situação, Qtd Reabertura, SLA Renegociado). Só vale para a carga do próprio mês; meses anteriores não podem ser reconstruídos.",
  },
  exportacao: {
    curta:
      "situação na data da exportação, não no fim do mês",
    texto: "Situação na exportação",
    Icon: FileClockIcon,
    explicacao:
      "É a situação do chamado na data em que a planilha foi exportada, não no fim do mês.",
  },
  derivado: {
    curta:
      "classificado pelas datas de abertura e solução; nenhuma linha excluída",
    texto: "Derivado das datas",
    Icon: SplitIcon,
    explicacao:
      "Cada chamado é classificado pelas datas de abertura e solução em relação ao mês. Nenhuma linha da planilha é excluída.",
  },
  outros: {
    curta:
      "itens além dos maiores somados em “Outros”; o total se mantém",
    texto: "Agrupado em Outros",
    Icon: LayersIcon,
    explicacao:
      "Os itens além dos maiores foram somados em “Outros”. O total do gráfico se mantém.",
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
      <TooltipContent className="max-w-md text-base">{explicacao}</TooltipContent>
    </Tooltip>
  )
}

const CLASSE_SIMBOLO =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#9a4f00]/60 bg-brand-soft align-middle text-[#7a3d00] focus-visible:outline-2 focus-visible:outline-ring"

/**
 * Só o símbolo do selo, para lugares apertados: mesmo ícone e tom do selo com texto, nome acessível
 * e explicação no foco/hover. A legenda da visão (`LegendaSimbolos`) é obrigatória ao usá-lo (D41).
 */
export function SeloSimbolo({ tipo, className }: { tipo: SeloTipo; className?: string }) {
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
      <TooltipContent className="max-w-md text-base">{explicacao}</TooltipContent>
    </Tooltip>
  )
}

/** Símbolos de origem lado a lado, na mesma linha do rótulo (sem texto). */
export function Selos({ tipos }: { tipos: SeloTipo[] }) {
  if (tipos.length === 0) return null
  return (
    <ul className="inline-flex items-center gap-1.5 align-middle" aria-label="Origem dos dados">
      {tipos.map((t) => (
        <li key={t} className="inline-flex">
          <SeloSimbolo tipo={t} />
        </li>
      ))}
    </ul>
  )
}

export type ItemLegenda = { chave: string; glifo: ReactNode; nome: string; texto: string }

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

const ORDEM: SeloTipo[] = ["reconstruido", "calculado", "exportacao", "derivado", "outros"]
