"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon, LoaderCircleIcon } from "lucide-react"

import { toast } from "sonner"

import { AnalysisEditForm } from "@/components/analyses/analysis-edit-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import { deleteAnalysis, listAnalyses } from "@/services/analysesService"
import type { SavedAnalysis } from "@/types/analyses"
import { formatDate, formatInteger } from "@/utils/format"

const MONTH_NAMES: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
}

interface AnalysisMonthGroup {
  month: string
  analyses: SavedAnalysis[]
}

interface AnalysisYearGroup {
  year: string
  months: AnalysisMonthGroup[]
}

function groupByYearAndMonth(analyses: SavedAnalysis[]): AnalysisYearGroup[] {
  const years = new Map<string, Map<string, SavedAnalysis[]>>()

  for (const analysis of analyses) {
    // Un informe que cruza meses se archiva en el mes en que termina:
    // 21/10 – 18/11 pertenece a Noviembre, aunque arranque en Octubre.
    const monthKey = (
      analysis.periodEnd ||
      analysis.periodMonth ||
      analysis.periodStart
    ).slice(0, 7)
    const year = monthKey.slice(0, 4)
    const month = monthKey.slice(5, 7)

    if (!years.has(year)) years.set(year, new Map())
    const months = years.get(year)!
    if (!months.has(month)) months.set(month, [])
    months.get(month)!.push(analysis)
  }

  return [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => ({
          month,
          analyses: [...items].sort((a, b) =>
            b.periodStart.localeCompare(a.periodStart)
          ),
        })),
    }))
}

export function AnalysesHistory() {
  const { analysisId } = useDashboardData()
  const [analyses, setAnalyses] = React.useState<SavedAnalysis[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<SavedAnalysis | null>(
    null
  )
  const [refreshKey, setRefreshKey] = React.useState(0)

  React.useEffect(() => {
    let active = true

    listAnalyses()
      .then((items) => {
        if (active) setAnalyses(items)
      })
      .catch((cause: unknown) => {
        if (active) {
          const message =
            cause instanceof Error ? cause.message : "No se pudo cargar el historial"
          setError(message)
          toast.error("No se pudo cargar el historial", { description: message })
        }
      })

    return () => {
      active = false
    }
  }, [analysisId, refreshKey])

  const reload = () => setRefreshKey((key) => key + 1)
  const grouped = React.useMemo(() => groupByYearAndMonth(analyses), [analyses])

  const handleDelete = async (analysis: SavedAnalysis) => {
    setBusyId(analysis.id)
    setError(null)

    try {
      await deleteAnalysis(analysis.id)
      if (editingId === analysis.id) setEditingId(null)
      toast.success("Informe eliminado", { description: analysis.name })
      reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo eliminar el informe"
      setError(message)
      toast.error("No se pudo eliminar el informe", { description: message })
    } finally {
      setBusyId(null)
      setPendingDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informes guardados</CardTitle>
        <CardDescription>
          Agrupados por año y mes. Despliega cada grupo para ver, editar o
          eliminar sus informes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay informes guardados. Analiza un archivo y pulsa
            Guardar para verlo aquí.
          </p>
        ) : (
          <div className="space-y-2">
            {grouped.map(({ year, months }) => (
              <Collapsible key={year} defaultOpen className="group/year border">
                <CollapsibleTrigger
                  render={
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
                    />
                  }
                >
                  <ChevronRightIcon className="size-4 shrink-0 transition-transform group-data-open/year:rotate-90" />
                  <span className="tabular-nums">{year}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatInteger(
                      months.reduce(
                        (total, group) => total + group.analyses.length,
                        0
                      )
                    )}{" "}
                    informes
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 border-t px-3 py-2">
                  {months.map(({ month, analyses: monthAnalyses }) => (
                    <Collapsible key={month} defaultOpen className="group/month">
                      <CollapsibleTrigger
                        render={
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-1 py-1.5 text-left text-xs font-medium hover:bg-muted/50"
                          />
                        }
                      >
                        <ChevronRightIcon className="size-3.5 shrink-0 transition-transform group-data-open/month:rotate-90" />
                        <span>{MONTH_NAMES[month] ?? month}</span>
                        <span className="font-normal text-muted-foreground">
                          {formatInteger(monthAnalyses.length)}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {monthAnalyses.map((analysis) => (
                            <Card
                              key={analysis.id}
                              className={
                                analysis.id === analysisId
                                  ? "border-primary"
                                  : undefined
                              }
                            >
                              <CardContent className="space-y-3 text-xs">
                                {editingId === analysis.id ? (
                                  <AnalysisEditForm
                                    analysis={analysis}
                                    onCancel={() => setEditingId(null)}
                                    onSaved={() => {
                                      setEditingId(null)
                                      reload()
                                    }}
                                  />
                                ) : (
                                  <>
                                    <div className="space-y-0.5">
                                      <p className="text-muted-foreground">
                                        Fecha que cubre
                                      </p>
                                      <p className="font-medium tabular-nums">
                                        {formatDate(analysis.periodStart)} –{" "}
                                        {formatDate(analysis.periodEnd)}
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-muted-foreground">
                                        Guardado el
                                      </p>
                                      <p className="font-medium tabular-nums">
                                        {formatDate(analysis.createdAt.slice(0, 10))}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                                      <Link
                                        className={buttonVariants({ size: "sm" })}
                                        href={`/dashboard/analizar/${analysis.id}`}
                                      >
                                        Ver
                                      </Link>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingId(analysis.id)}
                                        disabled={busyId !== null}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setPendingDelete(analysis)}
                                        disabled={busyId !== null}
                                      >
                                        {busyId === analysis.id ? (
                                          <LoaderCircleIcon className="animate-spin" />
                                        ) : null}
                                        Eliminar
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este informe?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{pendingDelete?.name}</strong> junto con sus
              datos guardados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => {
                if (pendingDelete) void handleDelete(pendingDelete)
              }}
            >
              {busyId !== null ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {busyId !== null ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
