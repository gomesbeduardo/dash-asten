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
import type { SeloTipo } from "./logica"

export const SELOS: Record<
  SeloTipo,
  { texto: string; Icon: typeof HistoryIcon; explicacao: string }
> = {
  reconstruido: {
    texto: "Reconstruído pelas datas",
    Icon: HistoryIcon,
    explicacao:
      "Calculado a partir das datas de abertura e solução da planilha mais recente, porque não há carga própria daquele mês. Indicadores que dependem da data da exportação ficam sem valor.",
  },
  calculado: {
    texto: "Calculado",
    Icon: CalculatorIcon,
    explicacao:
      "Usa colunas da data da exportação (Situação, Qtd Reabertura, SLA Renegociado). Só vale para a carga do próprio mês; meses anteriores não podem ser reconstruídos.",
  },
  exportacao: {
    texto: "Situação na exportação",
    Icon: FileClockIcon,
    explicacao:
      "É a situação do chamado na data em que a planilha foi exportada, não no fim do mês.",
  },
  derivado: {
    texto: "Derivado das datas",
    Icon: SplitIcon,
    explicacao:
      "Cada chamado é classificado pelas datas de abertura e solução em relação ao mês. Nenhuma linha da planilha é excluída.",
  },
  outros: {
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

export function Selos({ tipos }: { tipos: SeloTipo[] }) {
  if (tipos.length === 0) return null
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Origem dos dados">
      {tipos.map((t) => (
        <li key={t}>
          <Selo tipo={t} />
        </li>
      ))}
    </ul>
  )
}
