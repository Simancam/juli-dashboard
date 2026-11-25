"use client"

import { DateField } from "@/components/ui/date-field"
import { useDashboardData } from "@/hooks/useDashboardData"

/** Filtro de análisis: dos fechas independientes, aplicadas al elegirlas. */
export function AnalysisFilters() {
  const { overview, filters, applyFilters } = useDashboardData()

  if (!overview) {
    return null
  }

  const from = filters.from ?? overview.period.start
  const to = filters.to ?? overview.period.end
  const minDate = overview.report.detectedRange?.start
  const maxDate = overview.report.detectedRange?.end

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateField
        id="analisis-fecha-inicio"
        label="Fecha inicio"
        value={from}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(nextFrom) => {
          void applyFilters({
            from: nextFrom,
            to: nextFrom > to ? nextFrom : to,
          })
        }}
      />
      <DateField
        id="analisis-fecha-fin"
        label="Fecha fin"
        value={to}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(nextTo) => {
          void applyFilters({
            from: nextTo < from ? nextTo : from,
            to: nextTo,
          })
        }}
      />
    </div>
  )
}
