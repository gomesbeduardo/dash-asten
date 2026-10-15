import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { FilterIcon } from "lucide-react"

import type { Carga } from "@/cargas"
import { escolherAba } from "@/chamados"
import { useBarra } from "@/components/app/BarraContext"
import { ListaDeChips } from "@/components/app/FilterChips"
import { MultiSelectFilter } from "@/components/app/FiltersPanel"
import { useShortcuts } from "@/components/app/hooks/useShortcuts"
import { Button } from "@/components/ui/button"
import {
  Sheet as Drawer,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  CAMPOS_FILTRO,
  chipsDosFiltros,
  definirFiltro,
  opcoesDoFiltro,
  type CampoFiltro,
  type FiltrosChamados,
} from "./logica"

type Ctx = {
  filtros: FiltrosChamados
  definir: (campo: CampoFiltro, valores: string[]) => void
  limpar: () => void
  abrir: () => void
}

const SEM_FILTROS: Ctx = {
  filtros: {},
  definir: () => {},
  limpar: () => {},
  abrir: () => {},
}
const FiltrosContext = createContext<Ctx>(SEM_FILTROS)

export const useFiltrosChamados = () => useContext(FiltrosContext)

/**
 * Filtros de Chamados: um estado só para Painel, Comparar e Evolução, que sobrevive
 * à troca de visão e de competência (D6/D20). Abre com F e pelo botão da barra.
 */
export function FiltrosChamadosProvider({
  carga,
  children,
}: {
  carga: Carga
  children: ReactNode
}) {
  const [filtros, setFiltros] = useState<FiltrosChamados>({})
  const [aberto, setAberto] = useState(false)
  const { slot, setHold, setDica } = useBarra()
  const sheet = useMemo(() => escolherAba(carga.workbook), [carga.workbook])

  useEffect(() => {
    setHold(aberto)
    return () => setHold(false)
  }, [aberto, setHold])
  useEffect(() => {
    setDica("F filtros")
    return () => setDica(null)
  }, [setDica])
  useShortcuts({ onToggleFilters: () => setAberto((o) => !o) })

  const definir = useCallback(
    (campo: CampoFiltro, valores: string[]) =>
      setFiltros((f) => definirFiltro(f, campo, valores)),
    []
  )
  const limpar = useCallback(() => setFiltros({}), [])
  const abrir = useCallback(() => setAberto(true), [])
  const valor = useMemo(
    () => ({ filtros, definir, limpar, abrir }),
    [filtros, definir, limpar, abrir]
  )
  const total = chipsDosFiltros(filtros).length

  return (
    <FiltrosContext.Provider value={valor}>
      {slot &&
        createPortal(
          <div className="flex items-center gap-4">
            <Button variant="default" size="lg" onClick={abrir}>
              <FilterIcon aria-hidden /> Filtros
              {total > 0 && (
                <span className="rounded-full bg-primary-foreground px-2 text-sm font-semibold text-primary tabular-nums">
                  {total}
                </span>
              )}
            </Button>
          </div>,
          slot
        )}
      {children}
      <Drawer open={aberto} onOpenChange={setAberto}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b p-6">
            <SheetTitle className="text-2xl text-primary">Filtros</SheetTitle>
            <SheetDescription className="text-base">
              Recortam os indicadores, as leituras e os gráficos do painel, da
              comparação e da evolução.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            {CAMPOS_FILTRO.map(({ campo, rotulo }) => {
              const selecionados = filtros[campo] ?? []
              const opcoes = sheet ? opcoesDoFiltro(sheet, campo) : []
              const todas = [
                ...opcoes,
                ...selecionados.filter((v) => !opcoes.includes(v)),
              ]
              if (todas.length === 0) return null
              return (
                <div key={campo} className="flex flex-col gap-2">
                  <p className="font-display text-lg font-semibold">{rotulo}</p>
                  <MultiSelectFilter
                    label={rotulo}
                    options={todas}
                    selected={selecionados}
                    onChange={(v) => definir(campo, v)}
                  />
                </div>
              )
            })}
          </div>
          <div className="border-t p-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={limpar}
            >
              Limpar filtros
            </Button>
          </div>
        </SheetContent>
      </Drawer>
    </FiltrosContext.Provider>
  )
}

/** Aviso curto quando um filtro ativo não tem a coluna numa carga: os números ficam "—", não zero. */
export function AvisoFiltroSemColuna({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null
  return (
    <ul aria-label="Filtros sem coluna" className="flex flex-col gap-1">
      {avisos.map((a) => (
        <li key={a} className="text-base font-medium text-muted-foreground">
          {a}
        </li>
      ))}
    </ul>
  )
}

/** Filtros ativos, visíveis mesmo com a barra escondida; removíveis um a um. */
export function ChipsFiltrosChamados() {
  const { filtros, definir, limpar } = useFiltrosChamados()
  return (
    <ListaDeChips
      chips={chipsDosFiltros(filtros)}
      onRemove={(campo) => definir(campo, [])}
      onClearAll={limpar}
    />
  )
}
