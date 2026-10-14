import { useState } from "react"

import { tiposRegistrados, type AlteracaoDeCarga, type CargaMeta } from "@/cargas"
import { proximaVersao } from "@/app/navegacao"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LIMITE_NOME } from "./formatoCarga"
import { MESES } from "./NovaCargaDialog"

/**
 * Renomeia ou corrige tipo/competência de uma carga já guardada. Mudar tipo ou
 * competência move a carga de grupo: ela vira a próxima versão do destino.
 * `metas` traz todas as cargas (inclusive arquivadas), como o servidor conta.
 */
export function EditarCargaDialog({
  carga,
  metas,
  onSalvar,
  onCancel,
}: {
  carga: CargaMeta
  metas: CargaMeta[]
  onSalvar: (alteracao: AlteracaoDeCarga) => Promise<void>
  onCancel: () => void
}) {
  const tipos = tiposRegistrados()
  const [ano0, mes0] = carga.competencia.split("-").map(Number)
  const [nome, setNome] = useState(carga.nome ?? "")
  const [tipo, setTipo] = useState(carga.tipo)
  const [mes, setMes] = useState(mes0)
  const [ano, setAno] = useState(String(ano0))
  const [salvando, setSalvando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const anoNum = Number(ano)
  const anoValido = Number.isInteger(anoNum) && anoNum >= 1990 && anoNum <= 2100
  const competencia = `${anoNum}-${String(mes).padStart(2, "0")}`
  const moveu = tipo !== carga.tipo || (anoValido && competencia !== carga.competencia)
  const nomeNovo = nome.trim()
  const mudouNome = nomeNovo !== (carga.nome ?? "")
  const versao = moveu && anoValido ? proximaVersao(metas, tipo, competencia) : null
  const nomeDoTipo = tipos.find((t) => t.id === tipo)?.nome ?? tipo

  function alteracao(): AlteracaoDeCarga {
    return {
      ...(mudouNome ? { nome: nomeNovo || null } : {}),
      ...(tipo !== carga.tipo ? { tipo } : {}),
      ...(competencia !== carga.competencia ? { competencia } : {}),
    }
  }
  const nada = Object.keys(alteracao()).length === 0

  async function salvar() {
    setSalvando(true)
    setFalha(null)
    try {
      await onSalvar(alteracao())
      onCancel()
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Não foi possível salvar.")
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !salvando && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Editar carga</DialogTitle>
          <DialogDescription className="text-base">
            {carga.arquivo}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="editar-nome" className="text-base font-medium">
              Nome (opcional)
            </label>
            <Input
              id="editar-nome"
              maxLength={LIMITE_NOME}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="editar-tipo" className="text-base font-medium">
              Tipo
            </label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="editar-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-base font-medium">Competência</legend>
            <div className="flex gap-3">
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger aria-label="Mês" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="Ano"
                inputMode="numeric"
                className="w-28 tabular-nums"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
              />
            </div>
          </fieldset>

          {versao !== null && (
            <p role="status" className="border-l-4 border-brand bg-brand-soft py-2 pl-3 text-base">
              Ao salvar, esta carga vai virar a versão {versao} de {MESES[mes - 1]} de {anoNum}
              {tipo !== carga.tipo ? ` (${nomeDoTipo})` : ""}. A versão atual do grupo de origem
              não muda.
            </p>
          )}

          {falha && (
            <p role="alert" className="border-l-4 border-destructive py-2 pl-3 text-base text-destructive">
              {falha}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" disabled={salvando} onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="lg" disabled={salvando || !anoValido || nada} onClick={salvar}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
