import { describe, expect, it } from "vitest"

import {
  monthRange,
  previousMonthRange,
  resolvePanelPeriod,
} from "@/lib/panel-period"

const coverage = { firstDate: "2025-03-10", lastDate: "2025-11-20" }

describe("resolvePanelPeriod", () => {
  it("usa el último mes con datos cuando no hay filtros", () => {
    expect(resolvePanelPeriod({}, coverage)).toEqual({
      from: "2025-11-01",
      to: "2025-11-20",
    })
  })

  it("mantiene el año completo si se pide explícitamente", () => {
    expect(resolvePanelPeriod({ year: 2025 }, coverage)).toEqual({
      from: "2025-03-10",
      to: "2025-11-20",
    })
  })

  it("respeta el rango solicitado dentro de la cobertura", () => {
    expect(
      resolvePanelPeriod(
        { from: "2025-06-01", to: "2025-08-31" },
        coverage
      )
    ).toEqual({ from: "2025-06-01", to: "2025-08-31" })
  })

  it("limita las fechas a los extremos de la cobertura", () => {
    expect(
      resolvePanelPeriod(
        { from: "2024-12-01", to: "2026-02-01" },
        coverage
      )
    ).toEqual({ from: "2025-03-10", to: "2025-11-20" })
  })

  it("cae a la cobertura completa si el rango queda fuera de los datos", () => {
    expect(
      resolvePanelPeriod(
        { from: "2024-01-01", to: "2024-12-31" },
        coverage
      )
    ).toEqual({ from: "2025-03-10", to: "2025-11-20" })
  })

  it("permite un rango de un solo día", () => {
    expect(
      resolvePanelPeriod(
        { from: "2025-07-04", to: "2025-07-04" },
        coverage
      )
    ).toEqual({ from: "2025-07-04", to: "2025-07-04" })
  })
})

describe("monthRange", () => {
  it("devuelve el mes completo pedido", () => {
    expect(monthRange("2026-11")).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    })
  })

  it("respeta febrero en año bisiesto", () => {
    expect(monthRange("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    })
  })
})

describe("previousMonthRange", () => {
  it("devuelve el mes calendario anterior completo", () => {
    expect(previousMonthRange("2026-11-18")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
  })

  it("cruza de año en enero", () => {
    expect(previousMonthRange("2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    })
  })

  it("respeta febrero en año bisiesto", () => {
    expect(previousMonthRange("2024-03-31")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    })
  })
})
