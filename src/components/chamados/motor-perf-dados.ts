/** Dados de teste do motor (desempenho e caracterização): as 4 posições de teste e um conjunto sintético grande. */
import { CAB, foto, mai, out, v1, v2, type L } from "@/chamados/fotos-teste"
import { dia, montarSheet, montarWorkbook } from "@/chamados/test-util"
import {
  comCache,
  criarRepositorioMemoria,
  type Carga,
  type CargaMeta,
  type RepositorioDeCargas,
} from "@/cargas"
import type { Sheet } from "@/core"

export type Posicao = { competencia: string; sheet: Sheet }

export const POSICOES_TESTE: Posicao[] = [
  { competencia: "2026-04", sheet: foto(v1, "2026-04-30") },
  { competencia: "2026-04", sheet: foto(v2, "2026-04-30") },
  { competencia: "2026-05", sheet: foto(mai, "2026-05-31") },
  { competencia: "2026-10", sheet: foto(out, "2026-10-31") },
]

const fimDoMes = (c: string) => {
  const [a, m] = c.split("-").map(Number)
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
}
const mesDe = (base: number) => {
  const a = 2026 + Math.floor(base / 12)
  return `${a}-${String((base % 12) + 1).padStart(2, "0")}`
}
const OPERADORES = ["Operador 01", "Operador 02", "Operador 03", "Operador 04"]
const CLIENTES = ["Cliente A", "Cliente B", "Cliente C", "Cliente D", "Cliente E"]

/**
 * Posições sintéticas (determinísticas): `meses` meses a partir de jan/26, `porMes` chamados novos
 * por mês. Parte dos finalizados aparece aberta na posição do próprio mês (a correção a acha depois).
 */
export function posicoesSinteticas(meses: number, porMes: number): Posicao[] {
  type Ch = { cod: number; abre: number; fecha: number | null; i: number }
  const chamados: Ch[] = []
  let cod = 9000
  for (let m = 0; m < meses; m++)
    for (let k = 0; k < porMes; k++) {
      const i = cod++
      const dur = (i * 7) % 5
      chamados.push({
        cod: i,
        abre: m,
        fecha: i % 4 === 0 ? null : m + dur,
        i,
      })
    }
  const posicoes: Posicao[] = []
  for (let m = 0; m < meses; m++) {
    const comp = mesDe(m)
    const linhas: L[] = chamados
      .filter((c) => c.abre <= m)
      .map((c) => {
        const fechado =
          c.fecha !== null && (c.fecha < m || (c.fecha === m && c.i % 3 !== 0))
        const dAb = `${mesDe(c.abre)}-${String((c.i % 27) + 1).padStart(2, "0")}`
        const sol = fechado ? fimDoMes(mesDe(c.fecha!)) : null
        const prev = `${mesDe(c.abre + (c.i % 3))}-15`
        return [
          dAb,
          c.cod,
          CLIENTES[c.i % CLIENTES.length],
          c.i % 2 ? "Comercial" : "Operações",
          "Cadastro",
          "Integração",
          ["Baixa", "Média", "Alta"][c.i % 3],
          fechado ? "Finalizado" : c.i % 5 === 0 ? "Aguardando Cliente" : "Em Atendimento",
          prev,
          null,
          sol,
          null,
          c.i % 6 === 0 ? 1 : 0,
          "r",
          OPERADORES[c.i % OPERADORES.length],
          "A",
        ] as L
      })
    posicoes.push({ competencia: comp, sheet: foto(linhas, fimDoMes(comp)) })
  }
  return posicoes
}

export type Cenario = {
  repo: RepositorioDeCargas
  historico: CargaMeta[]
  obterCarga: (id: string) => Promise<Carga | null>
  /** As posições com a meta de cada uma (para `pontosDaEvolucao`). */
  proprias: { meta: CargaMeta; sheet: Sheet }[]
  /** A carga aberta (competência + versão). */
  abrir: (competencia: string, versao: number) => Promise<Carga>
}

export async function montarCenario(posicoes: Posicao[]): Promise<Cenario> {
  const repo = comCache(criarRepositorioMemoria())
  for (const p of posicoes)
    await repo.salvar({
      tipo: "chamados",
      competencia: p.competencia,
      arquivo: `ch-${p.competencia}.xlsx`,
      workbook: montarWorkbook(p.sheet),
    })
  const historico = await repo.listar()
  const obterCarga = (id: string) => repo.obter(id)
  const proprias = posicoes.map((p, i) => {
    const versao =
      posicoes.slice(0, i + 1).filter((q) => q.competencia === p.competencia)
        .length
    const meta = historico.find(
      (m) => m.competencia === p.competencia && m.versao === versao
    )!
    return { meta, sheet: p.sheet }
  })
  return {
    repo,
    historico,
    proprias,
    obterCarga,
    abrir: async (competencia, versao) => {
      const meta = historico.find(
        (m) => m.competencia === competencia && m.versao === versao
      )!
      return (await repo.obter(meta.id)) as Carga
    },
  }
}

export { CAB, dia, montarSheet }
