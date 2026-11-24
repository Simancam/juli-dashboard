import { z } from "zod"

const lineIdsSchema = z.array(z.number().int().nonnegative())

export const commissionReportCreateSchema = z.object({
  analysisId: z.string().uuid(),
  sellerKey: z.string().min(1).optional(),
  ownRate: z.number().min(0).max(1).optional(),
  teamRate: z.number().min(0).max(1).optional(),
  advanceCents: z.number().int().min(0).default(0),
  sellers: z.array(z.string().min(1)).optional(),
  selectedLines: lineIdsSchema.optional(),
  reassignedLines: lineIdsSchema.optional(),
})

export const commissionReportListQuerySchema = z.object({
  analysisId: z.string().uuid().optional(),
})

export type CommissionReportCreate = z.infer<typeof commissionReportCreateSchema>
