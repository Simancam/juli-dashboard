import { describe, expect, it } from "vitest"

import {
  ALL_SELLERS,
  DEFAULT_SELLER_KEY,
  resolveSellerKeys,
} from "@/lib/panel-sellers"

const sellers = [
  { key: DEFAULT_SELLER_KEY, label: "Juliana Montes" },
  { key: "OTRO VENDEDOR", label: "Otro vendedor" },
]

describe("resolveSellerKeys", () => {
  it("aplica el cliente por defecto cuando no viene parámetro", () => {
    expect(resolveSellerKeys(undefined, sellers)).toEqual([DEFAULT_SELLER_KEY])
  })

  it("quita el filtro con el centinela de todos los vendedores", () => {
    expect(resolveSellerKeys([ALL_SELLERS], sellers)).toBeNull()
  })

  it("respeta varios vendedores explícitos", () => {
    expect(resolveSellerKeys([DEFAULT_SELLER_KEY, "OTRO VENDEDOR"], sellers)).toEqual(
      [DEFAULT_SELLER_KEY, "OTRO VENDEDOR"]
    )
  })

  it("descarta claves inexistentes y evita duplicados", () => {
    expect(
      resolveSellerKeys(["NO EXISTE", "OTRO VENDEDOR", "OTRO VENDEDOR"], sellers)
    ).toEqual(["OTRO VENDEDOR"])
  })

  it("vuelve al default si ninguna clave existe", () => {
    expect(resolveSellerKeys(["NO EXISTE"], sellers)).toEqual([
      DEFAULT_SELLER_KEY,
    ])
  })

  it("no filtra si no hay default en los datos", () => {
    expect(resolveSellerKeys(undefined, [])).toBeNull()
  })
})
