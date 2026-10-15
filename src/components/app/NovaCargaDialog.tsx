import { useMemo, useState } from "react"

import {
  inferirCompetencia,
  reconhecerTipo,
  tiposRegistrados,
  type CargaMeta,
  type OrigemCompetencia,
} from "@/cargas"
import type { Workbook } from "@/core"
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
import { cn } from "@/lib/utils"
import { LIMITE_NOME, nomeSugerido } from "./formatoCarga"

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export const DICA_ORIGEM: Record<OrigemCompetencia, string> = {
  mesref: "da planilha (Mes Ref.)",
  aba: "pelo nome da aba",
  arquivo: "pelo nome do arquivo",
  titulo: "pelo título da planilha",
  datas: "pelas datas das linhas",
  "mes-anterior": "mês anterior",
}

export function NovaCargaDialog({
  workbook,
  metas,
  onConfirm,
  onCancel,
}: {
  workbook: Workbook
  metas: CargaMeta[]
  onConfirm: (escolha: {
    tipo: string
    competencia: string
    nome?: string
  }) => void
  onCancel: () => void
}) {
  const inicial = useMemo(() => {
    const { tipo, pontuacao } = reconhecerTipo(workbook)
    const comp = inferirCompetencia(workbook, workbook.fileName)
    const [ano, mes] = comp.competencia.split("-").map(Number)
    return {
      tipo: tipo.id,
      reconhecido: pontuacao > 0,
      ano,
      mes,
      origem: comp.origem,
      anoPresumido: comp.anoPresumido,
      avisoMesRef: comp.avisoMesRef,
    }
  }, [workbook])
  const tipos = tiposRegistrados()

  const [tipo, setTipo] = useState(inicial.tipo)
  const [mes, setMes] = useState(inicial.mes)
  const [ano, setAno] = useState(String(inicial.ano))
  const [editado, setEditado] = useState(false)
  const [presumido, setPresumido] = useState(inicial.anoPresumido)
  const [nome, setNome] = useState(() => nomeSugerido(workbook.fileName))

  const anoNum = Number(ano)
  const anoValido = Number.isInteger(anoNum) && anoNum >= 1990 && anoNum <= 2100
  const competencia = `${anoNum}-${String(mes).padStart(2, "0")}`
  const versao = anoValido ? proximaVersao(metas, tipo, competencia) : 1
  const linhas = workbook.sheets.reduce((n, s) => n + s.rows.length, 0)

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-xl"
        // Só fecha por Esc ou pelos botões: clique fora não descarta a carga.
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            Confirmar a carga
          </DialogTitle>
          <DialogDescription className="text-base">
            Confira o tipo e a competência antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="carga-tipo" className="text-base font-medium">
              Tipo
            </label>
            <Select
              value={tipo}
              onValueChange={(v) => {
                setTipo(v)
                setEditado(true)
              }}
            >
              <SelectTrigger id="carga-tipo">
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
            {inicial.reconhecido && tipo === inicial.tipo && !editado && (
              <p className="text-sm text-muted-foreground">
                reconhecido pelas colunas
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-base font-medium">
              Competência
            </legend>
            <div className="flex gap-3">
              <Select
                value={String(mes)}
                onValueChange={(v) => {
                  setMes(Number(v))
                  setPresumido(false)
                }}
              >
                <SelectTrigger
                  aria-label="Mês"
                  className={cn(
                    "flex-1",
                    presumido && "border-amber-500 ring-2 ring-amber-500/40"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((nome, i) => (
                    <SelectItem key={nome} value={String(i + 1)}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="Ano"
                inputMode="numeric"
                className={cn(
                  "w-28 tabular-nums",
                  presumido && "border-amber-500 ring-2 ring-amber-500/40"
                )}
                value={ano}
                onChange={(e) => {
                  setAno(e.target.value)
                  setPresumido(false)
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {DICA_ORIGEM[inicial.origem]}
            </p>
            {inicial.avisoMesRef && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {inicial.avisoMesRef}
              </p>
            )}
            {presumido && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Ano não encontrado na planilha — confira
              </p>
            )}
          </fieldset>

          {versao > 1 && (
            <p
              role="status"
              className="border-l-4 border-brand bg-brand-soft py-2 pl-3 text-base"
            >
              Será a versão {versao} deste mês (as anteriores continuam
              guardadas).
            </p>
          )}

          {versao > 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="carga-nome" className="text-base font-medium">
                Nome (opcional)
              </label>
              <Input
                id="carga-nome"
                maxLength={LIMITE_NOME}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Ajuda a diferenciar as versões deste mês.
              </p>
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
            <dt className="text-muted-foreground">Arquivo</dt>
            <dd className="truncate">{workbook.fileName}</dd>
            <dt className="text-muted-foreground">Abas</dt>
            <dd>
              {workbook.sheets.length} (
              {workbook.sheets.map((s) => s.name).join(", ")})
            </dd>
            <dt className="text-muted-foreground">Linhas</dt>
            <dd className="tabular-nums">{linhas}</dd>
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            size="lg"
            disabled={!anoValido}
            onClick={() =>
              onConfirm({ tipo, competencia, ...(versao > 1 ? { nome } : {}) })
            }
          >
            Confirmar carga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
