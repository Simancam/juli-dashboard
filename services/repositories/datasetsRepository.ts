import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type { Dataset } from "@/types/datasets"
import type { SaleLineDraft } from "@/types/sales"

import { mapDatasetRow, toSaleLineInsert } from "./mappers"

const LINE_CHUNK_SIZE = 500

type Client = SupabaseClient<Database>

export interface CreateDatasetInput {
  name: string
  periodStart: string
  periodEnd: string
  fileHash: string
  fileName: string
  rowCount: number
  lines: SaleLineDraft[]
}

export interface OverlappingDataset {
  id: string
  name: string
  periodStart: string
  periodEnd: string
}

export interface DatasetsRepository {
  list(): Promise<Dataset[]>
  findByHash(fileHash: string): Promise<Dataset[]>
  findReadyOverlapping(start: string, end: string): Promise<OverlappingDataset[]>
  createProcessing(input: CreateDatasetInput): Promise<Dataset>
  activate(newId: string, replaceIds: string[]): Promise<void>
}

export function createDatasetsRepository(
  client: Client = getSupabaseAdmin()
): DatasetsRepository {
  return {
    async list() {
      const { data, error } = await client
        .from("datasets")
        .select("*")
        .order("uploaded_at", { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapDatasetRow)
    },

    async findByHash(fileHash) {
      const { data, error } = await client
        .from("datasets")
        .select("*")
        .eq("file_hash", fileHash)
        // Los datasets archivados pertenecen a informes reemplazados; volver a
        // cargar el mismo archivo no debe chocar con ellos.
        .neq("status", "archived")

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapDatasetRow)
    },

    async findReadyOverlapping(start, end) {
      const { data, error } = await client
        .from("datasets")
        .select("id, name, period_start, period_end")
        .eq("status", "ready")
        .lte("period_start", end)
        .gte("period_end", start)

      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        periodStart: row.period_start,
        periodEnd: row.period_end,
      }))
    },

    async createProcessing(input) {
      const { data, error } = await client
        .from("datasets")
        .insert({
          name: input.name,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          file_hash: input.fileHash,
          file_name: input.fileName,
          row_count: input.rowCount,
          status: "processing",
          uploaded_by: "admin",
        })
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? "No se pudo crear el dataset")
      }

      try {
        for (let offset = 0; offset < input.lines.length; offset += LINE_CHUNK_SIZE) {
          const chunk = input.lines
            .slice(offset, offset + LINE_CHUNK_SIZE)
            .map((line, index) =>
              toSaleLineInsert(line, data.id, offset + index + 1)
            )

          if (chunk.length === 0) continue

          const { error: linesError } = await client.from("sale_lines").insert(chunk)

          if (linesError) throw new Error(linesError.message)
        }
      } catch (cause) {
        // El dataset quedó en processing; se elimina para no dejar basura.
        await client.from("datasets").delete().eq("id", data.id)

        throw cause
      }

      return mapDatasetRow(data)
    },

    async activate(newId, replaceIds) {
      const { error } = await client.rpc("activate_dataset", {
        p_new_id: newId,
        p_replace_ids: replaceIds,
      })

      if (error) throw new Error(error.message)
    },
  }
}
