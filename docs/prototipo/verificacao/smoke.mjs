import { chromium } from "playwright"
const out = process.argv[2]
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome" })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
page.on("pageerror", (e) => errors.push(e.message))
const log = (ok, msg) => console.log(`${ok ? "OK  " : "FAIL"} ${msg}`)
await page.goto("http://localhost:4317/")
await page.getByRole("button", { name: /exemplo fict/i }).click()
await page.waitForTimeout(1200)

// filtro Área (Indicadores)
const rowsBefore = await page.getByText(/\d+ linhas/).first().textContent()
await page.getByRole("combobox", { name: /^Área/ }).first().click()
await page.getByRole("option", { name: /^Comercial/ }).click()
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
const rowsAfter = await page.getByText(/\d+ linhas/).first().textContent()
log(rowsBefore !== rowsAfter, `filtro Área muda tabela: ${rowsBefore} → ${rowsAfter}`)
const chip = page.getByText("Comercial", { exact: false }).filter({ hasText: "Área" })
log((await chip.count()) > 0, "chip 'Área: Comercial' visível")
await page.screenshot({ path: `${out}/s1-filtro.png` })

// legenda: ocultar Meta
const metaBtn = page.getByLabel("Meta vs realizado por mês").getByRole("button", { name: "Meta" })
await metaBtn.click()
log((await metaBtn.getAttribute("aria-pressed")) !== null, `legenda Meta aria-pressed=${await metaBtn.getAttribute("aria-pressed")}`)

// Ver dados
const ver = page.getByRole("button", { name: /Ver dados/ }).first()
await ver.click()
await page.waitForTimeout(200)
log((await page.getByRole("button", { name: /Ver gráfico/ }).count()) > 0, "Ver dados alterna para tabela")
await page.screenshot({ path: `${out}/s2-verdados.png` })

// troca de aba preserva filtros
await page.getByRole("tab", { name: /Projetos/ }).click()
await page.waitForTimeout(300)
const projRows = await page.getByText(/\d+ linhas/).first().textContent()
log(/40 linhas/.test(projRows ?? ""), `Projetos sem filtro herdado: ${projRows}`)
await page.getByRole("button", { name: /Só atrasados/ }).click()
await page.waitForTimeout(300)
log(!/40 linhas/.test((await page.getByText(/\d+ linhas/).first().textContent()) ?? ""), "Só atrasados filtra")
await page.getByRole("tab", { name: /Indicadores/ }).click()
await page.waitForTimeout(300)
log((await page.getByText(/\d+ linhas/).first().textContent()) === rowsAfter, "Indicadores mantém seu filtro após trocar de aba")

// limpar filtros
await page.getByRole("button", { name: /Limpar filtros/ }).click()
await page.waitForTimeout(300)
log((await page.getByText(/\d+ linhas/).first().textContent()) === rowsBefore, "Limpar filtros restaura")

// menu Colunas
await page.getByRole("button", { name: /Colunas/ }).click()
await page.getByRole("menuitemcheckbox", { name: /Meta/ }).click()
await page.keyboard.press("Escape")
await page.waitForTimeout(200)
log((await page.getByRole("columnheader", { name: /^Meta/ }).count()) === 0, "coluna Meta ocultada")

// ocultar aba
await page.getByRole("button", { name: /^Abas/ }).click()
await page.getByRole("menuitemcheckbox", { name: /Instruções/ }).click()
await page.keyboard.press("Escape")
await page.waitForTimeout(200)
log((await page.getByRole("tab", { name: /Instruções/ }).count()) === 0, "aba Instruções oculta")

// status das abas
await page.getByRole("button", { name: /Status das abas/ }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/s3-status.png` })
await page.keyboard.press("Escape")

// limpar sessão com filtro ativo pede confirmação
await page.getByRole("tab", { name: /Projetos/ }).click()
await page.getByRole("button", { name: /Limpar sessão/ }).click()
await page.waitForTimeout(300)
log((await page.getByRole("alertdialog").or(page.getByRole("dialog")).count()) > 0, "Limpar sessão com filtro pede confirmação")
await page.screenshot({ path: `${out}/s4-confirm.png` })

console.log(errors.length ? "ERROS:\n" + errors.join("\n") : "sem erros de console")
await browser.close()
