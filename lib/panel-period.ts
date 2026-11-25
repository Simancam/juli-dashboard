import type { DataCoverage } from "@/types/panel"

export interface PanelPeriod {
  from: string
  to: string
}

/** Rango completo de un mes YYYY-MM. */
export function monthRange(month: string): PanelPeriod {
  const year = Number(month.slice(0, 4))
  const monthNumber = Number(month.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

/** Mes calendario anterior al mes en que termina el periodo elegido. */
export function previousMonthRange(to: string): PanelPeriod {
  const year = Number(to.slice(0, 4))
  const month = Number(to.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  const previousYear = month === 1 ? year - 1 : year
  const previousMonth = month === 1 ? 12 : month - 1
  const paddedMonth = String(previousMonth).padStart(2, "0")

  return {
    from: `${previousYear}-${paddedMonth}-01`,
    to: `${previousYear}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  }
}

/**
 * Resuelve el periodo del panel y lo limita al rango real de datos.
 * Por defecto muestra el último mes con datos. Si el rango pedido queda
 * completamente fuera de la cobertura, se usa la cobertura completa para
 * no mostrar un panel vacío engañoso.
 */
export function resolvePanelPeriod(
  query: { year?: number; from?: string; to?: string },
  coverage: Pick<DataCoverage, "firstDate" | "lastDate">,
  today: Date = new Date()
): PanelPeriod {
  const referenceYear = query.year ?? Number(coverage.lastDate?.slice(0, 4))
  const year = Number.isFinite(referenceYear)
    ? referenceYear
    : today.getUTCFullYear()

  let requestedFrom: string
  let requestedTo: string

  if (query.from && query.to) {
    requestedFrom = query.from
    requestedTo = query.to
  } else if (query.year !== undefined && Number.isFinite(query.year)) {
    requestedFrom = `${year}-01-01`
    requestedTo = coverage.lastDate?.startsWith(String(year))
      ? coverage.lastDate
      : `${year}-12-31`
  } else if (coverage.lastDate) {
    requestedFrom = `${coverage.lastDate.slice(0, 7)}-01`
    requestedTo = coverage.lastDate
  } else {
    requestedFrom = `${year}-01-01`
    requestedTo = `${year}-12-31`
  }

  const from =
    coverage.firstDate && requestedFrom < coverage.firstDate
      ? coverage.firstDate
      : requestedFrom
  const to =
    coverage.lastDate && requestedTo > coverage.lastDate
      ? coverage.lastDate
      : requestedTo

  if (from <= to) {
    return { from, to }
  }

  return {
    from: coverage.firstDate ?? requestedFrom,
    to: coverage.lastDate ?? requestedTo,
  }
}
