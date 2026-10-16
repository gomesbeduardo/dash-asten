// Gera 12 posições mensais (nov/25 a out/26) coerentes entre si, 100% fictícias e determinísticas
// (semente fixa), para medir o tempo do Painel e do "Comparar com" com volume próximo do real (D74).
//
// Uso:  node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 3000
//       node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas 20000 [--sem-xlsx] [--saida <pasta>]
//
// `--linhas N` é o tamanho da posição mais recente (out/26); as anteriores têm menos linhas porque
// só trazem o que já estava aberto até o fim do Mes Ref. (histórico anterior + o mês).
// Saída (em docs/exemplos/bench/<N>/, ignorada pelo Git):
//   xlsx/chamados-AAAA-MM.xlsx   a planilha de cada posição (omitida com --sem-xlsx)
//   api/cargas.json              a lista de metadados, como GET /api/cargas devolve
//   api/cargas/<id>.json         a carga completa, como GET /api/cargas/<id> devolve (datas em ISO)
//
// Como as posições mudam entre si: chamados finalizados depois (a posição antiga os mostra abertos),
// "Aguardando aceite" cujo aceite vem em posição posterior, reabertos (Situação volta a aberta, Qtd
// Reabertura = 1, depois finaliza de novo) e lançamentos atrasados (a Data de Solução cai no mês
// anterior ao da posição que a mostra: é o que a correção entre posições acha).
import { createRequire } from "node:module"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const XLSX = require("xlsx")
const aqui = dirname(fileURLToPath(import.meta.url))

// ---- argumentos
const args = process.argv.slice(2)
const pega = (nome, padrao) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : padrao
}
const LINHAS = Number(pega("--linhas", "3000"))
const SEM_XLSX = args.includes("--sem-xlsx")
const SAIDA = resolve(pega("--saida", join(aqui, "bench", String(LINHAS))))
if (!Number.isInteger(LINHAS) || LINHAS < 100) throw new Error("--linhas deve ser um inteiro >= 100")

// ---- aleatório determinístico (mulberry32, semente fixa)
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261015)
const inteiro = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const escolhe = (lista) => lista[Math.floor(rnd() * lista.length)]

// ---- datas (UTC, meia-noite, como o app lê)
const DIA = 86400000
const utc = (a, m, d = 1) => Date.UTC(a, m - 1, d)
const fimDoMes = (a, m) => utc(a, m + 1, 1) - DIA // último dia do mês, 00:00 UTC
const mesDaPosicao = (p) => {
  // p = 0..11 → nov/25 .. out/26
  const n = 10 + p // 0-based desde jan/25 → nov/25 = 10
  return { ano: 2025 + Math.floor(n / 12), mes: (n % 12) + 1 }
}
const POSICOES = Array.from({ length: 12 }, (_, p) => {
  const { ano, mes } = mesDaPosicao(p)
  return {
    competencia: `${ano}-${String(mes).padStart(2, "0")}`,
    mesRef: utc(ano, mes, 1),
    fim: fimDoMes(ano, mes),
  }
})
const INICIO_JANELA = POSICOES[0].mesRef
const FIM_JANELA = POSICOES[11].fim

// ---- população de chamados
const CLIENTES = Array.from({ length: 24 }, (_, i) => `Cliente ${String(i + 1).padStart(2, "0")}`)
const AREAS_SUP = ["Comercial", "Operações", "Financeiro", "Suprimentos", "Tecnologia", "Jurídico"]
const AREAS = Array.from({ length: 18 }, (_, i) => `Área ${String(i + 1).padStart(2, "0")}`)
const ATIVIDADES = ["Integração", "Correção", "Suporte", "Cadastro", "Relatório", "Acesso", "Melhoria", "Dúvida"]
const SEVERIDADES = ["Baixa", "Média", "Alta", "Crítica"]
const OPERADORES = Array.from({ length: 14 }, (_, i) => `Operador ${String(i + 1).padStart(2, "0")}`)
const RESPONSAVEIS = Array.from({ length: 20 }, (_, i) => `Responsável ${String(i + 1).padStart(2, "0")}`)
const TIPOS = ["Incidente", "Requisição", "Problema"]
const ABERTAS = ["Em Análise", "Em Atendimento", "Aguardando cliente"]
const ASSUNTOS = ["Falha na emissão", "Erro de integração", "Ajuste de cadastro", "Divergência de estoque", "Lentidão na consulta", "Acesso à rotina", "Nova rotina", "Validação de layout"]

function novoChamado(codigo, ab) {
  const c = { codigo, ab }
  c.cliente = escolhe(CLIENTES)
  c.areaSup = escolhe(AREAS_SUP)
  c.area = escolhe(AREAS)
  c.atividade = escolhe(ATIVIDADES)
  c.severidade = escolhe(SEVERIDADES)
  c.operador = escolhe(OPERADORES)
  c.responsavel = escolhe(RESPONSAVEIS)
  c.tipo = escolhe(TIPOS)
  c.resumo = `${escolhe(ASSUNTOS)} (${codigo})`
  c.base = inteiro(0, 2) // situação aberta de base; muda de tempos em tempos
  c.sla = rnd() < 0.85 ? ab + inteiro(7, 120) * DIA : null
  c.reneg = c.sla !== null && rnd() < 0.12 ? c.sla + inteiro(10, 60) * DIA : null
  // lançamento atrasado: a posição só enxerga os eventos do mês depois (a Data de Solução fica no mês anterior)
  c.atrasado = rnd() < 0.08
  // linha entra na posição do mês anterior ao da abertura (exportada depois, traz aberto-depois)
  c.exportadoAntes = rnd() < 0.01
  // ciclo de vida
  c.s1 = c.a1 = c.r = c.s2 = c.a2 = null
  if (rnd() >= 0.18) {
    c.s1 = ab + Math.round(-Math.log(1 - rnd()) * 45) * DIA
    const u = rnd()
    c.a1 = c.s1 + (u < 0.55 ? inteiro(1, 3) : u < 0.85 ? inteiro(5, 25) : inteiro(30, 80)) * DIA
    if (rnd() < 0.07) {
      c.r = c.a1 + inteiro(7, 90) * DIA
      c.s2 = c.r + inteiro(2, 60) * DIA
      c.a2 = c.s2 + inteiro(1, 10) * DIA
    }
  }
  return c
}

const chamados = []
{
  const total = Math.round(LINHAS / 1.01) // ~1% entra como "aberto depois" e fecha a conta da última posição
  const antes = Math.round(total * 0.4)
  const ini = utc(2024, 1, 1)
  const fim = INICIO_JANELA - DIA
  const datas = []
  for (let i = 0; i < antes; i++) datas.push(ini + Math.floor(Math.sqrt(rnd()) * (fim - ini)))
  for (let i = antes; i < total; i++) datas.push(INICIO_JANELA + Math.floor(rnd() * (FIM_JANELA - INICIO_JANELA)))
  datas.sort((a, b) => a - b)
  let codigo = 5000
  for (const d of datas) {
    const ab = Math.floor(d / DIA) * DIA
    chamados.push(novoChamado(codigo++, ab))
  }
  // os "exportados antes" abertos nos 5 primeiros dias de novembro/26 aparecem em out/26 (aberto depois do Mes Ref.)
  for (const c of chamados) c.exportadoAntes = false
  const extras = Math.round(LINHAS * 0.01)
  for (let i = 0; i < extras; i++) {
    const c = novoChamado(codigo++, utc(2026, 11, inteiro(1, 5)))
    c.exportadoAntes = true
    chamados.push(c)
  }
}

// primeira posição em que a linha existe
const primeiraPosicao = (c) => {
  for (let p = 0; p < 12; p++) {
    if (c.ab <= POSICOES[p].fim) return p
    if (c.exportadoAntes && p === 11) return p
  }
  return 99
}

const CABECALHO = [
  "Mes Ref.", "Data Abertura", "Código", "Tipo", "Cliente", "Área Superior", "Área", "Atividade", "Severidade",
  "Situação", "SLA Previsto", "SLA Renegociado", "Data de Solução", "Data de Aceite", "Qtd Reabertura",
  "Data Ultima Reabertura", "Resumo", "Operador", "Responsável Cliente",
]

const d = (t) => (t === null ? null : new Date(t))

/** Linha do chamado na posição p (estado visto no fim do Mes Ref.; lançamento atrasado enxerga um mês antes). */
function linhaNaPosicao(c, p) {
  const corte = c.atrasado && p > 0 ? POSICOES[p - 1].fim : POSICOES[p].fim
  const ate = (t) => t !== null && t <= corte
  let situacao, solucao = null, aceite = null, qtd = 0, ultimaReab = null
  if (ate(c.r)) {
    qtd = 1
    ultimaReab = c.r
    if (ate(c.s2)) {
      solucao = c.s2
      if (ate(c.a2)) { situacao = "Finalizado"; aceite = c.a2 } else situacao = "Aguardando aceite"
    } else {
      situacao = ABERTAS[(c.base + (c.codigo % 7) + p) % 3]
      solucao = c.s1 // fica a Data de Solução antiga; a reabertura é posterior a ela
      aceite = c.a1
    }
  } else if (ate(c.s1)) {
    solucao = c.s1
    if (ate(c.a1)) { situacao = "Finalizado"; aceite = c.a1 } else situacao = "Aguardando aceite"
  } else {
    situacao = ABERTAS[(c.base + Math.floor((p + c.codigo) / 4)) % 3]
  }
  return [
    d(POSICOES[p].mesRef), d(c.ab), c.codigo, c.tipo, c.cliente, c.areaSup, c.area, c.atividade, c.severidade,
    situacao, d(c.sla), d(c.reneg), d(solucao), d(aceite), qtd, d(ultimaReab), c.resumo, c.operador, c.responsavel,
  ]
}

// ---- Workbook no formato do app (espelha src/core/readWorkbook.ts)
function slugify(texto) {
  return (
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "coluna"
  )
}
function inferirTipo(valores) {
  const presentes = valores.filter((v) => v !== null)
  if (presentes.length === 0) return "empty"
  if (presentes.every((v) => v instanceof Date)) return "date"
  if (presentes.every((v) => typeof v === "number")) return "number"
  return "text"
}
function montarSheet(matriz) {
  const chaves = CABECALHO.map(slugify)
  const colunas = chaves.map((key, i) => {
    const valores = matriz.map((l) => l[i])
    const type = inferirTipo(valores)
    const distintos = new Set(valores.filter((v) => v !== null).map((v) => (v instanceof Date ? v.getTime() : v)))
    const col = {
      key,
      label: CABECALHO[i],
      type,
      filterable: type === "date" || (type === "text" && distintos.size >= 2 && distintos.size <= 30),
      distinctCount: distintos.size,
    }
    if (type === "number" && i === 2) col.format = "id" // Código
    return col
  })
  const rows = matriz.map((l) => Object.fromEntries(chaves.map((k, i) => [k, l[i]])))
  return { id: "chamados", name: "Chamados", index: 0, columns: colunas, rows }
}

// ---- saída
rmSync(SAIDA, { recursive: true, force: true })
mkdirSync(join(SAIDA, "api", "cargas"), { recursive: true })
if (!SEM_XLSX) mkdirSync(join(SAIDA, "xlsx"), { recursive: true })

const metas = []
let anterior = null
for (let p = 0; p < 12; p++) {
  const pos = POSICOES[p]
  const matriz = chamados.filter((c) => primeiraPosicao(c) <= p).map((c) => linhaNaPosicao(c, p))
  const nomeArquivo = `chamados-${pos.competencia}-bench.xlsx`
  const id = `bench-${LINHAS}-${pos.competencia}`
  const importadaEm = new Date(utc(...proximoMes(pos.competencia))).toISOString()
  const meta = {
    id, tipo: "chamados", competencia: pos.competencia, versao: 1, importadaEm, arquivo: nomeArquivo,
    linhas: matriz.length, nome: null, arquivadaEm: null, mesRef: pos.competencia,
  }
  metas.push(meta)
  const sheet = montarSheet(matriz)
  const carga = { ...meta, workbook: { fileName: nomeArquivo, importedAt: importadaEm, sheets: [sheet] } }
  writeFileSync(join(SAIDA, "api", "cargas", `${id}.json`), JSON.stringify(carga))

  if (!SEM_XLSX) {
    const ws = XLSX.utils.aoa_to_sheet([CABECALHO, ...matriz], { cellDates: true })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Chamados")
    XLSX.writeFile(wb, join(SAIDA, "xlsx", nomeArquivo), { cellDates: true })
  }

  // quanto muda de uma posição para a seguinte (coerência)
  let mudou = 0, finalizadosDepois = 0
  const mapa = new Map(matriz.map((l) => [l[2], l[9]]))
  if (anterior) {
    for (const [cod, sit] of anterior) {
      const agora = mapa.get(cod)
      if (agora !== sit) {
        mudou++
        if (agora === "Finalizado") finalizadosDepois++
      }
    }
  }
  console.log(`${pos.competencia}: ${String(matriz.length).padStart(6)} linhas` + (anterior ? `  | mudaram de situação vs. posição anterior: ${mudou} (viraram Finalizado: ${finalizadosDepois})` : ""))
  anterior = mapa
}
writeFileSync(join(SAIDA, "api", "cargas.json"), JSON.stringify(metas))
console.log(`Gravado em ${SAIDA}${SEM_XLSX ? " (sem .xlsx)" : ""}`)

function proximoMes(competencia) {
  const [a, m] = competencia.split("-").map(Number)
  return [m === 12 ? a + 1 : a, m === 12 ? 1 : m + 1, 1]
}
