import type { Kpis, RankedEntry } from "./analytics"
import type { QualityReport } from "./datasets"
import type { OverviewResponse } from "./overview"

export type AnalysisStatus = "active" | "superseded"

/** Metadatos de un análisis guardado. El detalle se consulta aparte. */
export interface SavedAnalysis {
  id: string
  /** Alias editable del informe; por defecto coincide con el archivo. */
  name: string
  datasetId: string | null
  periodMonth: string
  periodStart: string
  periodEnd: string
  fileName: string
  fileHash: string
  status: AnalysisStatus
  supersededBy: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Rankings por defecto calculados en el servidor al guardar el análisis. */
export interface AnalysisSnapshot {
  kpis: Kpis
  products: RankedEntry[]
  returnedProducts: RankedEntry[]
}

export interface AnalysisDetail extends SavedAnalysis {
  report: QualityReport
  snapshot: AnalysisSnapshot
  /** Resultado completo calculado al guardar; se muestra sin recalcular. */
  result: OverviewResponse | null
}

export interface AnalysisListResponse {
  analyses: SavedAnalysis[]
}

export interface AnalysisDetailResponse {
  analysis: AnalysisDetail
}

export interface UpdateAnalysisInput {
  name: string
  periodStart: string
  periodEnd: string
}
