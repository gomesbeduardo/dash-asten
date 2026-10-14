import { registrarTipo } from "@/cargas"
import { tipoChamados } from "@/chamados"

/** Registra os tipos de conjunto conhecidos (D30). Idempotente: registrar de novo substitui pelo id. */
export function registrarTiposDoApp(): void {
  registrarTipo(tipoChamados)
}
