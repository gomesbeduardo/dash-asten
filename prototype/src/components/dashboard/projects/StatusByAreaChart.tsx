import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { STATUSES, type Status } from "@/data/mock"
import type { StatusByArea } from "@/lib/projects"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { STATUS_COLOR } from "./status"

const config: ChartConfig = Object.fromEntries(
  STATUSES.map((s) => [s, { label: s, color: STATUS_COLOR[s] }])
)

export function StatusByAreaChart({ data }: { data: StatusByArea[] }) {
  const [hidden, setHidden] = useState<Status[]>([])
  const toggle = (s: Status) =>
    setHidden((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="Legenda: clique para ocultar ou mostrar um status">
        {STATUSES.map((s) => {
          const off = hidden.includes(s)
          return (
            <li key={s}>
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(s)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none transition-opacity focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  off ? "opacity-45 line-through" : ""
                }`}
              >
                <span aria-hidden className="size-3 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
                {s}
              </button>
            </li>
          )
        })}
      </ul>
      <ChartContainer config={config} className="aspect-auto h-[360px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="area" type="category" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 14 }} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 14 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {STATUSES.filter((s) => !hidden.includes(s)).map((s) => (
            <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLOR[s]} stroke="var(--card)" strokeWidth={1} />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}
