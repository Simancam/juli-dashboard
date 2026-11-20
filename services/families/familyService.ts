import {
  NON_PRODUCT_TERMS,
  OTHER_FAMILY,
  PRODUCT_FAMILY_MAP,
} from "@/lib/config/families"
import { normalizeText } from "@/utils/normalizers"

export interface FamilyResolution {
  familyKey: string
  isProduct: boolean
}

/** Primer token de la descripción, separando por espacio o "/". */
export function extractFamilyToken(description: string): string {
  const normalized = normalizeText(description)

  if (!normalized) {
    return ""
  }

  return normalized.split(/[\s/]+/)[0] ?? ""
}

export function resolveFamily(
  description: string,
  map: Readonly<Record<string, string>> = PRODUCT_FAMILY_MAP
): FamilyResolution {
  const token = extractFamilyToken(description)

  if (!token) {
    return { familyKey: OTHER_FAMILY, isProduct: true }
  }

  if (NON_PRODUCT_TERMS.includes(token)) {
    return { familyKey: token, isProduct: false }
  }

  return {
    familyKey: map[token] ?? OTHER_FAMILY,
    isProduct: true,
  }
}
