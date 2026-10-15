import { Loader2Icon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { formatarCompetencia, tiposRegistrados, type CargaMeta } from "@/cargas"
import { escolherCargaInicial } from "@/app/navegacao"
import { modoApi } from "@/app/modo-api"
import logo from "@/assets/asten-logo-fundo-claro.png"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { rotuloVersao } from "./formatoCarga"
import type { LoadState } from "./hooks/useWorkbookLoader"
import { AreaDeEnvio } from "./AreaDeEnvio"
import { ListaCargasAgrupada } from "./ListaCargasAgrupada"
import { standard } from "./motion/tokens"

/** Alinhada pelo topo (respiro fixo): a lista cresce só para baixo, sem pular a tela. */
export const CLASSE_TELA_DE_ENVIO =
  "mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-10 px-6 pb-12 pt-16"

/** Entra com fade atrasado (não pisca quando os dados vêm do cache); sem animação com movimento reduzido. */
function FadeComAtraso({
  atraso,
  className,
  children,
}: {
  atraso: number
  className?: string
  children: React.ReactNode
}) {
  const reduzir = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: reduzir ? 0 : atraso, ease: standard }}
    >
      {children}
    </motion.div>
  )
}

/** Três linhas no formato dos grupos da lista de cargas. */
export function EsqueletoDeCargas({ atraso = 0.12 }: { atraso?: number }) {
  return (
    <FadeComAtraso atraso={atraso} className="flex flex-col gap-2">
      <div role="status">
        <span className="sr-only">Carregando as cargas…</span>
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" aria-hidden />
      ))}
    </FadeComAtraso>
  )
}

/** Esqueleto neutro da tela de envio inteira (espera da sessão), com a mesma estrutura dela. */
export function EsqueletoDaTelaDeEnvio({
  atraso = 0.15,
  children,
}: {
  atraso?: number
  /** Texto acessível do estado (fica só para leitores de tela). */
  children: React.ReactNode
}) {
  return (
    <main className={CLASSE_TELA_DE_ENVIO} aria-busy>
      <FadeComAtraso atraso={atraso} className="flex flex-col gap-10">
        <div role="status" className="sr-only">
          {children}
        </div>
        <Skeleton className="h-12 w-32" aria-hidden />
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-7 w-3/5" />
        </div>
        <Skeleton className="h-48 w-full" aria-hidden />
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </FadeComAtraso>
    </main>
  )
}

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
    <main className={CLASSE_TELA_DE_ENVIO}>
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
          <EsqueletoDeCargas />
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
                <Loader2Icon className="size-5 motion-safe:animate-spin" aria-hidden />
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
