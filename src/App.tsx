import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ErroDeCarga, type AlteracaoDeCarga, type Carga, type CargaMeta } from "@/cargas"
import { registrarEnvio } from "@/cargas/enviados"
import { maisRecenteDoLote } from "@/cargas/lote"
import { sucessorAposExcluir } from "@/app/navegacao"
import { ordenarMetas } from "@/cargas/repositorio-comum"
import type { Workbook } from "@/core"
import { modoApi } from "@/app/modo-api"
import { usePrecarga } from "@/app/precarga"
import { useRepositorio } from "@/app/RepositorioContext"
import { useListaInicial } from "@/app/sessao/SessaoContext"
import { guardarUltimaAbertura, lerUltimaAbertura } from "@/app/ultima-abertura"
import { Avisos, type AvisoItem } from "@/components/app/Avisos"
import { Apresentacao } from "@/components/app/Apresentacao"
import { ImportScreen } from "@/components/app/ImportScreen"
import { NovaCargaDialog } from "@/components/app/NovaCargaDialog"
import {
  NovaCargaLoteDialog,
  type Escolha,
  type Guardada,
  type ItemLido,
} from "@/components/app/NovaCargaLoteDialog"
import { useAvisoAoSair } from "@/components/app/hooks/useAvisoAoSair"
import { useImpedirAbrirArquivo } from "@/components/app/hooks/useArrasteNaJanela"
import { cn } from "@/lib/utils"
import {
  useWorkbookLoader,
  type LoteLido,
} from "@/components/app/hooks/useWorkbookLoader"

/** Tempo mínimo entre duas relistagens disparadas pela volta à aba. */
const INTERVALO_RELISTAR_MS = 30_000

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
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroRepo, setErroRepo] = useState<string | null>(null)
  // Envio em andamento (guardando) e carga sendo baixada ao abrir.
  const [guardando, setGuardando] = useState(0)
  const [abrindo, setAbrindo] = useState(false)
  const abrindoRef = useRef(false)

  const ultimaLista = useRef(0)
  const sequencia = useRef(0)
  const atualRef = useRef<Carga | null>(null)
  const metasRef = useRef<CargaMeta[]>([])
  useEffect(() => {
    atualRef.current = atual
    metasRef.current = metas
  })
  // Arquivadas ficam fora de tudo, menos do Histórico (que as mostra sob pedido).
  const ativas = useMemo(() => metas.filter((m) => !m.arquivadaEm), [metas])
  // Os dados de uma carga nunca mudam, mas nome/tipo/competência/versão/arquivamento
  // podem: valem sempre os da lista.
  const atualVista = useMemo<Carga | null>(() => {
    if (!atual) return null
    const m = metas.find((x) => x.id === atual.id)
    return m ? { ...atual, ...m } : atual
  }, [atual, metas])

  const onLoaded = useCallback(
    (workbook: Workbook, original: ArrayBuffer) =>
      setPendente({ workbook, original }),
    []
  )
  const onLoadedMany = useCallback((l: LoteLido) => {
    setAviso(null)
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
        ultimaLista.current = Date.now()
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

  const abrir = useCallback(
    async (id: string) => {
      // O download leva um instante: mostra o indicador e ignora cliques repetidos.
      if (abrindoRef.current) return
      abrindoRef.current = true
      setAbrindo(true)
      try {
        const carga = await repo.obter(id)
        if (carga) setAtual(carga)
      } finally {
        abrindoRef.current = false
        setAbrindo(false)
      }
    },
    [repo]
  )

  // A carga aberta sumiu ou foi arquivada: avisa e abre a mais recente ativa
  // (ou volta à tela de envio).
  const reconciliar = useCallback(
    (ms: CargaMeta[], avisar: boolean) => {
      const a = atualRef.current
      if (!a) return
      const m = ms.find((x) => x.id === a.id)
      if (!m) {
        if (avisar) setAviso("Esta carga não existe mais.")
        setAtual(null)
        return
      }
      if (!m.arquivadaEm) return
      if (avisar) setAviso("Esta carga foi arquivada.")
      const sucessora = sucessorAposExcluir(
        ms.filter((x) => !x.arquivadaEm),
        m
      )
      if (sucessora) void abrir(sucessora.id)
      else setAtual(null)
    },
    [abrir]
  )

  // Refaz a lista (outra pessoa pode ter enviado, apagado ou arquivado). Uma
  // resposta antiga nunca sobrepõe uma mais nova. Falha de rede é ignorada.
  const atualizarLista = useCallback(
    async (avisar = true): Promise<boolean> => {
      const minha = ++sequencia.current
      ultimaLista.current = Date.now()
      try {
        const ms = await repo.listar()
        if (minha !== sequencia.current) return true
        setMetas(ms)
        reconciliar(ms, avisar)
        return true
      } catch {
        return false
      }
    },
    [repo, reconciliar]
  )

  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "hidden") return
      if (Date.now() - ultimaLista.current < INTERVALO_RELISTAR_MS) return
      void atualizarLista()
    }
    document.addEventListener("visibilitychange", aoVoltar)
    window.addEventListener("focus", aoVoltar)
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar)
      window.removeEventListener("focus", aoVoltar)
    }
  }, [atualizarLista])

  const alterar = useCallback(
    async (id: string, alteracao: AlteracaoDeCarga) => {
      let meta: CargaMeta
      try {
        meta = await repo.alterar(id, alteracao)
      } catch (e) {
        throw new Error(
          e instanceof ErroDeCarga
            ? e.message
            : "Não foi possível alterar a carga. Tente de novo.",
          { cause: e }
        )
      }
      const locais = ordenarMetas(
        metasRef.current.map((m) => (m.id === id ? meta : m))
      )
      setMetas(locais)
      if (!(await atualizarLista(false))) reconciliar(locais, false)
    },
    [repo, atualizarLista, reconciliar]
  )

  // Guarda uma planilha. A meta vem do servidor e o workbook é o local, sem
  // baixar de novo (o adaptador da API também revive datas para Date).
  const persistir = useCallback(
    async (item: ItemLido, escolha: Escolha) => {
      setGuardando((n) => n + 1)
      let meta: CargaMeta
      try {
        meta = await repo.salvar({
          tipo: escolha.tipo,
          competencia: escolha.competencia,
          arquivo: item.workbook.fileName,
          ...(escolha.nome ? { nome: escolha.nome } : {}),
          ...(escolha.mesRef ? { mesRef: escolha.mesRef } : {}),
          workbook: item.workbook,
          original: item.original,
        })
      } finally {
        setGuardando((n) => n - 1)
      }
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
        void atualizarLista()
      } catch {
        setErroRepo(
          modoApi()
            ? "Não foi possível guardar a carga no banco do app."
            : "Não foi possível guardar a carga neste navegador."
        )
      }
      setPendente(null)
    },
    [persistir, pendente, atualizarLista]
  )

  // Fim do lote: abre a competência mais recente entre as guardadas.
  const concluirLote = useCallback((guardadas: Guardada[], total: number) => {
    void atualizarLista()
    const recente = maisRecenteDoLote(guardadas.map((g) => g.meta))
    const g = guardadas.find((x) => x.meta === recente)
    if (g) setAtual({ ...g.meta, workbook: g.item.workbook })
    const erros = total - guardadas.length
    setAviso(
      `${guardadas.length} de ${total} guardadas${erros > 0 ? `; ${erros} com erro` : ""}`
    )
    setErroRepo(null)
    setLote(null)
  }, [atualizarLista])

  // Lembra a carga aberta (por navegador) para o "Abrir a última" da TV.
  const atualId = atual?.id
  useEffect(() => {
    if (atualId) guardarUltimaAbertura({ cargaId: atualId })
  }, [atualId])

  useImpedirAbrirArquivo()
  useAvisoAoSair(guardando > 0 || loader.state.status === "loading")

  usePrecarga(repo, ativas, atual?.tipo ?? null)

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

  const itensAviso: AvisoItem[] = []
  if (abrindo && atual) {
    itensAviso.push({ id: "abrindo", conteudo: "Abrindo a carga…" })
  }
  if (loader.state.status === "loading" && atual) {
    itensAviso.push({
      id: "lendo",
      conteudo: loader.state.progresso
        ? `Lendo ${loader.state.progresso.atual} de ${loader.state.progresso.total}…`
        : "Lendo a planilha…",
    })
  }
  if (aviso) {
    itensAviso.push({
      id: "aviso",
      className: "flex items-center gap-3 py-2 pl-4 pr-2",
      conteudo: (
        <>
          {aviso}
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setAviso(null)}
          >
            Fechar
          </button>
        </>
      ),
    })
  }

  return (
    <>
      {/* A tela que entra faz fade; a que sai desmonta (sem instante de tela vazia). */}
      <AnimatePresence initial={false}>
        {atualVista ? (
          <motion.div
            key={`apresentacao-${atualVista.tipo}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Trocar de competência: o conteúdo antigo fica atenuado até a nova carga chegar. */}
            <div
              aria-busy={abrindo}
              className={cn(
                "transition-opacity duration-150 motion-reduce:transition-none",
                abrindo && "opacity-60"
              )}
            >
              <Apresentacao
                key={atualVista.tipo}
                carga={atualVista}
                metas={ativas}
                metasTodas={metas}
                onAlterar={alterar}
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
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="envio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ImportScreen
              state={
                erroRepo ? { status: "error", message: erroRepo } : loader.state
              }
              onFiles={receberArquivos}
              metas={ativas}
              carregandoLista={!pronto}
              onAbrir={abrir}
              lembradaId={lerUltimaAbertura().cargaId}
              abrindo={abrindo}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Avisos itens={itensAviso} />
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
