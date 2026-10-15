import type { Workbook } from "@/core"
export type Competencia = string // "AAAA-MM"
export type CargaMeta = { id: string; tipo: string; competencia: Competencia; versao: number; importadaEm: string /* ISO */; arquivo: string; linhas: number; /** Rótulo opcional dado pela pessoa (D58). */ nome: string | null; /** ISO de quando foi arquivada; null = ativa. */ arquivadaEm: string | null; /** Mes Ref. lido da planilha no envio (D63); null = sem coluna legível. */ mesRef?: string | null }
export type Carga = CargaMeta & { workbook: Workbook }
export type NovaCarga = { tipo: string; competencia: Competencia; arquivo: string; nome?: string | null; mesRef?: Competencia | null; workbook: Workbook; original?: ArrayBuffer /* bytes do .xlsx enviado, para reprocessar */ }
/** Mudar tipo ou competência move a carga para outro grupo: ela vira a versão max+1 do destino. */
export type AlteracaoDeCarga = { nome?: string | null; tipo?: string; competencia?: Competencia; arquivada?: boolean }
export interface RepositorioDeCargas {
  listar(): Promise<CargaMeta[]>            // ordem: tipo asc, competência desc, versão desc
  obter(id: string): Promise<Carga | null>
  salvar(nova: NovaCarga): Promise<CargaMeta> // versão = maior versão de tipo+competência + 1 (começa em 1)
  excluir(id: string): Promise<void>
  /** Renomeia, corrige tipo/competência ou arquiva/restaura. Os dados (workbook) não mudam. */
  alterar(id: string, alteracao: AlteracaoDeCarga): Promise<CargaMeta>
  /** Só nos adaptadores locais (memória/IndexedDB); a API compartilhada não expõe. */
  limparTudo?(): Promise<void>
}
export type TipoDeConjunto = { id: string; nome: string; descricao: string; reconhecer(workbook: Workbook): number /* 0..1 */ }
export type OrigemCompetencia = "mesref" | "aba" | "arquivo" | "titulo" | "datas" | "mes-anterior"
