import type { VisaoTipoProps } from "@/panels/tipos"
import { BlocoTempo } from "./BlocoTempo"
import { ChipsFiltrosChamados } from "./filtros"

/** Aba Evolução: invólucro fino do bloco "Ao longo do tempo" (a aba some quando o Painel o incorporar). */
export function EvolucaoChamados(props: VisaoTipoProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-6xl leading-none text-primary">Evolução</h1>
        <ChipsFiltrosChamados />
      </header>
      <BlocoTempo {...props} />
    </div>
  )
}
