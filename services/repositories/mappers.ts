import type { Kpis, RankedEntry } from "@/types/analytics"
import type { AnalysisDetail, AnalysisSnapshot, SavedAnalysis } from "@/types/analyses"
import type { OverviewResponse } from "@/types/overview"
import type { SavedCommissionReport } from "@/types/commission-reports"
import type { QualityReport } from "@/types/datasets"
import type {
  DataCoverage,
  PanelChartPoint,
  PanelMonthlyPoint,
  PanelSummary,
} from "@/types/panel"
import type { DateRange, SaleLine, SaleLineDraft } from "@/types/sales"
import type { Database, Json } from "@/types/database.types"

type DatasetRow = Database["public"]["Tables"]["datasets"]["Row"]
type SaleLineRow = Database["public"]["Tables"]["sale_lines"]["Row"]
type SaleLineInsert = Database["public"]["Tables"]["sale_lines"]["Insert"]
type AnalysisRow = Database["public"]["Tables"]["analyses"]["Row"]
type CommissionReportRow =
  Database["public"]["Tables"]["commission_reports"]["Row"]

type SummaryRpcRow = Database["public"]["Functions"]["panel_summary"]["Returns"][number]
type MonthlyRpcRow = Database["public"]["Functions"]["sales_by_month"]["Returns"][number]
type ChartRpcRow = Database["public"]["Functions"]["panel_chart_points"]["Returns"][number]
type CoverageRpcRow = Database["public"]["Functions"]["data_coverage"]["Returns"][number]

/** Todos los RPC de ranking devuelven estas columnas; quantity/unit solo en productos. */
interface RankingRowLike {
  key: string
  label: string
  net_sales_cents: number
  share: number
  documents: number
  returns_cents: number
  margin: number
  cumulative_share: number
  quantity?: number
  unit?: string | null
}

/** PostgREST puede devolver `numeric`/`bigint` como string en respuestas grandes. */
export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function toText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

function toNullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value)
}

function fromJson<T>(value: Json | NonNullable<Json>, fallback: T): T {
  return value && typeof value === "object" ? (value as T) : fallback
}

/** Serialización explícita: los datos guardados son JSON, nunca confiamos en el cliente. */
export function asJson(value: unknown): NonNullable<Json> {
  return JSON.parse(JSON.stringify(value ?? {})) as NonNullable<Json>
}

export function mapDatasetRow(row: DatasetRow) {
  return {
    id: row.id,
    name: row.name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    fileHash: row.file_hash,
    rowCount: row.row_count,
    uploadedAt: row.uploaded_at,
  }
}

export function mapSaleLineRow(row: SaleLineRow): SaleLineDraft & { lineNo: number } {
  return {
    lineNo: row.line_no,
    documentNumber: row.document_number,
    docType: row.doc_type as SaleLine["docType"],
    date: row.date,
    status: row.status,
    costCenter: row.cost_center,
    sellerName: row.seller_name,
    sellerId: row.seller_id,
    sellerKey: row.seller_key,
    clientName: row.client_name,
    clientKey: row.client_key,
    item: row.item,
    itemDescription: row.item_description,
    unit: row.unit,
    quantity: toNumber(row.quantity),
    subtotalCents: toNumber(row.subtotal_cents),
    netCents: toNumber(row.net_cents),
    margin: toNumber(row.margin),
    warehouse: row.warehouse,
    familyKey: row.family_key,
    isProduct: row.is_product,
    isReturn: row.is_return,
  }
}

export function toSaleLineInsert(
  line: SaleLineDraft,
  datasetId: string,
  lineNo: number
): SaleLineInsert {
  return {
    dataset_id: datasetId,
    line_no: lineNo,
    document_number: line.documentNumber,
    doc_type: line.docType,
    date: line.date,
    status: line.status,
    cost_center: line.costCenter,
    seller_name: line.sellerName,
    seller_id: line.sellerId,
    seller_key: line.sellerKey,
    client_name: line.clientName,
    client_key: line.clientKey,
    item: line.item,
    item_description: line.itemDescription,
    unit: line.unit,
    quantity: line.quantity,
    subtotal_cents: line.subtotalCents,
    net_cents: line.netCents,
    margin: line.margin,
    warehouse: line.warehouse,
    family_key: line.familyKey,
    is_product: line.isProduct,
    is_return: line.isReturn,
  }
}

export function mapAnalysisRow(row: AnalysisRow): SavedAnalysis {
  return {
    id: row.id,
    name: row.name || "Informe de ventas",
    datasetId: row.dataset_id,
    periodMonth: row.period_month,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    fileName: row.file_name,
    fileHash: row.file_hash,
    status: row.status as SavedAnalysis["status"],
    supersededBy: row.superseded_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAnalysisDetail(row: AnalysisRow): AnalysisDetail {
  const snapshot = fromJson<Partial<AnalysisSnapshot>>(row.snapshot, {})
  const storedResult = fromJson<OverviewResponse | Record<string, never>>(
    row.result,
    {}
  )
  const result =
    "kpis" in storedResult ? (storedResult as OverviewResponse) : null

  return {
    ...mapAnalysisRow(row),
    report: fromJson<QualityReport>(row.quality_report, {} as QualityReport),
    snapshot: {
      kpis: snapshot.kpis ?? ({} as Kpis),
      clients: snapshot.clients ?? [],
      families: snapshot.families ?? [],
      products: snapshot.products ?? [],
      returnedProducts: snapshot.returnedProducts ?? [],
    },
    result,
  }
}

export function mapCommissionReportRow(
  row: CommissionReportRow
): SavedCommissionReport {
  const inputs = fromJson<
    SavedCommissionReport["inputs"] & {
      reassignments?: SavedCommissionReport["reassignments"]
    }
  >(row.inputs, {})

  return {
    id: row.id,
    analysisId: row.analysis_id,
    version: row.version,
    sellerKey: row.seller_key,
    ownRate: toNumber(row.own_rate),
    teamRate: toNumber(row.team_rate),
    advanceCents: toNumber(row.advance_cents),
    inputs: {
      ...inputs,
      commissionLines: Array.isArray(inputs.commissionLines)
        ? inputs.commissionLines
        : [],
    },
    result: fromJson(row.result, {} as SavedCommissionReport["result"]),
    reassignments: inputs.reassignments ?? [],
    warnings: fromJson<string[]>(row.warnings, []),
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export function mapPanelSummary(row: SummaryRpcRow): PanelSummary {
  return {
    netSalesCents: toNumber(row.net_sales_cents),
    grossSalesCents: toNumber(row.gross_sales_cents),
    returnsCents: toNumber(row.returns_cents),
    returnRate: toNumber(row.return_rate),
    documents: toNumber(row.documents),
    clients: toNumber(row.clients),
    avgTicketCents: toNumber(row.avg_ticket_cents),
    weightedMargin: toNumber(row.weighted_margin),
    lastDate: toNullableText(row.last_date),
    previousNetSalesCents: toNumber(row.previous_net_sales_cents),
    previousLastDate: toNullableText(row.previous_last_date),
  }
}

export function mapMonthlyRow(row: MonthlyRpcRow): PanelMonthlyPoint {
  return {
    month: toText(row.month).slice(0, 7),
    netSalesCents: toNumber(row.net_sales_cents),
    grossSalesCents: toNumber(row.gross_sales_cents),
    returnsCents: toNumber(row.returns_cents),
    documents: toNumber(row.documents),
  }
}

export function mapChartPointRow(row: ChartRpcRow): PanelChartPoint {
  return {
    bucket: toText(row.bucket).slice(0, 10),
    netSalesCents: toNumber(row.net_sales_cents),
    grossSalesCents: toNumber(row.gross_sales_cents),
    returnsCents: toNumber(row.returns_cents),
    documents: toNumber(row.documents),
    clients: toNumber(row.clients),
    products: toNumber(row.products),
    families: toNumber(row.families),
    sellers: toNumber(row.sellers),
    warehouses: toNumber(row.warehouses),
    quantity: toNumber(row.quantity),
  }
}

export function mapCoverageRow(row: CoverageRpcRow): DataCoverage {
  return {
    firstDate: toNullableText(row.first_date),
    lastDate: toNullableText(row.last_date),
    monthsWithData: toNumber(row.months_with_data),
    missingMonths: Array.isArray(row.missing_months)
      ? row.missing_months.map((month) => toText(month).slice(0, 7))
      : [],
    lastUploadAt: toNullableText(row.last_upload_at),
    datasetsReady: toNumber(row.datasets_ready),
  }
}

export function mapRankingRow(row: RankingRowLike): RankedEntry {
  const entry: RankedEntry = {
    key: toText(row.key),
    label: toText(row.label),
    netSalesCents: toNumber(row.net_sales_cents),
    share: toNumber(row.share),
    documents: toNumber(row.documents),
    returnsCents: toNumber(row.returns_cents),
    margin: toNumber(row.margin),
    cumulativeShare: toNumber(row.cumulative_share),
  }

  if ("quantity" in row) {
    entry.quantity = toNumber(row.quantity)
  }
  if ("unit" in row) {
    entry.unit = toNullableText(row.unit) ?? ""
  }

  return entry
}

export function periodFromRow(row: {
  period_start: string
  period_end: string
}): DateRange {
  return { start: row.period_start, end: row.period_end }
}
