import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type FormaCarregando = "painel" | "leituras" | "comparar" | "evolucao"

const bloco = (i: number, className: string) => (
  <Skeleton key={i} className={cn("rounded-lg", className)} />
)
const blocos = (n: number, className: string) =>
  Array.from({ length: n }, (_, i) => bloco(i, className))

/** Esqueleto do corpo de cada aba (mesmas grades do painel real, altura aproximada). */
function Forma({ forma }: { forma: FormaCarregando }) {
  switch (forma) {
    case "painel":
      return (
        <div className="flex flex-col gap-8">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-11 w-96" />
          {bloco(0, "h-56")}
          <div className="grid grid-cols-2 gap-5 min-[2200px]:grid-cols-[repeat(24,minmax(0,1fr))] md:max-[2199px]:grid-cols-4">
            {blocos(4, "h-40 min-[2200px]:col-span-6")}
            {blocos(8, "h-28 min-[2200px]:col-span-3")}
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {bloco(0, "h-96 xl:col-span-2")}
              {bloco(1, "h-96")}
            </div>
            <div className="grid grid-cols-1 gap-5 min-[2200px]:grid-cols-4 xl:max-[2199px]:grid-cols-2">
              {blocos(4, "h-96")}
            </div>
            <div className="grid grid-cols-1 gap-5 min-[2200px]:grid-cols-4 xl:max-[2199px]:grid-cols-2">
              {blocos(4, "h-96")}
            </div>
          </div>
        </div>
      )
    case "leituras":
      return (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-6 w-2/3" />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {blocos(6, "h-44")}
          </div>
        </div>
      )
    case "comparar":
      return (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap gap-6">{blocos(2, "h-16 w-72")}</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {blocos(9, "h-40")}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {blocos(4, "h-96")}
          </div>
        </div>
      )
    case "evolucao":
      return (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3 min-[137.5rem]:grid-cols-4">
            {blocos(4, "h-80")}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {blocos(2, "h-96")}
          </div>
        </div>
      )
  }
}

const ENTRADA_ATRASADA =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:delay-[120ms] motion-safe:fill-mode-both"

/**
 * Carregamento sem área vazia: esqueleto com o formato da aba. Dentro da
 * Apresentacao ele aparece na hora (o fade cruzado da aba já evita o pisca);
 * `atraso` o faz entrar com ~120 ms de atraso, para telas sem fade cruzado.
 */
export function Carregando({
  texto = "Carregando competências…",
  forma = "painel",
  atraso = false,
}: {
  texto?: string
  forma?: FormaCarregando
  atraso?: boolean
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={atraso ? ENTRADA_ATRASADA : undefined}
    >
      <p className="sr-only">{texto}</p>
      <div aria-hidden>
        <Forma forma={forma} />
      </div>
    </div>
  )
}
