import { mapearColunas, type CampoChamado } from "./mapeamento"
import {
  fimDoDia,
  lerFoto,
  limitesDaCompetencia,
  SEM_INFO,
  FAIXAS_ATRASO,
  type Chamado,
} from "./metricas"
import { mesesAteCompetencia, texto } from "./situacao"
import type { EntradaCompetencia } from "./tipos"

/**
 * Cruzamentos entre índices do bloco "No mês" do Painel (D63–D65). Funções puras sobre uma foto.
 *
 * Mês escolhido para comparar: o chamador passa a foto desse mês já corrigida por `corrigirFoto`.
 * Para mês SEM foto estes cruzamentos não existem (as datas sozinhas não dão Situação nem atraso):
 * passe `undefined` e as funções devolvem `null`; o chamador mostra "sem foto".
 *
 * `null` também quando falta a coluna necessária ou há filtro ativo sem a coluna nesta carga
 * (o chamador esconde o gráfico). Valor vazio vira "(sem informação)". Acima de `maxItens`
 * grupos, o resto é somado em "Outros". Grupos sem nada a mostrar (ex.: cliente sem nenhum
 * não finalizado no cruzamento por situação) são omitidos, e nenhuma linha some da planilha (D34).
 */
export const MAX_ITENS_CRUZAMENTO = 8

export const NO_CICLO = "No ciclo"
const ROTULOS_ATRASO = [NO_CICLO, ...FAIXAS_ATRASO]

export type ClienteSituacao = {
  rotulo: string
  total: number
  porSituacao: Record<string, number>
}
export type OperadorAtraso = {
  rotulo: string
  total: number
  /** Chaves: "No ciclo", "1", "2–3", "4–6", "7+" (sempre todas presentes). */
  porFaixa: Record<string, number>
}
export type AreaSla = {
  rotulo: string
  /** % no SLA dos finalizados no mês com SLA; null sem nenhum. */
  slaPct: number | null
  finalizadosComSla: number
  /** Não finalizados com SLA vigente vencido antes do fim do mês. */
  slaVencido: number
}
export type ClienteTempo = {
  rotulo: string
  tempoMedio: number | null
  tempoAceite: number | null
  finalizados: number
}

const DIA = 86_400_000
const r1 = (xs: number[]) =>
  xs.length
    ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10
    : null

type Contexto = {
  chamados: Chamado[]
  chave: (c: Chamado) => string
  inicio: number
  fim: number
}

/** Lê a foto e exige as colunas; `null` se não der para o cruzamento. */
function contexto(
  entrada: EntradaCompetencia | undefined,
  agrupa: CampoChamado,
  exige: CampoChamado[]
): Contexto | null {
  if (!entrada || (entrada.colunasSemFiltro ?? []).length > 0) return null
  const { mapa } = mapearColunas(entrada.sheet)
  if (!mapa[agrupa] || !mapa.situacao || exige.some((c) => !mapa[c]))
    return null
  const col = mapa[agrupa]!
  const { chamados } = lerFoto(entrada)
  const { inicio, fim } = limitesDaCompetencia(entrada.competencia)
  return {
    chamados,
    chave: (c) => texto(c.row[col]) ?? SEM_INFO,
    inicio,
    fim,
  }
}

/** Agrupa, calcula cada grupo, descarta os vazios, ordena e funde o excedente em "Outros". */
function agrupar<T extends { rotulo: string }>(
  ctx: Contexto,
  maxItens: number,
  calc: (rotulo: string, cs: Chamado[]) => T,
  peso: (t: T) => number
): T[] {
  const grupos = new Map<string, Chamado[]>()
  for (const c of ctx.chamados) {
    const k = ctx.chave(c)
    grupos.set(k, [...(grupos.get(k) ?? []), c])
  }
  const itens = [...grupos.entries()]
    .map(([rotulo, cs]) => ({ cs, t: calc(rotulo, cs) }))
    .filter((x) => peso(x.t) > 0)
    .sort(
      (a, b) => peso(b.t) - peso(a.t) || a.t.rotulo.localeCompare(b.t.rotulo)
    )
  if (itens.length <= maxItens) return itens.map((x) => x.t)
  const resto = itens.slice(maxItens).flatMap((x) => x.cs)
  return [...itens.slice(0, maxItens).map((x) => x.t), calc("Outros", resto)]
}

/** Não finalizados por cliente, divididos pela Situação literal. Clientes sem não finalizados são omitidos. */
export function clientePorSituacao(
  entrada: EntradaCompetencia | undefined,
  maxItens = MAX_ITENS_CRUZAMENTO
): { itens: ClienteSituacao[]; situacoes: string[] } | null {
  const ctx = contexto(entrada, "cliente", [])
  if (!ctx) return null
  const itens = agrupar<ClienteSituacao>(
    ctx,
    maxItens,
    (rotulo, cs) => {
      const porSituacao: Record<string, number> = {}
      for (const c of cs.filter((x) => x.naoFinalizado))
        porSituacao[c.situacaoTexto] = (porSituacao[c.situacaoTexto] ?? 0) + 1
      return {
        rotulo,
        total: Object.values(porSituacao).reduce((a, b) => a + b, 0),
        porSituacao,
      }
    },
    (t) => t.total
  )
  const soma = new Map<string, number>()
  for (const i of itens)
    for (const [s, n] of Object.entries(i.porSituacao))
      soma.set(s, (soma.get(s) ?? 0) + n)
  const situacoes = [...soma.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([s]) => s)
  return { itens, situacoes }
}

/** Não finalizados por operador: "No ciclo" (aberto no mês do Mes Ref.) e faixas de atraso. */
export function operadorPorAtraso(
  entrada: EntradaCompetencia | undefined,
  maxItens = MAX_ITENS_CRUZAMENTO
): OperadorAtraso[] | null {
  const ctx = contexto(entrada, "operador", [])
  if (!ctx || !entrada) return null
  return agrupar<OperadorAtraso>(
    ctx,
    maxItens,
    (rotulo, cs) => {
      const porFaixa = Object.fromEntries(ROTULOS_ATRASO.map((r) => [r, 0]))
      let total = 0
      for (const c of cs) {
        if (!c.naoFinalizado) continue
        total++
        if (c.abertura >= ctx.inicio) porFaixa[NO_CICLO]++
        else {
          const m = mesesAteCompetencia(c.abertura, entrada.competencia)
          porFaixa[FAIXAS_ATRASO[m <= 1 ? 0 : m <= 3 ? 1 : m <= 6 ? 2 : 3]]++
        }
      }
      return { rotulo, total, porFaixa }
    },
    (t) => t.total
  )
}

/** Por Área (módulo): % no SLA dos finalizados no mês e SLA vencido dos não finalizados. */
export function areaPorSla(
  entrada: EntradaCompetencia | undefined,
  maxItens = MAX_ITENS_CRUZAMENTO
): AreaSla[] | null {
  const ctx = contexto(entrada, "area", ["solucao"])
  if (!ctx) return null
  const noMes = (t: number | null) =>
    t !== null && t >= ctx.inicio && t <= ctx.fim
  return agrupar<AreaSla>(
    ctx,
    maxItens,
    (rotulo, cs) => {
      const fin = cs.filter(
        (c) => !c.naoFinalizado && noMes(c.solucao) && c.sla !== null
      )
      const dentro = fin.filter((c) => c.solucao! <= fimDoDia(c.sla!)).length
      return {
        rotulo,
        slaPct: fin.length ? (dentro / fin.length) * 100 : null,
        finalizadosComSla: fin.length,
        slaVencido: cs.filter(
          (c) => c.naoFinalizado && c.sla !== null && fimDoDia(c.sla) < ctx.fim
        ).length,
      }
    },
    (t) => t.finalizadosComSla + t.slaVencido
  )
}

/** Por cliente: tempo médio de resolução (finalizados no mês) e tempo até o aceite (aceitos no mês). */
export function clientePorTempo(
  entrada: EntradaCompetencia | undefined,
  maxItens = MAX_ITENS_CRUZAMENTO
): ClienteTempo[] | null {
  const ctx = contexto(entrada, "cliente", ["solucao"])
  if (!ctx) return null
  const noMes = (t: number | null) =>
    t !== null && t >= ctx.inicio && t <= ctx.fim
  return agrupar<ClienteTempo>(
    ctx,
    maxItens,
    (rotulo, cs) => {
      const fin = cs.filter((c) => !c.naoFinalizado && noMes(c.solucao))
      const dias = fin
        .map((c) => {
          const d = (c.solucao! - c.abertura) / DIA
          return d >= 0 ? d : c.tempoResolucao
        })
        .filter((d): d is number => d !== null)
      const aceite = cs
        .filter((c) => noMes(c.aceite) && c.solucao !== null)
        .map((c) => (c.aceite! - c.solucao!) / DIA)
        .filter((d) => d >= 0)
      return {
        rotulo,
        tempoMedio: r1(dias),
        tempoAceite: r1(aceite),
        finalizados: fin.length,
      }
    },
    (t) => t.finalizados + (t.tempoAceite !== null ? 1 : 0)
  )
}
