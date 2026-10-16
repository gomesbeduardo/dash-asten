import { createElement } from "react"
import type { ComponentType, ReactNode } from "react"
import type { Carga, CargaMeta } from "@/cargas"
import type { Visao } from "@/app/navegacao"
import { PainelOutro } from "@/components/app/PainelOutro"
import { PainelChamados } from "@/components/chamados/PainelChamados"
import { FiltrosChamadosProvider } from "@/components/chamados/filtros"
import { LeiturasChamados } from "@/components/chamados/LeiturasChamados"
import { CompararChamados } from "@/components/chamados/CompararChamados"

export type VisaoTipoProps = {
  carga: Carga
  /** Metadados de todas as cargas do mesmo tipo. */
  historico: CargaMeta[]
  obterCarga: (id: string) => Promise<Carga | null>
  /** true na 1ª exibição da visão nesta sessão: toca a entrada única (D26). */
  entrada: boolean
  /** Leva a outra visão do mesmo tipo (ex.: do Painel para as Leituras). */
  irPara?: (visao: Visao) => void
}

/** Contexto do tipo (ex.: filtros) que sobrevive à troca de visão e de competência. */
export type EnvoltorioDoTipo = ComponentType<{
  carga: Carga
  children: ReactNode
}>

export type VisoesDoTipo = {
  Envoltorio?: EnvoltorioDoTipo
  Painel: ComponentType<VisaoTipoProps>
  Leituras?: ComponentType<VisaoTipoProps>
  Comparar?: ComponentType<VisaoTipoProps>
}

const visoes: Record<string, VisoesDoTipo> = {
  chamados: {
    Envoltorio: FiltrosChamadosProvider,
    Painel: PainelChamados,
    Leituras: LeiturasChamados,
    Comparar: CompararChamados,
  },
}

// A Apresentacao não remonta a visão ao trocar a competência; abas, ocultas e filtros do
// genérico são por planilha, então ele recomeça a cada carga.
const PainelOutroDaCarga = (p: VisaoTipoProps) =>
  createElement(PainelOutro, { ...p, key: p.carga.id })

const OUTRO: VisoesDoTipo = { Painel: PainelOutroDaCarga }

/** Tipo sem visões próprias cai na experiência genérica (abas + modo automático). */
export function visoesDoTipo(tipoId: string): VisoesDoTipo {
  return Object.hasOwn(visoes, tipoId) ? visoes[tipoId] : OUTRO
}
