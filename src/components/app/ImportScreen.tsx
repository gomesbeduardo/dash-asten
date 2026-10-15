import { Loader2Icon } from "lucide-react"
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
  onFiles,
  metas = [],
  carregandoLista = false,
  onAbrir,
  lembradaId,
  abrindo = false,
}: {
  state: LoadState
  onFiles: (files: File[], ignorados: string[]) => void
  /** Cargas que já existem, mostradas agrupadas abaixo da área de envio. */
  metas?: CargaMeta[]
  carregandoLista?: boolean
  onAbrir?: (id: string) => void
  /** Carga aberta por último neste navegador; "Abrir a última" volta nela. */
  lembradaId?: string
  /** Uma carga está sendo baixada: mostra o indicador e trava os cliques. */
  abrindo?: boolean
}) {
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id
  const lembrada = lembradaId
    ? metas.find((m) => m.id === lembradaId && !m.arquivadaEm)
    : undefined
  const ultima = lembrada ?? escolherCargaInicial(metas)
  const loading = state.status === "loading"

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-10 px-6 py-12 3xl:max-w-5xl">
      <img src={logo} alt="Asten" className="h-12 w-auto self-start" />
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl leading-tight text-primary">
          Carregar a planilha da competência
        </h1>
        <p className="max-w-prose text-xl text-muted-foreground">
          Escolha a planilha do mês (ou várias de uma vez) e confirme o tipo e a
          competência.
          {!modoApi() &&
            " As cargas ficam guardadas só neste navegador; nada é enviado a lugar nenhum."}
        </p>
      </div>

      <AreaDeEnvio
        janela
        onFiles={onFiles}
        loading={loading}
        progresso={state.status === "loading" ? state.progresso : null}
      />

      {state.status === "error" && (
        <div
          role="alert"
          className="border-l-4 border-destructive bg-card py-3 pl-4 text-lg"
        >
          <p className="font-medium text-destructive">{state.message}</p>
          <p className="text-muted-foreground">Tente outro arquivo .xlsx.</p>
        </div>
      )}

      <section
        aria-labelledby="cargas-existentes"
        className="flex flex-col gap-4"
      >
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
                disabled={abrindo}
                onClick={() => onAbrir(ultima.id)}
              >
                {`Abrir a última: ${nomeDoTipo(ultima.tipo)} · ${formatarCompetencia(ultima.competencia, "longo")} ${rotuloVersao(ultima)}`}
              </Button>
            )}
            {abrindo && (
              <p
                role="status"
                className="flex items-center gap-2 text-base font-medium text-primary"
              >
                <Loader2Icon className="size-5 animate-spin" aria-hidden />
                Abrindo a carga…
              </p>
            )}
            <div
              inert={abrindo}
              className={abrindo ? "pointer-events-none opacity-60" : undefined}
            >
              <ListaCargasAgrupada
                metas={metas}
                nomeDoTipo={nomeDoTipo}
                onAbrir={onAbrir}
              />
            </div>
          </>
        )}
      </section>
    </main>
  )
}
