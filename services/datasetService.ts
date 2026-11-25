import { buildOverviewQuery } from "@/services/analyticsService"
import type { Dataset, DatasetListResponse, DatasetUploadResponse } from "@/types/datasets"
import type { OverviewFilters } from "@/types/overview"

export interface UploadDatasetOptions {
  periodStart?: string
  periodEnd?: string
  /** Filtros del análisis mostrado; el servidor recalcula el resultado guardado. */
  filters?: OverviewFilters
  /** Nombre con el que se guarda el informe. */
  name?: string
}

export async function uploadDataset(
  file: File,
  options: UploadDatasetOptions = {}
): Promise<DatasetUploadResponse> {
  const query = new URLSearchParams()

  if (options.periodStart && options.periodEnd) {
    query.set("periodStart", options.periodStart)
    query.set("periodEnd", options.periodEnd)
  }

  if (options.filters) {
    for (const [key, value] of new URLSearchParams(
      buildOverviewQuery(options.filters)
    )) {
      query.append(key, value)
    }
  }

  if (options.name?.trim()) {
    query.set("name", options.name.trim())
  }

  const body = new FormData()
  body.append("file", file)

  const response = await fetch(`/api/datasets?${query.toString()}`, {
    method: "POST",
    body,
  })
  const data = (await response.json().catch(() => null)) as
    | (DatasetUploadResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo guardar el dataset")
  }

  return data
}

export async function listDatasets(): Promise<Dataset[]> {
  const response = await fetch("/api/datasets")
  const data = (await response.json().catch(() => null)) as
    | (DatasetListResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo listar los datasets")
  }

  return data.datasets
}
