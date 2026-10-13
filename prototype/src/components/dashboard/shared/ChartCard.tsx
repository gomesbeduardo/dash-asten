// STUB — implementado pela fatia "shell + shared".
import type { ChartCardProps } from "./contracts"

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  )
}
