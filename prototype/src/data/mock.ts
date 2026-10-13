// Dados 100% FICTÍCIOS e determinísticos (seed fixa). Nada aqui vem de planilha real.

export const REFERENCE_DATE = "2026-10-13" // "hoje" do protótipo

export const AREAS = [
  "Comercial",
  "Operações",
  "Financeiro",
  "Pessoas",
  "Tecnologia",
  "Qualidade",
] as const

export const MONTHS = [
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
] as const

export const STATUSES = [
  "Não iniciado",
  "Em andamento",
  "Concluído",
  "Pausado",
] as const
export type Status = (typeof STATUSES)[number]

export type IndicatorRow = {
  area: string
  indicador: string
  mes: string // YYYY-MM
  meta: number | null
  realizado: number | null
}

export type ProjectRow = {
  id: number
  nome: string
  area: string
  responsavel: string
  status: Status
  inicio: string // ISO
  prazo: string // ISO
  conclusao: number | null // 0..100
  concluidoEm: string | null
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const INDICATORS_BY_AREA: Record<string, string[]> = {
  Comercial: ["Propostas enviadas", "Taxa de conversão", "Novos clientes", "Ticket médio", "Retenção"],
  Operações: ["Entregas no prazo", "Retrabalho", "Capacidade utilizada", "Tempo de ciclo", "Custo por entrega"],
  Financeiro: ["Margem operacional", "Inadimplência", "Prazo de recebimento", "Aderência ao orçamento", "Fluxo de caixa"],
  Pessoas: ["Turnover", "Horas de treinamento", "Clima organizacional", "Vagas preenchidas", "Absenteísmo"],
  Tecnologia: ["Disponibilidade", "Chamados resolvidos", "Tempo de resposta", "Entregas de sprint", "Vulnerabilidades tratadas"],
  Qualidade: ["Não conformidades", "Auditorias concluídas", "Satisfação do cliente", "Reclamações tratadas", "Ações corretivas"],
}

export function buildIndicatorRows(): IndicatorRow[] {
  const rnd = mulberry32(20261016)
  const rows: IndicatorRow[] = []
  for (const area of AREAS) {
    INDICATORS_BY_AREA[area].forEach((indicador, idx) => {
      const baseMeta = 62 + Math.round(rnd() * 26)
      const skill = (rnd() - 0.42) * 0.22 // algumas áreas sistematicamente abaixo
      MONTHS.forEach((mes, m) => {
        const meta = Math.min(98, baseMeta + m * 1.5)
        const noise = (rnd() - 0.5) * 0.16
        const realizado = Math.round(meta * (1 + skill + noise + (m % 3 === 0 ? -0.02 : 0.01)) * 10) / 10
        // Alguns valores ausentes (aparecem como "—", nunca 0)
        const missing = (idx === 3 && m === 5 && area === "Pessoas") || (area === "Tecnologia" && idx === 4 && m >= 4)
        rows.push({
          area,
          indicador,
          mes,
          meta: Math.round(meta * 10) / 10,
          realizado: missing ? null : Math.min(realizado, 120),
        })
      })
    })
  }
  return rows
}

const PROJECT_NAMES = [
  "Painel de metas trimestrais", "Revisão da política comercial", "Migração do ERP", "Programa de mentoria",
  "Auditoria interna ISO", "Novo fluxo de cobrança", "Portal do cliente", "Plano de sucessão",
  "Automação de conciliação", "Reestruturação de turnos", "Pesquisa de satisfação", "Catálogo de serviços",
  "Contingência de TI", "Revisão de contratos", "Onboarding digital", "Mapeamento de processos",
  "Redução de retrabalho", "Orçamento 2027", "Treinamento de liderança", "Integração com parceiros",
  "Monitoramento de SLA", "Padronização de relatórios", "Gestão de fornecedores", "Segurança da informação",
  "Campanha de retenção", "Revisão de metas de qualidade", "Painel de custos", "Expansão regional",
  "Política de home office", "Renovação de licenças", "Calibração de equipamentos", "Plano de comunicação",
  "Gestão de riscos", "Base única de clientes", "Revisão de benefícios", "Inventário de ativos",
  "Rotina de feedback", "Playbook de vendas", "Backup e recuperação", "Indicadores de clima",
]
const PEOPLE = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Ferreira", "Elisa Rocha", "Fábio Nunes",
  "Gabriela Alves", "Hugo Martins", "Isabela Costa", "João Pereira", "Karina Dias", "Leandro Barros",
]

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildProjectRows(): ProjectRow[] {
  const rnd = mulberry32(1013)
  return PROJECT_NAMES.map((nome, i) => {
    const r = rnd()
    const status: Status =
      r < 0.17 ? "Não iniciado" : r < 0.6 ? "Em andamento" : r < 0.88 ? "Concluído" : "Pausado"
    const inicio = addDays("2026-03-01", Math.floor(rnd() * 150))
    const dur = 30 + Math.floor(rnd() * 140)
    const prazo = addDays(inicio, dur)
    let conclusao: number | null
    let concluidoEm: string | null = null
    if (status === "Concluído") {
      conclusao = 100
      concluidoEm = addDays(REFERENCE_DATE, -Math.floor(rnd() * 70))
    } else if (status === "Não iniciado") conclusao = 0
    else if (status === "Pausado") conclusao = 10 + Math.floor(rnd() * 50)
    else conclusao = 15 + Math.floor(rnd() * 80)
    // Um valor ausente de propósito
    if (i === 17) conclusao = null
    return {
      id: i + 1,
      nome,
      area: AREAS[Math.floor(rnd() * AREAS.length)],
      responsavel: PEOPLE[Math.floor(rnd() * PEOPLE.length)],
      status,
      inicio,
      prazo,
      conclusao,
      concluidoEm,
    }
  })
}

export const INSTRUCTION_ROWS = [
  { passo: "1", orientacao: "Preencher a aba Indicadores até quinta-feira", responsavel: "Cada área" },
  { passo: "2", orientacao: "Atualizar status e % de conclusão em Projetos", responsavel: "Gerentes de projeto" },
  { passo: "3", orientacao: "Não alterar nomes de colunas nem a ordem das abas", responsavel: "Todos" },
  { passo: "4", orientacao: "Enviar o arquivo para a reunião de segunda", responsavel: "PMO" },
]
