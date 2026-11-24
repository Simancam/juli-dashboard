import { describe, expect, it } from "vitest"

import { analysisListQuerySchema } from "@/lib/schemas/analyses"
import { commissionReportCreateSchema } from "@/lib/schemas/commission-reports"
import { panelQuerySchema } from "@/lib/schemas/panel"
import {
  asJson,
  mapAnalysisDetail,
  mapCommissionReportRow,
  mapCoverageRow,
  mapPanelSummary,
  mapRankingRow,
  toNumber,
  toSaleLineInsert,
} from "@/services/repositories/mappers"
import { makeSaleLineDraft } from "@/tests/fixtures/sales"
import type { Database } from "@/types/database.types"

type SummaryRow = Parameters<typeof mapPanelSummary>[0]
type CoverageRow = Parameters<typeof mapCoverageRow>[0]
type RankingRow = Parameters<typeof mapRankingRow>[0]
type AnalysisRow = Database["public"]["Tables"]["analyses"]["Row"]
type ReportRow = Database["public"]["Tables"]["commission_reports"]["Row"]

describe("mappers de persistencia", () => {
  it("normaliza números que llegan como texto", () => {
    expect(toNumber("1234")).toBe(1234)
    expect(toNumber("no-numero")).toBe(0)
  })

  it("mapea el resumen del panel con fechas nulas", () => {
    const row = {
      net_sales_cents: "70000",
      gross_sales_cents: "80000",
      returns_cents: "-10000",
      return_rate: "0.125",
      documents: "5",
      clients: "2",
      avg_ticket_cents: "20000",
      weighted_margin: "0.3",
      last_date: "2025-11-18",
      previous_net_sales_cents: "50000",
      previous_last_date: null,
    } as unknown as SummaryRow

    expect(mapPanelSummary(row)).toEqual({
      netSalesCents: 70000,
      grossSalesCents: 80000,
      returnsCents: -10000,
      returnRate: 0.125,
      documents: 5,
      clients: 2,
      avgTicketCents: 20000,
      weightedMargin: 0.3,
      lastDate: "2025-11-18",
      previousNetSalesCents: 50000,
      previousLastDate: null,
    })
  })

  it("recorta los meses cubiertos a YYYY-MM", () => {
    const row = {
      first_date: "2025-10-21",
      last_date: "2025-11-18",
      months_with_data: 1,
      missing_months: ["2025-11-01"],
      last_upload_at: null,
      datasets_ready: 1,
    } as unknown as CoverageRow

    expect(mapCoverageRow(row).missingMonths).toEqual(["2025-11"])
  })

  it("solo agrega cantidad y unidad cuando el ranking las trae", () => {
    const base = {
      key: "k",
      label: "Producto",
      net_sales_cents: 100,
      share: 0.5,
      documents: 1,
      returns_cents: 0,
      margin: 0.1,
      cumulative_share: 0.5,
    } as RankingRow

    expect(mapRankingRow(base).quantity).toBeUndefined()
    expect(mapRankingRow({ ...base, quantity: 3, unit: "UND" }).quantity).toBe(3)
  })

  it("convierte una línea a snake_case con número estable", () => {
    const line = makeSaleLineDraft()

    expect(toSaleLineInsert(line, "dataset-1", 7)).toMatchObject({
      dataset_id: "dataset-1",
      line_no: 7,
      subtotal_cents: 100_000,
      seller_key: "MONTES CUELLO JULIANA",
      is_return: false,
    })
  })

  it("recupera el reporte de calidad y el snapshot del análisis", () => {
    const report = { validRows: 2, warnings: ["aviso"] }
    const row = {
      id: "analysis-1",
      status: "active",
      period_month: "2025-10-01",
      quality_report: asJson(report),
      snapshot: asJson({ kpis: { documents: 2 }, products: [], returnedProducts: [] }),
    } as unknown as AnalysisRow

    const detail = mapAnalysisDetail(row)

    expect(detail.report).toEqual(report)
    expect(detail.snapshot.kpis).toEqual({ documents: 2 })
  })

  it("extrae las reasignaciones guardadas dentro de inputs", () => {
    const reassignments = [{ id: 3, originalSellerKey: "OTRO", assignedTo: "JULIANA", subtotalCents: 10 }]
    const row = {
      id: "report-1",
      inputs: asJson({ sellers: [], reassignments }),
      result: asJson({ totalCommissionCents: 100 }),
      warnings: asJson(["sin líneas"]),
      own_rate: 0.02,
    } as unknown as ReportRow

    const report = mapCommissionReportRow(row)

    expect(report.reassignments).toEqual(reassignments)
    expect(report.warnings).toEqual(["sin líneas"])
    expect(report.result).toEqual({ totalCommissionCents: 100 })
    expect(report.ownRate).toBe(0.02)
  })
})

describe("schemas de la fase de persistencia", () => {
  it("valida el rango del panel", () => {
    expect(panelQuerySchema.parse({ year: "2025" }).year).toBe(2025)
    expect(
      panelQuerySchema.safeParse({ from: "2025-11-18", to: "2025-10-21" }).success
    ).toBe(false)
  })

  it("aplica defaults al crear un reporte", () => {
    const parsed = commissionReportCreateSchema.parse({
      analysisId: "11111111-1111-4111-8111-111111111111",
    })

    expect(parsed.advanceCents).toBe(0)
    expect(parsed.selectedLines).toBeUndefined()
  })

  it("rechaza tasas fuera de rango", () => {
    expect(
      commissionReportCreateSchema.safeParse({
        analysisId: "11111111-1111-4111-8111-111111111111",
        ownRate: 3,
      }).success
    ).toBe(false)
  })

  it("lista todos los estados por defecto", () => {
    expect(analysisListQuerySchema.parse({}).status).toBe("all")
  })
})
