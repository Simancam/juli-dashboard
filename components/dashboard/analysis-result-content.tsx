"use client"

import { SaveAnalysisButton } from "@/components/analyses/save-analysis-button"
import { AnalysisFilters } from "@/components/dashboard/analysis-filters"
import { ClientsRanking } from "@/components/dashboard/clients-ranking"
import { FamiliesChart } from "@/components/dashboard/families-chart"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ProductsRanking } from "@/components/dashboard/products-ranking"

interface AnalysisResultContentProps {
  /** Al guardar desde un diálogo, reemplaza la navegación por su cierre. */
  onSaved?: () => void
}

/** Contenido del análisis en vivo, compartido por la vista y el diálogo. */
export function AnalysisResultContent({ onSaved }: AnalysisResultContentProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AnalysisFilters />
        <SaveAnalysisButton onSaved={onSaved} />
      </div>
      <KpiCards />
      <div className="grid gap-4 lg:grid-cols-2">
        <ClientsRanking />
        <FamiliesChart />
      </div>
      <ProductsRanking />
    </div>
  )
}
