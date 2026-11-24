import type { CommissionReportCreate } from "@/lib/schemas/commission-reports"
import type {
  CommissionReportListResponse,
  CommissionReportResponse,
  SavedCommissionReport,
} from "@/types/commission-reports"

export async function listCommissionReports(
  analysisId?: string
): Promise<SavedCommissionReport[]> {
  const query = analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : ""
  const response = await fetch(`/api/commission-reports${query}`)
  const data = (await response.json().catch(() => null)) as
    | (CommissionReportListResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo listar los reportes")
  }

  return data.reports
}

export async function getCommissionReport(
  id: string
): Promise<SavedCommissionReport | null> {
  const reports = await listCommissionReports()
  return reports.find((report) => report.id === id) ?? null
}

export async function createCommissionReport(
  input: CommissionReportCreate
): Promise<SavedCommissionReport> {
  const response = await fetch("/api/commission-reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = (await response.json().catch(() => null)) as
    | (CommissionReportResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo guardar el reporte")
  }

  return data.report
}
