"use client"

import { LinesTable } from "@/components/commissions/lines-table"
import { useDashboardData } from "@/hooks/useDashboardData"

/** Tabla del flujo de análisis; la misma vista se reutiliza en Comisiones. */
export function SalesTable() {
  const { overview, filters, isLoading, applyFilters } = useDashboardData()

  if (!overview) {
    return null
  }

  return (
    <LinesTable
      rows={overview.table}
      targetSeller={overview.commission.sellerKey}
      selectedLines={filters.selectedLines}
      reassignedLines={filters.reassignedLines}
      isLoading={isLoading}
      title="5. Ventas · selección manual"
      onSelectedLinesChange={(selectedLines) => {
        void applyFilters({ selectedLines })
      }}
      onReassignedLinesChange={(reassignedLines) => {
        void applyFilters({ reassignedLines })
      }}
    />
  )
}
