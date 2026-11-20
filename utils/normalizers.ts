import type { DocType } from "@/types/sales"

const DOCUMENT_TYPES: readonly DocType[] = ["FEV", "FEF", "FEE", "NCE"]

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/** Texto en mayúsculas, sin tildes, con espacios simples y sin extremos. */
export function normalizeText(value: string): string {
  return stripDiacritics(value).toUpperCase().replace(/\s+/g, " ").trim()
}

/** Normaliza encabezados: sin tildes, minúsculas y sin signos. */
export function normalizeHeader(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeName(value: string): string {
  return normalizeText(value)
}

export function normalizeSellerKey(value: string): string {
  return normalizeName(value)
}

export function normalizeClientKey(value: string): string {
  return normalizeName(value)
}

export function parseDocType(documentNumber: string): DocType | null {
  const [prefix] = normalizeText(documentNumber).split("-")

  if (!prefix || !DOCUMENT_TYPES.includes(prefix as DocType)) {
    return null
  }

  return prefix as DocType
}
