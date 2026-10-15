// Recorte de 5 linhas de chamados-2026-04-ficticio.xlsx + variação v2 (mesmo Mes Ref abr/26). Rode: node docs/exemplos/gerar-teste-foto.cjs
// Grava as 4 fotos em docs/exemplos/teste-foto/ (ignoradas pelo Git). Mesmos dados de src/chamados/foto.aceite.test.ts.
const path = require("node:path")
const fs = require("node:fs")
const X = require("xlsx")
const DIR = path.join(__dirname, "teste-foto")
fs.mkdirSync(DIR, { recursive: true })
const d = (s) => (s ? new Date(s + "T00:00:00") : null) // meia-noite local, como a planilha real
const CAB = ["Mes Ref.", "Data Abertura", "Código", "Cliente", "Área Superior", "Área", "Atividade", "Severidade", "Situação", "SLA Previsto", "SLA Renegociado", "Data de Solução", "Data de Aceite", "Qtd Reabertura", "Resumo", "Operador", "Responsável Cliente"]
let MES_REF = d("2026-04-01")
// [abertura, código, cliente, área sup, área, atividade, severidade, situação, sla prev, sla reneg, solução, aceite, reab, resumo, operador, resp]
const v1 = [
  ["2026-04-03", 5000, "Cliente Ômega", "Comercial", "Cadastro", "Integração", "Média", "Em Atendimento", "2026-04-20", null, null, null, 0, "Falha na emissão de relatório", "Operador 05", "Responsável B"],
  ["2026-01-18", 5003, "Cliente Ômega", "Operações", "Armazém", "Correção", "Baixa", "Em Análise", "2026-01-28", "2026-05-15", null, null, 0, "Acesso à rotina", "Operador 05", "Responsável A"],
  ["2026-03-10", 5005, "Cliente Delta", "Operações", "Logística", "Suporte", "Baixa", "Finalizado", "2026-03-25", null, "2026-04-08", "2026-04-10", 0, "Erro de integração", "Operador 04", "Responsável A"],
  ["2026-04-02", 5007, "Cliente Delta", "Comercial", "Cadastro", "Suporte", "Alta", "Finalizado", "2026-04-15", null, "2026-04-12", "2026-04-13", 1, "Ajuste de cadastro", "Operador 04", "Responsável B"],
  ["2025-12-05", 5010, "Cliente Ômega", "Operações", "Armazém", "Correção", "Média", "Aguardando aceite", null, null, "2026-04-25", null, 0, "Divergência de estoque", "Operador 04", "Responsável A"],
]
const v2 = v1.map((r) => [...r])
v2[0][7] = "Finalizado"; v2[0][10] = "2026-04-28"; v2[0][11] = "2026-04-29" // 5000 resolvido
v2[4][7] = "Finalizado"; v2[4][11] = "2026-04-27" // 5010 aceito
v2.push(["2026-04-22", 5012, "Cliente Delta", "Comercial", "Cadastro", "Integração", "Média", "Em Análise", "2026-05-06", null, null, null, 0, "Nova rotina de exportação", "Operador 05", "Responsável B"])

function salvar(linhas, nome) {
  const aoa = [CAB, ...linhas.map((r) => [MES_REF, d(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[7], d(r[8]), d(r[9]), d(r[10]), d(r[11]), r[12], r[13], r[14], r[15]])]
  const ws = X.utils.aoa_to_sheet(aoa, { cellDates: true })
  for (let i = 1; i < aoa.length; i++) {
    const c = ws[X.utils.encode_cell({ r: i, c: 0 })]
    if (c) c.z = "mmm/yy"
    for (const col of [1, 9, 10, 11, 12]) {
      const k = ws[X.utils.encode_cell({ r: i, c: col })]
      if (k && k.t === "d") k.z = "dd/mm/yyyy"
    }
  }
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, ws, "Chamados")
  X.writeFile(wb, path.join(DIR, nome), { cellDates: true })
  console.log("gravado", nome, linhas.length, "linhas")
}
salvar(v1, "teste-foto-abr26-v1.xlsx")
salvar(v2, "teste-foto-abr26-v2.xlsx")

// Foto de maio (Mes Ref mai/26): parte da v2 de abril.
const mai = v2.map((r) => [...r])
const i5012 = mai.findIndex((r) => r[1] === 5012)
mai[i5012][7] = "Finalizado"; mai[i5012][10] = "2026-05-05"; mai[i5012][11] = "2026-05-07"
mai.push(["2026-05-10", 5015, "Cliente Ômega", "Operações", "Logística", "Suporte", "Alta", "Em Atendimento", "2026-05-25", null, null, null, 0, "Lentidão na consulta", "Operador 04", "Responsável A"])
MES_REF = d("2026-05-01"); salvar(mai, "teste-foto-mai26.xlsx")

// Foto de outubro (Mes Ref out/26): salto de 5 meses sem fotos (jun–set).
const out = mai.map((r) => [...r])
const i5003 = out.findIndex((r) => r[1] === 5003)
out[i5003][7] = "Finalizado"; out[i5003][10] = "2026-06-20"; out[i5003][11] = "2026-06-22" // resolvido em junho (mês sem foto)
const i5015 = out.findIndex((r) => r[1] === 5015)
out[i5015][7] = "Finalizado"; out[i5015][10] = "2026-05-30"; out[i5015][11] = "2026-06-02" // corrige maio: resolvido em 30/05, lançado depois
out.push(["2026-08-14", 5020, "Cliente Delta", "Operações", "Armazém", "Correção", "Média", "Em Análise", "2026-08-30", null, null, null, 0, "Erro no inventário", "Operador 05", "Responsável B"])
out.push(["2026-10-06", 5022, "Cliente Ômega", "Comercial", "Cadastro", "Integração", "Baixa", "Aguardando cliente", "2026-10-20", null, null, null, 0, "Validação de layout", "Operador 04", "Responsável A"])
out.push(["2026-10-01", 5024, "Cliente Delta", "Comercial", "Cadastro", "Suporte", "Alta", "Finalizado", "2026-10-15", null, "2026-10-09", "2026-10-10", 2, "Ajuste de permissão", "Operador 05", "Responsável B"])
out.push(["2026-11-03", 5026, "Cliente Ômega", "Comercial", "Cadastro", "Suporte", "Média", "Em Análise", "2026-11-20", null, null, null, 0, "Aberto depois do Mes Ref.", "Operador 04", "Responsável A"]) // foto exportada em novembro
MES_REF = d("2026-10-01"); salvar(out, "teste-foto-out26.xlsx")
