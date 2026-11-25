"use client"

import * as React from "react"
import { LoaderCircleIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { CommissionResultCard } from "@/components/commissions/commission-result"
import { LinesTable } from "@/components/commissions/lines-table"
import { SellerSelector } from "@/components/commissions/seller-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCommissionProfile } from "@/lib/config/commission-profiles"
import { analyticsService } from "@/services/analyticsService"
import { updateCommissionReport } from "@/services/commissionReportsService"
import type { SavedCommissionReport } from "@/types/commission-reports"
import type { OverviewFilters } from "@/types/overview"
import { centsToNumber } from "@/utils/money"

interface CommissionEditFormProps {
  report: SavedCommissionReport
  analysisLabel: string
  onCancel: () => void
  onSaved: (report: SavedCommissionReport) => void
}

type Overview = Awaited<
  ReturnType<typeof analyticsService.getOverviewByAnalysis>
>

export function CommissionEditForm({
  report,
  analysisLabel,
  onCancel,
  onSaved,
}: CommissionEditFormProps) {
  const profile = getCommissionProfile(report.sellerKey)
  const [ownRate, setOwnRate] = React.useState(String(report.ownRate * 100))
  const [teamRate, setTeamRate] = React.useState(String(report.teamRate * 100))
  const [advance, setAdvance] = React.useState(
    String(centsToNumber(report.advanceCents))
  )
  const [sellers, setSellers] = React.useState<string[] | undefined>(
    report.inputs.sellers
  )
  const [selectedLines, setSelectedLines] = React.useState<
    number[] | undefined
  >(report.inputs.reassignedLines ?? [])
  const [reassignedLines, setReassignedLines] = React.useState<number[]>(
    report.inputs.reassignedLines ?? []
  )
  const [preview, setPreview] = React.useState<Overview | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)

  const own = Number(ownRate) / 100
  const team = Number(teamRate) / 100
  const advanceValue = Number(advance)
  const advanceValid = Number.isFinite(advanceValue) && advanceValue >= 0
  const advanceCents = advanceValid ? Math.round(advanceValue * 100) : 0
  const ratesValid =
    Number.isFinite(own) &&
    Number.isFinite(team) &&
    own >= 0 &&
    own <= 1 &&
    team >= 0 &&
    team <= 1 &&
    advanceValid
  const isLoadingPreview = ratesValid && preview === null

  const invalidatePreview = () => {
    setPreview(null)
    setError(null)
  }

  React.useEffect(() => {
    if (!ratesValid) return

    let active = true
    const current = ++requestId.current
    const filters: OverviewFilters = {
      metric: "value",
      order: "desc",
      limit: 10,
      includeCommission: true,
      ownRate: own,
      teamRate: team,
      advanceCents,
      sellers,
      reassignedLines,
    }

    analyticsService
      .getOverviewByAnalysis(report.analysisId, filters)
      .then((result) => {
        if (active && current === requestId.current) setPreview(result)
      })
      .catch((cause: unknown) => {
        if (active && current === requestId.current) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo recalcular"
          )
        }
      })

    return () => {
      active = false
    }
  }, [report.analysisId, ratesValid, own, team, advanceCents, sellers, reassignedLines])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!ratesValid) {
      setError("Las tasas y el anticipo deben ser números válidos")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const updated = await updateCommissionReport(report.id, {
        sellerKey: profile.sellerKey,
        ownRate: own,
        teamRate: team,
        advanceCents,
        ...(sellers === undefined ? { allSellers: true } : { sellers }),
        reassignedLines,
      })
      toast.success("Comisiones actualizadas", {
        description: `Comisiones ${updated.version}`,
      })
      onSaved(updated)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo editar el reporte"
      setError(message)
      toast.error("No se pudo editar el reporte", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  const commission = preview?.commission

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs sm:col-span-2">
              <span className="font-medium">Informe</span>
              <Input
                value={analysisLabel}
                readOnly
                className="text-muted-foreground"
              />
            </label>
            <label className="space-y-2 text-xs">
              <span className="font-medium">Own rate (%)</span>
              <Input
                value={ownRate}
                onChange={(event) => {
                  setOwnRate(event.target.value)
                  invalidatePreview()
                }}
              />
            </label>
            <label className="space-y-2 text-xs">
              <span className="font-medium">Team rate (%)</span>
              <Input
                value={teamRate}
                onChange={(event) => {
                  setTeamRate(event.target.value)
                  invalidatePreview()
                }}
              />
            </label>
            <label className="space-y-2 text-xs sm:col-span-2">
              <span className="font-medium">Anticipo ($)</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={advance}
                onChange={(event) => {
                  setAdvance(event.target.value)
                  invalidatePreview()
                }}
              />
            </label>
          </CardContent>
        </Card>
        <SellerSelector
          className="h-full"
          sellers={preview?.sellers ?? []}
          selected={sellers}
          disabled={isSaving}
          onChange={(keys) => {
            setSellers(keys)
            invalidatePreview()
          }}
        />
      </div>

      <LinesTable
        rows={preview?.table ?? []}
        targetSeller={profile.sellerKey}
        selectedLines={selectedLines}
        reassignedLines={reassignedLines}
        isLoading={isLoadingPreview || isSaving}
        onSelectedLinesChange={setSelectedLines}
        onReassignedLinesChange={(ids) => {
          setReassignedLines(ids)
          invalidatePreview()
        }}
        title="Reasignar"
        description="Las líneas marcadas solo preparan reasignaciones; la base sigue siendo los vendedores elegidos."
      />

      {commission ? (
        <CommissionResultCard
          result={commission.result}
          ownRate={own}
          teamRate={team}
          sellerKey={profile.sellerKey}
          reassignmentCount={commission.reassignments.length}
          reassignedCents={commission.reassignments.reduce(
            (total, item) => total + item.subtotalCents,
            0
          )}
          title="Resultado al guardar"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {ratesValid
              ? "Recalculando con las nuevas entradas…"
              : "Revisa las tasas y el anticipo para ver el resultado."}
          </CardContent>
        </Card>
      )}

      {error ? (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="gap-2" disabled={isSaving || !ratesValid}>
          {isSaving ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <span className="text-xs text-muted-foreground">
          Se conservan el número y el informe originales.
        </span>
      </div>
    </form>
  )
}
