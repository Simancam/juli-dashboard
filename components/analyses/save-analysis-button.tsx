"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { useDashboardData } from "@/hooks/useDashboardData"

export function SaveAnalysisButton() {
  const router = useRouter()
  const { file, overview, analysisId, isSaving, error, save } = useDashboardData()

  if (!file || !overview) {
    return null
  }

  if (analysisId) {
    return (
      <Link
        className={buttonVariants({ variant: "outline" })}
        href={`/dashboard/analizar/${analysisId}`}
      >
        Ver análisis guardado
      </Link>
    )
  }

  const handleSave = async () => {
    const id = await save()
    if (id) {
      toast.success("Informe guardado", {
        description: "Ya está disponible en Informes guardados",
      })
      router.push("/dashboard/analizar")
    } else {
      toast.error("No se pudo guardar el análisis", {
        description: error ?? undefined,
      })
    }
  }

  return (
    <Button onClick={handleSave} disabled={isSaving}>
      {isSaving ? (
        <LoaderCircleIcon className="animate-spin" />
      ) : (
        <SaveIcon />
      )}
      {isSaving ? "Guardando…" : "Guardar análisis"}
    </Button>
  )
}
