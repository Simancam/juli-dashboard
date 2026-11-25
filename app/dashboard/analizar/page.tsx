"use client"

import { AnalysesHistory } from "@/components/analyses/analyses-history"
import { useDashboardData } from "@/hooks/useDashboardData"

export default function AnalizarPage() {
  const { error } = useDashboardData()

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Reportes
      </h1>

      {error ? (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}

      <AnalysesHistory />
    </div>
  )
}
