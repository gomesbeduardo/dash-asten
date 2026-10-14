import { useCallback, useEffect, useRef, useState } from "react"

import type { Carga, CargaMeta } from "@/cargas"
import { registrarEnvio } from "@/cargas/enviados"
import { ordenarMetas } from "@/cargas/repositorio-comum"
import type { Workbook } from "@/core"
import { modoApi } from "@/app/modo-api"
import { usePrecarga } from "@/app/precarga"
import { useRepositorio } from "@/app/RepositorioContext"
import { useListaInicial } from "@/app/sessao/SessaoContext"
import { Apresentacao } from "@/components/app/Apresentacao"
import { ImportScreen } from "@/components/app/ImportScreen"
import { NovaCargaDialog } from "@/components/app/NovaCargaDialog"
import { useWorkbookLoader } from "@/components/app/hooks/useWorkbookLoader"

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
  const [erroRepo, setErroRepo] = useState<string | null>(null)

  const onLoaded = useCallback(
    (workbook: Workbook, original: ArrayBuffer) =>
      setPendente({ workbook, original }),
    []
  )
  const loader = useWorkbookLoader(onLoaded)

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

  const guardar = useCallback(
    async (escolha: { tipo: string; competencia: string }) => {
      if (!pendente) return
      try {
        const meta = await repo.salvar({
          tipo: escolha.tipo,
          competencia: escolha.competencia,
          arquivo: pendente.workbook.fileName,
          workbook: pendente.workbook,
          original: pendente.original,
        })
        registrarEnvio(meta.id)
        // Sem baixar de novo: a meta vem do servidor e o workbook é o local
        // (o adaptador da API também revive datas para Date).
        setMetas((ms) => ordenarMetas([...ms.filter((m) => m.id !== meta.id), meta]))
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
    [repo, pendente]
  )

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
          onNovaCarga={loader.load}
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
          onFile={loader.load}
          metas={metas}
          carregandoLista={!pronto}
          onAbrir={abrir}
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
