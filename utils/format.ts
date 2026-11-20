const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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
