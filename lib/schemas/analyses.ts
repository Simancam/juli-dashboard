import { z } from "zod"

import { isoDateSchema } from "./common"

export const analysisListQuerySchema = z.object({
  status: z.enum(["active", "superseded", "all"]).default("all"),
})

export const analysisParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updateAnalysisSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: "`periodStart` no puede ser posterior a `periodEnd`",
    path: ["periodEnd"],
  })

export type AnalysisListQuery = z.infer<typeof analysisListQuerySchema>
export type UpdateAnalysisBody = z.infer<typeof updateAnalysisSchema>
