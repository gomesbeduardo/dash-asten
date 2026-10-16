/**
 * Barras do "No mês": a barra sólida é o mês aberto; quando o mês comparado é maior, a diferença
 * continua a barra em listras a 45° (nunca atrás da sólida). Comparado menor ou igual não tem listra:
 * o valor dele fica em cinza ao lado do atual. Base reta, ponta com raio de 4 px, gradiente leve,
 * sombra suave e grade tracejada. HTML/CSS para acompanhar a tipografia fluida (rem).
 */
import { useEffect, useState } from "react"

import { chartGrow } from "@/components/app/motion/tokens"
import { useCrescerBarra } from "@/components/app/motion/useCrescerBarra"
import { useOrdemAtrasada } from "@/components/app/motion/useOrdemAtrasada"
import { gradienteBarra, SOMBRA_BARRA } from "./barra-estilo"
import { LegendaSeries, useSeriesOcultas } from "./LegendaSeries"

export type SerieRefinada = { id: string; rotulo: string; cor: string }
export type LinhaRefinada = {
  rotulo: string
  /** Um valor por série (mesma ordem de `series`); `base` é o mesmo valor no mês comparado. */
  valores: {
    valor: number | null
    base?: number | null
    /** Texto próprio do valor no rótulo (ex.: "67% (2 de 3)"); sem ele vale `formatar`. */
    texto?: string
    /** Texto próprio do valor comparado, em cinza. */
    textoBase?: string
  }[]
}

/** Listras a 45° (0,09375 rem de traço a cada 0,3125 rem, escalam com a fonte) na cor cheia da série. */
const listras = (cor: string) =>
  `repeating-linear-gradient(45deg, ${cor} 0 0.09375rem, transparent 0.09375rem 0.3125rem)`

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
  texto,
  textoBase,
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
  texto?: string
  textoBase?: string
}) {
  const pct = (v: number) => `${(v / topo) * 100}%`
  const comBase =
    rotuloBase !== undefined && base !== undefined && base !== null
  const fim = Math.max(valor ?? 0, comBase ? base : 0)
  const atual = valor ?? 0
  const crescer = useCrescerBarra<HTMLSpanElement>(animar, atraso)
  // As listras entram depois que a sólida termina de crescer, como continuação dela.
  const crescerListras = useCrescerBarra<HTMLSpanElement>(
    animar,
    atual > 0 ? atraso + chartGrow / 1000 : atraso
  )
  // A camada listrada fica montada quando o gráfico tem comparação (largura 0 sem diferença a
  // mostrar) para a posição e a largura animarem quando o comparado passa a ser maior ou menor.
  const listrada = rotuloBase !== undefined
  const sobra = comBase ? Math.max(0, base - atual) : 0
  return (
    <div className="relative" style={{ height: altura }} title={titulo}>
      {listrada && (
        <span
          data-fantasma=""
          ref={crescerListras}
          aria-hidden
          className="transicao-valor absolute top-0 rounded-r-[4px]"
          style={{
            left: pct(atual),
            width: pct(sobra),
            height: altura,
            minWidth: sobra > 0 ? "0.25rem" : 0,
            background: listras(cor),
          }}
        />
      )}
      {valor !== null && valor > 0 && (
        <span
          data-barra=""
          ref={crescer}
          aria-hidden
          className={`transicao-valor absolute top-0 left-0 ${sobra > 0 ? "" : "rounded-r-[4px]"}`}
          style={{
            width: pct(valor),
            height: altura,
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
          {valor === null ? "—" : (texto ?? formatar(valor))}
        </span>
        {comBase && (
          <span className="num text-base text-muted-foreground">
            {curtoDoMes(rotuloBase)} {textoBase ?? formatar(base)}
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
  escalaFixa,
  semRotulos = false,
  larguraValor = "7rem",
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
  /** Escala própria (ex.: 0–100%): ignora o teto calculado pelos dados. */
  escalaFixa?: { topo: number; passo: number }
  /** Esconde os nomes das linhas (o gráfico vizinho já os mostra). */
  semRotulos?: boolean
  /** Espaço reservado à direita da trilha para o rótulo do valor. */
  larguraValor?: string
}) {
  const altura = fina ? "0.9rem" : "1.25rem"
  // Ao filtrar, as barras deslizam na ordem antiga e só depois as linhas trocam de lugar.
  const ordenadas = useOrdemAtrasada(linhas, (l) => l.rotulo)
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
  const { passo, topo } = escalaFixa ?? escala(Math.max(0, ...todos))
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
            return `${rotulo} ${v?.valor == null ? "—" : (v.texto ?? formatar(v.valor))}${cmp}`
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
        className={`relative flex flex-1 flex-col justify-center pb-8 ${semRotulos ? "[--rot:0rem]" : "[--rot:clamp(7rem,26%,12rem)]"}`}
        style={{ "--val": larguraValor } as React.CSSProperties}
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
          {ordenadas.map((l, r) => (
            <div
              key={l.rotulo}
              className="grid grid-cols-[var(--rot)_1fr] items-center gap-x-3"
            >
              <span
                className="truncate text-right text-lg font-medium text-foreground"
                title={l.rotulo}
                aria-hidden={semRotulos || undefined}
              >
                {semRotulos ? "\u00a0" : l.rotulo}
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
                      texto={v?.texto}
                      textoBase={v?.textoBase}
                      titulo={`${l.rotulo}, ${rotulo}: ${v?.valor == null ? "—" : (v.texto ?? formatar(v.valor))}`}
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
