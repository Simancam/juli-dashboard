export const OTHER_FAMILY = "OTROS"

/** Diccionario editable: primer token de Desc. ítem → familia. */
export const PRODUCT_FAMILY_MAP: Readonly<Record<string, string>> = {
  ABRAZ: "ABRAZADERAS",
  ABRAZADERA: "ABRAZADERAS",
  SOP: "SOPORTES",
  SOPORTE: "SOPORTES",
  GRA: "GRAPAS",
  GRAPA: "GRAPAS",
  DIAGON: "DIAGONALES",
  DIAGONAL: "DIAGONALES",
  RETEN: "RETENCIONES",
  RETENCION: "RETENCIONES",
  CONEC: "CONECTORES",
  CONECTOR: "CONECTORES",
}

/** Términos que no son producto: cuentan en ventas y comisión, no en rankings. */
export const NON_PRODUCT_TERMS: readonly string[] = [
  "PROYECTOS",
  "ADMINISTRACION",
  "IMPREVISTOS",
  "UTILIDAD",
  "GALVANIZADO",
  "SERV",
]
