import { describe, expect, it } from "vitest"

import {
  extractFamilyToken,
  resolveFamily,
} from "@/services/families/familyService"

describe("familyService", () => {
  it("extrae el primer token separando por espacio o /", () => {
    expect(extractFamilyToken("ABRAZADERA 1/2")).toBe("ABRAZADERA")
    expect(extractFamilyToken("ABRAZ/1/2")).toBe("ABRAZ")
    expect(extractFamilyToken("  ")).toBe("")
  })

  it("mapea el diccionario inicial", () => {
    expect(resolveFamily("ABRAZADERA 1/2")).toEqual({
      familyKey: "ABRAZADERAS",
      isProduct: true,
    })
    expect(resolveFamily("SOPORTE TIPO A")).toEqual({
      familyKey: "SOPORTES",
      isProduct: true,
    })
    expect(resolveFamily("CONECTOR 3/4")).toEqual({
      familyKey: "CONECTORES",
      isProduct: true,
    })
  })

  it("marca los términos que no son producto", () => {
    expect(resolveFamily("PROYECTOS ESPECIALES")).toEqual({
      familyKey: "PROYECTOS",
      isProduct: false,
    })
    expect(resolveFamily("ADMINISTRACIÓN")).toEqual({
      familyKey: "ADMINISTRACION",
      isProduct: false,
    })
    expect(resolveFamily("SERV INSTALACION")).toEqual({
      familyKey: "SERV",
      isProduct: false,
    })
  })

  it("envía lo desconocido a OTROS", () => {
    expect(resolveFamily("TORNILLO 1/4")).toEqual({
      familyKey: "OTROS",
      isProduct: true,
    })
    expect(resolveFamily("")).toEqual({
      familyKey: "OTROS",
      isProduct: true,
    })
  })
})
