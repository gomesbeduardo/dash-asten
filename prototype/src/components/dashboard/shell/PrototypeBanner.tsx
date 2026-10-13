import { FlaskConical } from "lucide-react"

export function PrototypeBanner() {
  return (
    <div role="note" className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-base text-background">
      <FlaskConical className="size-4" aria-hidden />
      <span className="font-medium">Protótipo — dados fictícios</span>
    </div>
  )
}
