import { CheckCircle2, XCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const FOUND = [
  { col: "Projeto", type: "Texto" },
  { col: "Área", type: "Texto" },
  { col: "Responsável", type: "Texto" },
  { col: "Status", type: "Texto" },
  { col: "% Concluído", type: "Número" },
]
const TYPES = ["Texto", "Número", "Data", "Ignorar"]

export function IncompatibleView() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-late/40 bg-card p-5" aria-labelledby="diag-title">
        <h2 id="diag-title" className="flex items-center gap-2 text-xl font-semibold text-late">
          <XCircle className="size-6" aria-hidden /> Não foi possível ler a aba “Base antiga”
        </h2>
        <p className="mt-2 text-base">
          Falta a coluna obrigatória <strong>Prazo</strong>. Sem ela não dá para calcular atrasos, então a aba não vira painel.
        </p>
        <ul className="mt-4 flex flex-col gap-2 text-base">
          {FOUND.map((f) => (
            <li key={f.col} className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-chart-3" aria-hidden />
              <span>
                Coluna “{f.col}” encontrada
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 font-medium text-late">
            <XCircle className="size-5" aria-hidden />
            <span>Coluna “Prazo” ausente</span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="map-title">
        <h2 id="map-title" className="text-xl font-semibold">
          Mapear colunas manualmente
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Em breve: indique onde está o cabeçalho e o tipo de cada coluna. Nesta prévia, os campos não têm efeito.
        </p>

        <div className="mt-4 flex max-w-xs flex-col gap-1.5">
          <label htmlFor="header-row" className="text-base font-medium">
            Linha do cabeçalho
          </label>
          <Select defaultValue="1">
            <SelectTrigger id="header-row" className="h-10 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-base">
                  Linha {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FOUND.map((f) => (
            <div key={f.col} className="flex flex-col gap-1.5">
              <label htmlFor={`type-${f.col}`} className="text-base font-medium">
                Tipo de “{f.col}”
              </label>
              <Select defaultValue={f.type}>
                <SelectTrigger id={`type-${f.col}`} className="h-10 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-base">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Button className="mt-5 h-10 text-base" disabled>
          Aplicar mapeamento
        </Button>
      </section>
    </div>
  )
}
