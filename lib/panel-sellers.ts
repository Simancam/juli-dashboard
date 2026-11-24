import type { PanelSellerOption } from "@/types/panel"

/** Valor del selector que representa "sin filtro de vendedor". */
export const ALL_SELLERS = "all"

/** Cliente que se muestra por defecto en el panel histórico. */
export const DEFAULT_SELLER_KEY = "MONTES CUELLO JULIANA"

/**
 * Resuelve los vendedores efectivos. El servidor aplica el default aunque el
 * cliente no envíe el parámetro, para que todas las cifras se calculen igual.
 * `null` significa "todos los vendedores".
 */
export function resolveSellerKeys(
  requested: string[] | undefined,
  sellers: PanelSellerOption[]
): string[] | null {
  if (requested?.includes(ALL_SELLERS)) {
    return null
  }

  const exists = (key: string) => sellers.some((seller) => seller.key === key)
  const fallback = (): string[] | null =>
    exists(DEFAULT_SELLER_KEY) ? [DEFAULT_SELLER_KEY] : null

  if (!requested || requested.length === 0) {
    return fallback()
  }

  const known = [...new Set(requested.filter(exists))]

  return known.length > 0 ? known : fallback()
}
