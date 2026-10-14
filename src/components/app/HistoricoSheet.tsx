import { useMemo, useState } from "react"

import type { AlteracaoDeCarga, CargaMeta } from "@/cargas"
import { tiposRegistrados } from "@/cargas"
import {
  enviadosVisiveis,
  foiEnviada,
  limparEnviados,
  tirarDaLista,
} from "@/cargas/enviados"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditarCargaDialog } from "./EditarCargaDialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataCarga, filtrarHistorico } from "./buscaHistorico"
import { competenciaLonga, rotuloComNome, rotuloVersao } from "./formatoCarga"
import { ListaCargasAgrupada } from "./ListaCargasAgrupada"

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
  onAlterar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  metas: CargaMeta[]
  atualId: string
  onAbrir: (id: string) => void
  /** Renomeia, corrige tipo/competência ou arquiva/restaura. Quem chama trata os erros. */
  onAlterar: (id: string, alteracao: AlteracaoDeCarga) => Promise<void>
}) {
  // O estado de Enviados vive no localStorage; `rev` força reler após mudar.
  const [rev, setRev] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [busca, setBusca] = useState("")
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [editando, setEditando] = useState<CargaMeta | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  // Arquivar/restaurar direto da lista: a falha aparece no topo do painel.
  const alterar = async (id: string, alt: AlteracaoDeCarga) => {
    try {
      setFalha(null)
      await onAlterar(id, alt)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Não foi possível alterar a carga.")
    }
  }
  const nomeDoTipo = (id: string) =>
    tiposRegistrados().find((t) => t.id === id)?.nome ?? id

  const ativas = useMemo(() => metas.filter((m) => !m.arquivadaEm), [metas])
  const temArquivadas = ativas.length !== metas.length
  const enviados = useMemo(
    () => maisRecentesPrimeiro(enviadosVisiveis(ativas)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativas, rev, open]
  )
  const geral = useMemo(
    () =>
      filtrarHistorico(
        maisRecentesPrimeiro(mostrarArquivadas ? metas : ativas),
        busca,
        nomeDoTipo
      ),
    [metas, ativas, mostrarArquivadas, busca]
  )

  const abrir = (id: string) => {
    onAbrir(id)
    onOpenChange(false)
  }
  const nome = (v: CargaMeta) =>
    `${competenciaLonga(v.competencia)} ${rotuloVersao(v)}`

  const podeAbrir = (v: CargaMeta) => !v.arquivadaEm
  const gestao = (v: CargaMeta) => (
    <>
      <Button
        size="lg"
        variant="ghost"
        aria-label={`Editar ${nome(v)}`}
        onClick={() => setEditando(v)}
      >
        Editar
      </Button>
      {v.arquivadaEm ? (
        <Button
          size="lg"
          variant="ghost"
          aria-label={`Restaurar ${nome(v)}`}
          onClick={() => alterar(v.id, { arquivada: false })}
        >
          Restaurar
        </Button>
      ) : (
        <Button
          size="lg"
          variant="ghost"
          aria-label={`Arquivar ${nome(v)}`}
          onClick={() => alterar(v.id, { arquivada: true })}
        >
          Arquivar
        </Button>
      )}
    </>
  )

  const etiquetas = (v: CargaMeta) => (
    <p className="mt-1 flex flex-wrap gap-1">
      <Etiqueta>{nomeDoTipo(v.tipo)}</Etiqueta>
      <Etiqueta>{competenciaLonga(v.competencia)}</Etiqueta>
      <Etiqueta>{rotuloComNome(v)}</Etiqueta>
      <Etiqueta>{dataCarga(v.importadaEm)}</Etiqueta>
      {foiEnviada(v.id) && <Etiqueta>enviada deste navegador</Etiqueta>}
    </p>
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
        {falha && (
          <p
            role="alert"
            className="mx-4 border-l-4 border-destructive py-2 pl-3 text-base text-destructive"
          >
            {falha}
          </p>
        )}
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
                  {ativas.some((m) => foiEnviada(m.id))
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
                <ListaCargasAgrupada
                  metas={enviados}
                  nomeDoTipo={nomeDoTipo}
                  atualId={atualId}
                  onAbrir={abrir}
                  acoes={(v) => (
                    <>
                      {gestao(v)}
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
                  )}
                />
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
            {temArquivadas && (
              <label className="flex min-h-11 items-center gap-2 text-base">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={mostrarArquivadas}
                  onChange={(e) => setMostrarArquivadas(e.target.checked)}
                />
                Mostrar arquivadas
              </label>
            )}
            {metas.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nenhuma carga guardada.
              </p>
            ) : geral.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nenhuma carga encontrada para essa busca.
              </p>
            ) : (
              <ListaCargasAgrupada
                metas={geral}
                nomeDoTipo={nomeDoTipo}
                atualId={atualId}
                onAbrir={abrir}
                expandirTodos={busca.trim() !== ""}
                detalhes={etiquetas}
                podeAbrir={podeAbrir}
                acoes={gestao}
              />
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
      {editando && (
        <EditarCargaDialog
          key={editando.id}
          carga={editando}
          metas={metas}
          onSalvar={(alt) => onAlterar(editando.id, alt)}
          onCancel={() => setEditando(null)}
        />
      )}
    </Sheet>
  )
}
