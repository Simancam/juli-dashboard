import { z } from "zod"

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")

export const dateRangeOptions = {
  message: "`from` no puede ser posterior a `to`",
  path: ["to"] as PropertyKey[],
}

function toList(value: unknown): unknown {
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

export const filterListSchema = z.preprocess(
  toList,
  z.array(z.string().min(1)).optional()
)

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === true || value === "true" || value === "1") {
    return true
  }

  if (value === false || value === "false" || value === "0") {
    return false
  }

  return value
}, z.boolean().optional())

export const limitQuerySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(500)
  .default(10)
