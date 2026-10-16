import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  criarRepositorioMemoria,
  type Carga,
  type RepositorioDeCargas,
} from "@/cargas"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { foto, out } from "@/chamados/fotos-teste"
import { montarWorkbook } from "@/chamados/test-util"
import { FiltrosChamadosProvider } from "./filtros"
import * as logica from "./logica"

beforeEach(() => registrarTiposDoApp())

describe("FiltrosChamadosProvider", () => {
  it("não recalcula as opções num re-render sem mudança de dados", async () => {
    const repo: RepositorioDeCargas = criarRepositorioMemoria()
    const meta = await repo.salvar({
      tipo: "chamados",
      competencia: "2026-10",
      arquivo: "out.xlsx",
      workbook: montarWorkbook(foto(out, "2026-10-01")),
    })
    const carga = (await repo.obter(meta.id)) as Carga
    const espiao = vi.spyOn(logica, "opcoesDoFiltro")
    const cena = (n: number) => (
      <FiltrosChamadosProvider carga={carga}>
        <p>{n}</p>
      </FiltrosChamadosProvider>
    )
    const { rerender } = render(cena(1))
    const chamadas = espiao.mock.calls.length
    expect(chamadas).toBeGreaterThan(0)
    rerender(cena(2))
    rerender(cena(3))
    expect(espiao.mock.calls.length).toBe(chamadas)
  })
})
