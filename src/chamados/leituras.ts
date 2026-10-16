import { mapearColunas, normalizar, type CampoChamado } from "./mapeamento"
import { metricasDe } from "./cache-metricas"
import { classificarLinha, mesesAteCompetencia, tempo, texto } from "./situacao"
import type { EntradaCompetencia, MetricasChamados } from "./tipos"

export type Severidade = "critico" | "atencao" | "destaque"
export type FiltroSugerido = {
  campo: CampoChamado | "idade"
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
const ORDEM: Record<Severidade, number> = {
  critico: 0,
  atencao: 1,
  destaque: 2,
}
const MAX_LEITURAS = 4
/** Faixa de atraso por ciclo (meses entre a abertura e o Mes Ref.) tratada como "muito antigo". */
export const FAIXA_ANTIGA = "7+"
const MESES_ANTIGO = 7

const inteiro = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
const pct = (n: number) => `${Math.round(n * 100)}%`
const dias = (n: number) => n.toFixed(1).replace(".", ",")
const sinal = (n: number) =>
  n > 0 ? `+${inteiro(n)}` : n < 0 ? `-${inteiro(-n)}` : "0"
const plural = (n: number, um: string, varios: string) =>
  n === 1 ? um : varios

/** Clientes com não finalizados na foto e quantos de cada estão em atraso há 7 meses ou mais. */
function clientesNaoFinalizados(
  entrada: EntradaCompetencia
): Map<string, { total: number; velhos: number }> {
  const { sheet, competencia } = entrada
  const { mapa } = mapearColunas(sheet)
  const out = new Map<string, { total: number; velhos: number }>()
  if (!mapa.cliente || !mapa.abertura || !mapa.situacao) return out
  for (const row of sheet.rows) {
    if (classificarLinha(row, mapa, competencia) !== "na-foto") continue
    if (normalizar(texto(row[mapa.situacao]) ?? "") === "finalizado") continue
    const cliente = texto(row[mapa.cliente])
    if (cliente === null) continue
    const abertura = tempo(row[mapa.abertura])!
    const e = out.get(cliente) ?? { total: 0, velhos: 0 }
    e.total++
    if (mesesAteCompetencia(abertura, competencia) >= MESES_ANTIGO) e.velhos++
    out.set(cliente, e)
  }
  return out
}

/** Leituras estratégicas do mês (D35): regras com limite numérico, sem projeção. Máx. 4, da mais grave à menos. */
export function gerarLeituras(
  atual: EntradaCompetencia,
  anterior?: EntradaCompetencia,
  /** As métricas de `atual` contra `anterior`, se já calculadas (evita calcular de novo). */
  metricas?: MetricasChamados
): Leitura[] {
  const m = metricas ?? metricasDe(atual, anterior)
  const kpi = (id: string) => m.kpis.find((k) => k.id === id)
  const abertos = kpi("naoFinalizados")?.valor ?? null
  if (abertos === null || abertos <= 0) return []
  const leituras: Leitura[] = []

  // fluxo
  const entradas = kpi("entradas")?.valor ?? null
  const finalizados = kpi("finalizados")?.valor ?? null
  const abertosAnt = kpi("naoFinalizados")?.anterior ?? null
  if (
    anterior &&
    entradas !== null &&
    finalizados !== null &&
    abertosAnt !== null &&
    finalizados > 0 &&
    finalizados >= 1.5 * entradas &&
    abertos < abertosAnt
  ) {
    const delta = abertos - abertosAnt
    let texto = `Foram finalizados ${inteiro(finalizados)} chamados e entraram ${inteiro(entradas)}. Os não finalizados variaram ${sinal(delta)} (${sinal(Math.round((delta / abertosAnt) * 100))}%) frente ao mês anterior.`
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
      evidencia: ["naoFinalizados", "entradas", "finalizados", "tempoMedio"],
    })
  }

  // concentração
  const clientes = [...clientesNaoFinalizados(atual).entries()].sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0])
  )
  if (clientes.length > 0) {
    const [nome, { total, velhos }] = clientes[0]
    if (total / abertos >= 0.4)
      leituras.push({
        id: "concentracao",
        severidade: "atencao",
        titulo: `${nome} concentra ${pct(total / abertos)} dos não finalizados (${inteiro(total)} de ${inteiro(abertos)})`,
        texto: `${velhos === 1 ? "1 deles está" : `${inteiro(velhos)} deles estão`} em atraso há ${MESES_ANTIGO} meses ou mais.`,
        evidencia: ["cliente", "naoFinalizados"],
        filtro: { campo: "cliente", valores: [nome] },
      })
  }

  // atraso antigo (ciclo): não finalizados abertos há 7 meses ou mais
  const velhos =
    m.atrasoFaixas.find((f) => f.rotulo === FAIXA_ANTIGA)?.valor ?? 0
  if (velhos / abertos > 0.25)
    leituras.push({
      id: "envelhecimento",
      severidade: velhos / abertos > 0.4 ? "critico" : "atencao",
      titulo: `${inteiro(velhos)} ${plural(velhos, "chamado", "chamados")} (${pct(velhos / abertos)}) ${plural(velhos, "está", "estão")} em atraso há ${MESES_ANTIGO} meses ou mais`,
      texto: `Dos ${inteiro(abertos)} chamados não finalizados, ${pct(velhos / abertos)} foram abertos há ${MESES_ANTIGO} meses ou mais do Mes Ref.`,
      evidencia: ["atrasoFaixas", "naoFinalizados"],
      filtro: { campo: "idade", valores: [FAIXA_ANTIGA] },
    })

  // gargalo no cliente: aguardando aceite entre os não finalizados
  const aguardando = kpi("aguardandoAceite")?.valor ?? null
  if (aguardando !== null && aguardando / abertos >= 0.3)
    leituras.push({
      id: "gargaloCliente",
      severidade: "atencao",
      titulo: `${pct(aguardando / abertos)} dos chamados não finalizados estão aguardando aceite do cliente`,
      texto: `${inteiro(aguardando)} de ${inteiro(abertos)} chamados não finalizados estão aguardando aceite.`,
      evidencia: ["aguardandoAceite", "naoFinalizados"],
      acao: "Cobrar aceite dos clientes com mais pendências",
    })

  // sem SLA
  const semSla = kpi("semSla")?.valor ?? null
  if (semSla !== null && semSla / abertos >= 0.2)
    leituras.push({
      id: "semSla",
      severidade: "atencao",
      titulo: `${pct(semSla / abertos)} dos não finalizados estão sem SLA`,
      texto: `${inteiro(semSla)} de ${inteiro(abertos)} chamados não finalizados não têm SLA previsto. Nota: o % no SLA é medido sobre uma base menor, então não representa todos os não finalizados.`,
      evidencia: ["semSla", "naoFinalizados"],
    })

  return leituras
    .sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade])
    .slice(0, MAX_LEITURAS)
}
