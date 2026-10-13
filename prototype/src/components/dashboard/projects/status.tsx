import { CheckCircle2, CircleDashed, PauseCircle, PlayCircle } from "lucide-react"
import type { Status } from "@/data/mock"
import { Badge } from "@/components/ui/badge"

export const STATUS_COLOR: Record<Status, string> = {
  "Não iniciado": "var(--chart-5)",
  "Em andamento": "var(--chart-1)",
  "Concluído": "var(--chart-3)",
  "Pausado": "var(--chart-4)",
}

const ICON = {
  "Não iniciado": CircleDashed,
  "Em andamento": PlayCircle,
  "Concluído": CheckCircle2,
  "Pausado": PauseCircle,
} as const

export function StatusBadge({ status }: { status: Status }) {
  const Icon = ICON[status]
  return (
    <Badge variant="outline" className="h-7 gap-1.5 px-2.5 text-sm font-medium">
      <Icon aria-hidden style={{ color: STATUS_COLOR[status] }} className="size-4!" />
      {status}
    </Badge>
  )
}
