import { useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { buildIndicatorRows, buildProjectRows } from "@/data/mock"
import { defaultIndicatorFilters, indicatorChips, type IndicatorFilters } from "@/lib/indicators"
import { defaultProjectFilters, projectChips, type ProjectFilters } from "@/lib/projects"
import { SHEETS } from "@/config/sheets"
import { IndicatorsView } from "@/components/dashboard/indicators/IndicatorsView"
import { ProjectsView } from "@/components/dashboard/projects/ProjectsView"
import { InstructionsView } from "@/components/dashboard/fallback/InstructionsView"
import { IncompatibleView } from "@/components/dashboard/fallback/IncompatibleView"
import { PrototypeBanner } from "@/components/dashboard/shell/PrototypeBanner"
import { AppHeader } from "@/components/dashboard/shell/AppHeader"
import { EmptyState } from "@/components/dashboard/shell/EmptyState"
import { LoadingSkeleton } from "@/components/dashboard/shell/LoadingSkeleton"
import { SheetTabs } from "@/components/dashboard/shell/SheetTabs"

type Session = { phase: "empty" } | { phase: "loading"; fileName: string } | { phase: "ready"; fileName: string; importedAt: Date }

export function App() {
  const [session, setSession] = useState<Session>({ phase: "empty" })
  const [indicatorFilters, setIndicatorFilters] = useState<IndicatorFilters>(defaultIndicatorFilters)
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(defaultProjectFilters)
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState(SHEETS[0].id)
  const timer = useRef<number | undefined>(undefined)

  const indicatorRows = useMemo(() => buildIndicatorRows(), [])
  const projectRows = useMemo(() => buildProjectRows(), [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const load = (fileName: string) => {
    window.clearTimeout(timer.current)
    setSession({ phase: "loading", fileName })
    timer.current = window.setTimeout(
      () => setSession({ phase: "ready", fileName, importedAt: new Date() }),
      700
    )
  }

  const clearSession = () => {
    window.clearTimeout(timer.current)
    setSession({ phase: "empty" })
    setIndicatorFilters(defaultIndicatorFilters)
    setProjectFilters(defaultProjectFilters)
    setHiddenTabs([])
    setActiveTab(SHEETS[0].id)
  }

  const toggleTab = (id: string, visible: boolean) => {
    const next = visible ? hiddenTabs.filter((h) => h !== id) : [...hiddenTabs, id]
    setHiddenTabs(next)
    if (!visible && id === activeTab) {
      const first = SHEETS.find((s) => !next.includes(s.id))
      if (first) setActiveTab(first.id)
    }
  }

  const hasActiveFilters = indicatorChips(indicatorFilters).length + projectChips(projectFilters).length > 0

  return (
    <div className="min-h-svh">
      <PrototypeBanner />
      {session.phase === "ready" && (
        <AppHeader
          fileName={session.fileName}
          importedAt={session.importedAt}
          hasActiveFilters={hasActiveFilters}
          onReplace={load}
          onClearSession={clearSession}
        />
      )}
      <main className="mx-auto max-w-7xl px-6 py-5">
        {session.phase === "empty" && <EmptyState onLoad={load} />}
        {session.phase === "loading" && <LoadingSkeleton />}
        {session.phase === "ready" && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
            <SheetTabs hidden={hiddenTabs} onToggle={toggleTab} />
            <TabsContent value="indicadores">
              <IndicatorsView rows={indicatorRows} filters={indicatorFilters} onFiltersChange={setIndicatorFilters} />
            </TabsContent>
            <TabsContent value="projetos">
              <ProjectsView rows={projectRows} filters={projectFilters} onFiltersChange={setProjectFilters} />
            </TabsContent>
            <TabsContent value="instrucoes">
              <InstructionsView />
            </TabsContent>
            <TabsContent value="base-antiga">
              <IncompatibleView />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}

export default App
