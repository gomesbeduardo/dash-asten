import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { applyFilters, clearFilter, type SheetFilters } from "@/core"
import type { VisaoTipoProps } from "@/panels/tipos"
import { crossfade } from "@/components/app/motion/tokens"
import { AutoPanel } from "@/components/app/auto/AutoPanel"
import { AbasDaPlanilha } from "@/components/app/AbasDaPlanilha"
import { useBarra } from "@/components/app/BarraContext"
import { FilterChips } from "@/components/app/FilterChips"
import { FiltersPanel } from "@/components/app/FiltersPanel"
import { useShortcuts } from "@/components/app/hooks/useShortcuts"
import {
  hideSheet,
  resolveActive,
  showSheet,
  stepSheet,
  visibleIds,
} from "@/components/app/tabs-state"

type Estado = {
  activeId: string
  hidden: string[]
  filters: Record<string, SheetFilters> // por aba (D6)
}

/** Painel do tipo "outro": uma tela por aba da planilha, com filtros e modo automático (D22, D25). */
export function PainelOutro({ carga }: VisaoTipoProps) {
  const workbook = carga.workbook
  const [state, setState] = useState<Estado>({
    activeId: workbook.sheets[0].id,
    hidden: [],
    filters: {},
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false)
  const reduce = useReducedMotion()
  const { slot, setHold, setDica } = useBarra()
  // Abas já abertas: a entrada escalonada toca uma vez só.
  const [seen, setSeen] = useState<string[]>([])

  const { hidden } = state
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

  const overlayOpen = filtersOpen || tabsMenuOpen
  useEffect(() => {
    setHold(overlayOpen)
    return () => setHold(false)
  }, [overlayOpen, setHold])

  useEffect(() => {
    setDica("← → abas · 1–9 vai à aba · F filtros")
    return () => setDica(null)
  }, [setDica])

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
  })

  const entry = !seen.includes(sheet.id)
  useEffect(() => {
    const t = setTimeout(
      () => setSeen((s) => (s.includes(activeId) ? s : [...s, activeId])),
      0
    )
    return () => clearTimeout(t)
  }, [activeId])

  return (
    <>
      {slot &&
        createPortal(
          <AbasDaPlanilha
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
            onTabsMenuOpenChange={setTabsMenuOpen}
          />,
          slot
        )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={sheet.id}
          className="flex flex-col gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : crossfade, ease: "linear" }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-6xl leading-none text-primary">{sheet.name}</h1>
            <p className="text-lg text-muted-foreground">
              {carga.arquivo} · importada às{" "}
              {new Date(carga.importadaEm).toLocaleTimeString("pt-BR", {
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

          <AutoPanel
            sheet={sheet}
            rows={rows}
            filters={filters}
            entry={entry}
          />
        </motion.div>
      </AnimatePresence>

      <FiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        sheet={sheet}
        filters={filters}
        onChange={setSheetFilters}
        onClearAll={() => setSheetFilters({})}
      />
    </>
  )
}
