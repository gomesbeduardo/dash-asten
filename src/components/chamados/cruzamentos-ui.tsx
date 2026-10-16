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
import { useCrescerBarra } from "@/components/app/motion/useCrescerBarra"
import { useOrdemAtrasada } from "@/components/app/motion/useOrdemAtrasada"
import { gradienteBarra, SOMBRA_BARRA } from "./barra-estilo"
import { GraficoCartao } from "./cartoes"
import {
  BarrasHtml,
  LegendaCores,
  type Celula,
  type GrupoBarras,
  type Segmento,
} from "./barras-html"
import {
  clientesPorTotal,
  operadoresPorAtraso,
  ordemFaixas,
  ordemSituacoes,
} from "./cruzamentos-ordem"
import { BarrasRefinadas } from "./barras-refinadas"
import { corDaFaixa, COR_FIN, coresDasSituacoes } from "./cores"
import type { BaseAnterior } from "./painel-foto"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const inteiro = new Intl.NumberFormat("pt-BR")
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

/** Insumos comuns: o Mes Ref. (corrigido, filtrado), o mês escolhido e as cores das situações da faixa do topo. */
export type DadosCruzamento = {
  atual: EntradaCompetencia | null
  competencia: string
  base: BaseAnterior
  entradaBase: EntradaCompetencia | null
  cores: Map<string, string>
  /** Crescimento das barras na entrada (a mesma prop `animar` dos outros gráficos). */
  animar?: boolean
  className?: string
}

/** Quando o mês escolhido não dá o cruzamento: a nota para o cartão ou nada (sem base). */
function notaBase(base: BaseAnterior, tem: boolean): string | undefined {
  if (base?.semFoto)
    return `${base.semFoto}: este cruzamento depende da Situação e só mostra o mês de referência`
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

const SEM_INFO_COR = "var(--sit-outra)"

/** Cliente × Situação: não finalizados por cliente, empilhados pela Situação (a de maior total fica na base). */
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
  // clientes pelo total do mês aberto; os que só existem no comparado vão depois
  const rotulos = uniao(
    clientesPorTotal(a.itens).map((i) => i.rotulo),
    b?.itens.map((i) => i.rotulo) ?? []
  )
  // ordem fixa dos segmentos: a situação de maior total (nos dois meses) na base
  const situacoes = ordemSituacoes(uniao(a.situacoes, b?.situacoes ?? []), [
    a.itens,
    b?.itens ?? [],
  ])
  const celula = (
    i: { total: number; porSituacao: Record<string, number> } | undefined
  ): Celula => ({
    texto: inteiro.format(i?.total ?? 0),
    segmentos: situacoes.map((s): Segmento => ({
      id: s,
      rotulo: s,
      valor: i?.porSituacao[s] ?? 0,
      cor: cores.get(s) ?? SEM_INFO_COR,
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
      subtitulo="não finalizados por cliente, divididos pela Situação"
      contexto={b ? `${m.atual} ao lado de ${m.base}` : m.atual}
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
            cor: cores.get(s) ?? SEM_INFO_COR,
          }))}
        />
        <BarrasHtml
          grupos={grupos}
          colunas={[{ maximo }]}
          animar={d.animar}
          descricao={`Cliente × Situação: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} ${l.celulas[0].texto}`).join(", ")}`).join("; ")}`}
        />
      </div>
    </GraficoCartao>
  )
}

/** Operador × Atraso: não finalizados por operador, empilhados por faixa (7+ na base; uma cor, claro a escuro). */
export function OperadorAtraso(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => operadorPorAtraso(e), d)
  if (!a) return null
  const m = mesesDe(d, !!b)
  // 7+ na base e "No ciclo" (sem atraso) na ponta
  const faixas = ordemFaixas(FAIXAS_ATRASO)
  const rotulos = uniao(
    operadoresPorAtraso(a).map((i) => i.rotulo),
    b?.map((i) => i.rotulo) ?? []
  )
  const nomeFaixa = (f: string) =>
    f === "No ciclo" ? f : f === "1" ? "1 mês" : `${f} meses`
  const celula = (
    i: { total: number; porFaixa: Record<string, number> } | undefined
  ): Celula => ({
    texto: inteiro.format(i?.total ?? 0),
    segmentos: faixas.map((f) => ({
      id: f,
      rotulo: nomeFaixa(f),
      valor: i?.porFaixa[f] ?? 0,
      cor: corDaFaixa(f),
      claro: f === "1" || f === "No ciclo",
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
      subtitulo="não finalizados por operador, por tempo desde a abertura"
      contexto={b ? `${m.atual} ao lado de ${m.base}` : m.atual}
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
            rotulo: nomeFaixa(f),
            cor: corDaFaixa(f),
          }))}
        />
        <BarrasHtml
          grupos={grupos}
          colunas={[{ maximo }]}
          animar={d.animar}
          descricao={`Operador × Atraso: ${grupos.map((g) => `${g.rotulo} ${g.linhas.map((l) => `${l.mes} ${l.celulas[0].texto}`).join(", ")}`).join("; ")}`}
        />
      </div>
    </GraficoCartao>
  )
}

/** Barra de SLA vencido: largura proporcional ao maior da tabela, com a mesma entrada e transição das outras. */
function BarraVencidos({
  valor,
  maximo,
  animar = false,
}: {
  valor: number
  maximo: number
  animar?: boolean
}) {
  const crescer = useCrescerBarra<HTMLSpanElement>(animar)
  return (
    <span
      data-barra-vencidos=""
      ref={crescer}
      className="transicao-valor block h-[1.25rem] rounded-r-[4px]"
      style={{
        width: `${(valor / maximo) * 100}%`,
        minWidth: valor > 0 ? "0.25rem" : 0,
        background: gradienteBarra("var(--vencido)"),
        boxShadow: valor > 0 ? SOMBRA_BARRA : undefined,
      }}
    />
  )
}

/** Trilha de 0 a 100% com a barra da %; sem número escrito (o valor está no tooltip e no aria-label). `meta` liga uma referência depois. */
export function BarraPercentual({
  rotulo,
  pct,
  meta,
  animar = false,
}: {
  rotulo: string
  pct: number | null
  meta?: number
  animar?: boolean
}) {
  const crescer = useCrescerBarra<HTMLSpanElement>(animar)
  if (pct === null)
    return (
      <span className="text-base text-muted-foreground">
        sem finalizados com SLA
      </span>
    )
  const texto = `${decimal.format(pct)}%`
  return (
    <div
      role="img"
      aria-label={`${rotulo}: ${texto} dos finalizados dentro do SLA`}
      title={`${rotulo}: ${texto}`}
      className="relative h-[1.25rem] w-full rounded-r-[4px] bg-muted"
    >
      <span
        data-barra-sla=""
        ref={crescer}
        className="transicao-valor absolute top-0 left-0 h-full rounded-r-[4px]"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: gradienteBarra(COR_FIN),
          boxShadow: SOMBRA_BARRA,
        }}
      />
      {meta !== undefined && (
        <span
          data-meta=""
          aria-hidden
          className="transicao-valor absolute -top-0.5 h-[calc(100%+4px)] w-[3px] -translate-x-1/2 rounded-[1px] bg-foreground"
          style={{ left: `${meta}%` }}
        />
      )}
    </div>
  )
}

/** Área × SLA: tabela com barras embutidas, uma linha por área, ordenadas por vencidos. */
export function AreaSla(d: DadosCruzamento) {
  const { a } = useDuas((e) => areaPorSla(e), d)
  // Ao filtrar, as barras deslizam na ordem antiga e só depois as áreas trocam de lugar.
  const linhas = useOrdemAtrasada(
    [...(a ?? [])].sort(
      (x, y) =>
        y.slaVencido - x.slaVencido || x.rotulo.localeCompare(y.rotulo, "pt-BR")
    ),
    (i) => i.rotulo
  )
  if (!a) return null
  const m = mesesDe(d, false)
  const maxVenc = Math.max(1, ...linhas.map((i) => i.slaVencido))
  return (
    <GraficoCartao
      id="areaSla"
      titulo="Área × SLA"
      subtitulo="finalizados dentro do SLA e SLA vencido, por área"
      contexto={m.atual}
      nota={notaBase(d.base, false)}
      tabela={{
        colunas: ["Área", "% no SLA", "Finalizados com SLA", "SLA vencido"],
        linhas: linhas.map((i) => [
          i.rotulo,
          i.slaPct == null ? "—" : `${decimal.format(i.slaPct)}%`,
          i.finalizadosComSla ?? 0,
          i.slaVencido,
        ]),
      }}
      className={d.className}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[26%] text-base">Área</TableHead>
            <TableHead className="w-[42%] text-base whitespace-normal">
              No SLA (% dos finalizados no mês)
            </TableHead>
            <TableHead className="min-w-[8.5rem] text-base whitespace-normal">
              Vencidos (nº de não finalizados)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((i) => (
            <TableRow key={i.rotulo}>
              <TableCell className="text-lg font-medium whitespace-normal">
                {i.rotulo}
              </TableCell>
              <TableCell>
                <BarraPercentual
                  rotulo={i.rotulo}
                  pct={i.slaPct}
                  animar={d.animar}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1" aria-hidden>
                    <BarraVencidos
                      valor={i.slaVencido}
                      maximo={maxVenc}
                      animar={d.animar}
                    />
                  </div>
                  <span
                    data-vencidos-num=""
                    className="num min-w-[3ch] shrink-0 text-right text-lg font-semibold text-foreground tabular-nums"
                  >
                    {inteiro.format(i.slaVencido)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GraficoCartao>
  )
}

/** Cliente × Tempo médio: duas barras finas por cliente (resolução e até o aceite), mesma escala em dias. */
export function ClienteTempo(d: DadosCruzamento) {
  const { a, b } = useDuas((e) => clientePorTempo(e), d)
  if (!a) return null
  const m = mesesDe(d, !!b)
  const rotulos = uniao(
    [...a]
      .sort((x, y) => (y.tempoMedio ?? -1) - (x.tempoMedio ?? -1))
      .map((i) => i.rotulo),
    b?.map((i) => i.rotulo) ?? []
  )
  const dias = (v: number | null | undefined) =>
    v == null ? "—" : `${decimal.format(v)} d`
  const linhas = rotulos.map((r) => {
    const x = a.find((i) => i.rotulo === r)
    const y = b?.find((i) => i.rotulo === r)
    return {
      rotulo: r,
      valores: [
        {
          valor: x?.tempoMedio ?? null,
          base: b ? (y?.tempoMedio ?? null) : undefined,
        },
        {
          valor: x?.tempoAceite ?? null,
          base: b ? (y?.tempoAceite ?? null) : undefined,
        },
      ],
    }
  })
  return (
    <GraficoCartao
      id="clienteTempo"
      titulo="Cliente × Tempo médio"
      subtitulo="dias para resolver e até o aceite, por cliente"
      contexto={b ? `${m.atual} ao lado de ${m.base}` : m.atual}
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
      <BarrasRefinadas
        linhas={linhas}
        series={[
          { id: "res", rotulo: "Resolução", cor: COR_FIN },
          { id: "ace", rotulo: "Até o aceite", cor: "var(--chart-4)" },
        ]}
        rotuloBase={b ? m.base : undefined}
        animar={d.animar ?? false}
        formatar={(v) => `${decimal.format(v)} d`}
        fina
      />
    </GraficoCartao>
  )
}
