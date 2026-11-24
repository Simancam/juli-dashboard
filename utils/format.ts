const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const integerFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatMoney(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value)
}

/** Etiqueta corta y entera para el gráfico: recibe centavos. */
export function formatApproxMoney(cents: number): string {
  const value = Math.round(cents / 100)
  const sign = value < 0 ? "-" : ""
  const amount = Math.abs(value)

  if (amount >= 1_000_000) {
    return `${sign}$${Math.round(amount / 1_000_000)}M`
  }
  if (amount >= 1_000) {
    return `${sign}$${Math.round(amount / 1_000)}mil`
  }
  return `${sign}${formatInteger(amount)}`
}

export function formatPercent(ratio: number): string {
  return `${decimalFormatter.format(ratio * 100)}%`
}

export function formatMargin(points: number): string {
  return `${decimalFormatter.format(points)}%`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-")

  return `${day}/${month}/${year}`
}
