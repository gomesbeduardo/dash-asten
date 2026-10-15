// Gera docs/exemplos/chamados-estrutura-nova-set-2026.xlsx (dados fictícios) e imprime os
// números esperados de set/2026 e out/2026, contados aqui por conta independente do app.
// Uso: node docs/exemplos/gerar-estrutura-nova.mjs
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const XLSX = require("xlsx")
const aqui = dirname(fileURLToPath(import.meta.url))

const D = (s) => (s ? new Date(`${s}T00:00:00Z`) : null)
const CABECALHO = [
  "Mes Ref.", "Data Abertura", "Hora Abertura", "Código", "Tipo", "Severidade", "Resumo",
  "Área Superior", "Área", "Cliente", "Autarquia", "Operador", "Situação", "Data de Solução",
  "SLA Previsto", "SLA Renegociado", "Data de Aceite", "Data Ultima Reabertura",
  "Situação Ultima Reabertura", "Qtd Reabertura", "Observação",
]

// ab, sol, sla, reneg, aceite, situacao, ultimaReab, qtdReab
const EM = "Em Análise"
const FIN = "Finalizado"
const AG = "Aguardando Aceite de Solução"
const L = (ab, sol, sla, reneg, aceite, sit, reab = null, qtd = 0) => ({ ab, sol, sla, reneg, aceite, sit, reab, qtd })
const LINHAS = [
  // backlog em aberto
  L("2026-03-02", null, "2026-06-30", null, null, EM),
  L("2026-05-12", null, "2026-08-15", "2026-10-31", null, EM), // SLA renegociado prevalece
  L("2026-06-20", null, null, null, null, EM), // sem SLA
  L("2026-07-07", null, "2026-09-10", null, null, EM),
  L("2026-07-15", null, "2026-09-30", null, null, EM), // vence no último dia de set: só atrasa em out
  L("2026-08-03", null, "2026-10-15", null, null, EM),
  L("2026-08-20", null, null, null, null, EM), // sem SLA
  L("2026-09-01", null, "2026-09-20", null, null, EM),
  L("2026-09-14", null, "2026-11-30", null, null, EM),
  L("2026-09-30", null, "2026-10-30", null, null, EM), // abre no último dia de set
  // entradas de outubro
  L("2026-10-02", null, "2026-10-20", null, null, EM),
  L("2026-10-05", null, null, null, null, EM), // sem SLA
  L("2026-10-09", null, "2026-12-01", null, null, EM),
  // resolvidos antes de setembro
  L("2026-04-01", "2026-05-10", "2026-05-30", null, "2026-05-12", FIN),
  L("2026-06-01", "2026-07-02", "2026-07-10", null, "2026-07-03", FIN),
  L("2026-07-01", "2026-08-20", "2026-08-10", null, "2026-08-21", FIN),
  L("2026-08-05", "2026-08-31", null, null, "2026-09-02", FIN),
  // resolvidos em setembro
  L("2026-08-10", "2026-09-01", "2026-09-05", null, "2026-09-02", FIN),
  L("2026-09-02", "2026-09-10", "2026-09-08", null, "2026-09-11", FIN),
  L("2026-09-05", "2026-09-30", "2026-09-30", null, "2026-10-01", FIN),
  L("2026-07-20", "2026-09-15", "2026-09-01", "2026-09-20", "2026-09-16", FIN),
  L("2026-09-08", "2026-09-22", null, null, "2026-09-23", FIN),
  // resolvidos em outubro
  L("2026-09-10", "2026-10-03", "2026-10-05", null, "2026-10-04", FIN),
  L("2026-08-25", "2026-10-20", "2026-09-30", null, "2026-10-21", FIN),
  L("2026-10-01", "2026-10-08", "2026-10-10", null, "2026-10-09", FIN),
  L("2026-05-05", "2026-10-31", "2026-07-01", null, "2026-10-31", FIN),
  // aguardando aceite de solução (com solução, sem aceite)
  L("2026-08-18", "2026-09-12", "2026-09-20", null, null, AG),
  L("2026-09-20", "2026-10-06", "2026-10-30", null, null, AG),
  // reabertos pendentes (reabertura > solução, situação Em Análise)
  L("2026-06-10", "2026-08-12", "2026-08-30", null, null, EM, "2026-09-03", 1),
  L("2026-08-02", "2026-09-04", "2026-09-20", null, null, EM, "2026-09-18", 1),
  L("2026-07-08", "2026-09-25", "2026-09-25", null, null, EM, "2026-10-07", 2),
  // reabertos já finalizados
  L("2026-05-20", "2026-07-15", "2026-07-31", null, "2026-07-16", FIN, "2026-08-02", 1),
  L("2026-08-12", "2026-09-09", "2026-09-30", null, "2026-09-10", FIN, "2026-09-14", 1),
  // mais variedade
  L("2026-09-25", null, "2026-10-10", null, null, "Em Desenvolvimento"),
  L("2026-10-12", "2026-10-13", "2026-10-14", null, "2026-10-14", FIN),
  L("2026-02-10", "2026-04-01", "2026-04-15", null, "2026-04-02", FIN),
  L("2026-03-15", null, "2026-04-30", null, null, EM),
  L("2026-09-18", "2026-09-29", "2026-10-05", null, "2026-09-30", FIN),
  L("2026-08-30", null, null, null, null, "Pendente Cliente"), // sem SLA
  L("2026-09-27", null, "2026-09-29", null, null, EM),
]

const CLIENTES = ["Cliente Alfa", "Cliente Beta", "Cliente Gama"]
const AREAS = [["Área Sup. 1", "Área 1A"], ["Área Sup. 1", "Área 1B"], ["Área Sup. 2", "Área 2A"]]
const linhas = LINHAS.map((l, i) => {
  const n = i + 1
  const abertura = D(l.ab)
  return {
    ...l,
    n,
    cliente: CLIENTES[i % 3],
    autarquia: n % 4 === 0 ? null : ["Autarquia X", "Autarquia Y"][i % 2], // em parte
    tipo: n % 3 === 0 ? null : ["Incidente", "Requisição"][i % 2], // em parte
    operador: `Operador ${"ABCD"[i % 4]}`,
    area: AREAS[i % 3],
    row: [
      "2026-10", abertura, "09:15", 7000 + n, null, null, `Chamado fictício ${n}`,
      AREAS[i % 3][0], AREAS[i % 3][1], CLIENTES[i % 3], null, `Operador ${"ABCD"[i % 4]}`,
      l.sit, D(l.sol), D(l.sla), D(l.reneg), D(l.aceite), D(l.reab),
      l.reab ? "Em Análise" : null, l.qtd, null,
    ],
  }
})
for (const l of linhas) {
  l.row[4] = l.tipo
  l.row[10] = l.autarquia
}

const ws = XLSX.utils.aoa_to_sheet([CABECALHO, ...linhas.map((l) => l.row)], { cellDates: true })
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, "chamados ciclo Setembro - RH")
const saida = join(aqui, "chamados-estrutura-nova-set-2026.xlsx")
XLSX.writeFile(wb, saida)

// ---- números esperados, contados direto das datas acima (sem o código do app) ----
const ms = (s) => (s ? Date.parse(`${s}T00:00:00Z`) : null)
const inicioMes = (c) => Date.parse(`${c}-01T00:00:00Z`)
const fimMes = (c) => {
  const [a, m] = c.split("-").map(Number)
  return Date.UTC(a, m, 1) - 1
}
const fimDoDia = (s) => ms(s) + 86_400_000 - 1

function esperado(c) {
  const ini = inicioMes(c), fim = fimMes(c)
  let backlog = 0, entradas = 0, saidas = 0, atraso = 0, semSla = 0, aguardando = 0, reabPend = 0
  for (const l of LINHAS) {
    const ab = ms(l.ab), sol = ms(l.sol), aceite = ms(l.aceite)
    if (ab > fim) continue
    if (ab >= ini) entradas++
    if (sol !== null && sol >= ini && sol <= fim) saidas++
    const aberto = sol === null || sol > fim
    if (aberto) {
      backlog++
      const vigente = l.reneg ?? l.sla
      if (vigente && fimDoDia(vigente) < fim) atraso++
      if (!l.sla) semSla++
    }
    if (l.sit.toLowerCase().includes("aceite") && !(aceite !== null && aceite <= fim)) aguardando++
    if (l.reab && sol !== null && sol <= fim && ms(l.reab) > sol && l.sit !== FIN) reabPend++
  }
  return { backlog, entradas, saidas, atraso, semSla, aguardando, reabPend, linhas: LINHAS.filter((l) => ms(l.ab) <= fim).length }
}

console.log(`Gerado: ${saida} (${LINHAS.length} linhas)`)
for (const c of ["2026-09", "2026-10"]) console.log(c, JSON.stringify(esperado(c)))
