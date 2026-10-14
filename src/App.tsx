import { useCallback, useEffect, useRef, useState } from "react"

import type { Carga, CargaMeta } from "@/cargas"
import { registrarEnvio } from "@/cargas/enviados"
import { maisRecenteDoLote } from "@/cargas/lote"
import { ordenarMetas } from "@/cargas/repositorio-comum"
import type { Workbook } from "@/core"
import { modoApi } from "@/app/modo-api"
import { usePrecarga } from "@/app/precarga"
import { useRepositorio } from "@/app/RepositorioContext"
import { useListaInicial } from "@/app/sessao/SessaoContext"
import { Apresentacao } from "@/components/app/Apresentacao"
import { ImportScreen } from "@/components/app/ImportScreen"
import { NovaCargaDialog } from "@/components/app/NovaCargaDialog"
import {
  NovaCargaLoteDialog,
  type Escolha,
  type Guardada,
  type ItemLido,
} from "@/components/app/NovaCargaLoteDialog"
import {
  useWorkbookLoader,
  type LoteLido,
} from "@/components/app/hooks/useWorkbookLoader"

export function App() {
  const repo = useRepositorio()
  // Lista que o porteiro já buscou ao verificar a sessão: poupa uma requisição na abertura.
  const listaInicial = useRef(useListaInicial())
  const [pronto, setPronto] = useState(false)
  const [metas, setMetas] = useState<CargaMeta[]>([])
  const [atual, setAtual] = useState<Carga | null>(null)
  const [pendente, setPendente] = useState<{
    workbook: Workbook
    original: ArrayBuffer
  } | null>(null)
  const [lote, setLote] = useState<LoteLido | null>(null)
  const [resumoLote, setResumoLote] = useState<string | null>(null)
  const [erroRepo, setErroRepo] = useState<string | null>(null)

  const onLoaded = useCallback(
    (workbook: Workbook, original: ArrayBuffer) =>
      setPendente({ workbook, original }),
    []
  )
  const onLoadedMany = useCallback((l: LoteLido) => {
    setResumoLote(null)
    setLote(l)
  }, [])
  const loader = useWorkbookLoader(onLoaded, onLoadedMany)
  const { load, loadMany } = loader
  // Um arquivo segue o fluxo de sempre; dois ou mais abrem a confirmação em lote.
  const receberArquivos = useCallback(
    (files: File[], ignorados: string[]) => {
      if (files.length === 1) load(files[0])
      else loadMany(files, ignorados)
    },
    [load, loadMany]
  )

  // Abertura: sempre na tela de envio. Só lista as cargas (para mostrar o que
  // já existe); nenhuma carga completa é baixada até a pessoa escolher uma.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const ms = listaInicial.current ?? (await repo.listar())
        if (cancelado) return
        setMetas(ms)
      } catch {
        if (!cancelado)
          setErroRepo(
            modoApi()
              ? "Não foi possível ler o histórico do app."
              : "Não foi possível ler o histórico deste navegador."
          )
      } finally {
        if (!cancelado) setPronto(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [repo])

  // Guarda uma planilha. A meta vem do servidor e o workbook é o local, sem
  // baixar de novo (o adaptador da API também revive datas para Date).
  const persistir = useCallback(
    async (item: ItemLido, escolha: Escolha) => {
      const meta = await repo.salvar({
        tipo: escolha.tipo,
        competencia: escolha.competencia,
        arquivo: item.workbook.fileName,
        workbook: item.workbook,
        original: item.original,
      })
      registrarEnvio(meta.id)
      setMetas((ms) => ordenarMetas([...ms.filter((m) => m.id !== meta.id), meta]))
      return meta
    },
    [repo]
  )

  const guardar = useCallback(
    async (escolha: Escolha) => {
      if (!pendente) return
      try {
        const meta = await persistir(pendente, escolha)
        setAtual({ ...meta, workbook: pendente.workbook })
        setErroRepo(null)
      } catch {
        setErroRepo(
          modoApi()
            ? "Não foi possível guardar a carga no banco do app."
            : "Não foi possível guardar a carga neste navegador."
        )
      }
      setPendente(null)
    },
    [persistir, pendente]
  )

  // Fim do lote: abre a competência mais recente entre as guardadas.
  const concluirLote = useCallback((guardadas: Guardada[], total: number) => {
    const recente = maisRecenteDoLote(guardadas.map((g) => g.meta))
    const g = guardadas.find((x) => x.meta === recente)
    if (g) setAtual({ ...g.meta, workbook: g.item.workbook })
    const erros = total - guardadas.length
    setResumoLote(
      `${guardadas.length} de ${total} guardadas${erros > 0 ? `; ${erros} com erro` : ""}`
    )
    setErroRepo(null)
    setLote(null)
  }, [])

  const abrir = useCallback(
    async (id: string) => {
      const carga = await repo.obter(id)
      if (carga) setAtual(carga)
    },
    [repo]
  )

  usePrecarga(repo, metas, atual?.tipo ?? null)

  const apagarTudo = useCallback(async () => {
    await repo.limparTudo?.()
    setMetas([])
    setAtual(null)
    loader.dismiss()
  }, [repo, loader])

  // Banco compartilhado: só volta à tela inicial, sem apagar nada.
  const fecharCarga = useCallback(() => {
    setAtual(null)
    loader.dismiss()
  }, [loader])

  const erro =
    erroRepo ?? (loader.state.status === "error" ? loader.state.message : null)

  return (
    <>
      {atual ? (
        <Apresentacao
          key={atual.tipo}
          carga={atual}
          metas={metas}
          obterCarga={repo.obter}
          onAbrir={abrir}
          onNovaCarga={receberArquivos}
          onApagarTudo={repo.limparTudo ? apagarTudo : undefined}
          onFecharCarga={fecharCarga}
          erro={erro}
          onDismissErro={() => {
            loader.dismiss()
            setErroRepo(null)
          }}
        />
      ) : (
        <ImportScreen
          state={
            erroRepo ? { status: "error", message: erroRepo } : loader.state
          }
          onFiles={receberArquivos}
          metas={metas}
          carregandoLista={!pronto}
          onAbrir={abrir}
        />
      )}
      {loader.state.status === "loading" && atual && (
        <p
          role="status"
          className="fixed bottom-4 left-4 z-50 rounded-md border bg-card px-4 py-2 text-base shadow-md"
        >
          {loader.state.progresso
            ? `Lendo ${loader.state.progresso.atual} de ${loader.state.progresso.total}…`
            : "Lendo a planilha…"}
        </p>
      )}
      {resumoLote && (
        <p
          role="status"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-md border bg-card py-2 pl-4 pr-2 text-base shadow-md"
        >
          {resumoLote}
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setResumoLote(null)}
          >
            Fechar
          </button>
        </p>
      )}
      {lote && (
        <NovaCargaLoteDialog
          itens={lote.itens}
          falhas={lote.falhas}
          ignorados={lote.ignorados}
          metas={metas}
          guardar={persistir}
          onConcluir={concluirLote}
          onCancel={() => setLote(null)}
        />
      )}
      {pendente && (
        <NovaCargaDialog
          workbook={pendente.workbook}
          metas={metas}
          onConfirm={guardar}
          onCancel={() => setPendente(null)}
        />
      )}
    </>
  )
}

export default App
