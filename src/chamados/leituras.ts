import { mapearColunas, type CampoChamado } from "./mapeamento"
import { calcularMetricas, limitesDaCompetencia } from "./metricas"
import { classificarLinha, tempo, texto } from "./situacao"
import type { EntradaCompetencia } from "./tipos"

export type Severidade = "critico" | "atencao" | "destaque"
export type FiltroSugerido = {
  campo: CampoChamado | "situacaoNaCompetencia" | "idade"
  valores: string[]
}
export type Leitura = {
  id: "fluxo" | "concentracao" | "envelhecimento" | "gargaloCliente" | "semSla"
  severidade: Severidade
  titulo: string
  texto: string
  evidencia: string[]
  filtro?: FiltroSugerido
  acao?: string
}
const DIA = 86_400_000
const ORDEM: Record<Severidade, number> = {
  critico: 0,
  atencao: 1,
  destaque: 2,
}
const MAX_LEITURAS = 4

const inteiro = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
const pct = (n: number) => `${Math.round(n * 100)}%`
const dias = (n: number) => n.toFixed(1).replace(".", ",")
const sinal = (n: number) =>
  n > 0 ? `+${inteiro(n)}` : n < 0 ? `-${inteiro(-n)}` : "0"
const plural = (n: number, um: string, varios: string) =>
  n === 1 ? um : varios

/** Clientes do backlog (aberto no fim da competência) e quantos de cada têm mais de 180 dias. */
function clientesDoBacklog(
  entrada: EntradaCompetencia
): Map<string, { total: number; velhos: number }> {
  const { sheet, competencia } = entrada
  const { mapa } = mapearColunas(sheet)
  const { fim } = limitesDaCompetencia(competencia)
  const out = new Map<string, { total: number; velhos: number }>()
  if (!mapa.cliente || !mapa.abertura) return out
  for (const row of sheet.rows) {
    if (classificarLinha(row, mapa, competencia) !== "aberto-no-fim") continue
    const cliente = texto(row[mapa.cliente])
    if (cliente === null) continue
    const abertura = tempo(row[mapa.abertura])!
    const e = out.get(cliente) ?? { total: 0, velhos: 0 }
    e.total++
    if (Math.floor((fim - abertura) / DIA) > 180) e.velhos++
    out.set(cliente, e)
  }
  return out
}

/** Leituras estratégicas do mês (D35): regras com limite numérico, sem projeção. Máx. 4, da mais grave à menos. */
export function gerarLeituras(
  atual: EntradaCompetencia,
  anterior?: EntradaCompetencia
): Leitura[] {
  const m = calcularMetricas(atual, anterior)
  const kpi = (id: string) => m.kpis.find((k) => k.id === id)
  const backlog = kpi("backlog")?.valor ?? null
  if (backlog === null || backlog <= 0) return []
  const leituras: Leitura[] = []

  // fluxo
  const entradas = kpi("entradas")?.valor ?? null
  const saidas = kpi("saidas")?.valor ?? null
  const backlogAnt = kpi("backlog")?.anterior ?? null
  if (
    anterior &&
    entradas !== null &&
    saidas !== null &&
    backlogAnt !== null &&
    saidas > 0 &&
    saidas >= 1.5 * entradas &&
    backlog < backlogAnt
  ) {
    const delta = backlog - backlogAnt
    let texto = `Saíram ${inteiro(saidas)} chamados e entraram ${inteiro(entradas)}. O backlog variou ${sinal(delta)} (${sinal(Math.round((delta / backlogAnt) * 100))}%) frente ao mês anterior.`
    const tm = kpi("tempoMedio")
    if (
      tm &&
      tm.valor !== null &&
      tm.anterior !== null &&
      tm.valor > tm.anterior
    )
      texto += ` O tempo médio subiu de ${dias(tm.anterior)} para ${dias(tm.valor)} dias porque foram fechados chamados antigos — isso também pesa no % de SLA.`
    leituras.push({
      id: "fluxo",
      severidade: "destaque",
      titulo: "Mês de redução de estoque",
      texto,
      evidencia: ["backlog", "entradas", "saidas", "tempoMedio"],
    })
  }

  // concentração
  const clientes = [...clientesDoBacklog(atual).entries()].sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0])
  )
  if (clientes.length > 0) {
    const [nome, { total, velhos }] = clientes[0]
    if (total / backlog >= 0.4)
      leituras.push({
        id: "concentracao",
        severidade: "atencao",
        titulo: `${nome} concentra ${pct(total / backlog)} do backlog (${inteiro(total)} de ${inteiro(backlog)})`,
        texto: `${velhos === 1 ? "1 deles tem" : `${inteiro(velhos)} deles têm`} mais de 180 dias de abertura.`,
        evidencia: ["cliente", "backlog"],
        filtro: { campo: "cliente", valores: [nome] },
      })
  }

  // envelhecimento
  const velhos =
    m.envelhecimento.find((f) => f.rotulo === "> 180 dias")?.valor ?? 0
  if (velhos / backlog > 0.25)
    leituras.push({
      id: "envelhecimento",
      severidade: velhos / backlog > 0.4 ? "critico" : "atencao",
      titulo: `${inteiro(velhos)} ${plural(velhos, "chamado", "chamados")} (${pct(velhos / backlog)}) ${plural(velhos, "está", "estão")} abertos há mais de 180 dias`,
      texto: `Do backlog de ${inteiro(backlog)} chamados, ${pct(velhos / backlog)} têm mais de 180 dias de abertura.`,
      evidencia: ["envelhecimento", "backlog"],
      filtro: { campo: "idade", valores: ["> 180 dias"] },
    })

  // gargalo no cliente (depende da Situação da exportação: exige carga própria)
  const aguardando = kpi("aguardandoAceite")?.valor ?? null
  if (aguardando !== null && aguardando / backlog >= 0.3)
    leituras.push({
      id: "gargaloCliente",
      severidade: "atencao",
      titulo: `${pct(aguardando / backlog)} do backlog aguarda aceite do cliente`,
      texto: `${inteiro(aguardando)} de ${inteiro(backlog)} chamados do backlog estão aguardando aceite.`,
      evidencia: ["aguardandoAceite", "backlog"],
      acao: "Cobrar aceite dos clientes com mais pendências",
    })

  // sem SLA
  const semSla = kpi("semSla")?.valor ?? null
  if (semSla !== null && semSla / backlog >= 0.2)
    leituras.push({
      id: "semSla",
      severidade: "atencao",
      titulo: `${pct(semSla / backlog)} do backlog está sem SLA`,
      texto: `${inteiro(semSla)} de ${inteiro(backlog)} chamados do backlog não têm SLA previsto. Nota: o % no SLA é medido sobre uma base menor, então não representa todo o backlog.`,
      evidencia: ["semSla", "backlog"],
      filtro: { campo: "situacaoNaCompetencia", valores: ["aberto-no-fim"] },
    })

  return leituras
    .sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade])
    .slice(0, MAX_LEITURAS)
}
