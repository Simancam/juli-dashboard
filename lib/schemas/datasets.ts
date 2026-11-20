import { z } from "zod"

import { booleanQuerySchema, isoDateSchema } from "./common"

export const datasetUploadQuerySchema = z
  .object({
    dryRun: booleanQuerySchema,
    mode: z.enum(["replace"]).optional(),
    periodStart: isoDateSchema.optional(),
    periodEnd: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasStart = value.periodStart !== undefined
    const hasEnd = value.periodEnd !== undefined

    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: "custom",
        message: "`periodStart` y `periodEnd` deben enviarse juntos",
        path: hasStart ? ["periodEnd"] : ["periodStart"],
      })
      return
    }

    if (
      value.periodStart !== undefined &&
      value.periodEnd !== undefined &&
      value.periodStart > value.periodEnd
    ) {
      ctx.addIssue({
        code: "custom",
        message: "`periodStart` no puede ser posterior a `periodEnd`",
        path: ["periodEnd"],
      })
    }
  })

export const datasetParamsSchema = z.object({
  id: z.string().uuid(),
})
