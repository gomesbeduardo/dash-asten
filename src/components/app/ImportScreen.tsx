import { formatarCompetencia, tiposRegistrados, type CargaMeta } from "@/cargas"
import { escolherCargaInicial } from "@/app/navegacao"
import { modoApi } from "@/app/modo-api"
import logo from "@/assets/asten-logo-fundo-claro.png"
import { Button } from "@/components/ui/button"
import { rotuloVersao } from "./formatoCarga"
import type { LoadState } from "./hooks/useWorkbookLoader"
import { AreaDeEnvio } from "./AreaDeEnvio"
import { ListaCargasAgrupada } from "./ListaCargasAgrupada"

export function ImportScreen({
  state,
  onFile,
  metas = [],
  carregandoLista = false,
  onAbrir,
}: {
  state: LoadState
  onFile: (file: File) => void
  /** Cargas que já existem, mostradas agrupadas abaixo da área de envio. */
  metas?: CargaMeta[]
  carregandoLista?: boolean
  onAbrir?: (id: string) => void
}) {
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id
  const ultima = escolherCargaInicial(metas)
  const loading = state.status === "loading"

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-10 px-6 py-12">
      <img src={logo} alt="Asten" className="h-12 w-auto self-start" />
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl leading-tight text-primary">
          Carregar a planilha da competência
        </h1>
        <p className="max-w-prose text-xl text-muted-foreground">
          Escolha a planilha do mês, confirme o tipo e a competência, e ela vira
          telas para apresentar.{" "}
          {modoApi()
            ? "A carga fica guardada no banco do app e aparece em qualquer computador."
            : "As cargas ficam guardadas só neste navegador; nada é enviado a lugar nenhum."}
        </p>
      </div>

      <AreaDeEnvio onFile={onFile} loading={loading} />

      {state.status === "error" && (
        <div
          role="alert"
          className="border-l-4 border-destructive bg-card py-3 pl-4 text-lg"
        >
          <p className="font-medium text-destructive">{state.message}</p>
          <p className="text-muted-foreground">Tente outro arquivo .xlsx.</p>
        </div>
      )}

      <section aria-labelledby="cargas-existentes" className="flex flex-col gap-4">
        <h2 id="cargas-existentes" className="text-2xl text-primary">
          Cargas que já existem
        </h2>
        {carregandoLista ? (
          <p role="status" className="text-base text-muted-foreground">
            Carregando as cargas…
          </p>
        ) : metas.length === 0 || !onAbrir ? (
          <p className="text-base text-muted-foreground">
            Nenhuma carga guardada ainda. Envie a primeira planilha acima.
          </p>
        ) : (
          <>
            {ultima && (
              <Button
                size="lg"
                className="h-11 self-start px-5 text-base"
                onClick={() => onAbrir(ultima.id)}
              >
                {`Abrir a última: ${nomeDoTipo(ultima.tipo)} · ${formatarCompetencia(ultima.competencia, "longo")} ${rotuloVersao(ultima)}`}
              </Button>
            )}
            <ListaCargasAgrupada
              metas={metas}
              nomeDoTipo={nomeDoTipo}
              onAbrir={onAbrir}
            />
          </>
        )}
      </section>
    </main>
  )
}
