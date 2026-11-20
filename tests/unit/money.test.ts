import { describe, expect, it } from "vitest"

import { centsToNumber, parseAmountToCents, roundRateToCents } from "@/utils/money"

describe("money", () => {
  it("convierte números de Excel a centavos", () => {
    expect(parseAmountToCents(1234.56)).toBe(123456)
    expect(parseAmountToCents(-778.5)).toBe(-77850)
  })

  it("convierte formato local colombiano", () => {
    expect(parseAmountToCents("$ 1.234.567,89")).toBe(123456789)
    expect(parseAmountToCents("-1.000,50")).toBe(-100050)
  })

  it("convierte formato internacional", () => {
    expect(parseAmountToCents("1,234,567.89")).toBe(123456789)
  })

  it("rechaza valores no numéricos", () => {
    expect(parseAmountToCents("")).toBeNull()
    expect(parseAmountToCents("abc")).toBeNull()
    expect(parseAmountToCents(Number.NaN)).toBeNull()
  })

  it("redondea una sola vez sobre centavos", () => {
    expect(roundRateToCents(5_793_076_900, 0.02)).toBe(115_861_538)
    expect(centsToNumber(115_861_538)).toBe(1_158_615.38)
  })
})
