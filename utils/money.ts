/**
 * Convierte montos a centavos enteros. Acepta números de Excel y strings
 * con formato local ("1.234.567,89") o internacional ("1,234,567.89").
 */
export function parseAmountToCents(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : null
  }

  if (typeof value !== "string") {
    return null
  }

  const raw = value.trim().replace(/[^\d,.-]/g, "")

  if (!raw) {
    return null
  }

  const lastComma = raw.lastIndexOf(",")
  const lastDot = raw.lastIndexOf(".")

  let normalized = raw

  if (lastComma > lastDot) {
    // Formato local: puntos de miles y coma decimal.
    normalized = raw.replace(/\./g, "").replace(",", ".")
  } else if (lastDot > lastComma) {
    // Formato internacional: comas de miles y punto decimal.
    normalized = raw.replace(/,/g, "")
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

export function centsToNumber(cents: number): number {
  return cents / 100
}

/** Número genérico para cantidades y márgenes (acepta coma decimal). */
export function parseNumberValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== "string") {
    return null
  }

  const raw = value.trim().replace(/\s/g, "").replace(",", ".")

  if (!raw) {
    return null
  }

  const parsed = Number(raw)

  return Number.isFinite(parsed) ? parsed : null
}

export function roundRateToCents(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate)
}
