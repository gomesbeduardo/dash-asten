/** Indicador discreto de carregamento: nunca deixa a área vazia. Sem animação com movimento reduzido. */
export function Carregando({
  texto = "Carregando competências…",
}: {
  texto?: string
}) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <p className="text-xl text-muted-foreground">{texto}</p>
      <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
