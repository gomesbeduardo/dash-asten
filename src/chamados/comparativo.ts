import { calcularMetricas } from "./metricas"
import type { Comparacao, EntradaCompetencia, Evolucao } from "./tipos"

export function compararCompetencias(a: EntradaCompetencia, b: EntradaCompetencia): Comparacao {
  const ma = calcularMetricas(a)
  const mb = calcularMetricas(b)
  const kpis = mb.kpis.map((kb) => {
    const va = ma.kpis.find((k) => k.id === kb.id)?.valor ?? null
    return {
      id: kb.id,
      rotulo: kb.rotulo,
      formato: kb.formato,
      a: va,
      b: kb.valor,
      delta: va !== null && kb.valor !== null ? kb.valor - va : null,
      melhorQuando: kb.melhorQuando,
    }
  })
  const ids = [...new Set([...ma.distribuicoes, ...mb.distribuicoes].map((d) => d.id))]
  const distribuicoes = ids.map((id) => {
    const da = ma.distribuicoes.find((d) => d.id === id)
    const db = mb.distribuicoes.find((d) => d.id === id)
    const va = new Map((da?.itens ?? []).map((i) => [i.rotulo, i.valor]))
    const vb = new Map((db?.itens ?? []).map((i) => [i.rotulo, i.valor]))
    const rotulos = [...new Set([...vb.keys(), ...va.keys()])]
    const itens = rotulos
      .map((rotulo) => ({ rotulo, a: va.get(rotulo) ?? 0, b: vb.get(rotulo) ?? 0 }))
      .sort((x, y) => y.b + y.a - (x.b + x.a))
    return { id, titulo: (db ?? da)!.titulo, itens }
  })
  return { a: ma, b: mb, kpis, distribuicoes }
}

export function evolucao(entradas: EntradaCompetencia[]): Evolucao {
  const metricas = entradas.map((e) => calcularMetricas(e)).sort((x, y) => x.competencia.localeCompare(y.competencia))
  if (metricas.length === 0) return { competencias: [], series: [] }
  const series = metricas[0].kpis.map((k) => ({
    id: k.id,
    rotulo: k.rotulo,
    formato: k.formato,
    valores: metricas.map((m) => m.kpis.find((x) => x.id === k.id)?.valor ?? null),
  }))
  return { competencias: metricas.map((m) => m.competencia), series }
}
