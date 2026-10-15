/** Cruzamentos do bloco "No mês" (decisão 25): Mes Ref. ao lado do mês escolhido, quando há foto dele. */
import { useMemo } from "react"

import { formatarCompetencia } from "@/cargas"
import {
  areaPorSla,
  clientePorSituacao,
  clientePorTempo,
  FAIXAS_ATRASO,
  operadorPorAtraso,
  type EntradaCompetencia,
} from "@/chamados"
import { GraficoCartao } from "./cartoes"
import {
  BarrasHtml,
  LegendaCores,
  type Celula,
  type GrupoBarras,
  type Segmento,
} from "./barras-html"
import { COR } from "./graficos"
import { coresDasSituacoes, type BaseAnterior } from "./painel-foto"

const inteiro = new Intl.NumberFormat("pt-BR")
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

/** Insumos comuns: o Mes Ref. (corrigido, filtrado), o mês escolhido e as cores das situações da faixa do topo. */
export type DadosCruzamento = {
  atual: EntradaCompetencia | null
  competencia: string
  base: BaseAnterior
  entradaBase: EntradaCompetencia | null
  cores: Map<string, string>
  className?: string
}

/** Quando o mês escolhido não dá o cruzamento: a nota para o cartão ou nada (sem base). */
function notaBase(base: BaseAnterior, tem: boolean): string | undefined {
  if (base?.semFoto)
    return `${base.semFoto}: este cruzamento depende da Situação e só mostra o Mes Ref.`
  if (base && !tem)
    return `Sem dados de ${base.rotulo} para este cruzamento (falta coluna).`
  return undefined
}

/** Junta os rótulos do Mes Ref. e do mês escolhido (Mes Ref. primeiro). */
const uniao = (a: string[], b: string[]) => [...new Set([...a, ...b])]

function useDuas<T>(
  fn: (e: EntradaCompetencia | undefined) => T | null,
  d: DadosCruzamento
) {
  const a = useMemo(() => (d.atual ? fn(d.atual) : null), [d.atual]) // eslint-disable-line react-hooks/exhaustive-deps
  const b = useMemo(
    () => (d.entradaBase ? fn(d.entradaBase) : null),
    [d.entradaBase] // eslint-disable-line react-hooks/exhaustive-deps
  )
  return { a, b }
}

const mesesDe = (d: DadosCruzamento, temBase: boolean) => {
  const atual = formatarCompetencia(d.competencia)
  return { atual, base: temBase ? (d.base?.rotulo ?? "") : "" }
}

/** Cliente × Situação: não finalizados por cliente, empilhados pela Situação. */
export function ClienteSituacao(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => clientePorSituacao(e), d)
  const cores = useMemo(
    () =>
      coresDasSituacoes([
        ...d.cores.keys(),
        ...(a?.situacoes ?? []),
        ...(b?.situacoes ?? []),
      ]),
    [d.cores, a, b]
  )
  if (!a) return null
  const m = mesesDe(d, !!b)
  const rotulos = uniao(
    a.itens.map((i) => i.rotulo),
    b?.itens.map((i) => i.rotulo) ?? []
  )
  const situacoes = uniao(a.situacoes, b?.situacoes ?? [])
  const celula = (
    i: { total: number; porSituacao: Record<string, number> } | undefined
  ): Celula => ({
    texto: inteiro.format(i?.total ?? 0),
    segmentos: situacoes.map((s): Segmento => ({
      id: s,
      rotulo: s,
      valor: i?.porSituacao[s] ?? 0,
      cor: cores.get(s) ?? COR.cinza,
    })),
  })
  const grupos: GrupoBarras[] = rotulos.map((r) => ({
    rotulo: r,
    linhas: [
      ...(b
        ? [
            {
              mes: m.base,
              destaque: false,
              celulas: [celula(b.itens.find((i) => i.rotulo === r))],
            },
          ]
        : []),
      {
        mes: m.atual,
        destaque: true,
        celulas: [celula(a.itens.find((i) => i.rotulo === r))],
      },
    ],
  }))
  const maximo = Math.max(
    1,
    ...a.itens.map((i) => i.total),
    ...(b?.itens.map((i) => i.total) ?? [])
  )
  return (
    <GraficoCartao
      id="clienteSituacao"
      titulo="Cliente × Situação"
      subtitulo={`não finalizados por cliente, divididos pela Situação · ${b ? `${m.atual} ao lado de ${m.base}` : m.atual}`}
      nota={notaBase(d.base, !!b)}
      tabela={{
        colunas: ["Cliente", "Mês", ...situacoes],
        linhas: grupos.flatMap((g) =>
          g.linhas.map((l, k) => [
            k === 0 ? g.rotulo : "",
            l.mes,
            ...situacoes.map(
              (s) => l.celulas[0].segmentos.find((x) => x.id === s)?.valor ?? 0
            ),
          ])
        ),
      }}
      className={d.className}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <LegendaCores
          itens={situacoes.map((s) => ({
            id: s,
            rotulo: s,
            cor: cores.get(s) ?? COR.cinza,
          }))}
        />
        <BarrasHtml
          grupos={grupos}
          colunas={[{ maximo }]}
          descricao={`Cliente × Situação: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} ${l.celulas[0].texto}`).join(", ")}`).join("; ")}`}
        />
      </div>
    </GraficoCartao>
  )
}

const COR_FAIXA: Record<string, string> = {
  "No ciclo": "var(--chart-3)",
  "1": "#e3b341",
  "2–3": "#d9822b",
  "4–6": "#c4492a",
  "7+": "var(--late)",
}

/** Operador × Atraso: não finalizados por operador, empilhados por faixa de atraso. */
export function OperadorAtraso(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => operadorPorAtraso(e), d)
  if (!a) return null
  const m = mesesDe(d, !!b)
  const faixas = ["No ciclo", ...FAIXAS_ATRASO]
  const rotulos = uniao(
    a.map((i) => i.rotulo),
    b?.map((i) => i.rotulo) ?? []
  )
  const celula = (
    i: { total: number; porFaixa: Record<string, number> } | undefined
  ): Celula => ({
    texto: inteiro.format(i?.total ?? 0),
    segmentos: faixas.map((f) => ({
      id: f,
      rotulo: f === "No ciclo" ? f : `${f} meses`,
      valor: i?.porFaixa[f] ?? 0,
      cor: COR_FAIXA[f],
    })),
  })
  const grupos: GrupoBarras[] = rotulos.map((r) => ({
    rotulo: r,
    linhas: [
      ...(b
        ? [
            {
              mes: m.base,
              destaque: false,
              celulas: [celula(b.find((i) => i.rotulo === r))],
            },
          ]
        : []),
      {
        mes: m.atual,
        destaque: true,
        celulas: [celula(a.find((i) => i.rotulo === r))],
      },
    ],
  }))
  const maximo = Math.max(
    1,
    ...a.map((i) => i.total),
    ...(b?.map((i) => i.total) ?? [])
  )
  return (
    <GraficoCartao
      id="operadorAtraso"
      titulo="Operador × Atraso"
      subtitulo={`não finalizados por operador, por tempo desde a abertura · ${b ? `${m.atual} ao lado de ${m.base}` : m.atual}`}
      nota={notaBase(d.base, !!b)}
      tabela={{
        colunas: ["Operador", "Mês", ...faixas],
        linhas: grupos.flatMap((g) =>
          g.linhas.map((l, k) => [
            k === 0 ? g.rotulo : "",
            l.mes,
            ...faixas.map(
              (f) => l.celulas[0].segmentos.find((x) => x.id === f)?.valor ?? 0
            ),
          ])
        ),
      }}
      className={d.className}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <LegendaCores
          itens={faixas.map((f) => ({
            id: f,
            rotulo: f === "No ciclo" ? f : `${f} meses`,
            cor: COR_FAIXA[f],
          }))}
        />
        <BarrasHtml
          grupos={grupos}
          colunas={[{ maximo }]}
          descricao={`Operador × Atraso: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} ${l.celulas[0].texto}`).join(", ")}`).join("; ")}`}
        />
      </div>
    </GraficoCartao>
  )
}

const simples = (valor: number | null, cor: string, texto: string): Celula => ({
  texto,
  segmentos:
    valor === null || valor <= 0
      ? []
      : [{ id: "v", rotulo: texto, valor, cor }],
})

/** Área × SLA: % no SLA dos finalizados no mês e SLA vencido dos não finalizados. */
export function AreaSla(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => areaPorSla(e), d)
  if (!a) return null
  const m = mesesDe(d, !!b)
  const rotulos = uniao(
    a.map((i) => i.rotulo),
    b?.map((i) => i.rotulo) ?? []
  )
  type Linha = (typeof a)[number] | undefined
  const celulas = (i: Linha): Celula[] => [
    simples(
      i?.slaPct ?? null,
      "var(--chart-3)",
      i?.slaPct == null ? "—" : `${decimal.format(i.slaPct)}%`
    ),
    simples(
      i?.slaVencido ?? 0,
      "var(--late)",
      inteiro.format(i?.slaVencido ?? 0)
    ),
  ]
  const grupos: GrupoBarras[] = rotulos.map((r) => ({
    rotulo: r,
    linhas: [
      ...(b
        ? [
            {
              mes: m.base,
              destaque: false,
              celulas: celulas(b.find((i) => i.rotulo === r)),
            },
          ]
        : []),
      {
        mes: m.atual,
        destaque: true,
        celulas: celulas(a.find((i) => i.rotulo === r)),
      },
    ],
  }))
  const maxVenc = Math.max(
    1,
    ...a.map((i) => i.slaVencido),
    ...(b?.map((i) => i.slaVencido) ?? [])
  )
  return (
    <GraficoCartao
      id="areaSla"
      titulo="Área × SLA"
      subtitulo={`finalizados dentro do SLA e SLA vencido, por área · ${b ? `${m.atual} ao lado de ${m.base}` : m.atual}`}
      nota={notaBase(d.base, !!b)}
      tabela={{
        colunas: [
          "Área",
          "Mês",
          "% no SLA",
          "Finalizados com SLA",
          "SLA vencido",
        ],
        linhas: rotulos.flatMap((r) =>
          [
            ...(b ? [{ mes: m.base, i: b.find((x) => x.rotulo === r) }] : []),
            { mes: m.atual, i: a.find((x) => x.rotulo === r) },
          ].map(({ mes, i }, k) => [
            k === 0 ? r : "",
            mes,
            i?.slaPct == null ? "—" : `${decimal.format(i.slaPct)}%`,
            i?.finalizadosComSla ?? 0,
            i?.slaVencido ?? 0,
          ])
        ),
      }}
      className={d.className}
    >
      <BarrasHtml
        grupos={grupos}
        colunas={[
          { titulo: "% no SLA (finalizados no mês)", maximo: 100 },
          { titulo: "SLA vencido (não finalizados)", maximo: maxVenc },
        ]}
        descricao={`Área × SLA: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} ${l.celulas[0].texto} no SLA, ${l.celulas[1].texto} vencidos`).join(", ")}`).join("; ")}`}
      />
    </GraficoCartao>
  )
}

/** Cliente × Tempo médio: dias para resolver e dias até o aceite, por cliente. */
export function ClienteTempo(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => clientePorTempo(e), d)
  if (!a) return null
  const m = mesesDe(d, !!b)
  const rotulos = uniao(
    a.map((i) => i.rotulo),
    b?.map((i) => i.rotulo) ?? []
  )
  type Linha = (typeof a)[number] | undefined
  const dias = (v: number | null | undefined) =>
    v == null ? "—" : `${decimal.format(v)} d`
  const celulas = (i: Linha): Celula[] => [
    simples(i?.tempoMedio ?? null, "var(--chart-1)", dias(i?.tempoMedio)),
    simples(i?.tempoAceite ?? null, "var(--chart-4)", dias(i?.tempoAceite)),
  ]
  const grupos: GrupoBarras[] = rotulos.map((r) => ({
    rotulo: r,
    linhas: [
      ...(b
        ? [
            {
              mes: m.base,
              destaque: false,
              celulas: celulas(b.find((i) => i.rotulo === r)),
            },
          ]
        : []),
      {
        mes: m.atual,
        destaque: true,
        celulas: celulas(a.find((i) => i.rotulo === r)),
      },
    ],
  }))
  const max = (k: "tempoMedio" | "tempoAceite") =>
    Math.max(1, ...a.map((i) => i[k] ?? 0), ...(b?.map((i) => i[k] ?? 0) ?? []))
  return (
    <GraficoCartao
      id="clienteTempo"
      titulo="Cliente × Tempo médio"
      subtitulo={`dias para resolver e até o aceite, por cliente · ${b ? `${m.atual} ao lado de ${m.base}` : m.atual}`}
      nota={notaBase(d.base, !!b)}
      tabela={{
        colunas: [
          "Cliente",
          "Mês",
          "Resolução (dias)",
          "Até o aceite (dias)",
          "Finalizados",
        ],
        linhas: rotulos.flatMap((r) =>
          [
            ...(b ? [{ mes: m.base, i: b.find((x) => x.rotulo === r) }] : []),
            { mes: m.atual, i: a.find((x) => x.rotulo === r) },
          ].map(({ mes, i }, k) => [
            k === 0 ? r : "",
            mes,
            dias(i?.tempoMedio),
            dias(i?.tempoAceite),
            i?.finalizados ?? 0,
          ])
        ),
      }}
      className={d.className}
    >
      <BarrasHtml
        grupos={grupos}
        colunas={[
          { titulo: "Resolução", maximo: max("tempoMedio") },
          { titulo: "Até o aceite", maximo: max("tempoAceite") },
        ]}
        descricao={`Cliente × Tempo médio: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} resolução ${l.celulas[0].texto}, aceite ${l.celulas[1].texto}`).join(", ")}`).join("; ")}`}
      />
    </GraficoCartao>
  )
}
