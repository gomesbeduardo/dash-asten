import type { Workbook } from "@/core"
export type Competencia = string // "AAAA-MM"
export type CargaMeta = { id: string; tipo: string; competencia: Competencia; versao: number; importadaEm: string /* ISO */; arquivo: string; linhas: number }
export type Carga = CargaMeta & { workbook: Workbook }
export type NovaCarga = { tipo: string; competencia: Competencia; arquivo: string; workbook: Workbook; original?: ArrayBuffer /* bytes do .xlsx enviado, para reprocessar */ }
export interface RepositorioDeCargas {
  listar(): Promise<CargaMeta[]>            // ordem: tipo asc, competência desc, versão desc
  obter(id: string): Promise<Carga | null>
  salvar(nova: NovaCarga): Promise<CargaMeta> // versão = maior versão de tipo+competência + 1 (começa em 1)
  excluir(id: string): Promise<void>
  /** Só nos adaptadores locais (memória/IndexedDB); a API compartilhada não expõe. */
  limparTudo?(): Promise<void>
}
export type TipoDeConjunto = { id: string; nome: string; descricao: string; reconhecer(workbook: Workbook): number /* 0..1 */ }
export type OrigemCompetencia = "aba" | "arquivo" | "datas" | "mes-anterior"
