import type { Workbook } from "@/core"
import { ordenarMetas } from "./repositorio-comum"
import type { Carga, CargaMeta, NovaCarga, RepositorioDeCargas } from "./types"

/** Falha ao falar com o servidor de cargas; a mensagem já é legível para o usuário. */
export class ErroDeCarga extends Error {
  /** Status HTTP da resposta; ausente quando nem chegou resposta (rede). */
  readonly status?: number
  constructor(mensagem: string, status?: number) {
    super(mensagem)
    this.name = "ErroDeCarga"
    this.status = status
  }
}

const LIMITE_BYTES = 3.8 * 1024 * 1024
const MSG_401 =
  "Sessão sem login. Recarregue a página e entre com o usuário e senha do time."

const paraBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function gzip(texto: string): Promise<Uint8Array> {
  const fluxo = new Response(texto).body!.pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}

/** Strings ISO viram Date nas colunas `date` e em importedAt (o JSON não carrega Date). */
function reviver(wb: Workbook): Workbook {
  const paraData = (v: unknown) => (typeof v === "string" ? new Date(v) : v)
  return {
    ...wb,
    importedAt: new Date(wb.importedAt),
    sheets: wb.sheets.map((s) => {
      const datas = s.columns.filter((c) => c.type === "date").map((c) => c.key)
      if (datas.length === 0) return s
      return {
        ...s,
        rows: s.rows.map((r) => {
          const nova = { ...r }
          for (const k of datas) nova[k] = paraData(r[k]) as Date | null
          return nova
        }),
      }
    }),
  }
}

async function validar(resp: Response): Promise<Response> {
  if (resp.ok) return resp
  if (resp.status === 401) {
    // Avisa o porteiro de sessão (SessaoGate), que devolve o usuário ao login.
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("asten:sessao-expirada"))
    throw new ErroDeCarga(MSG_401, 401)
  }
  let detalhe: string | undefined
  try {
    const corpo = (await resp.json()) as { erro?: unknown }
    if (typeof corpo?.erro === "string") detalhe = corpo.erro
  } catch {
    /* corpo não é JSON */
  }
  throw new ErroDeCarga(
    detalhe ?? `Falha ao falar com o servidor (HTTP ${resp.status}).`,
    resp.status
  )
}

/** Adaptador HTTP do banco compartilhado. Não oferece `limparTudo` de propósito. */
export function criarRepositorioApi(base = "/api"): RepositorioDeCargas {
  async function chamar(caminho: string, init: RequestInit = {}): Promise<Response> {
    let resp: Response
    try {
      resp = await fetch(`${base}${caminho}`, { ...init, credentials: "same-origin" })
    } catch {
      throw new ErroDeCarga("Não foi possível falar com o servidor. Verifique a conexão.")
    }
    return resp
  }

  return {
    async listar() {
      const resp = await validar(await chamar("/cargas"))
      return ordenarMetas((await resp.json()) as CargaMeta[])
    },
    async obter(id) {
      const resp = await chamar(`/cargas/${encodeURIComponent(id)}`)
      if (resp.status === 404) return null
      const carga = (await (await validar(resp)).json()) as Carga
      return { ...carga, workbook: reviver(carga.workbook) }
    },
    async salvar(nova: NovaCarga) {
      const { tipo, competencia, arquivo, workbook, original } = nova
      const texto = JSON.stringify({
        tipo,
        competencia,
        arquivo,
        workbook,
        ...(original ? { originalBase64: paraBase64(original) } : {}),
      })
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let corpo: string | Uint8Array = texto
      if (typeof CompressionStream !== "undefined") {
        corpo = await gzip(texto)
        headers["X-Content-Encoding"] = "gzip"
      }
      const bytes = typeof corpo === "string" ? new Blob([corpo]).size : corpo.byteLength
      if (bytes > LIMITE_BYTES) {
        const mb = (bytes / 1024 / 1024).toFixed(1).replace(".", ",")
        throw new ErroDeCarga(
          `A planilha é grande demais para enviar (${mb} MB). Limite: 3,8 MB.`
        )
      }
      const resp = await validar(
        await chamar("/cargas", { method: "POST", headers, body: corpo as BodyInit })
      )
      return (await resp.json()) as CargaMeta
    },
    async excluir(id) {
      await validar(await chamar(`/cargas/${encodeURIComponent(id)}`, { method: "DELETE" }))
    },
  }
}
