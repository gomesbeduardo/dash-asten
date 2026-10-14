import { useMemo, useState } from "react"

import type { CargaMeta } from "@/cargas"
import { tiposRegistrados } from "@/cargas"
import {
  enviadosVisiveis,
  foiEnviada,
  limparEnviados,
  tirarDaLista,
} from "@/cargas/enviados"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataCarga, filtrarHistorico } from "./buscaHistorico"
import { competenciaLonga, dataHora, rotuloVersao } from "./formatoCarga"

const maisRecentesPrimeiro = (metas: CargaMeta[]) =>
  [...metas].sort((a, b) => b.importadaEm.localeCompare(a.importadaEm))

const Etiqueta = ({ children }: { children: string }) => (
  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
    {children}
  </span>
)

/** Histórico em duas abas (D47). Nenhuma ação daqui apaga cargas do banco. */
export function HistoricoSheet({
  open,
  onOpenChange,
  metas,
  atualId,
  onAbrir,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  metas: CargaMeta[]
  atualId: string
  onAbrir: (id: string) => void
}) {
  // O estado de Enviados vive no localStorage; `rev` força reler após mudar.
  const [rev, setRev] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [busca, setBusca] = useState("")
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id

  const enviados = useMemo(
    () => maisRecentesPrimeiro(enviadosVisiveis(metas)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, rev, open]
  )
  const geral = useMemo(
    () => filtrarHistorico(maisRecentesPrimeiro(metas), busca, nomeDoTipo),
    [metas, busca]
  )

  const abrir = (id: string) => {
    onAbrir(id)
    onOpenChange(false)
  }
  const nome = (v: CargaMeta) =>
    `${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`

  const linha = (v: CargaMeta, acoes: React.ReactNode, etiquetas = false) => (
    <li
      key={v.id}
      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
    >
      <div className="min-w-0 text-base">
        <p className="tabular-nums">
          <span className="font-semibold">{nome(v)}</span> ·{" "}
          {dataHora(v.importadaEm)}
          {v.id === atualId && (
            <span className="ml-2 text-sm text-brand-ink">aberta</span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {v.arquivo}
        </p>
        {etiquetas && (
          <p className="mt-1 flex flex-wrap gap-1">
            <Etiqueta>{nomeDoTipo(v.tipo)}</Etiqueta>
            <Etiqueta>{competenciaLonga(v.competencia)}</Etiqueta>
            <Etiqueta>{rotuloVersao(v)}</Etiqueta>
            <Etiqueta>{dataCarga(v.importadaEm)}</Etiqueta>
            {foiEnviada(v.id) && <Etiqueta>enviada deste navegador</Etiqueta>}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">{acoes}</div>
    </li>
  )

  const botaoAbrir = (v: CargaMeta) => (
    <Button
      size="lg"
      variant="outline"
      aria-label={`Abrir ${nome(v)}`}
      onClick={() => abrir(v.id)}
    >
      Abrir
    </Button>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setConfirmando(false)
        onOpenChange(o)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl text-primary">Histórico</SheetTitle>
          <SheetDescription className="text-base">
            Cargas enviadas por este navegador e todas as cargas do time.
          </SheetDescription>
        </SheetHeader>
        <Tabs
          defaultValue="enviados"
          className="px-4 pb-6"
          onValueChange={() => setConfirmando(false)}
        >
          <TabsList>
            <TabsTrigger value="enviados">Enviados</TabsTrigger>
            <TabsTrigger value="geral">Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="enviados" className="flex flex-col gap-3">
            {enviados.length === 0 ? (
              <div className="text-base text-muted-foreground">
                <p>
                  {metas.some((m) => foiEnviada(m.id))
                    ? "Lista limpa."
                    : "Nada enviado deste navegador ainda."}
                </p>
                <p>Todas as cargas continuam na aba Geral.</p>
              </div>
            ) : (
              <>
                {confirmando ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base">
                      Tirar {enviados.length}{" "}
                      {enviados.length === 1 ? "carga" : "cargas"} da lista?
                      Nada é apagado; continuam na aba Geral.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => {
                        limparEnviados(enviados.map((m) => m.id))
                        setConfirmando(false)
                        setRev((r) => r + 1)
                      }}
                    >
                      Confirmar limpeza
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setConfirmando(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="self-start"
                    onClick={() => setConfirmando(true)}
                  >
                    Limpar enviados
                  </Button>
                )}
                <ul className="flex flex-col gap-2">
                  {enviados.map((v) =>
                    linha(
                      v,
                      <>
                        {botaoAbrir(v)}
                        <Button
                          size="lg"
                          variant="ghost"
                          aria-label={`Tirar da lista ${nome(v)}`}
                          onClick={() => {
                            tirarDaLista(v.id)
                            setRev((r) => r + 1)
                          }}
                        >
                          Tirar da lista
                        </Button>
                      </>
                    )
                  )}
                </ul>
              </>
            )}
          </TabsContent>

          <TabsContent value="geral" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="busca-historico" className="text-sm font-medium">
                Buscar
              </label>
              <Input
                id="busca-historico"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Arquivo, competência (09/2026, set/26), data, tipo, v3"
              />
            </div>
            {metas.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nenhuma carga guardada.
              </p>
            ) : geral.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nenhuma carga encontrada para essa busca.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {geral.map((v) => linha(v, botaoAbrir(v), true))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
