import { z } from "zod"

import {
  dateRangeOptions,
  filterListSchema,
  isoDateSchema,
  limitQuerySchema,
} from "./common"

export const docTypeSchema = z.enum(["FEV", "FEF", "FEE", "NCE"])
export const granularitySchema = z.enum(["day", "week", "month"])
export const rankingOrderSchema = z.enum(["asc", "desc"])
export const rankingMetricSchema = z.enum(["value", "quantity"])
export const breakdownDimensionSchema = z.enum(["warehouse", "docType"])

function toDocTypeList(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item !== "string" || item.trim())
  }

  return value
}

export const docTypeListSchema = z.preprocess(
  toDocTypeList,
  z.array(docTypeSchema).optional()
)

const analyticsFilterFields = {
  from: isoDateSchema,
  to: isoDateSchema,
  sellers: filterListSchema,
  clients: filterListSchema,
  families: filterListSchema,
  items: filterListSchema,
  warehouses: filterListSchema,
  docTypes: docTypeListSchema,
}

export const analyticsFiltersSchema = z
  .object(analyticsFilterFields)
  .refine((value) => value.from <= value.to, dateRangeOptions)

export const kpisQuerySchema = z
  .object({
    ...analyticsFilterFields,
    compare: z.enum(["prev"]).optional(),
  })
  .refine((value) => value.from <= value.to, dateRangeOptions)

export const timeseriesQuerySchema = z
  .object({
    ...analyticsFilterFields,
    granularity: granularitySchema.default("day"),
    compare: z.enum(["prev"]).optional(),
  })
  .refine((value) => value.from <= value.to, dateRangeOptions)

export const rankingsQuerySchema = z
  .object({
    ...analyticsFilterFields,
    limit: limitQuerySchema,
    order: rankingOrderSchema.default("desc"),
    metric: rankingMetricSchema.default("value"),
  })
  .refine((value) => value.from <= value.to, dateRangeOptions)

export const breakdownQuerySchema = z
  .object({
    ...analyticsFilterFields,
    dimension: breakdownDimensionSchema.default("warehouse"),
    limit: limitQuerySchema,
  })
  .refine((value) => value.from <= value.to, dateRangeOptions)
