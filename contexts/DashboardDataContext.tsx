"use client"

import * as React from "react"

import { analyticsService } from "@/services/analyticsService"
import { uploadDataset } from "@/services/datasetService"
import type { OverviewFilters, OverviewResponse } from "@/types/overview"

const DEFAULT_FILTERS: OverviewFilters = {
  metric: "value",
  order: "desc",
  limit: 10,
  advanceCents: 0,
  includeNonProducts: false,
}

interface DashboardDataContextValue {
  file: File | null
  analysisId: string | null
  overview: OverviewResponse | null
  filters: OverviewFilters
  isLoading: boolean
  isSaving: boolean
  error: string | null
  /** Analiza el archivo sin persistirlo. */
  analyze: (file: File) => Promise<boolean>
  /** Persiste el análisis en memoria y devuelve su id. */
  save: () => Promise<string | null>
  applyFilters: (next: Partial<OverviewFilters>) => Promise<void>
  clear: () => void
}

export const DashboardDataContext =
  React.createContext<DashboardDataContextValue | null>(null)

export function DashboardDataProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [file, setFile] = React.useState<File | null>(null)
  const [analysisId, setAnalysisId] = React.useState<string | null>(null)
  const [overview, setOverview] = React.useState<OverviewResponse | null>(null)
  const [filters, setFilters] = React.useState<OverviewFilters>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)

  const load = React.useCallback(
    async (
      id: string | null,
      currentFile: File | null,
      currentFilters: OverviewFilters
    ): Promise<OverviewResponse | null> => {
      const currentRequest = ++requestId.current
      setIsLoading(true)
      setError(null)

      try {
        const result = id
          ? await analyticsService.getOverviewByAnalysis(id, currentFilters)
          : currentFile
            ? await analyticsService.getOverview(currentFile, currentFilters)
            : null

        if (currentRequest === requestId.current) {
          setOverview(result)
        }

        return result
      } catch (cause) {
        if (currentRequest === requestId.current) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo analizar el archivo"
          )
        }

        return null
      } finally {
        if (currentRequest === requestId.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  const analyze = React.useCallback(
    async (nextFile: File) => {
      requestId.current += 1
      setFile(nextFile)
      setAnalysisId(null)
      setOverview(null)
      setFilters(DEFAULT_FILTERS)

      const result = await load(null, nextFile, DEFAULT_FILTERS)
      return result !== null
    },
    [load]
  )

  const save = React.useCallback(async () => {
    if (!file || !overview) {
      setError("No hay un análisis en memoria para guardar")
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      const saved = await uploadDataset(file, {
        periodStart: overview.period.start,
        periodEnd: overview.period.end,
        filters,
      })
      const id = saved.analysisId ?? null

      if (!id) {
        throw new Error("El servidor no devolvió el análisis guardado")
      }

      setAnalysisId(id)
      return id
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el análisis"
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }, [file, overview, filters])

  const applyFilters = React.useCallback(
    async (next: Partial<OverviewFilters>) => {
      const merged = { ...filters, ...next }
      setFilters(merged)
      await load(analysisId, file, merged)
    },
    [analysisId, file, filters, load]
  )

  const clear = React.useCallback(() => {
    requestId.current += 1
    setFile(null)
    setAnalysisId(null)
    setOverview(null)
    setFilters(DEFAULT_FILTERS)
    setError(null)
    setIsLoading(false)
    setIsSaving(false)
  }, [])

  const value = React.useMemo(
    () => ({
      file,
      analysisId,
      overview,
      filters,
      isLoading,
      isSaving,
      error,
      analyze,
      save,
      applyFilters,
      clear,
    }),
    [
      file,
      analysisId,
      overview,
      filters,
      isLoading,
      isSaving,
      error,
      analyze,
      save,
      applyFilters,
      clear,
    ]
  )

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}
