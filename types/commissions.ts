import type { SaleLine } from "./sales"

export type Attribution = "own" | "team"

export type CommissionAttribution = (line: SaleLine) => Attribution

export interface CommissionProfile {
  sellerKey: string
  /** Se aplica a las ventas de la vendedora del perfil, p. ej. 0.02. */
  ownRate: number
  /** Se aplica a las ventas de otros vendedores, p. ej. 0.01. */
  teamRate: number
  /** Extensión futura para atribución manual por línea. */
  attribution?: CommissionAttribution
}

export interface CommissionResult {
  /** Base del ownRate: ventas de la vendedora del perfil. */
  ownCents: number
  /** Base del teamRate: ventas de vendedores distintos al perfil. */
  teamCents: number
  ownCommissionCents: number
  teamCommissionCents: number
  totalCommissionCents: number
  advanceCents: number
  netToPayCents: number
}

/** Constancia de una línea reasignada al perfil, sin alterar su registro original. */
export interface Reassignment {
  id: number
  originalSellerKey: string
  assignedTo: string
  subtotalCents: number
}

export interface CommissionResponse {
  profile: CommissionProfile
  result: CommissionResult
  meta: {
    from: string
    to: string
    datasetsUsed: string[]
    lines: number
  }
  warnings: string[]
}
