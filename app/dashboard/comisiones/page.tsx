"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { LinesTable } from "@/components/commissions/lines-table"
import { SellerSelector } from "@/components/commissions/seller-selector"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { analyticsService } from "@/services/analyticsService"
import { listAnalyses } from "@/services/analysesService"
import {
  createCommissionReport,
  listCommissionReports,
} from "@/services/commissionReportsService"
import type { SavedAnalysis } from "@/types/analyses"
import type { SavedCommissionReport } from "@/types/commission-reports"
import type { OverviewFilters } from "@/types/overview"
import { formatDate, formatInteger, formatMoney, formatPercent } from "@/utils/format"

const selectClass =
  "h-9 w-full rounded-none border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"

/** Sin dataset no hay líneas desde las que calcular; se ocultan de la lista. */
function usableAnalyses(analyses: SavedAnalysis[]): SavedAnalysis[] {
  return analyses.filter((analysis) => analysis.datasetId !== null)
}

function keepValidSelection(current: string, analyses: SavedAnalysis[]): string {
  return analyses.some((analysis) => analysis.id === current)
    ? current
    : (analyses[0]?.id ?? "")
}

export default function ComisionesPage() {
  const router = useRouter()
  const profile = getCommissionProfile()

  const [analyses, setAnalyses] = React.useState<SavedAnalysis[]>([])
  const [reports, setReports] = React.useState<SavedCommissionReport[]>([])
  const [selected, setSelected] = React.useState("")
  const [ownRate, setOwnRate] = React.useState("2")
  const [teamRate, setTeamRate] = React.useState("1")
  const [advance, setAdvance] = React.useState("0")
  const [sellers, setSellers] = React.useState<string[] | undefined>(undefined)
  const [selectedLines, setSelectedLines] = React.useState<number[] | undefined>(
    undefined
  )
  const [reassignedLines, setReassignedLines] = React.useState<number[]>([])
  const [preview, setPreview] = React.useState<Awaited<
    ReturnType<typeof analyticsService.getOverviewByAnalysis>
  > | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const requestId = React.useRef(0)

  const own = Number(ownRate) / 100
  const team = Number(teamRate) / 100
  const advanceCents = Math.round(Number(advance) * 100)
  const ratesValid =
    Number.isFinite(own) &&
    Number.isFinite(team) &&
    own >= 0 &&
    own <= 1 &&
    team >= 0 &&
    team <= 1 &&
    Number.isFinite(advanceCents) &&
    advanceCents >= 0

  const refresh = React.useCallback(async () => {
    const [analysisList, reportList] = await Promise.all([
      listAnalyses("active"),
      listCommissionReports(),
    ])
    const usable = usableAnalyses(analysisList)

    setAnalyses(usable)
    setReports(reportList)
    setSelected((current) => keepValidSelection(current, usable))
  }, [])

  React.useEffect(() => {
    let active = true

    Promise.all([listAnalyses("active"), listCommissionReports()])
      .then(([analysisList, reportList]) => {
        if (!active) return

        const usable = usableAnalyses(analysisList)
        setAnalyses(usable)
        setReports(reportList)
        setSelected((current) => keepValidSelection(current, usable))
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo cargar Comisiones"
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // La vista previa se recalcula en servidor sin bloquear los controles.
  React.useEffect(() => {
    if (!selected || !ratesValid) return

    let active = true
    const current = ++requestId.current
    const filters: OverviewFilters = {
      metric: "value",
      order: "desc",
      limit: 10,
      includeNonProducts: false,
      advanceCents,
      ownRate: own,
      teamRate: team,
      sellers,
      selectedLines,
      reassignedLines,
    }

    analyticsService
      .getOverviewByAnalysis(selected, filters)
      .then((result) => {
        if (active && current === requestId.current) setPreview(result)
      })
      .catch((cause: unknown) => {
        if (active && current === requestId.current) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo calcular la comisión"
          )
        }
      })

    return () => {
      active = false
    }
  }, [selected, ratesValid, advanceCents, own, team, sellers, selectedLines, reassignedLines])

  const updateAnalysis = (id: string) => {
    setSelected(id)
    setPreview(null)
    setSelectedLines(undefined)
    setReassignedLines([])
    setSellers(undefined)
    setError(null)
  }

  const handleSave = async () => {
    if (!selected) {
      setError("Selecciona un análisis activo")
      return
    }
    if (!ratesValid) {
      setError("Las tasas y el anticipo deben ser números válidos")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const report = await createCommissionReport({
        analysisId: selected,
        sellerKey: profile.sellerKey,
        ownRate: own,
        teamRate: team,
        advanceCents,
        ...(sellers !== undefined ? { sellers } : {}),
        ...(selectedLines !== undefined ? { selectedLines } : {}),
        reassignedLines,
      })
      await refresh()
      toast.success("Reporte de comisiones guardado", {
        description: `Versión ${report.version}`,
      })
      router.push(`/dashboard/comisiones/${report.id}`)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo guardar el reporte"
      setError(message)
      toast.error("No se pudo guardar el reporte", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" /> Cargando comisiones…
      </div>
    )
  }

  const showPreview = preview !== null && selected !== "" && ratesValid
  const shownPreview = showPreview ? preview : null
  const commission = shownPreview?.commission

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Comisiones
          </h1>
          <p className="text-sm text-muted-foreground">
            Elige el informe, los vendedores y las líneas. Las cifras se calculan
            siempre en el servidor desde las líneas guardadas.
          </p>
        </div>
        {reports.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {formatInteger(reports.length)} versión(es) guardada(s)
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Nueva versión</CardTitle>
          <CardDescription>
            Cada envío crea una versión inmutable. Podrás verla con todas sus
            entradas después de guardar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs lg:col-span-2">
            <span className="font-medium">Informe</span>
            <select
              className={selectClass}
              value={selected}
              onChange={(event) => updateAnalysis(event.target.value)}
            >
              {analyses.length === 0 ? (
                <option value="" disabled>
                  No hay análisis con líneas disponibles
                </option>
              ) : null}
              {analyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {formatDate(analysis.periodStart)} · {analysis.fileName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">Own rate (%)</span>
            <Input value={ownRate} onChange={(event) => setOwnRate(event.target.value)} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">Team rate (%)</span>
            <Input value={teamRate} onChange={(event) => setTeamRate(event.target.value)} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">Anticipo (COP)</span>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={advance}
              onChange={(event) => setAdvance(event.target.value)}
            />
          </label>
          <div className="flex items-end lg:col-span-5">
            <Button onClick={handleSave} disabled={isSaving || !selected || !ratesValid}>
              {isSaving ? <LoaderCircleIcon className="animate-spin" /> : null}
              Guardar versión
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SellerSelector
          sellers={shownPreview?.sellers ?? []}
          selected={sellers}
          onChange={setSellers}
        />

        <Card>
          <CardHeader>
            <CardTitle>Resultado en vivo</CardTitle>
            <CardDescription>
              {profile.sellerKey} · {formatPercent(own)} propio +{" "}
              {formatPercent(team)} de equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Venta propia</p>
              <p className="tabular-nums">{formatMoney(commission?.result.ownCents ?? 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Venta equipo</p>
              <p className="tabular-nums">{formatMoney(commission?.result.teamCents ?? 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Comisión propia</p>
              <p className="tabular-nums">
                {formatMoney(commission?.result.ownCommissionCents ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Comisión equipo</p>
              <p className="tabular-nums">
                {formatMoney(commission?.result.teamCommissionCents ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total comisión</p>
              <p className="font-medium tabular-nums">
                {formatMoney(commission?.result.totalCommissionCents ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {(commission?.result.netToPayCents ?? 0) < 0
                  ? "Saldo a favor"
                  : "Neto a pagar"}
              </p>
              <p className="font-medium tabular-nums">
                {formatMoney(Math.abs(commission?.result.netToPayCents ?? 0))}
              </p>
            </div>
            {commission?.reassignments.length ? (
              <p className="text-emerald-600 sm:col-span-2 dark:text-emerald-400">
                {formatInteger(commission.reassignments.length)} línea(s)
                reasignadas a {profile.sellerKey}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {shownPreview ? (
        <LinesTable
          rows={shownPreview.table}
          targetSeller={profile.sellerKey}
          selectedLines={selectedLines}
          reassignedLines={reassignedLines}
          onSelectedLinesChange={setSelectedLines}
          onReassignedLinesChange={setReassignedLines}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Versiones guardadas</CardTitle>
          <CardDescription>
            Abre una versión para ver el detalle completo: vendedores, líneas
            elegidas, reasignaciones y resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay reportes.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 border p-3 text-sm"
              >
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    v{report.version} · {report.sellerKey} ·{" "}
                    {formatPercent(report.ownRate)} propio /{" "}
                    {formatPercent(report.teamRate)} equipo ·{" "}
                    {report.createdAt.slice(0, 10)}
                  </p>
                  <p className="font-medium tabular-nums">
                    Comisión {formatMoney(report.result.totalCommissionCents)} · a pagar{" "}
                    {formatMoney(report.result.netToPayCents)}
                  </p>
                </div>
                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/dashboard/comisiones/${report.id}`}
                >
                  Ver detalle
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
