"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

import { SavedAnalysisView } from "@/components/analyses/saved-analysis-view"
import { ClientsRankingCard } from "@/components/dashboard/clients-ranking"
import { FamiliesChartCard } from "@/components/dashboard/families-chart"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAnalysis } from "@/services/analysesService"
import type { AnalysisDetail } from "@/types/analyses"
import type { RankedEntry } from "@/types/analytics"
import { formatDate, formatInteger, formatMargin, formatMoney } from "@/utils/format"

function SnapshotTable({ title, entries }: { title: string; entries: RankedEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entries.map((entry) => (
              <li key={entry.key} className="flex justify-between gap-2 border-b last:border-0">
                <span>{entry.label}</span>
                <span className="tabular-nums">{formatMoney(entry.netSalesCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function LegacySnapshot({ analysis }: { analysis: AnalysisDetail }) {
  const { kpis } = analysis.snapshot

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {analysis.name}
          </h1>
          <span className="font-heading text-2xl font-semibold tracking-tight text-muted-foreground tabular-nums">
            {formatDate(analysis.periodStart)} – {formatDate(analysis.periodEnd)}
          </span>
        </div>
        <span
          className="block text-[10px] text-muted-foreground/70"
          title={analysis.fileName}
        >
          {analysis.fileName}
        </span>
        <p className="text-sm text-muted-foreground">
          {analysis.status} · guardado el {analysis.createdAt.slice(0, 10)}.{" "}
          <Link className="underline" href="/dashboard/analizar">
            Volver a Análisis
          </Link>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Este informe se guardó antes de existir el resultado completo; solo se
        conserva el resumen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1"><CardDescription>Venta neta</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatMoney(kpis.netSalesCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Comprobantes</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatInteger(kpis.documents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Clientes</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatInteger(kpis.clients)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Margen</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatMargin(kpis.weightedMargin)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.snapshot.clients.length > 0 ? (
          <ClientsRankingCard
            clients={analysis.snapshot.clients}
            kpis={kpis}
          />
        ) : null}
        {analysis.snapshot.families.length > 0 ? (
          <FamiliesChartCard families={analysis.snapshot.families} />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SnapshotTable title="Productos" entries={analysis.snapshot.products} />
        <SnapshotTable title="Productos devueltos" entries={analysis.snapshot.returnedProducts} />
      </div>
    </div>
  )
}

function AnalysisDetailContent() {
  const params = useParams<{ id: string }>()
  const [analysis, setAnalysis] = React.useState<AnalysisDetail | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    getAnalysis(params.id)
      .then((result) => {
        if (active) setAnalysis(result)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el análisis")
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" /> Cargando informe…
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-destructive">{error ?? "No encontrado"}</p>
        <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/analizar">
          Volver a Informes
        </Link>
      </div>
    )
  }

  if (!analysis.result) {
    return <LegacySnapshot analysis={analysis} />
  }

  // El nombre y el periodo son editables; las cifras son las que se guardaron.
  const result = {
    ...analysis.result,
    period: { start: analysis.periodStart, end: analysis.periodEnd },
  }

  return <SavedAnalysisView analysis={analysis} overview={result} />
}

export default function AnalysisDetailPage() {
  return (
    <React.Suspense fallback={null}>
      <AnalysisDetailContent />
    </React.Suspense>
  )
}
