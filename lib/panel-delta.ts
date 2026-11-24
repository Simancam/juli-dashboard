import { formatPercent } from "@/utils/format"

export type DeltaKind = "relative" | "ratio-points" | "points"

export interface Delta {
  direction: "up" | "down"
  label: string
}

const pointsFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Variación de un KPI frente al mes anterior, lista para mostrar en la card. */
export function computeDelta(
  current: number,
  previous: number,
  kind: DeltaKind = "relative"
): Delta | null {
  if (previous === 0 && current === 0) {
    return null
  }

  const difference = current - previous

  if (difference === 0) {
    return null
  }

  const direction = difference > 0 ? "up" : "down"

  if (kind === "relative") {
    if (previous === 0) {
      return null
    }

    return {
      direction,
      label: `${direction === "up" ? "+" : "−"}${formatPercent(Math.abs(difference) / Math.abs(previous))}`,
    }
  }

  const points = kind === "ratio-points" ? difference * 100 : difference

  if (Math.abs(points) < 0.05) {
    return null
  }

  return {
    direction,
    label: `${direction === "up" ? "+" : "−"}${pointsFormatter.format(Math.abs(points))} pp`,
  }
}
