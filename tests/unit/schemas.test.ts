import { describe, expect, it } from "vitest"

import { analyticsFiltersSchema, rankingsQuerySchema } from "@/lib/schemas/analytics"
import { datasetUploadQuerySchema } from "@/lib/schemas/datasets"
import { commissionQuerySchema } from "@/lib/schemas/commissions"
import { saleLineDraftSchema } from "@/lib/schemas/sales"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"

describe("schemas", () => {
  it("parsea filtros con listas separadas por coma", () => {
    const parsed = analyticsFiltersSchema.parse({
      from: "2025-10-21",
      to: "2025-11-18",
      sellers: "JULIANA, ASTRALAGA",
      docTypes: "FEF,NCE",
    })

    expect(parsed.sellers).toEqual(["JULIANA", "ASTRALAGA"])
    expect(parsed.docTypes).toEqual(["FEF", "NCE"])
  })

  it("rechaza rangos invertidos", () => {
    const result = analyticsFiltersSchema.safeParse({
      from: "2025-11-18",
      to: "2025-10-21",
    })

    expect(result.success).toBe(false)
  })

  it("aplica defaults de rankings", () => {
    const parsed = rankingsQuerySchema.parse({
      from: "2025-10-21",
      to: "2025-11-18",
    })

    expect(parsed.limit).toBe(10)
    expect(parsed.order).toBe("desc")
    expect(parsed.metric).toBe("value")
  })

  it("valida el query de carga de datasets", () => {
    expect(
      datasetUploadQuerySchema.parse({ dryRun: "true" }).dryRun
    ).toBe(true)

    const missingEnd = datasetUploadQuerySchema.safeParse({
      periodStart: "2025-10-21",
    })
    expect(missingEnd.success).toBe(false)
  })

  it("valida comisiones con anticipo en centavos", () => {
    const parsed = commissionQuerySchema.parse({
      from: "2025-10-21",
      to: "2025-11-18",
      advance: "500000",
    })

    expect(parsed.advance).toBe(500000)
  })

  it("valida una línea canónica", () => {
    expect(saleLineDraftSchema.safeParse(makeSaleLineDraft()).success).toBe(true)
  })
})
