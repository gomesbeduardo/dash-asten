import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react"

import {
  inferirCompetencia,
  reconhecerTipo,
  tiposRegistrados,
  type CargaMeta,
  type OrigemCompetencia,
} from "@/cargas"
import { versoesDoLote } from "@/cargas/lote"
import type { Workbook } from "@/core"
import { modoApi } from "@/app/modo-api"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LIMITE_NOME, nomeSugerido } from "./formatoCarga"
import { DICA_ORIGEM, MESES } from "./NovaCargaDialog"

export type ItemLido = { workbook: Workbook; original: ArrayBuffer }
export type FalhaDeLeitura = { nome: string; mensagem: string }
export type Escolha = { tipo: string; competencia: string; nome?: string }
export type Guardada = { meta: CargaMeta; item: ItemLido }

type Estado = "aguardando" | "enviando" | "guardada" | "erro"
type Linha = {
  chave: number
  item: ItemLido
  tipo: string
  reconhecido: boolean
  editado: boolean
  mes: number
  ano: string
  origem: OrigemCompetencia
  nome: string
  linhas: number
  estado: Estado
  meta?: CargaMeta
}

function linhaInicial(item: ItemLido, chave: number): Linha {
  const { tipo, pontuacao } = reconhecerTipo(item.workbook)
  const comp = inferirCompetencia(item.workbook, item.workbook.fileName)
  const [ano, mes] = comp.competencia.split("-").map(Number)
  return {
    chave,
    item,
    tipo: tipo.id,
    reconhecido: pontuacao > 0,
    editado: false,
    mes,
    ano: String(ano),
    origem: comp.origem,
    nome: nomeSugerido(item.workbook.fileName),
    linhas: item.workbook.sheets.reduce((n, s) => n + s.rows.length, 0),
    estado: "aguardando",
  }
}

const anoOk = (ano: string) => {
  const n = Number(ano)
  return Number.isInteger(n) && n >= 1990 && n <= 2100
}
const competenciaDe = (l: Linha) =>
  `${Number(l.ano)}-${String(l.mes).padStart(2, "0")}`

const MSG_ERRO = () =>
  modoApi()
    ? "Não foi possível guardar a carga no banco do app."
    : "Não foi possível guardar a carga neste navegador."

/** Confirmação de 2 ou mais planilhas de uma vez, com envio sequencial e estado por linha. */
export function NovaCargaLoteDialog({
  itens,
  falhas,
  ignorados,
  metas,
  guardar,
  onConcluir,
  onCancel,
}: {
  itens: ItemLido[]
  falhas: FalhaDeLeitura[]
  ignorados: string[]
  metas: CargaMeta[]
  guardar: (item: ItemLido, escolha: Escolha) => Promise<CargaMeta>
  onConcluir: (guardadas: Guardada[], total: number) => void
  onCancel: () => void
}) {
  const tipos = tiposRegistrados()
  const [linhas, setLinhas] = useState<Linha[]>(() => itens.map(linhaInicial))
  const linhasRef = useRef(linhas)
  // As versões existentes valem como estavam ao abrir; o servidor atribui as reais.
  const [metasBase] = useState(metas)
  const [enviando, setEnviando] = useState(false)
  const [terminou, setTerminou] = useState(false)
  const [prog, setProg] = useState({ atual: 0, total: 0 })
  const confirmar = useRef<HTMLButtonElement>(null)

  function mudar(next: Linha[]) {
    linhasRef.current = next
    setLinhas(next)
  }
  const atualizar = (chave: number, p: Partial<Linha>) =>
    mudar(linhasRef.current.map((l) => (l.chave === chave ? { ...l, ...p } : l)))

  const versoes = useMemo(() => {
    const validas = linhas.filter((l) => l.estado !== "guardada")
    const v = versoesDoLote(
      metasBase,
      validas.map((l) => ({
        tipo: l.tipo,
        competencia: anoOk(l.ano) ? competenciaDe(l) : "",
      }))
    )
    return new Map(validas.map((l, i) => [l.chave, v[i]]))
  }, [linhas, metasBase])

  const pendentes = linhas.filter((l) => l.estado !== "guardada")
  const guardadasN = linhas.length - pendentes.length
  const comErro = linhas.filter((l) => l.estado === "erro").length
  const invalido = pendentes.some((l) => !anoOk(l.ano))
  const bloqueado = enviando

  async function enviar() {
    setEnviando(true)
    setTerminou(false)
    const alvo = linhasRef.current.filter((l) => l.estado !== "guardada")
    for (const l of alvo) atualizar(l.chave, { estado: "aguardando" })
    for (const [i, l] of alvo.entries()) {
      setProg({ atual: i + 1, total: alvo.length })
      atualizar(l.chave, { estado: "enviando" })
      try {
        const atual = linhasRef.current.find((x) => x.chave === l.chave)!
        // O nome só vale quando a carga vira versão 2 ou mais (a mesma conta da tabela).
        const versao = versoes.get(atual.chave) ?? 1
        const meta = await guardar(atual.item, {
          tipo: atual.tipo,
          competencia: competenciaDe(atual),
          ...(versao > 1 ? { nome: atual.nome } : {}),
        })
        atualizar(l.chave, { estado: "guardada", meta })
      } catch {
        atualizar(l.chave, { estado: "erro" })
      }
    }
    setEnviando(false)
    setTerminou(true)
    if (linhasRef.current.every((l) => l.estado === "guardada")) concluir()
  }

  function concluir() {
    onConcluir(
      linhasRef.current
        .filter((l) => l.estado === "guardada" && l.meta)
        .map((l) => ({ meta: l.meta!, item: l.item })),
      linhasRef.current.length
    )
  }

  const resumo = enviando
    ? `Enviando ${prog.atual} de ${prog.total}…`
    : terminou
      ? `${guardadasN} de ${linhas.length} guardadas; ${comErro} com erro`
      : ""

  // Depois de um envio com erros, o foco vai para "Tentar de novo".
  useEffect(() => {
    if (terminou && comErro > 0) confirmar.current?.focus()
  }, [terminou, comErro])

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !enviando) onCancel()
      }}
    >
      <DialogContent
        className="sm:max-w-6xl"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          confirmar.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            Confirmar as cargas
          </DialogTitle>
          <DialogDescription className="text-base">
            Confira o tipo e a competência de cada planilha antes de guardar.
            Elas são enviadas uma por vez.
          </DialogDescription>
        </DialogHeader>

        {(ignorados.length > 0 || falhas.length > 0) && (
          <div className="border-l-4 border-brand bg-brand-soft py-2 pl-3 text-base">
            {ignorados.length > 0 && (
              <p>
                Ficaram de fora por não serem .xlsx: {ignorados.join(", ")}.
              </p>
            )}
            {falhas.map((f) => (
              <p key={f.nome}>
                Não foi possível ler {f.nome}: {f.mensagem}
              </p>
            ))}
          </div>
        )}

        <div className="max-h-[55vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Arquivo</TableHead>
                <TableHead scope="col" className="text-right">
                  Linhas
                </TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Competência</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const nome = l.item.workbook.fileName
                const travada = bloqueado || l.estado === "guardada"
                const versao = versoes.get(l.chave) ?? 1
                return (
                  <TableRow key={l.chave}>
                    <TableCell className="max-w-56 whitespace-normal break-all font-medium" title={nome}>
                      {nome}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.linhas}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.tipo}
                        disabled={travada}
                        onValueChange={(v) =>
                          atualizar(l.chave, { tipo: v, editado: true })
                        }
                      >
                        <SelectTrigger aria-label={`Tipo de ${nome}`}>
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
                      <p className="mt-1 text-sm text-muted-foreground">
                        {!l.reconhecido && !l.editado
                          ? "tipo não reconhecido: será guardado como Outro"
                          : l.reconhecido && !l.editado
                            ? "reconhecido pelas colunas"
                            : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div
                        role="group"
                        aria-label={`Competência de ${nome}`}
                        className="flex gap-2"
                      >
                        <Select
                          value={String(l.mes)}
                          disabled={travada}
                          onValueChange={(v) =>
                            atualizar(l.chave, { mes: Number(v) })
                          }
                        >
                          <SelectTrigger aria-label={`Mês de ${nome}`}>
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
                          aria-label={`Ano de ${nome}`}
                          inputMode="numeric"
                          className="w-24 tabular-nums"
                          disabled={travada}
                          value={l.ano}
                          onChange={(e) =>
                            atualizar(l.chave, { ano: e.target.value })
                          }
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {DICA_ORIGEM[l.origem]}
                      </p>
                      {l.estado !== "guardada" && versao > 1 && anoOk(l.ano) && (
                        <p className="mt-1 border-l-4 border-brand pl-2 text-sm">
                          Vira a versão {versao} deste mês
                        </p>
                      )}
                      {l.estado !== "guardada" && versao > 1 && anoOk(l.ano) && (
                        <div className="mt-2 flex flex-col gap-1">
                          <label
                            htmlFor={`nome-${l.chave}`}
                            className="text-sm font-medium"
                          >
                            Nome (opcional)
                          </label>
                          <Input
                            id={`nome-${l.chave}`}
                            aria-label={`Nome (opcional) de ${nome}`}
                            maxLength={LIMITE_NOME}
                            disabled={travada}
                            value={l.nome}
                            onChange={(e) =>
                              atualizar(l.chave, { nome: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell aria-live="polite" className="whitespace-normal">
                      <EstadoDaLinha l={l} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={travada}
                        aria-label={`Tirar ${nome} do lote`}
                        onClick={() =>
                          mudar(linhasRef.current.filter((x) => x.chave !== l.chave))
                        }
                      >
                        <XIcon aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <p role="status" aria-live="polite" className="min-h-6 text-base font-medium">
          {resumo}
        </p>

        <DialogFooter>
          <Button variant="outline" size="lg" disabled={enviando} onClick={onCancel}>
            Cancelar
          </Button>
          {terminou && comErro > 0 && (
            <>
              {guardadasN > 0 && (
                <Button variant="outline" size="lg" disabled={enviando} onClick={concluir}>
                  Concluir
                </Button>
              )}
              <Button
                ref={confirmar}
                size="lg"
                disabled={enviando || invalido}
                onClick={enviar}
              >
                Tentar de novo as que falharam
              </Button>
            </>
          )}
          {!(terminou && comErro > 0) && (
            <Button
              ref={confirmar}
              size="lg"
              disabled={enviando || invalido || pendentes.length === 0}
              onClick={enviar}
            >
              {enviando
                ? "Enviando…"
                : pendentes.length === 1
                  ? "Confirmar 1 carga"
                  : `Confirmar ${pendentes.length} cargas`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EstadoDaLinha({ l }: { l: Linha }) {
  if (l.estado === "enviando")
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2Icon className="size-4 motion-safe:animate-spin" aria-hidden />
        Enviando…
      </span>
    )
  if (l.estado === "guardada")
    return (
      <span className="inline-flex items-center gap-1.5 text-primary">
        <CheckIcon className="size-4" aria-hidden />
        Guardada · versão {l.meta?.versao}
      </span>
    )
  if (l.estado === "erro")
    return <span className="text-destructive">{MSG_ERRO()}</span>
  return <span className="text-muted-foreground">Aguardando</span>
}
