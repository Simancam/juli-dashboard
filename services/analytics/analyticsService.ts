import { OTHER_FAMILY } from "@/lib/config/families"
import type { Kpis, RankedEntry } from "@/types/analytics"
import type {
  ProductMetric,
  ProductOrder,
} from "@/types/overview"
import type { DateRange, SaleLineDraft } from "@/types/sales"

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0)

export function filterLinesByPeriod<T extends SaleLineDraft>(
  lines: T[],
  period: DateRange
): T[] {
  return lines.filter(
    (line) => line.date >= period.start && line.date <= period.end
  )
}

export function calculateKpis(lines: SaleLineDraft[]): Kpis {
  const returns = lines.filter((line) => line.isReturn)
  const sales = lines.filter((line) => !line.isReturn)

  const netSalesCents = sum(lines.map((line) => line.subtotalCents))
  const grossSalesCents = sum(sales.map((line) => line.subtotalCents))
  const returnsCents = sum(returns.map((line) => line.subtotalCents))

  const clientNet = new Map<string, number>()

  for (const line of lines) {
    clientNet.set(
      line.clientKey,
      (clientNet.get(line.clientKey) ?? 0) + line.subtotalCents
    )
  }

  const salesDocuments = new Set(sales.map((line) => line.documentNumber)).size
  const positiveLines = lines.filter((line) => line.subtotalCents > 0)
  const marginWeight = sum(positiveLines.map((line) => line.subtotalCents))

  const weightedMargin =
    marginWeight === 0
      ? 0
      : sum(
          positiveLines.map(
            (line) => line.margin * line.subtotalCents
          )
        ) / marginWeight

  return {
    netSalesCents,
    grossSalesCents,
    returnsCents,
    returnRate:
      grossSalesCents === 0 ? 0 : Math.abs(returnsCents) / grossSalesCents,
    documents: new Set(lines.map((line) => line.documentNumber)).size,
    clients: [...clientNet.values()].filter((value) => value !== 0).length,
    avgTicketCents:
      salesDocuments === 0 ? 0 : Math.round(netSalesCents / salesDocuments),
    weightedMargin,
  }
}

interface ProductGroup {
  key: string
  item: string
  label: string
  unit: string
  netSalesCents: number
  returnsCents: number
  quantity: number
  marginNumerator: number
  marginWeight: number
  documents: Set<string>
}

function toEntry(group: ProductGroup, totalNetSalesCents: number): RankedEntry {
  return {
    key: group.key,
    label: group.label || group.item,
    netSalesCents: group.netSalesCents,
    share:
      totalNetSalesCents === 0
        ? 0
        : group.netSalesCents / totalNetSalesCents,
    documents: group.documents.size,
    returnsCents: group.returnsCents,
    margin:
      group.marginWeight === 0
        ? 0
        : group.marginNumerator / group.marginWeight,
    quantity: group.quantity,
    unit: group.unit,
  }
}

export function rankProducts(
  lines: SaleLineDraft[],
  options: {
    metric: ProductMetric
    order: ProductOrder
    limit: number
  }
): { products: RankedEntry[]; returnedProducts: RankedEntry[] } {
  // Servicios y otros no producto siempre forman parte del análisis.
  const eligible = lines
  const grouped = new Map<string, ProductGroup>()

  for (const line of eligible) {
    const key = `${line.item}|${line.unit}`
    const group = grouped.get(key) ?? {
      key,
      item: line.item,
      label: line.itemDescription,
      unit: line.unit,
      netSalesCents: 0,
      returnsCents: 0,
      quantity: 0,
      marginNumerator: 0,
      marginWeight: 0,
      documents: new Set<string>(),
    }

    group.netSalesCents += line.subtotalCents
    group.quantity += line.quantity

    if (line.isReturn) {
      group.returnsCents += line.subtotalCents
    }

    if (line.subtotalCents > 0) {
      group.marginNumerator += line.margin * line.subtotalCents
      group.marginWeight += line.subtotalCents
    }

    group.documents.add(line.documentNumber)
    grouped.set(key, group)
  }

  const totalNetSalesCents = sum(
    eligible.map((line) => line.subtotalCents)
  )
  const entries = [...grouped.values()].map((group) =>
    toEntry(group, totalNetSalesCents)
  )

  const direction = options.order === "asc" ? 1 : -1
  const sortValue = (entry: RankedEntry): number =>
    options.metric === "quantity" ? (entry.quantity ?? 0) : entry.netSalesCents

  const products = entries
    .filter((entry) => entry.netSalesCents > 0)
    .sort((a, b) => (sortValue(a) - sortValue(b)) * direction)
    .slice(0, options.limit)

  const returnedProducts = entries
    .filter((entry) => entry.netSalesCents <= 0)
    .sort((a, b) => a.netSalesCents - b.netSalesCents)

  return { products, returnedProducts }
}

const FAMILY_LABELS: Readonly<Record<string, string>> = {
  SERV: "Servicios",
  PROYECTOS: "Proyectos",
  ADMINISTRACION: "Administración",
  IMPREVISTOS: "Imprevistos",
  UTILIDAD: "Utilidad",
  GALVANIZADO: "Galvanizado",
  OTROS: "Otros",
}

function familyLabel(key: string): string {
  return FAMILY_LABELS[key] ?? key.charAt(0) + key.slice(1).toLowerCase()
}

interface FamilyGroup {
  netSalesCents: number
  documents: Set<string>
}

/** Ventas netas por familia de producto o servicio (incluye los no producto). */
export function rankFamilies(lines: SaleLineDraft[]): RankedEntry[] {
  const grouped = new Map<string, FamilyGroup>()

  for (const line of lines) {
    const key = line.familyKey || OTHER_FAMILY
    const group = grouped.get(key) ?? {
      netSalesCents: 0,
      documents: new Set<string>(),
    }

    group.netSalesCents += line.subtotalCents
    group.documents.add(line.documentNumber)
    grouped.set(key, group)
  }

  const totalNetSalesCents = sum(lines.map((line) => line.subtotalCents))

  return [...grouped.entries()]
    .filter(([, group]) => group.netSalesCents > 0)
    .map(([key, group]) => ({
      key,
      label: familyLabel(key),
      netSalesCents: group.netSalesCents,
      share:
        totalNetSalesCents === 0
          ? 0
          : group.netSalesCents / totalNetSalesCents,
      documents: group.documents.size,
      returnsCents: 0,
      margin: 0,
    }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents)
}

interface ClientGroup {
  key: string
  label: string
  netSalesCents: number
  returnsCents: number
  marginNumerator: number
  marginWeight: number
  documents: Set<string>
}

/**
 * Ranking de clientes por venta neta. Es la lectura principal del análisis:
 * quién compró más, cuánto concentra y con qué margen.
 */
export function rankClients(
  lines: SaleLineDraft[],
  options: { order?: ProductOrder } = {}
): RankedEntry[] {
  const grouped = new Map<string, ClientGroup>()

  for (const line of lines) {
    const group = grouped.get(line.clientKey) ?? {
      key: line.clientKey,
      label: line.clientName || line.clientKey,
      netSalesCents: 0,
      returnsCents: 0,
      marginNumerator: 0,
      marginWeight: 0,
      documents: new Set<string>(),
    }

    group.netSalesCents += line.subtotalCents

    if (line.isReturn) {
      group.returnsCents += line.subtotalCents
    }

    if (line.subtotalCents > 0) {
      group.marginNumerator += line.margin * line.subtotalCents
      group.marginWeight += line.subtotalCents
    }

    group.documents.add(line.documentNumber)
    grouped.set(line.clientKey, group)
  }

  const totalNetSalesCents = sum(lines.map((line) => line.subtotalCents))
  const direction = options.order === "asc" ? 1 : -1

  const entries = [...grouped.values()]
    .filter((group) => group.netSalesCents > 0)
    .map<RankedEntry>((group) => ({
      key: group.key,
      label: group.label,
      netSalesCents: group.netSalesCents,
      share:
        totalNetSalesCents === 0
          ? 0
          : group.netSalesCents / totalNetSalesCents,
      documents: group.documents.size,
      returnsCents: group.returnsCents,
      margin:
        group.marginWeight === 0
          ? 0
          : group.marginNumerator / group.marginWeight,
    }))
    .sort((a, b) => (a.netSalesCents - b.netSalesCents) * direction)

  let cumulativeShare = 0

  // Se devuelven todos los clientes: la paginación y la gráfica viven en la UI.
  return entries.map((entry) => {
    cumulativeShare += entry.share
    return { ...entry, cumulativeShare }
  })
}
