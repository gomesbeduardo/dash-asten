import type { ComponentType } from "react"
import type { Carga, CargaMeta } from "@/cargas"
import { PainelOutro } from "@/components/app/PainelOutro"
import { PainelChamados } from "@/components/chamados/PainelChamados"
import { CompararChamados } from "@/components/chamados/CompararChamados"
import { EvolucaoChamados } from "@/components/chamados/EvolucaoChamados"

export type VisaoTipoProps = {
  carga: Carga
  /** Metadados de todas as cargas do mesmo tipo. */
  historico: CargaMeta[]
  obterCarga: (id: string) => Promise<Carga | null>
  /** true na 1ª exibição da visão nesta sessão: toca a entrada única (D26). */
  entrada: boolean
}

export type VisoesDoTipo = {
  Painel: ComponentType<VisaoTipoProps>
  Comparar?: ComponentType<VisaoTipoProps>
  Evolucao?: ComponentType<VisaoTipoProps>
}

const visoes: Record<string, VisoesDoTipo> = {
  chamados: {
    Painel: PainelChamados,
    Comparar: CompararChamados,
    Evolucao: EvolucaoChamados,
  },
}

const OUTRO: VisoesDoTipo = { Painel: PainelOutro }

/** Tipo sem visões próprias cai na experiência genérica (abas + modo automático). */
export function visoesDoTipo(tipoId: string): VisoesDoTipo {
  return Object.hasOwn(visoes, tipoId) ? visoes[tipoId] : OUTRO
}
