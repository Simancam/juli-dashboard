import { describe, expect, it } from "vitest"

import {
  calculateKpis,
  filterLinesByPeriod,
  rankProducts,
} from "@/services/analytics/analyticsService"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"

describe("analyticsService", () => {
  const lines = [
    makeSaleLineDraft({
      documentNumber: "FEF-1",
      clientKey: "CLIENTE UNO",
      item: "ABRAZ-1",
      itemDescription: "ABRAZADERA 1/2",
      unit: "UND",
      quantity: 2,
      subtotalCents: 100_000,
      margin: 20,
    }),
    makeSaleLineDraft({
      documentNumber: "FEV-2",
      clientKey: "CLIENTE UNO",
      item: "CABLE-1",
      itemDescription: "CABLE COBRE",
      unit: "MT",
      quantity: 3,
      subtotalCents: 200_000,
      margin: 10,
    }),
    makeSaleLineDraft({
      documentNumber: "NCE-3",
      docType: "NCE",
      isReturn: true,
      clientKey: "CLIENTE DOS",
      item: "ABRAZ-1",
      itemDescription: "ABRAZADERA 1/2",
      unit: "UND",
      quantity: -1,
      subtotalCents: -50_000,
      margin: 0,
    }),
    makeSaleLineDraft({
      documentNumber: "FEF-4",
      clientKey: "CLIENTE DOS",
      item: "PROY-1",
      itemDescription: "PROYECTOS ESPECIALES",
      unit: "UND",
      quantity: 1,
      subtotalCents: 50_000,
      margin: 0,
      isProduct: false,
      familyKey: "PROYECTOS",
    }),
  ]

  it("calcula los KPIs basicos", () => {
    const kpis = calculateKpis(lines)

    expect(kpis.netSalesCents).toBe(300_000)
    expect(kpis.grossSalesCents).toBe(350_000)
    expect(kpis.returnsCents).toBe(-50_000)
    expect(kpis.returnRate).toBeCloseTo(50_000 / 350_000)
    expect(kpis.documents).toBe(4)
    expect(kpis.clients).toBe(1)
    expect(kpis.avgTicketCents).toBe(100_000)
    expect(kpis.weightedMargin).toBeCloseTo(
      (20 * 100_000 + 10 * 200_000 + 0 * 50_000) / 350_000
    )
  })

  it("filtra por periodo", () => {
    expect(
      filterLinesByPeriod(lines, {
        start: "2025-10-21",
        end: "2025-10-21",
      })
    ).toHaveLength(4)
    expect(
      filterLinesByPeriod(lines, {
        start: "2025-10-22",
        end: "2025-10-31",
      })
    ).toHaveLength(0)
  })

  it("excluye no productos por defecto y separa unidades", () => {
    const ranked = rankProducts(lines, {
      metric: "value",
      order: "desc",
      limit: 10,
    })

    expect(ranked.products.map((entry) => entry.key)).toEqual([
      "CABLE-1|MT",
      "ABRAZ-1|UND",
    ])
    expect(ranked.products[0].documents).toBe(1)
    expect(ranked.products[1].returnsCents).toBe(-50_000)

    const withNonProducts = rankProducts(lines, {
      metric: "value",
      order: "desc",
      limit: 10,
      includeNonProducts: true,
    })

    expect(withNonProducts.products).toHaveLength(3)
  })

  it("no mezcla unidades en el ranking por cantidad", () => {
    const mixed = [
      ...lines,
      makeSaleLineDraft({
        documentNumber: "FEF-5",
        item: "ABRAZ-1",
        itemDescription: "ABRAZADERA 1/2",
        unit: "KG",
        quantity: 7,
        subtotalCents: 10_000,
      }),
    ]

    const ranked = rankProducts(mixed, {
      metric: "quantity",
      order: "desc",
      limit: 10,
    })

    expect(ranked.products.map((entry) => entry.unit)).toContain("KG")
    expect(
      ranked.products.filter((entry) => entry.key.startsWith("ABRAZ-1"))
    ).toHaveLength(2)
  })

  it("separa productos con neto no positivo", () => {
    const returned = [
      ...lines,
      makeSaleLineDraft({
        documentNumber: "FEF-6",
        item: "TORN-1",
        itemDescription: "TORNILLO 1/4",
        unit: "UND",
        quantity: 1,
        subtotalCents: -20_000,
      }),
    ]

    const ranked = rankProducts(returned, {
      metric: "value",
      order: "desc",
      limit: 10,
    })

    expect(ranked.returnedProducts.map((entry) => entry.key)).toEqual([
      "TORN-1|UND",
    ])
  })
})
