import { describe, expect, it } from "vitest"

import {
  formatApproxMoney,
  formatMargin,
  formatMoney,
  formatPercent,
} from "@/utils/format"

describe("format", () => {
  it("muestra los montos como enteros, sin decimales", () => {
    const formatted = formatMoney(123_456_789)

    expect(formatted).toContain("1.234.568")
    expect(formatted).not.toMatch(/,\d/)
  })

  it("conserva los decimales en los porcentajes", () => {
    expect(formatPercent(0.12345)).toContain("12,3")
  })

  it("muestra el margen en puntos porcentuales sin multiplicarlo por 100", () => {
    expect(formatMargin(74.004)).toContain("74,0")
  })

  it("convierte centavos una sola vez en la etiqueta del gráfico", () => {
    expect(formatApproxMoney(39_710_317_100)).toBe("$397M")
    expect(formatApproxMoney(54_000_000)).toBe("$540mil")
  })
})
