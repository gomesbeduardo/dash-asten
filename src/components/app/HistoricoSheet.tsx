import { useState } from "react"

import type { CargaMeta } from "@/cargas"
import { agruparHistorico } from "@/app/navegacao"
import { tiposRegistrados } from "@/cargas"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { competenciaLonga, dataHora, rotuloVersao } from "./formatoCarga"

export function HistoricoSheet({
  open,
  onOpenChange,
  metas,
  atualId,
  onAbrir,
  onExcluir,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  metas: CargaMeta[]
  atualId: string
  onAbrir: (id: string) => void
  onExcluir: (meta: CargaMeta) => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setConfirmando(null)
        onOpenChange(o)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl text-primary">Histórico</SheetTitle>
          <SheetDescription className="text-base">
            Todas as cargas guardadas neste navegador.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          {agruparHistorico(metas).map((g) => (
            <section key={g.tipo} className="flex flex-col gap-3">
              <h3 className="font-display text-xl text-primary">
                {nomeDoTipo(g.tipo)}
              </h3>
              {g.competencias.map((c) => (
                <div key={c.competencia} className="flex flex-col gap-1">
                  <p className="text-base font-semibold">
                    {competenciaLonga(c.competencia)}
                  </p>
                  {c.versoes.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 text-base">
                        <p className="tabular-nums">
                          <span className="font-semibold">
                            {rotuloVersao(v)}
                          </span>{" "}
                          · {dataHora(v.importadaEm)}
                          {v.id === atualId && (
                            <span className="ml-2 text-sm text-brand-ink">
                              aberta
                            </span>
                          )}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {v.arquivo} · {v.linhas} linhas
                        </p>
                      </div>
                      {confirmando === v.id ? (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="lg"
                            variant="destructive"
                            aria-label={`Confirmar exclusão de ${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`}
                            onClick={() => {
                              setConfirmando(null)
                              onExcluir(v)
                            }}
                          >
                            Excluir
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setConfirmando(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="lg"
                            variant="outline"
                            aria-label={`Abrir ${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`}
                            onClick={() => {
                              onAbrir(v.id)
                              onOpenChange(false)
                            }}
                          >
                            Abrir
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            aria-label={`Excluir ${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`}
                            onClick={() => setConfirmando(v.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
          {metas.length === 0 && (
            <p className="text-base text-muted-foreground">
              Nenhuma carga guardada.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
