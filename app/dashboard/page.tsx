"use client"

import { AnalysisFilters } from "@/components/dashboard/analysis-filters"
import { CommissionPanel } from "@/components/dashboard/commission-panel"
import { DataUploader } from "@/components/dashboard/data-uploader"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ProductsRanking } from "@/components/dashboard/products-ranking"
import { SalesTable } from "@/components/dashboard/sales-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useDashboardData } from "@/hooks/useDashboardData"
import { formatDate } from "@/utils/format"

export default function DashboardPage() {
  const { user } = useAuth()
  const { overview, error } = useDashboardData()

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Ventas y comisiones
        </h1>
        <p className="text-sm text-muted-foreground">
          Hola, {user?.name}. Carga el informe para ver los indicadores del
          periodo.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}

      <DataUploader />

      {overview ? (
        <>
          <AnalysisFilters
            key={`${overview.period.start}-${overview.period.end}`}
          />
          <KpiCards />
          <p className="text-xs text-muted-foreground">
            Periodo analizado: {formatDate(overview.period.start)} a{" "}
            {formatDate(overview.period.end)}
          </p>
          <div className="max-w-lg">
            <CommissionPanel />
          </div>
          <SalesTable />
          <ProductsRanking />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sin datos cargados</CardTitle>
            <CardDescription>
              Selecciona un XLSX con el formato del informe de ventas. Verás
              KPIs, ranking de productos y la comisión calculada en centavos.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            El archivo no se guarda: cada análisis se calcula al subirlo.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
