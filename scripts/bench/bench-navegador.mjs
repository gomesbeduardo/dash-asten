// Medição no navegador (D74): build de produção em modo API + preview, com as 12 posições servidas por
// page.route (sem banco). Fora do e2e padrão (não roda no `npm run test:e2e`).
// Uso: node scripts/bench/bench-navegador.mjs <linhas> [reps=3]   (dados: gerar-bench-12-posicoes.mjs --linhas <linhas>)
// Porta: PW_PORT (padrão 4186). Mede: abrir o Painel, Painel>Comparar>Painel e 3 trocas do "Comparar com".
// Para cada ação: maior quadro (rAF) e soma de longtasks numa janela de 3 s após o clique/troca.
import { createRequire } from "node:module"
import { spawn, execFileSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, "..", "..")
const { chromium } = createRequire(join(raiz, "package.json"))("playwright")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LINHAS = Number(process.argv[2] ?? 3000)
const REPS = Number(process.argv[3] ?? 3)
const PORTA = process.env.PW_PORT ?? "4186"
const URL = `http://localhost:${PORTA}/`
const DADOS = join(raiz, "docs/exemplos/bench", String(LINHAS), "api")
const DIST = join(raiz, "docs/exemplos/bench/dist")
const JANELA = 3000
if (!existsSync(join(DADOS, "cargas.json"))) throw new Error(`Gere os dados antes: node docs/exemplos/gerar-bench-12-posicoes.mjs --linhas ${LINHAS}`)

if (!process.env.SEM_BUILD) {
  console.log("build de produção (modo API) ...")
  execFileSync("npx", ["vite", "build", "--outDir", DIST, "--emptyOutDir", ...(process.env.PERFIL ? ["--minify", "false"] : [])], { cwd: raiz, stdio: "ignore", env: { ...process.env, VITE_REPOSITORIO: "api" } })
}
const srv = spawn("npx", ["vite", "preview", "--outDir", DIST, "--port", PORTA, "--strictPort"], { cwd: raiz, stdio: "ignore", detached: true })
const matar = () => { try { process.kill(-srv.pid) } catch { /* já saiu */ } }
process.on("exit", matar)
for (let i = 0; i < 60; i++) { try { if ((await fetch(URL)).ok) break } catch { /* ainda subindo */ } await sleep(500) }

const metas = readFileSync(join(DADOS, "cargas.json"))
const cargas = new Map()
const corpo = (id) => cargas.get(id) ?? (cargas.set(id, readFileSync(join(DADOS, "cargas", `${id}.json`))), cargas.get(id))

const out = []
try {
  const browser = await chromium.launch({ headless: true })
  for (let rep = 1; rep <= REPS; rep++) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await ctx.newPage()
    await page.route("**/api/**", (rota) => {
      const u = new globalThis.URL(rota.request().url())
      const caminho = u.pathname.replace(/^\/api\//, "")
      if (caminho === "cargas") return rota.fulfill({ status: 200, contentType: "application/json", body: metas })
      const m = /^cargas\/([^/]+)$/.exec(caminho)
      if (m && existsSync(join(DADOS, "cargas", `${m[1]}.json`)))
        return rota.fulfill({ status: 200, contentType: "application/json", body: corpo(m[1]) })
      return rota.fulfill({ status: 404, contentType: "application/json", body: '{"erro":"Não encontrado."}' })
    })
    await page.goto(URL); await sleep(1500)
    await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]) }).observe({ type: "longtask" }) })

    const cdp = process.env.PERFIL ? await ctx.newCDPSession(page) : null
    if (cdp) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }) }
    async function perfilar(nome, fazer) {
      if (!cdp) return fazer()
      await cdp.send("Profiler.start"); await fazer(); await sleep(JANELA)
      const { profile } = await cdp.send("Profiler.stop")
      const dt = new Map(), porId = new Map(profile.nodes.map((n) => [n.id, n]))
      profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)))
      const por = new Map()
      for (const [id, us] of dt) {
        const f = porId.get(id).callFrame
        if (f.functionName === "(idle)" || f.functionName === "(program)") continue
        const k = `${f.functionName || "(anônima)"} ${f.url.split("/").pop()}:${f.lineNumber + 1}`
        por.set(k, (por.get(k) ?? 0) + us / 1000)
      }
      console.log(`PERFIL ${nome} (tempo próprio, ms):`)
      for (const [k, ms] of [...por].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log("  ", ms.toFixed(0).padStart(5), k)
    }
    async function acao(nome, evento, fazer0) {
      const fazer = () => perfilar(nome, fazer0)
      await page.evaluate(({ evento, J }) => {
        const m = (window.__m = { c: 0, ts: [], novo: null, t0: document.querySelector("main")?.textContent ?? "" })
        const f = (t) => {
          m.ts.push(t)
          const txt = document.querySelector("main")?.textContent ?? ""
          if (m.novo === null && txt !== m.t0 && !document.querySelector('[aria-busy="true"]') && !txt.includes("Carregando")) m.novo = t - m.c
          if (t - m.c < J) requestAnimationFrame(f)
        }
        document.addEventListener(evento, () => { m.c = performance.now(); requestAnimationFrame(f) }, { once: true, capture: true })
      }, { evento, J: JANELA })
      await fazer(); await sleep(JANELA + 600)
      const r = await page.evaluate(() => {
        const m = window.__m, c = m.c
        const iv = []; let p = c
        for (const t of m.ts) { iv.push(t - p); p = t }
        const lt = window.__lt.filter(([s, d]) => s + d >= c && s <= c + 3000)
        return { maiorQuadro: Math.max(0, ...iv), ltSoma: lt.reduce((x, [, d]) => x + d, 0), ltN: lt.length, ltMax: Math.max(0, ...lt.map((x) => x[1])), conteudoMs: m.novo }
      })
      out.push({ linhas: LINHAS, rep, acao: nome, ...r })
      console.log(rep, nome.padEnd(24), "maiorQuadro", r.maiorQuadro.toFixed(0).padStart(5), "ms | longtasks", r.ltSoma.toFixed(0).padStart(5), "ms (n=" + r.ltN + ", max " + r.ltMax.toFixed(0) + ") | conteudo", r.conteudoMs?.toFixed(0))
    }
    const topo = async () => { await page.mouse.move(900, 500); await page.mouse.move(900, 5); await sleep(700) }
    const aba = async (n) => { await topo(); await page.getByRole("tab", { name: n }).click() }
    await acao("abrir o Painel", "click", () => page.getByRole("button", { name: /Abrir a última/ }).click())
    await page.getByRole("tab", { name: "Painel", selected: true }).waitFor()
    await acao("Painel>Comparar", "click", () => aba("Comparar"))
    await acao("Comparar>Painel", "click", () => aba("Painel"))
    const sel = page.getByLabel("Comparar com")
    const opts = await sel.locator("option").evaluateAll((o) => o.map((x) => x.value))
    if (rep === 1) console.log("opções do Comparar com:", opts.join(", "))
    // 3 meses com posição e 1 mês sem posição (o seletor lista os dois tipos)
    const escolhas = ["mes:2026-08", "mes:2026-03", "mes:2025-11", "mes:2025-09"].filter((v) => opts.includes(v))
    for (const [i, v] of escolhas.entries())
      await acao(`troca ${i + 1} (${v})`, "change", () => sel.selectOption(v))
    await ctx.close()
  }
  await browser.close()
} finally { matar() }
const saida = join(raiz, "docs/exemplos/bench", `resultado-navegador-${LINHAS}.json`)
writeFileSync(saida, JSON.stringify(out, null, 1))
// resumo: melhor (menor maior quadro) de cada ação
const acoes = [...new Set(out.map((o) => o.acao))]
console.log("\nMELHOR de", REPS, "por ação (menor maiorQuadro / menor soma de longtasks):")
for (const a of acoes) {
  const xs = out.filter((o) => o.acao === a)
  console.log(`  ${a.padEnd(26)} quadro ${Math.min(...xs.map((x) => x.maiorQuadro)).toFixed(0)} ms | longtasks ${Math.min(...xs.map((x) => x.ltSoma)).toFixed(0)} ms`)
}
console.log("resultado em", saida)
