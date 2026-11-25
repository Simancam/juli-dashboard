"use client"

import { Input } from "@/components/ui/input"
import { useDashboardData } from "@/hooks/useDashboardData"
import { cn } from "@/lib/utils"

/** Título del informe, editable en memoria y usado al guardar el análisis. */
export function EditableAnalysisName({ className }: { className?: string }) {
  const { name, setName } = useDashboardData()

  return (
    <Input
      aria-label="Nombre del informe"
      title="Editar nombre del informe"
      placeholder="Nombre del informe"
      value={name}
      maxLength={120}
      onChange={(event) => setName(event.target.value)}
      className={cn(
        "font-heading h-auto max-w-xl border-0 bg-transparent px-0 py-0 font-semibold tracking-tight shadow-none focus-visible:border-0 focus-visible:ring-0",
        className
      )}
    />
  )
}
