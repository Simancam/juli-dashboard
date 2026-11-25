import { describe, expect, it } from "vitest"

import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { buildOverview } from "@/services/analytics/overviewBuilder"
import type { QualityReport } from "@/types/datasets"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"

const profile = getCommissionProfile()

const report: QualityReport = {
  rowsRead: 2,
  validRows: 2,
  invalidRows: 0,
  rowErrors: [],
  excludedByStatus: 0,
  excludedByStatusDetail: {},
  exactDuplicates: 0,
  sellersWithMultipleIds: [],
  feeNetMismatches: [],
  atypicalMargins: { fullMargin: 0, negativeMargin: 0 },
  unmappedItems: [],
  warnings: [],
  detectedRange: null,
  suggestedPeriod: null,
  suggestedName: null,
}

describe("overviewBuilder", () => {
  const lines = [
    makeSaleLineDraft({
      sellerKey: profile.sellerKey,
      sellerName: profile.sellerKey,
      clientKey: "CLIENTE JULIANA",
      clientName: "CLIENTE JULIANA",
      item: "PROPIO",
      itemDescription: "PRODUCTO PROPIO",
      subtotalCents: 200_000,
      isProduct: true,
    }),
    makeSaleLineDraft({
      documentNumber: "FEF-2",
      sellerKey: "OTRO VENDEDOR",
      sellerName: "OTRO VENDEDOR",
      clientKey: "CLIENTE OTRO",
      clientName: "CLIENTE OTRO",
      item: "SERVICIO",
      itemDescription: "SERVICIO DE INSTALACION",
      subtotalCents: 100_000,
      isProduct: false,
      familyKey: "SERV",
    }),
  ]

  const baseQuery = {
    metric: "value" as const,
    order: "desc" as const,
    limit: 10,
  }

  it("separa el análisis de la comisión y conserva la tabla completa", () => {
    const overview = buildOverview({
      lines,
      idOf: (line) => lines.indexOf(line),
      report,
      period: { start: "2025-10-21", end: "2025-10-21" },
      query: baseQuery,
    })

    expect(overview.commission).toBeUndefined()
    expect(overview.table).toHaveLength(2)
    expect(overview.products.map((entry) => entry.label)).toContain(
      "SERVICIO DE INSTALACION"
    )
    expect(overview.families.map((family) => family.key)).toEqual([
      "ABRAZADERAS",
      "SERV",
    ])
  })

  it("aplica el filtro de vendedores a KPIs, clientes y productos", () => {
    const overview = buildOverview({
      lines,
      idOf: (line) => lines.indexOf(line),
      report,
      period: { start: "2025-10-21", end: "2025-10-21" },
      query: { ...baseQuery, sellers: [profile.sellerKey] },
    })

    expect(overview.sellers).toEqual([profile.sellerKey, "OTRO VENDEDOR"])
    expect(overview.table).toHaveLength(2)
    expect(overview.kpis.netSalesCents).toBe(200_000)
    expect(overview.clients.map((client) => client.key)).toEqual([
      "CLIENTE JULIANA",
    ])
    expect(overview.products.map((entry) => entry.label)).toEqual([
      "PRODUCTO PROPIO",
    ])
    expect(overview.families.map((family) => family.key)).toEqual([
      "ABRAZADERAS",
    ])
  })

  it("calcula la comisión solo cuando se solicita", () => {
    const overview = buildOverview({
      lines,
      idOf: (line) => lines.indexOf(line),
      report,
      period: { start: "2025-10-21", end: "2025-10-21" },
      query: { ...baseQuery, includeCommission: true },
    })

    expect(overview.commission?.result).toMatchObject({
      ownCents: 200_000,
      teamCents: 100_000,
      totalCommissionCents: 5_000,
    })
  })

  it("descuenta el anticipo del neto a pagar", () => {
    const overview = buildOverview({
      lines,
      idOf: (line) => lines.indexOf(line),
      report,
      period: { start: "2025-10-21", end: "2025-10-21" },
      query: { ...baseQuery, includeCommission: true, advanceCents: 1_000 },
    })

    expect(overview.commission?.result).toMatchObject({
      totalCommissionCents: 5_000,
      advanceCents: 1_000,
      netToPayCents: 4_000,
    })
  })

  it("marcar líneas en la tabla no reemplaza el filtro de vendedores", () => {
    const query = {
      ...baseQuery,
      includeCommission: true,
      sellers: [profile.sellerKey],
    }
    const build = (selectedLines?: number[]) =>
      buildOverview({
        lines,
        idOf: (line) => lines.indexOf(line),
        report,
        period: { start: "2025-10-21", end: "2025-10-21" },
        query: { ...query, selectedLines },
      })

    expect(build([1]).commission?.result).toEqual(build().commission?.result)
    expect(build([1]).commission?.result).toMatchObject({
      ownCents: 200_000,
      teamCents: 0,
    })
  })

  it("una línea reasignada entra a la base propia aunque su vendedor no esté filtrado", () => {
    const overview = buildOverview({
      lines,
      idOf: (line) => lines.indexOf(line),
      report,
      period: { start: "2025-10-21", end: "2025-10-21" },
      query: {
        ...baseQuery,
        includeCommission: true,
        sellers: [profile.sellerKey],
        selectedLines: [1],
        reassignedLines: [1],
      },
    })

    expect(overview.commission?.result).toMatchObject({
      ownCents: 300_000,
      teamCents: 0,
      totalCommissionCents: 6_000,
    })
  })
})
