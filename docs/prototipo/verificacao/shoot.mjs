import { chromium } from "playwright"
const out = process.argv[2]
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome" })
const errors = []
async function run(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on("console", (m) => m.type() === "error" && errors.push(`${tag}: ${m.text()}`))
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`))
  await page.goto("http://localhost:4317/")
  await page.screenshot({ path: `${out}/${tag}-0-vazio.png` })
  await page.getByRole("button", { name: /exemplo fict/i }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/${tag}-1-indicadores.png`, fullPage: true })
  await page.getByRole("tab", { name: /Projetos/ }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${tag}-2-projetos.png`, fullPage: true })
  await page.getByRole("tab", { name: /Base antiga/ }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${tag}-3-base-antiga.png`, fullPage: true })
  await page.close()
}
await run(1920, 1080, "1920")
await run(1366, 768, "1366")
await run(1024, 768, "1024")
console.log(errors.length ? errors.join("\n") : "sem erros de console")
await browser.close()
