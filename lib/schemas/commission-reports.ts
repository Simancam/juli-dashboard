import { z } from "zod"

const lineIdsSchema = z.array(z.number().int().nonnegative())

/** Entradas que el servidor recalcula; nunca se fidean cifras del cliente. */
const commissionValuesSchema = z.object({
  sellerKey: z.string().min(1).optional(),
  ownRate: z.number().min(0).max(1).optional(),
  teamRate: z.number().min(0).max(1).optional(),
  /** Anticipo en centavos, descontado de la comisión total. */
  advanceCents: z.coerce.number().int().min(0).optional(),
  sellers: z.array(z.string().min(1)).optional(),
  reassignedLines: lineIdsSchema.optional(),
})

export const commissionReportCreateSchema = commissionValuesSchema.extend({
  analysisId: z.string().uuid(),
  /** Legacy: marcar líneas en la tabla no define la base de la comisión. */
  selectedLines: lineIdsSchema.optional(),
})

export const commissionReportParamsSchema = z.object({
  id: z.string().uuid(),
})

export const commissionReportUpdateSchema = commissionValuesSchema
  .extend({
    /**
     * Necesario para distinguir "todos" de "no enviado" al editar: sin este
     * flag, `sellers` ausente conserva los vendedores ya guardados.
     */
    allSellers: z.boolean().optional(),
  })
  .refine((value) => !(value.allSellers && value.sellers !== undefined), {
    message: "`allSellers` y `sellers` no pueden enviarse juntos",
    path: ["allSellers"],
  })

export const commissionReportListQuerySchema = z.object({
  analysisId: z.string().uuid().optional(),
})

export type CommissionReportCreate = z.infer<typeof commissionReportCreateSchema>
export type CommissionReportUpdate = z.infer<typeof commissionReportUpdateSchema>
