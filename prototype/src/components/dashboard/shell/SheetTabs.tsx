import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SHEETS } from "@/config/sheets"

type Props = {
  hidden: string[]
  onToggle: (id: string, visible: boolean) => void
}

/** Deve ser renderizada dentro de <Tabs>. */
export function SheetTabs({ hidden, onToggle }: Props) {
  const visible = SHEETS.filter((s) => !hidden.includes(s.id))
  return (
    <div className="flex items-end justify-between gap-3 border-b">
      <TabsList variant="line" className="h-auto min-w-0 flex-wrap justify-start gap-1 p-0">
        {visible.map((s) => (
          <TabsTrigger
            key={s.id}
            value={s.id}
            className="h-11 flex-none px-4 text-base data-active:font-semibold data-active:text-brand group-data-[variant=line]/tabs-list:data-active:after:bg-brand"
          >
            {s.name}
          </TabsTrigger>
        ))}
      </TabsList>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="mb-1 h-10 gap-2 px-3 text-base">
            <Layers aria-hidden /> Abas
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>Mostrar abas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SHEETS.map((s) => {
            const isVisible = !hidden.includes(s.id)
            return (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={isVisible}
                disabled={isVisible && visible.length === 1}
                onCheckedChange={(v) => onToggle(s.id, !!v)}
                onSelect={(e) => e.preventDefault()}
                className="min-h-9 text-base"
              >
                {s.name}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
