import { afterEach, describe, expect, it, vi } from "vitest"
import {
  areaPorSla,
  clientePorSituacao,
  clientePorTempo,
  operadorPorAtraso,
} from "./cruzamentos"
import { foto, mai, v1, v2 } from "./fotos-teste"
import * as metricas from "./metricas"
import type { EntradaCompetencia } from "./tipos"

const e = (
  linhas: typeof v1,
  mesRef: string,
  c: string
): EntradaCompetencia => ({ sheet: foto(linhas, mesRef), competencia: c })

afterEach(() => vi.restoreAllMocks())

describe("cache dos cruzamentos por entrada", () => {
  it("trocar o Comparar com não recalcula os cruzamentos do mês aberto", () => {
    const aberto = e(mai, "2026-05-01", "2026-05")
    const baseA = e(v1, "2026-04-01", "2026-04")
    const baseB = e(v2, "2026-04-01", "2026-04")
    const cruzamentos = [
      clientePorSituacao,
      operadorPorAtraso,
      areaPorSla,
      clientePorTempo,
    ]
    const lerFoto = vi.spyOn(metricas, "lerFoto")

    // abre o Painel: mês aberto + base A
    const antes = cruzamentos.map((f) => [f(aberto), f(baseA)])
    const aposAbrir = lerFoto.mock.calls.length
    // troca do "Comparar com": o aberto repete, só a base B é nova
    const depois = cruzamentos.map((f) => [f(aberto), f(baseB)])
    const aposTrocar = lerFoto.mock.calls.length - aposAbrir

    expect(depois.map((p) => p[0])).toEqual(antes.map((p) => p[0]))
    // só a base B lê a foto (uma vez por cruzamento que a lê; o aberto vem do cache)
    expect(aposTrocar).toBeLessThanOrEqual(cruzamentos.length)
    // repetir a mesma entrada não lê a foto de novo
    cruzamentos.forEach((f) => f(baseB))
    expect(lerFoto.mock.calls.length - aposAbrir).toBe(aposTrocar)
  })

  it("maxItens diferentes não se misturam no cache", () => {
    const aberto = e(mai, "2026-05-01", "2026-05")
    const todos = clientePorSituacao(aberto, 8)!
    const um = clientePorSituacao(aberto, 1)!
    expect(um.itens.length).toBeLessThanOrEqual(2)
    expect(clientePorSituacao(aberto, 8)).toEqual(todos)
  })
})
