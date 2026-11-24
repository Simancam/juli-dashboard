"use client"

import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateAnalysis } from "@/services/analysesService"
import type { SavedAnalysis } from "@/types/analyses"

interface AnalysisEditFormProps {
  analysis: SavedAnalysis
  onCancel: () => void
  onSaved: () => void
}

export function AnalysisEditForm({
  analysis,
  onCancel,
  onSaved,
}: AnalysisEditFormProps) {
  const [name, setName] = React.useState(analysis.name || analysis.fileName)
  const [periodStart, setPeriodStart] = React.useState(analysis.periodStart)
  const [periodEnd, setPeriodEnd] = React.useState(analysis.periodEnd)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      await updateAnalysis(analysis.id, { name, periodStart, periodEnd })
      toast.success("Informe actualizado", { description: name })
      onSaved()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo editar el informe"
      setError(message)
      toast.error("No se pudo editar el informe", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <label className="block space-y-1 text-xs">
        <span className="font-medium">Nombre del informe</span>
        <Input
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-xs">
          <span className="font-medium">Desde</span>
          <Input
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="font-medium">Hasta</span>
          <Input
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" type="submit" disabled={isSaving}>
          {isSaving ? <LoaderCircleIcon className="animate-spin" /> : null}
          Guardar cambios
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Cambiar el nombre o las fechas no recalcula las cifras guardadas.
      </p>
    </form>
  )
}
