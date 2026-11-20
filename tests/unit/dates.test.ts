import { describe, expect, it } from "vitest"

import {
  excelSerialToIsoDate,
  isIsoDate,
  parseDateOnly,
  parsePeriodFromFileName,
} from "@/utils/dates"

describe("dates", () => {
  it("valida fechas ISO reales", () => {
    expect(isIsoDate("2025-10-21")).toBe(true)
    expect(isIsoDate("2025-02-30")).toBe(false)
    expect(isIsoDate("21/10/2025")).toBe(false)
  })

  it("convierte seriales de Excel", () => {
    // 45921 = 2025-09-21
    expect(excelSerialToIsoDate(45921)).toBe("2025-09-21")
  })

  it("parsea fechas locales e ISO", () => {
    expect(parseDateOnly("21/10/2025")).toBe("2025-10-21")
    expect(parseDateOnly("2025-10-21")).toBe("2025-10-21")
    expect(parseDateOnly("no es fecha")).toBeNull()
  })

  it("extrae el periodo del nombre del archivo", () => {
    expect(
      parsePeriodFromFileName("Informe_ventasJM_21_10_2025_AL_18_11_2025.xlsx")
    ).toEqual({ start: "2025-10-21", end: "2025-11-18" })

    expect(parsePeriodFromFileName("archivo.xlsx")).toBeNull()
  })
})
