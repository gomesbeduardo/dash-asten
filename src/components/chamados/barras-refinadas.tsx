/**
 * Barras do "No mês": o mês comparado é uma barra listrada a 45° atrás (espessura cheia) e a barra
 * sólida do mês aberto fica na frente, com ~55% da espessura, centralizada (valor comparado em cinza
 * ao lado do atual). Base reta, ponta com raio de 4 px, gradiente leve, sombra suave e grade tracejada. HTML/CSS para acompanhar a tipografia fluida (rem).
 */
import { useEffect, useState } from "react"

import { useCrescerBarra } from "@/components/app/motion/useCrescerBarra"
import { gradienteBarra, SOMBRA_BARRA } from "./barra-estilo"
import { LegendaSeries, useSeriesOcultas } from "./LegendaSeries"

export type SerieRefinada = { id: string; rotulo: string; cor: string }
export type LinhaRefinada = {
  rotulo: string
  /** Um valor por série (mesma ordem de `series`); `base` é o mesmo valor no mês comparado. */
  valores: { valor: number | null; base?: number | null }[]
}

/** Listras a 45° (0,09375 rem de traço a cada 0,3125 rem, escalam com a fonte) na cor cheia da série. */
const listras = (cor: string) =>
  `repeating-linear-gradient(45deg, ${cor} 0 0.09375rem, transparent 0.09375rem 0.3125rem)`
/** Fração da espessura que a barra sólida ocupa quando há mês comparado atrás. */
const FRACAO_SOLIDA = 0.55
/** Folga em cima e embaixo que a centraliza: (1 − 0,55) / 2. */
const FOLGA_SOLIDA = 0.225

const inteiro = new Intl.NumberFormat("pt-BR")
const padrao = (v: number) => inteiro.format(v)

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

function Barra({
  cor,
  valor,
  base,
  topo,
  rotuloBase,
  animar,
  atraso,
  titulo,
  altura,
  formatar,
}: {
  cor: string
  valor: number | null
  base?: number | null
  topo: number
  rotuloBase?: string
  animar: boolean
  atraso: number
  titulo: string
  altura: string
  formatar: (v: number) => string
}) {
  const pct = (v: number) => `${(v / topo) * 100}%`
  const comBase =
    rotuloBase !== undefined && base !== undefined && base !== null
  const fim = Math.max(valor ?? 0, comBase ? base : 0)
  const crescer = useCrescerBarra<HTMLSpanElement>(animar, atraso)
  const crescerListras = useCrescerBarra<HTMLSpanElement>(animar, atraso)
  // A espessura da sólida depende de o gráfico ter comparação, não do valor desta linha: todas
  // as barras ficam com a mesma espessura. A camada listrada fica montada (largura 0 se a base for 0)
  // para a largura animar quando a base sai de 0.
  const listrada = rotuloBase !== undefined
  const larguraBase = comBase ? base : 0
  return (
    <div className="relative" style={{ height: altura }} title={titulo}>
      {listrada && (
        <span
          data-fantasma=""
          ref={crescerListras}
          aria-hidden
          className="transicao-valor absolute top-0 left-0 rounded-r-[4px]"
          style={{
            width: pct(larguraBase),
            height: altura,
            minWidth: larguraBase > 0 ? "0.25rem" : 0,
            background: listras(cor),
          }}
        />
      )}
      {valor !== null && valor > 0 && (
        <span
          data-barra=""
          ref={crescer}
          aria-hidden
          className="transicao-valor absolute left-0 rounded-r-[4px]"
          style={{
            width: pct(valor),
            height: listrada ? `calc(${altura} * ${FRACAO_SOLIDA})` : altura,
            top: listrada ? `calc(${altura} * ${FOLGA_SOLIDA})` : 0,
            minWidth: "0.25rem",
            background: gradienteBarra(cor),
            boxShadow: SOMBRA_BARRA,
          }}
        />
      )}
      {(valor === 0 || valor === null) && (
        <span data-barra="" aria-hidden className="hidden" />
      )}
      <span
        className="transicao-valor absolute top-1/2 flex -translate-y-1/2 items-baseline gap-2 whitespace-nowrap"
        style={{ left: `calc(${pct(fim)} + 0.6rem)` }}
      >
        <span className="num text-lg font-semibold text-foreground">
          {valor === null ? "—" : formatar(valor)}
        </span>
        {comBase && (
          <span className="num text-base text-muted-foreground">
            {curtoDoMes(rotuloBase)} {formatar(base)}
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
  formatar = padrao,
  corDaLinha,
  fina = false,
}: {
  linhas: LinhaRefinada[]
  series: SerieRefinada[]
  /** Rótulo do mês comparado ("mai/26"); sem ele não há camada listrada. */
  rotuloBase?: string
  animar: boolean
  /** Texto do valor (ex.: dias); o padrão é o inteiro em pt-BR. */
  formatar?: (v: number) => string
  /** Cor própria por linha (ex.: faixa de atraso); sem ela vale a cor da série. */
  corDaLinha?: (rotulo: string) => string
  /** Barras mais finas, para duas ou mais séries por categoria. */
  fina?: boolean
}) {
  const altura = fina ? "0.9rem" : "1.25rem"
  // A entrada do zero (com atraso escalonado) é só dos elementos do 1º commit (D76): linha ou
  // série que aparece depois (filtro, competência, legenda) entra pronta e a transição cuida do resto.
  const [primeiroCommit, setPrimeiroCommit] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setPrimeiroCommit(false))
    return () => clearTimeout(t)
  }, [])
  const entra = animar && primeiroCommit
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
      return v
        ? [v.valor ?? 0, rotuloBase !== undefined ? (v.base ?? 0) : 0]
        : []
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
                ? ` (${rotuloBase}: ${formatar(v.base)})`
                : ""
            return `${rotulo} ${v?.valor == null ? "—" : formatar(v.valor)}${cmp}`
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
              className="inline-block h-4 w-6 rounded-r-[4px]"
              style={{ background: listras("var(--muted-foreground)") }}
            />
            {rotuloBase}
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={descricao}
        className="relative flex flex-1 flex-col justify-center pb-8 [--rot:clamp(7rem,26%,12rem)] [--val:7rem]"
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
              <span className="num absolute top-full mt-1.5 -translate-x-1/2 text-base whitespace-nowrap text-muted-foreground">
                {formatar(m)}
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
                      cor={corDaLinha?.(l.rotulo) ?? cor}
                      valor={v ? v.valor : 0}
                      base={v?.base}
                      topo={topo}
                      rotuloBase={rotuloBase}
                      animar={entra}
                      atraso={(r * 2 + j) * 0.04}
                      altura={altura}
                      formatar={formatar}
                      titulo={`${l.rotulo}, ${rotulo}: ${v?.valor == null ? "—" : formatar(v.valor)}`}
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
