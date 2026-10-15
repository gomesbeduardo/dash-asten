/**
 * Barras do "No mês" (estilo refinado): pontas arredondadas, gradiente leve, sombra suave e grade
 * vertical tracejada. O mês comparado é um contorno tracejado da mesma forma, atrás da barra atual,
 * com o valor dele em cinza ao lado do atual. Em HTML/CSS para acompanhar a tipografia fluida (rem).
 */
import { motion, useReducedMotion } from "motion/react"

import { chartGrow } from "@/components/app/motion/tokens"
import { gradienteBarra, SOMBRA_BARRA } from "./barra-estilo"
import { LegendaSeries, useSeriesOcultas } from "./LegendaSeries"

export type SerieRefinada = { id: string; rotulo: string; cor: string }
export type LinhaRefinada = {
  rotulo: string
  /** Um valor por série (mesma ordem de `series`); `base` é o mesmo valor no mês comparado. */
  valores: { valor: number; base?: number | null }[]
}

const inteiro = new Intl.NumberFormat("pt-BR")

/** "mai/26" vira "mai"; "abr/26 v1" vira "abr v1" (o ano fica na legenda). */
const curtoDoMes = (r: string) => r.replace(/\/\d{2}\b/, "")

/** Teto "redondo" do eixo e o passo das linhas da grade (4 a 5 divisões). */
function escala(maximo: number) {
  const bruto = Math.max(maximo / 4, 1)
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 5, 10].map((f) => f * pot).find((p) => p >= bruto) ?? pot
  const topo = Math.max(passo, Math.ceil(maximo / passo) * passo)
  return { passo, topo }
}

const ALTURA = "1.25rem"

function Barra({
  cor,
  valor,
  base,
  topo,
  rotuloBase,
  animar,
  atraso,
  titulo,
}: {
  cor: string
  valor: number
  base?: number | null
  topo: number
  rotuloBase?: string
  animar: boolean
  atraso: number
  titulo: string
}) {
  const reduce = useReducedMotion()
  const pct = (v: number) => `${(v / topo) * 100}%`
  const comBase =
    rotuloBase !== undefined && base !== undefined && base !== null
  const fim = Math.max(valor, comBase ? base : 0)
  const anima = animar && !reduce
  return (
    <div className="relative" style={{ height: ALTURA }} title={titulo}>
      {comBase && base > 0 && (
        <motion.span
          data-contorno=""
          aria-hidden
          className="absolute top-0 left-0 rounded-r-full border-[1.5px] border-dashed border-muted-foreground/60"
          style={{ width: pct(base), height: ALTURA, minWidth: ALTURA }}
          initial={anima ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: chartGrow / 1000, ease: "easeOut" }}
        />
      )}
      {valor > 0 && (
        <motion.span
          data-barra=""
          aria-hidden
          className="absolute top-0 left-0 origin-left rounded-r-full"
          style={{
            width: pct(valor),
            height: ALTURA,
            minWidth: ALTURA,
            background: gradienteBarra(cor),
            boxShadow: SOMBRA_BARRA,
          }}
          initial={anima ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{
            duration: chartGrow / 1000,
            ease: "easeOut",
            delay: atraso,
          }}
        />
      )}
      {valor === 0 && <span data-barra="" aria-hidden className="hidden" />}
      <span
        className="absolute top-1/2 flex -translate-y-1/2 items-baseline gap-1.5 whitespace-nowrap"
        style={{ left: `calc(${pct(fim)} + 0.6rem)` }}
      >
        <span className="num text-lg font-semibold text-foreground">
          {inteiro.format(valor)}
        </span>
        {comBase && (
          <span className="num text-base text-muted-foreground">
            {curtoDoMes(rotuloBase)} {inteiro.format(base)}
          </span>
        )}
      </span>
    </div>
  )
}

export function BarrasRefinadas({
  linhas,
  series,
  rotuloBase,
  animar,
}: {
  linhas: LinhaRefinada[]
  series: SerieRefinada[]
  /** Rótulo do mês comparado ("mai/26"); sem ele não há contorno. */
  rotuloBase?: string
  animar: boolean
}) {
  const { ocultas, alternar } = useSeriesOcultas(
    series.map((s) => s.id).join("|"),
    series.map((s) => s.id)
  )
  const visiveis = series
    .map((s, i) => ({ ...s, i }))
    .filter((s) => !ocultas.includes(s.id))
  const todos = linhas.flatMap((l) =>
    visiveis.flatMap(({ i }) => {
      const v = l.valores[i]
      return v ? [v.valor, rotuloBase !== undefined ? (v.base ?? 0) : 0] : []
    })
  )
  const { passo, topo } = escala(Math.max(0, ...todos))
  const marcas = Array.from(
    { length: Math.round(topo / passo) + 1 },
    (_, k) => k * passo
  )
  const descricao = linhas
    .map(
      (l) =>
        `${l.rotulo}: ${visiveis
          .map(({ rotulo, i }) => {
            const v = l.valores[i]
            const cmp =
              rotuloBase !== undefined &&
              v?.base !== undefined &&
              v.base !== null
                ? ` (${rotuloBase}: ${inteiro.format(v.base)})`
                : ""
            return `${rotulo} ${inteiro.format(v?.valor ?? 0)}${cmp}`
          })
          .join(", ")}`
    )
    .join("; ")
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendaSeries itens={series} ocultas={ocultas} onAlternar={alternar} />
        {rotuloBase !== undefined && (
          <span className="flex items-center gap-2 px-2.5 text-base text-muted-foreground">
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded-r-full border-[1.5px] border-dashed border-muted-foreground/60"
            />
            {rotuloBase}
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={descricao}
        className="relative flex flex-1 flex-col justify-center pb-8 [--rot:clamp(7rem,26%,12rem)] [--val:6.5rem]"
      >
        {/* grade vertical tracejada, na mesma largura das trilhas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[var(--val)] left-[calc(var(--rot)+0.75rem)]"
        >
          {marcas.map((m) => (
            <span
              key={m}
              className="absolute top-0 bottom-8 -translate-x-1/2"
              style={{
                left: `${(m / topo) * 100}%`,
                borderLeft:
                  m === 0
                    ? "1px solid var(--border)"
                    : "1px dashed color-mix(in srgb, var(--muted-foreground) 28%, transparent)",
              }}
            >
              <span className="num absolute top-full mt-1.5 -translate-x-1/2 text-base text-muted-foreground">
                {inteiro.format(m)}
              </span>
            </span>
          ))}
        </div>
        <div className="relative flex flex-col gap-6">
          {linhas.map((l, r) => (
            <div
              key={l.rotulo}
              className="grid grid-cols-[var(--rot)_1fr] items-center gap-x-3"
            >
              <span
                className="truncate text-right text-lg font-medium text-foreground"
                title={l.rotulo}
              >
                {l.rotulo}
              </span>
              <div className="mr-[var(--val)] flex flex-col gap-2">
                {visiveis.map(({ id, cor, rotulo, i }, j) => {
                  const v = l.valores[i]
                  return (
                    <Barra
                      key={id}
                      cor={cor}
                      valor={v?.valor ?? 0}
                      base={v?.base}
                      topo={topo}
                      rotuloBase={rotuloBase}
                      animar={animar}
                      atraso={(r * 2 + j) * 0.04}
                      titulo={`${l.rotulo}, ${rotulo}: ${inteiro.format(v?.valor ?? 0)}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
