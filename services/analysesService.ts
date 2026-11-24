import type {
  AnalysisDetailResponse,
  AnalysisListResponse,
  AnalysisStatus,
  SavedAnalysis,
  UpdateAnalysisInput,
} from "@/types/analyses"

export async function listAnalyses(
  status: AnalysisStatus | "all" = "all"
): Promise<SavedAnalysis[]> {
  const response = await fetch(`/api/analyses?status=${status}`)
  const data = (await response.json().catch(() => null)) as
    | (AnalysisListResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo listar los análisis")
  }

  return data.analyses
}

export async function getAnalysis(id: string) {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`)
  const data = (await response.json().catch(() => null)) as
    | (AnalysisDetailResponse & { message?: string })
    | null

  if (!response.ok || !data) {
    throw new Error(data?.message ?? "No se pudo cargar el análisis")
  }

  return data.analysis
}

export async function updateAnalysis(id: string, input: UpdateAnalysisInput) {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = (await response.json().catch(() => null)) as
    | { analysis?: SavedAnalysis; message?: string }
    | null

  if (!response.ok || !data?.analysis) {
    throw new Error(data?.message ?? "No se pudo editar el informe")
  }

  return data.analysis
}

export async function deleteAnalysis(id: string): Promise<void> {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { message?: string }
      | null
    throw new Error(data?.message ?? "No se pudo eliminar el informe")
  }
}
