"use client"

import { AnalysesHistory } from "@/components/analyses/analyses-history"
import { useAuth } from "@/hooks/useAuth"
import { useDashboardData } from "@/hooks/useDashboardData"

export default function AnalizarPage() {
  const { user } = useAuth()
  const { error } = useDashboardData()

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Analizar
        </h1>
        <p className="text-sm text-muted-foreground">
          Hola, {user?.name}. Carga el informe con el botón Analizar del Panel,
          revisa el resultado y guárdalo solo si quieres conservarlo.
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

      <AnalysesHistory />
    </div>
  )
}
