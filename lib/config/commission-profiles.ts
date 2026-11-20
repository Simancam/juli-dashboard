import type { CommissionProfile } from "@/types/commissions"

export const DEFAULT_SELLER_KEY = "MONTES CUELLO JULIANA"

/** Perfiles tipados de comisión; hoy solo el de Juliana. */
export const COMMISSION_PROFILES: Readonly<
  Record<string, CommissionProfile>
> = {
  [DEFAULT_SELLER_KEY]: {
    sellerKey: DEFAULT_SELLER_KEY,
    ownRate: 0.02,
    teamRate: 0.01,
  },
}

export function getCommissionProfile(
  sellerKey: string = DEFAULT_SELLER_KEY
): CommissionProfile {
  return COMMISSION_PROFILES[sellerKey] ?? COMMISSION_PROFILES[DEFAULT_SELLER_KEY]
}
