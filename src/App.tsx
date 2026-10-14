import { useCallback, useEffect, useState } from "react"

import type { Carga, CargaMeta } from "@/cargas"
import type { Workbook } from "@/core"
import { escolherCargaInicial, sucessorAposExcluir } from "@/app/navegacao"
import { useRepositorio } from "@/app/RepositorioContext"
import { Apresentacao } from "@/components/app/Apresentacao"
import { ImportScreen } from "@/components/app/ImportScreen"
import { NovaCargaDialog } from "@/components/app/NovaCargaDialog"
import { useWorkbookLoader } from "@/components/app/hooks/useWorkbookLoader"

export function App() {
  const repo = useRepositorio()
  const [pronto, setPronto] = useState(false)
  const [metas, setMetas] = useState<CargaMeta[]>([])
  const [atual, setAtual] = useState<Carga | null>(null)
  const [pendente, setPendente] = useState<Workbook | null>(null)
  const [erroRepo, setErroRepo] = useState<string | null>(null)

  const onLoaded = useCallback((wb: Workbook) => setPendente(wb), [])
  const loader = useWorkbookLoader(onLoaded)

  // Abertura (TV): competência mais recente do tipo da última carga feita.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const ms = await repo.listar()
        const ini = escolherCargaInicial(ms)
        const carga = ini ? await repo.obter(ini.id) : null
        if (cancelado) return
        setMetas(ms)
        setAtual(carga)
      } catch {
        if (!cancelado)
          setErroRepo("Não foi possível ler o histórico deste navegador.")
      } finally {
        if (!cancelado) setPronto(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [repo])

  const guardar = useCallback(
    async (escolha: { tipo: string; competencia: string }) => {
      if (!pendente) return
      try {
        const meta = await repo.salvar({
          tipo: escolha.tipo,
          competencia: escolha.competencia,
          arquivo: pendente.fileName,
          workbook: pendente,
        })
        setMetas(await repo.listar())
        setAtual(await repo.obter(meta.id))
        setErroRepo(null)
      } catch {
        setErroRepo("Não foi possível guardar a carga neste navegador.")
      }
      setPendente(null)
    },
    [repo, pendente]
  )

  const abrir = useCallback(
    async (id: string) => {
      const carga = await repo.obter(id)
      if (carga) setAtual(carga)
    },
    [repo]
  )

  const excluir = useCallback(
    async (meta: CargaMeta) => {
      await repo.excluir(meta.id)
      const restantes = await repo.listar()
      setMetas(restantes)
      if (atual?.id === meta.id) {
        const suc = sucessorAposExcluir(restantes, meta)
        setAtual(suc ? await repo.obter(suc.id) : null)
      }
    },
    [repo, atual]
  )

  const apagarTudo = useCallback(async () => {
    await repo.limparTudo()
    setMetas([])
    setAtual(null)
    loader.dismiss()
  }, [repo, loader])

  if (!pronto) return null

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
          onExcluir={excluir}
          onNovaCarga={loader.load}
          onApagarTudo={apagarTudo}
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
          onFile={loader.load}
        />
      )}
      {pendente && (
        <NovaCargaDialog
          workbook={pendente}
          metas={metas}
          onConfirm={guardar}
          onCancel={() => setPendente(null)}
        />
      )}
    </>
  )
}

export default App
