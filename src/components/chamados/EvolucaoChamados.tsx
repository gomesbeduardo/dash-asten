import type { VisaoTipoProps } from "@/panels/tipos"

/** Em construção: outra fatia implementa esta visão. */
export function EvolucaoChamados({ carga }: VisaoTipoProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-6xl leading-none text-primary">Evolução</h1>
      <p className="text-lg text-muted-foreground">
        Em construção · {carga.arquivo}
      </p>
    </div>
  )
}
