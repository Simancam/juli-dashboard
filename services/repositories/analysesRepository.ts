import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import type {
  AnalysisDetail,
  AnalysisSnapshot,
  AnalysisStatus,
  SavedAnalysis,
  UpdateAnalysisInput,
} from "@/types/analyses"
import type { OverviewResponse } from "@/types/overview"
import type { QualityReport } from "@/types/datasets"
import type { SaleLineDraft } from "@/types/sales"
import type { Database } from "@/types/database.types"

import { asJson, mapAnalysisDetail, mapAnalysisRow, mapSaleLineRow } from "./mappers"

type Client = SupabaseClient<Database>

export interface CreateAnalysisInput {
  datasetId: string
  periodStart: string
  periodEnd: string
  name?: string
  fileName: string
  fileHash: string
  report: QualityReport
  snapshot: AnalysisSnapshot
  result: OverviewResponse
}

export interface AnalysesRepository {
  list(status: AnalysisStatus | "all"): Promise<SavedAnalysis[]>
  getById(id: string): Promise<AnalysisDetail | null>
  getLines(datasetId: string): Promise<Array<SaleLineDraft & { lineNo: number }>>
  listActiveIdsByDatasets(datasetIds: string[]): Promise<string[]>
  createActive(input: CreateAnalysisInput): Promise<SavedAnalysis>
  setSupersededBy(analysisIds: string[], newId: string): Promise<void>
  updateMeta(id: string, input: UpdateAnalysisInput): Promise<SavedAnalysis>
  remove(id: string): Promise<void>
}

export function createAnalysesRepository(
  client: Client = getSupabaseAdmin()
): AnalysesRepository {
  return {
    async list(status) {
      let query = client.from("analyses").select("*")

      if (status !== "all") {
        query = query.eq("status", status)
      }

      const { data, error } = await query
        .order("period_month", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapAnalysisRow)
    },

    async getById(id) {
      const { data, error } = await client
        .from("analyses")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (error) throw new Error(error.message)

      return data ? mapAnalysisDetail(data) : null
    },

    async getLines(datasetId) {
      const { data, error } = await client
        .from("sale_lines")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("line_no", { ascending: true })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapSaleLineRow)
    },

    async listActiveIdsByDatasets(datasetIds) {
      if (datasetIds.length === 0) return []

      const { data, error } = await client
        .from("analyses")
        .select("id")
        .eq("status", "active")
        .in("dataset_id", datasetIds)

      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => row.id)
    },

    async createActive(input) {
      const { data, error } = await client
        .from("analyses")
        .insert({
          dataset_id: input.datasetId,
          period_month: `${input.periodStart.slice(0, 7)}-01`,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          file_name: input.fileName,
          file_hash: input.fileHash,
          name: input.name?.trim() || "Informe de ventas",
          quality_report: asJson(input.report),
          kpis: asJson(input.snapshot.kpis),
          snapshot: asJson(input.snapshot),
          result: asJson(input.result),
          status: "active",
          created_by: "admin",
        })
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? "No se pudo guardar el análisis")
      }

      return mapAnalysisRow(data)
    },

    async setSupersededBy(analysisIds, newId) {
      if (analysisIds.length === 0) return

      const { error } = await client
        .from("analyses")
        .update({ superseded_by: newId })
        .eq("status", "superseded")
        .is("superseded_by", null)
        .in("id", analysisIds)

      if (error) throw new Error(error.message)
    },

    async updateMeta(id, input) {
      const { data, error } = await client
        .from("analyses")
        .update({
          name: input.name,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          period_month: `${input.periodStart.slice(0, 7)}-01`,
        })
        .eq("id", id)
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? "No se pudo editar el informe")
      }

      return mapAnalysisRow(data)
    },

    async remove(id) {
      const { error } = await client.rpc("delete_analysis", { p_id: id })

      if (error) throw new Error(error.message)
    },
  }
}
