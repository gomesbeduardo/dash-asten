/** Modal de um indicador do Comparar: gráfico grande à esquerda, números por competência à direita. */
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import type { FormatoKpi } from "@/chamados"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { raioBarra, SOMBRA_BARRA_SVG, TRACEJADO_GRADE } from "./barra-estilo"
import { ColunaTopoArredondada, DefsGradiente, urlGradiente } from "./barra-svg"
import { animacao, COR } from "./graficos"
import { formatarKpi } from "./logica"
import { MarcaCorrigido } from "./selos"

export type PontoKpi = {
  competencia: string
  rotulo: string
  valor: number | null
  nota: string | null
  /** Valor corrigido por posição posterior (D65): quem corrigiu e o valor original, já formatado. */
  marca?: { por: string[]; original: string } | null
}

export type DeltaKpi = {
  texto: string
  tom: "bom" | "ruim" | "neutro"
  rotuloTom?: string
  sentido?: "alta" | "queda" | "igual"
} | null

const TOM = {
  bom: "text-positive",
  ruim: "text-late",
  neutro: "text-muted-foreground",
} as const

const EIXO = { fontSize: "1.1250rem", fill: "var(--muted-foreground)" }

export function ModalKpi({
  aberto,
  titulo,
  formato,
  pontos,
  delta,
  animar,
  onFechar,
  onCloseAutoFocus,
}: {
  aberto: boolean
  titulo: string
  formato: FormatoKpi
  pontos: PontoKpi[]
  delta: DeltaKpi
  animar: boolean
  onFechar: () => void
  onCloseAutoFocus: (e: Event) => void
}) {
  const ultimo = pontos.length - 1
  const dados = pontos.map((p, i) => ({
    ...p,
    atual: i === ultimo,
    barra: p.valor,
  }))
  const fmt = (v: number | null) => formatarKpi(v, formato)
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      {aberto && (
        <DialogContent
          className="max-h-[94svh] overflow-y-auto sm:max-w-6xl"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-4xl leading-tight text-primary">
              <span>{titulo}</span>
            </DialogTitle>
            <DialogDescription className="text-lg">
              Gráfico em ordem cronológica; a lista começa pelo mês atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ChartContainer
              config={{ barra: { label: titulo, color: COR.principal } }}
              className={`aspect-auto h-72 w-full min-w-0 lg:h-[26rem] ${SOMBRA_BARRA_SVG}`}
              role="img"
              aria-label={`${titulo}: ${pontos.map((p) => `${p.rotulo} ${fmt(p.valor)}`).join(", ")}`}
            >
              <BarChart
                data={dados}
                margin={{ top: 36, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="color-mix(in srgb, var(--border) 45%, transparent)"
                  strokeDasharray={TRACEJADO_GRADE}
                />
                <DefsGradiente
                  cores={[COR.principal, COR.cinza]}
                  orientacao="vertical"
                />
                <XAxis
                  dataKey="rotulo"
                  interval="preserveStartEnd"
                  tick={EIXO}
                  tickMargin={8}
                  tickLine={false}
                />
                <YAxis
                  tick={EIXO}
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tickCount={4}
                  ticks={
                    formato === "percentual" ? [0, 25, 50, 75, 100] : undefined
                  }
                  domain={[0, formato === "percentual" ? 100 : "auto"]}
                  tickFormatter={(v) =>
                    formato === "percentual" ? `${v}%` : String(v)
                  }
                />
                <Bar
                  dataKey="barra"
                  radius={raioBarra(56, "vertical")}
                  maxBarSize={96}
                  {...animacao(animar)}
                  shape={(p: {
                    x?: number
                    y?: number
                    width?: number
                    height?: number
                    payload?: (typeof dados)[number]
                  }) => {
                    const d = p.payload
                    const cor = d?.atual ? COR.principal : COR.cinza
                    return (
                      <ColunaTopoArredondada
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        fill={urlGradiente(cor, "vertical")}
                      />
                    )
                  }}
                >
                  <LabelList
                    dataKey="barra"
                    position="top"
                    offset={8}
                    formatter={(v: unknown) =>
                      v === null || v === undefined ? "—" : fmt(Number(v))
                    }
                    style={{
                      fontSize: "1.1250rem",
                      fontWeight: 700,
                      fill: "var(--primary)",
                    }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-col gap-4">
              <ul
                aria-label="Valores por competência"
                className="flex flex-col divide-y rounded-lg border bg-background/60"
              >
                {[...pontos].reverse().map((p, ri) => {
                  const atual = ri === 0
                  return (
                    <li
                      key={p.competencia}
                      aria-current={atual ? "true" : undefined}
                      className={cn(
                        "flex items-baseline justify-between gap-3 px-4 py-3",
                        atual && "rounded-t-lg bg-brand/15"
                      )}
                    >
                      <span className="flex items-center gap-2 text-xl">
                        <span className={cn(atual && "font-semibold")}>
                          {p.rotulo}
                        </span>
                        {atual && (
                          <span className="rounded bg-brand-ink px-1.5 py-0.5 text-sm font-medium text-primary-foreground">
                            atual
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "num font-display text-primary",
                          atual
                            ? "text-5xl font-bold"
                            : "text-3xl font-semibold"
                        )}
                      >
                        {fmt(p.valor)}
                        {p.nota && (
                          <span className="block text-right font-sans text-sm font-normal text-muted-foreground">
                            {p.nota}
                          </span>
                        )}
                        {p.marca && (
                          <MarcaCorrigido
                            por={p.marca.por}
                            original={p.marca.original}
                            className="mt-1 ml-auto flex"
                          />
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p
                className={cn(
                  "num text-2xl font-semibold",
                  delta ? TOM[delta.tom] : "text-muted-foreground"
                )}
              >
                <span className="mr-2 text-base font-normal text-muted-foreground">
                  Δ
                </span>
                {delta ? (
                  <>
                    {delta.texto.replace(/ vs\s*/, " ").trim()}
                    {delta.rotuloTom && (
                      <span className="ml-2 text-lg font-normal">
                        {delta.sentido === "alta" ? "↑" : "↓"} {delta.rotuloTom}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
