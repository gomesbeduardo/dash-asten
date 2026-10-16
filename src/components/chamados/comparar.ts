/**
 * Lógica pura do Comparar com fotos (D65/D66): colunas por versão ou mês sem posição, métricas
 * corrigidas por coluna e os cartões (KPIs e Situações) com a marca de corrigido.
 */
import { formatarCompetencia, type CargaMeta, type Competencia } from "@/cargas"
import {
  metricasCorrigidas,
  metricasDoMesSemFoto,
  opcoesDeComparacao,
  rotuloCompetencia,
  type EntradaCompetencia,
  type FormatoKpi,
  type ItemDistribuicaoCorrigido,
  type KpiChamados,
  type KpiCorrigido,
  type MetricasCorrigidas,
  type MetricasParciais,
} from "@/chamados"
import type { Sheet } from "@/core"
import {
  colunasAusentes,
  filtrarSheet,
  sentidoEntre,
  type ComparacaoN,
  type FiltrosChamados,
  type Sentido,
} from "./logica"

/** Uma opção do seletor de coluna: um mês sem posição ou uma versão de um mês com foto. */
export type ColunaOpcao = {
  /** `2026-04@2` (versão de um mês com foto) ou `2026-06` (mês sem posição). */
  chave: string
  competencia: Competencia
  /** `null` = mês sem posição. */
  versao: number | null
  temFoto: boolean
  /** A versão mais atual do mês (a de maior número). */
  maisAtual: boolean
  /** Texto do seletor: "Setembro de 2026, v2 (atual)", "Junho de 2026 (sem posição)". */
  rotulo: string
  /** Rótulo da coluna: "abr/26", ou "abr/26 v1" quando o mês tem 2+ versões. */
  curto: string
}

export const chaveFoto = (c: Competencia, v: number) => `${c}@${v}`
export const competenciaDaChave = (chave: string): Competencia =>
  chave.split("@")[0]

const longo = (c: Competencia) => {
  const t = formatarCompetencia(c, "longo")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Opções do seletor: do mês da foto mais recente para trás, com e sem posição (D66). Mês com 2+
 * versões desdobra as versões, da mais nova à mais antiga. `metas` são só as versões ativas
 * cuja planilha está carregada; `fotoMaisAtual` limita até onde os meses sem posição aparecem.
 */
export function opcoesDeColuna(
  metas: Pick<CargaMeta, "competencia" | "versao" | "arquivadaEm">[],
  fotoMaisAtual?: EntradaCompetencia
): ColunaOpcao[] {
  const fotos = metas
    .filter((m) => !m.arquivadaEm)
    .map((m) => ({ competencia: m.competencia, versao: m.versao }))
  if (fotos.length === 0) return []
  const maisRecente = fotos.reduce(
    (a, f) => (f.competencia > a ? f.competencia : a),
    fotos[0].competencia
  )
  const versoesDe = (c: Competencia) =>
    fotos
      .filter((f) => f.competencia === c)
      .map((f) => f.versao)
      .sort((a, b) => b - a)
  const { meses } = opcoesDeComparacao(
    fotos,
    maisRecente,
    fotoMaisAtual,
    versoesDe(maisRecente)[0]
  )
  const competencias = new Set<Competencia>([
    maisRecente,
    ...meses.map((m) => m.competencia),
    ...fotos.map((f) => f.competencia),
  ])
  return [...competencias]
    .sort()
    .reverse()
    .flatMap((c): ColunaOpcao[] => {
      const vs = versoesDe(c)
      const curto = formatarCompetencia(c)
      if (vs.length === 0)
        return [
          {
            chave: c,
            competencia: c,
            versao: null,
            temFoto: false,
            maisAtual: false,
            rotulo: `${longo(c)} (sem posição)`,
            curto,
          },
        ]
      return vs.map((v, i) => ({
        chave: chaveFoto(c, v),
        competencia: c,
        versao: v,
        temFoto: true,
        maisAtual: i === 0,
        rotulo:
          vs.length > 1
            ? `${longo(c)}, v${v}${i === 0 ? " (atual)" : ""}`
            : longo(c),
        curto: vs.length > 1 ? `${curto} v${v}` : curto,
      }))
    })
}

/** Colunas em ordem cronológica; no mesmo mês, da versão mais antiga para a mais nova. */
export function ordenarOpcoes(opcoes: ColunaOpcao[]): ColunaOpcao[] {
  return [...opcoes].sort(
    (a, b) =>
      a.competencia.localeCompare(b.competencia) ||
      (a.versao ?? 0) - (b.versao ?? 0)
  )
}

/**
 * Seleção inicial: o mês anterior com foto (senão o mês anterior, senão a outra versão do mesmo
 * mês) e a carga aberta. `abertaChave` é a versão que a pessoa abriu.
 */
export function selecaoPadrao(
  opcoes: ColunaOpcao[],
  abertaChave: string
): string[] {
  const atual =
    opcoes.find((o) => o.chave === abertaChave) ??
    opcoes.find(
      (o) => o.temFoto && o.competencia === competenciaDaChave(abertaChave)
    ) ??
    opcoes.find((o) => o.temFoto)
  if (!atual) return []
  const antes = opcoes.filter((o) => o.competencia < atual.competencia)
  const anterior =
    antes.find((o) => o.temFoto && o.maisAtual) ??
    antes[0] ??
    opcoes.find((o) => o.competencia === atual.competencia && o !== atual)
  return [anterior?.chave, atual.chave].filter((c): c is string => !!c)
}

/** Opção a sugerir em "Adicionar": prefere mês ainda não usado e com foto; antes da mais antiga escolhida. */
export function proximaChave(
  opcoes: ColunaOpcao[],
  escolhidas: string[]
): string | null {
  const livres = opcoes.filter((o) => !escolhidas.includes(o.chave))
  if (livres.length === 0) return null
  const usados = new Set(escolhidas.map(competenciaDaChave))
  const pools = [
    livres.filter((o) => o.temFoto && !usados.has(o.competencia)),
    livres.filter((o) => !usados.has(o.competencia)),
    livres,
  ]
  const pool = pools.find((p) => p.length > 0)!
  const maisAntiga = [...usados].sort()[0]
  return (pool.find((o) => o.competencia < maisAntiga) ?? pool[0]).chave
}

/** Seleção pedida pelo Histórico: as versões daquele mês (se existirem entre as opções). */
export function selecaoDoPedido(
  opcoes: ColunaOpcao[],
  pedido: { competencia: Competencia; versoes: number[] } | null
): string[] | null {
  if (!pedido) return null
  const chaves = pedido.versoes
    .map((v) => chaveFoto(pedido.competencia, v))
    .filter((c) => opcoes.some((o) => o.chave === c))
  return chaves.length >= 2 ? chaves : null
}

export type Coluna = {
  opcao: ColunaOpcao
  metricas: MetricasCorrigidas | MetricasParciais
  /** A foto (com o recorte dos filtros) desta coluna; `null` no mês sem posição. */
  entrada: EntradaCompetencia | null
}

/**
 * Valores de uma coluna (D65). Com foto: a foto daquela versão corrigida pela versão atual de
 * cada mês POSTERIOR (versões do mesmo mês nunca se corrigem). Sem posição: só entradas e
 * finalizados, pelas datas da posição mais atual. Os filtros valem para a foto da coluna; as fotos
 * que corrigem entram inteiras, para o chamado ser achado pelo Código.
 */
export function calcularColuna(
  opcao: ColunaOpcao,
  opcoes: ColunaOpcao[],
  sheets: Map<string, Sheet>,
  filtros: FiltrosChamados
): Coluna {
  const atuais = opcoes.filter((o) => o.temFoto && o.maisAtual)
  const entradaDe = (o: ColunaOpcao): EntradaCompetencia => {
    const bruta = sheets.get(o.chave)!
    return {
      sheet: filtrarSheet(bruta, filtros, o.competencia),
      competencia: o.competencia,
      colunasSemFiltro: colunasAusentes(bruta, filtros),
    }
  }
  if (opcao.temFoto) {
    const entrada = entradaDe(opcao)
    const posteriores = atuais
      .filter((o) => o.competencia > opcao.competencia)
      .map((o): EntradaCompetencia => ({
        sheet: sheets.get(o.chave)!,
        competencia: o.competencia,
      }))
    return {
      opcao,
      metricas: metricasCorrigidas(entrada, posteriores),
      entrada,
    }
  }
  const maisAtual = atuais[0] // as opções vêm da mais recente para a mais antiga
  const base = entradaDe(maisAtual)
  const parcial = metricasDoMesSemFoto(opcao.competencia, base)
  const semColuna = base.colunasSemFiltro ?? []
  const metricas: MetricasParciais =
    semColuna.length > 0
      ? {
          ...parcial,
          colunasSemFiltro: semColuna,
          kpis: parcial.kpis.map((k) => ({
            ...k,
            valor: null,
            detalhe: "filtro sem a coluna nesta carga",
          })),
        }
      : parcial
  return { opcao, metricas, entrada: null }
}

/** Valor da foto como está, quando a correção mudou o valor deste cartão. */
export type Marca = { por: string[]; original: number | null }

/** Um cartão da tela: KPI ou Situação, com um valor por coluna. */
export type Cartao = {
  id: string
  rotulo: string
  formato: FormatoKpi
  melhorQuando: KpiChamados["melhorQuando"]
  valores: (number | null)[]
  /** última − primeira; null se qualquer das duas não tiver dado. */
  delta: number | null
  setas: (Sentido | null)[]
  /** Por coluna, por que não há valor ("sem posição de jun/26"). */
  notas: (string | null)[]
  marcas: (Marca | null)[]
}

const porDe = (c: Coluna): string[] =>
  "corrigidoPor" in c.metricas
    ? c.metricas.corrigidoPor.map(rotuloCompetencia)
    : []

const marcaDe = (c: Coluna, original: number | null): Marca => ({
  por: porDe(c),
  original,
})

export function cartoesDeKpis(cmp: ComparacaoN, colunas: Coluna[]): Cartao[] {
  return cmp.kpis.map((k) => ({
    id: k.id,
    rotulo: k.rotulo,
    formato: k.formato,
    melhorQuando: k.melhorQuando,
    valores: k.valores,
    delta: k.delta,
    setas: k.setas,
    notas: k.valores.map((v, i) =>
      v === null
        ? (colunas[i].metricas.kpis.find((x) => x.id === k.id)?.detalhe ??
          "sem dado")
        : null
    ),
    marcas: colunas.map((c) => {
      const kpi = c.metricas.kpis.find((x) => x.id === k.id) as
        KpiCorrigido | undefined
      return kpi && kpi.original !== undefined ? marcaDe(c, kpi.original) : null
    }),
  }))
}

/** Um cartão por Situação (valor literal da planilha), com os valores de cada coluna. */
export function cartoesDeSituacoes(colunas: Coluna[]): Cartao[] {
  const rotulos = [
    ...new Set(
      colunas.flatMap((c) => c.metricas.situacoes.map((s) => s.rotulo))
    ),
  ]
  const semDado = (c: Coluna) =>
    "semFoto" in c.metricas || (c.metricas.colunasSemFiltro ?? []).length > 0
  const cartoes = rotulos.map((rotulo): Cartao => {
    const itens = colunas.map((c) =>
      c.metricas.situacoes.find((s) => s.rotulo === rotulo)
    )
    const valores = colunas.map((c, i) =>
      semDado(c) ? null : (itens[i]?.valor ?? 0)
    )
    const primeiro = valores[0]
    const fim = valores[valores.length - 1]
    return {
      id: `situacao:${rotulo}`,
      rotulo,
      formato: "inteiro",
      melhorQuando: "neutro",
      valores,
      delta: primeiro !== null && fim !== null ? fim - primeiro : null,
      setas: valores.map((v, i) =>
        i === 0 ? null : sentidoEntre(valores[i - 1], v, "inteiro")
      ),
      notas: colunas.map((c) =>
        !semDado(c)
          ? null
          : "semFoto" in c.metricas
            ? c.metricas.motivo
            : "filtro sem a coluna nesta carga"
      ),
      marcas: colunas.map((c, i) => {
        const item = itens[i] as ItemDistribuicaoCorrigido | undefined
        return item && item.original !== undefined
          ? marcaDe(c, item.original)
          : null
      }),
    }
  })
  const total = (c: Cartao) =>
    c.valores.reduce<number>((s, v) => s + (v ?? 0), 0)
  return cartoes.sort(
    (a, b) => total(b) - total(a) || a.rotulo.localeCompare(b.rotulo)
  )
}
