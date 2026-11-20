"use client"

import * as React from "react"

import { analyticsService } from "@/services/analyticsService"
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
  overview: OverviewResponse | null
  filters: OverviewFilters
  isLoading: boolean
  error: string | null
  upload: (file: File) => Promise<void>
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
  const [overview, setOverview] = React.useState<OverviewResponse | null>(null)
  const [filters, setFilters] = React.useState<OverviewFilters>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)

  const load = React.useCallback(
    async (currentFile: File, currentFilters: OverviewFilters) => {
      const currentRequest = ++requestId.current
      setIsLoading(true)
      setError(null)

      try {
        const result = await analyticsService.getOverview(
          currentFile,
          currentFilters
        )

        if (currentRequest === requestId.current) {
          setOverview(result)
        }
      } catch (cause) {
        if (currentRequest === requestId.current) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo analizar el archivo"
          )
        }
      } finally {
        if (currentRequest === requestId.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  const upload = React.useCallback(
    async (nextFile: File) => {
      requestId.current += 1
      setFile(nextFile)
      setFilters(DEFAULT_FILTERS)
      await load(nextFile, DEFAULT_FILTERS)
    },
    [load]
  )

  const applyFilters = React.useCallback(
    async (next: Partial<OverviewFilters>) => {
      if (!file) {
        return
      }

      const merged = { ...filters, ...next }
      setFilters(merged)
      await load(file, merged)
    },
    [file, filters, load]
  )

  const clear = React.useCallback(() => {
    requestId.current += 1
    setFile(null)
    setOverview(null)
    setFilters(DEFAULT_FILTERS)
    setError(null)
    setIsLoading(false)
  }, [])

  const value = React.useMemo(
    () => ({
      file,
      overview,
      filters,
      isLoading,
      error,
      upload,
      applyFilters,
      clear,
    }),
    [file, overview, filters, isLoading, error, upload, applyFilters, clear]
  )

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}
