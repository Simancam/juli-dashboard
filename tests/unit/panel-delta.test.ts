import { describe, expect, it } from "vitest"

import { computeDelta } from "@/lib/panel-delta"

describe("computeDelta", () => {
  it("marca el aumento con flecha arriba y signo positivo", () => {
    expect(computeDelta(120, 100)).toEqual({ direction: "up", label: "+20,0%" })
  })

  it("marca la disminución con flecha abajo y signo negativo", () => {
    expect(computeDelta(80, 100)).toEqual({ direction: "down", label: "−20,0%" })
  })

  it("no muestra variación cuando no hay cambio", () => {
    expect(computeDelta(100, 100)).toBeNull()
    expect(computeDelta(0, 0)).toBeNull()
  })

  it("no calcula porcentaje si el mes anterior no tenía base", () => {
    expect(computeDelta(100, 0)).toBeNull()
  })

  it("muestra los ratios en puntos porcentuales", () => {
    expect(computeDelta(0.06, 0.05, "ratio-points")).toEqual({
      direction: "up",
      label: "+1,0 pp",
    })
  })

  it("muestra el margen en puntos porcentuales tal cual", () => {
    expect(computeDelta(74.5, 72, "points")).toEqual({
      direction: "up",
      label: "+2,5 pp",
    })
  })
})
