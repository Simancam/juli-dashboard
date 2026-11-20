import { describe, expect, it } from "vitest"

import {
  normalizeClientKey,
  normalizeHeader,
  normalizeName,
  normalizeSellerKey,
  normalizeText,
  parseDocType,
} from "@/utils/normalizers"

describe("normalizers", () => {
  it("normaliza vendedores con doble espacio y tildes", () => {
    expect(normalizeSellerKey("  RINCON  ANDREINA ")).toBe("RINCON ANDREINA")
    expect(normalizeSellerKey("Márjorie  Vergara")).toBe("MARJORIE VERGARA")
    expect(normalizeName("  Gómez   Pérez ")).toBe("GOMEZ PEREZ")
    expect(normalizeClientKey("Cliente / Uno")).toBe("CLIENTE / UNO")
  })

  it("normaliza encabezados conservando el typo Márgen", () => {
    expect(normalizeHeader("  Desc. ítem ")).toBe("desc item")
    expect(normalizeHeader("Márgen")).toBe("margen")
    expect(normalizeHeader("Valor subtotal local")).toBe("valor subtotal local")
  })

  it("normaliza texto general", () => {
    expect(normalizeText("  Fée   Electrónica ")).toBe("FEE ELECTRONICA")
  })

  it("extrae el tipo de documento", () => {
    expect(parseDocType("FEV-1234")).toBe("FEV")
    expect(parseDocType("FEF-2925")).toBe("FEF")
    expect(parseDocType("FEE-2945")).toBe("FEE")
    expect(parseDocType("NCE-10")).toBe("NCE")
    expect(parseDocType("OTRO-1")).toBeNull()
  })
})
