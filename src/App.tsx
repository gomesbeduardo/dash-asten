import { createElement, useCallback, useMemo, useState } from "react"

import {
  applyFilters,
  clearFilter,
  type SheetFilters,
  type Workbook,
} from "@/core"
import { getPanel } from "@/panels/registry"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilterChips } from "@/components/app/FilterChips"
import { FiltersPanel } from "@/components/app/FiltersPanel"
import { GenericTable } from "@/components/app/GenericTable"
import { ImportScreen } from "@/components/app/ImportScreen"
import { TopBar } from "@/components/app/TopBar"
import { useBarVisibility } from "@/components/app/hooks/useBarVisibility"
import { useShortcuts } from "@/components/app/hooks/useShortcuts"
import { useWorkbookLoader } from "@/components/app/hooks/useWorkbookLoader"
import {
  hideSheet,
  resolveActive,
  showSheet,
  stepSheet,
  visibleIds,
} from "@/components/app/tabs-state"

type Presentation = {
  workbook: Workbook
  activeId: string
  hidden: string[]
  filters: Record<string, SheetFilters> // por aba (D6)
}

function Presenter({
  initial,
  onReplace,
  onClear,
  replaceError,
  onDismissError,
}: {
  initial: Workbook
  onReplace: (file: File) => void
  onClear: () => void
  replaceError: string | null
  onDismissError: () => void
}) {
  const [state, setState] = useState<Presentation>({
    workbook: initial,
    activeId: initial.sheets[0].id,
    hidden: [],
    filters: {},
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { workbook, hidden } = state
  const allIds = useMemo(() => workbook.sheets.map((s) => s.id), [workbook])
  const activeId = resolveActive(allIds, hidden, state.activeId)
  const sheet =
    workbook.sheets.find((s) => s.id === activeId) ?? workbook.sheets[0]
  const filters = useMemo(
    () => state.filters[sheet.id] ?? {},
    [state.filters, sheet.id]
  )
  const rows = useMemo(() => applyFilters(sheet, filters), [sheet, filters])
  const filterCount = Object.keys(filters).length

  const overlayOpen = filtersOpen || tabsMenuOpen || confirmOpen
  const bar = useBarVisibility({ hold: overlayOpen })

  const select = useCallback(
    (id: string) => setState((s) => ({ ...s, activeId: id })),
    []
  )
  const setSheetFilters = (next: SheetFilters) =>
    setState((s) => ({ ...s, filters: { ...s.filters, [sheet.id]: next } }))

  useShortcuts({
    onStep: (dir) => {
      if (overlayOpen) return
      select(stepSheet(visibleIds(allIds, hidden), activeId, dir))
    },
    onGoTo: (i) => {
      if (overlayOpen) return
      const id = visibleIds(allIds, hidden)[i]
      if (id) select(id)
    },
    onToggleFilters: () => setFiltersOpen((o) => !o),
    onEscape: () => {
      setFiltersOpen(false)
      setTabsMenuOpen(false)
    },
    onToggleBar: bar.toggle,
  })

  const panel = getPanel(sheet)

  return (
    <div className="min-h-svh">
      <TopBar
        visible={bar.visible}
        sheets={workbook.sheets}
        hidden={hidden}
        activeId={activeId}
        filterCount={filterCount}
        onSelect={select}
        onToggleSheet={(id, show) =>
          setState((s) => {
            const nextHidden = show
              ? showSheet(s.hidden, id)
              : hideSheet(allIds, s.hidden, id)
            return {
              ...s,
              hidden: nextHidden,
              activeId: resolveActive(allIds, nextHidden, s.activeId),
            }
          })
        }
        onOpenFilters={() => setFiltersOpen(true)}
        onPickFile={onReplace}
        onClear={() => setConfirmOpen(true)}
        onTabsMenuOpenChange={setTabsMenuOpen}
      />

      <main className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 px-10 pt-[104px] pb-16">
        {replaceError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 border-l-4 border-destructive bg-card py-3 pl-4 text-lg"
          >
            <span>
              <span className="font-medium text-destructive">
                {replaceError}
              </span>{" "}
              A planilha atual continua aberta.
            </span>
            <Button variant="ghost" size="lg" onClick={onDismissError}>
              Fechar
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="text-6xl leading-none text-primary">{sheet.name}</h1>
          <p className="text-lg text-muted-foreground">
            {workbook.fileName} · importada às{" "}
            {workbook.importedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <FilterChips
          sheet={sheet}
          filters={filters}
          onRemove={(key) => setSheetFilters(clearFilter(filters, key))}
          onClearAll={() => setSheetFilters({})}
        />

        {panel ? (
          createElement(panel, { sheet, rows, filters })
        ) : (
          <GenericTable key={sheet.id} sheet={sheet} rows={rows} />
        )}
      </main>

      <FiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        sheet={sheet}
        filters={filters}
        onChange={setSheetFilters}
        onClearAll={() => setSheetFilters({})}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">
              Limpar a planilha?
            </DialogTitle>
            <DialogDescription className="text-base">
              Os dados saem da tela e você volta ao início. O arquivo original
              não é alterado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg">
                Cancelar
              </Button>
            </DialogClose>
            <Button size="lg" onClick={onClear}>
              Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function App() {
  const [workbook, setWorkbook] = useState<Workbook | null>(null)
  // `session` força um novo estado de apresentação a cada planilha carregada.
  const [session, setSession] = useState(0)
  const onLoaded = useCallback((wb: Workbook) => {
    setWorkbook(wb)
    setSession((n) => n + 1)
  }, [])
  const loader = useWorkbookLoader(onLoaded)

  if (!workbook)
    return <ImportScreen state={loader.state} onFile={loader.load} />

  return (
    <Presenter
      key={session}
      initial={workbook}
      onReplace={loader.load}
      onClear={() => {
        setWorkbook(null)
        loader.dismiss()
      }}
      replaceError={
        loader.state.status === "error" ? loader.state.message : null
      }
      onDismissError={loader.dismiss}
    />
  )
}

export default App
