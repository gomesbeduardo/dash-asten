import { createContext, useContext, type ReactNode } from "react"
import type { RepositorioDeCargas } from "@/cargas"

const Contexto = createContext<RepositorioDeCargas | null>(null)

/** Fornece o repositório de cargas: IndexedDB em produção, memória nos testes. */
export function RepositorioProvider({
  repositorio,
  children,
}: {
  repositorio: RepositorioDeCargas
  children: ReactNode
}) {
  return <Contexto.Provider value={repositorio}>{children}</Contexto.Provider>
}

export function useRepositorio(): RepositorioDeCargas {
  const repo = useContext(Contexto)
  if (!repo) throw new Error("useRepositorio fora do RepositorioProvider")
  return repo
}
