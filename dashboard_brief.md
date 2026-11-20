# Plan de implementación: lógica de negocio del dashboard de ventas

Monolito Next.js con API Routes, sin UI. Los datos salen de `Informe_ventasJM_…xlsx`.

---

## 0. Alerta: el 1% del equipo puede dar resultados muy distintos

La regla "1% del equipo y 2% de ella", aplicada por la columna vendedor, da cifras muy diferentes según el archivo:

| Escenario | Propia (2%) | Equipo (1%) | Comisión |
|---|---|---|---|
| Hoja de gerencia (referencia): reasignación manual de clientes, 1% solo sobre 3 líneas de PALMACEITE | $283.384.788 | $5.239.338 | **$5.720.089,14** |
| Misma hoja, regla solo por columna vendedor | $196.818.105 | $91.806.021 | $4.854.422,31 |
| **Archivo de ventas (21/10 al 18/11), regla literal por vendedor** | $57.930.769 | $2.644.681.606 | **$27.605.431,44** |

En el tercer escenario el 1% del equipo ($26,4M) pesa 23 veces más que la comisión propia ($1,16M), porque el equipo incluye a Cabarcas ($1.617M) y Astralaga ($782M).

Puede ser exactamente lo que dice el contrato, pero no cuadra con la hoja de referencia. Por eso el motor es **configurable por perfil** (sección 6). El default es la regla literal; la diferencia se resuelve cambiando configuración, no código.

---

## 1. Decisiones de negocio (criterio propio para los "desconozco")

| Tema | Decisión | Razón |
|---|---|---|
| Base de venta | `Valor subtotal local` (sin IVA) | Es lo que usa la hoja de referencia. Evita el problema de `Valor neto` en las FEE, que parece estar en otra moneda. |
| Estados | Solo `Aprobada`. El resto se excluye y se reporta. | Hay 1 línea "En elaboración" (FEF-2945, $778.500). |
| Devoluciones (NCE) | Restan en el periodo en que se emite la NCE, como hace la hoja. | Los valores ya vienen en negativo. |
| Fletes, servicios, AIU | Cuentan para ventas y comisión. | No hay columna de tipo en el archivo, y la hoja los incluye. |
| Líneas duplicadas | Se conservan. | Las 4 repetidas son líneas de la misma factura (FEF-2925, qty 1). |
| Filas vacías o de totales | Se ignoran (sin `Nro documento`). | Pedido del cliente. |
| Clientes nuevos o reasignados | Fuera de alcance; punto de extensión previsto. | Quedó abierto. |
| Identidad de vendedor | Nombre normalizado (mayúsculas, sin dobles espacios ni tildes) | "RINCON  ANDREINA" trae doble espacio y Marjorie Vergara aparece con 2 cédulas. |
| Identidad de producto | `Item` | Cada ítem tiene exactamente 1 descripción y 1 unidad de medida. |
| Volumen | Agregación en SQL con índices; límite de 10 MB y 50k filas por archivo | No se sabe cuánto crecerá. |

---

## 2. Modelo canónico (`SaleLine`)

Se parte de las 19 columnas del archivo. Se normalizan los encabezados (trim, tildes, minúsculas) manteniendo el typo "Márgen". Campos derivados:

- `docType`: prefijo de `Nro documento` (FEV, FEF, FEE o NCE). `isReturn = (docType == NCE)`.
- `date`: fecha sin hora (tipo DATE, evita problemas de zona horaria).
- `sellerKey`: nombre normalizado. `sellerId`: cédula con trim.
- `clientKey`: razón social normalizada.
- `familyKey` e `isProduct`: ver sección 5.
- `amountCents`: `Valor subtotal local` como entero en centavos, para no acumular errores de punto flotante.
- `unit`: unidad de medida con trim (UND, KG, MT).

---

## 3. Pipeline de ingesta

1. **Recepción:** `multipart` con límites de tamaño, tipo `.xlsx` y hash SHA-256 del archivo.
2. **Lectura:** solo la primera hoja.
3. **Validación de encabezados:** si falta una columna obligatoria, error claro con la lista.
4. **Normalización por fila:** conversión de tipos y limpieza de espacios. Se conserva el cero inicial de `C.O.` (por ejemplo "001").
5. **Clasificación:** filas vacías, filas sin estado `Aprobada` y filas con error de datos.
6. **Reporte de calidad** (se devuelve siempre y no bloquea):
   - filas leídas, válidas y excluidas por estado;
   - duplicados exactos (informativo);
   - vendedores con más de una cédula;
   - líneas FEE/NCE con diferencia grande entre subtotal y neto;
   - márgenes atípicos (46 líneas con 100%, 17 negativas);
   - ítems sin familia mapeada.
7. **Periodo:** la UI envía `periodStart` y `periodEnd`. Valores sugeridos:
   - se extraen del nombre del archivo con `(\d{2})_(\d{2})_(\d{4})_AL_(\d{2})_(\d{2})_(\d{4})`;
   - se muestra el rango real de `Fecha` en los datos.
8. Si lo digitado no coincide con el rango real, se devuelve una advertencia y se pide confirmación. Se guarda el periodo digitado.

---

## 4. Persistencia

Dos tablas lógicas, adaptables al ORM del repo:

- `datasets`: id, nombre, `periodStart`, `periodEnd`, `fileHash` (único), `rowCount`, `uploadedAt`.
- `sale_lines`: todos los campos canónicos más `datasetId`, con índices en `(date)`, `(sellerKey)`, `(clientKey)`, `(item)` y `(datasetId)`.

**Reglas de integridad:**

- Mismo `fileHash`: **409**, archivo ya cargado.
- Periodo que se solapa con otro dataset: **409** con la lista de conflictos. El cliente decide con `mode=replace` (borra los datasets en conflicto) o cambia las fechas. Así no se doble cuentan ventas.
- La carga es atómica (transacción): todo o nada.
- Las consultas filtran por `date BETWEEN from AND to` sobre todas las líneas guardadas, no por dataset. Así se pueden analizar rangos que cruzan varios archivos.

---

## 5. Motor de métricas

Funciones puras sobre las líneas ya filtradas, testeables sin base de datos.

**KPIs**

- `netSales`: suma de todos los montos. `grossSales`: suma de las líneas no NCE. `returns`: suma de las NCE. `returnRate = |returns| / grossSales`.
- `documents`: cantidad de documentos distintos.
- `clients`: clientes con venta neta distinta de cero.
- `avgTicket = netSales / documentos de venta`.
- `weightedMargin`: margen ponderado por monto, solo sobre líneas con subtotal positivo.

**Series:** ventas por día, semana o mes (`granularity`). Con `compare=prev` se calcula también el periodo anterior de igual duración.

**Rankings** (`limit` configurable, ascendente y descendente)

- **Vendedores:** venta neta, % del total, documentos, devoluciones y margen.
- **Clientes:** venta neta y % acumulado (Pareto).
- **Productos:**
  - por **valor**;
  - por **cantidad**, siempre separada por unidad de medida (nunca se suman UND con KG o MT);
  - los "menos vendidos" son los de menor venta neta positiva en el periodo;
  - los productos con neto ≤ 0 (devueltos del todo) van en una lista aparte.
- **Familias:** solo por valor, porque mezclan unidades.

**Familias** (no hay columna en el archivo): se toma el primer token de `Desc. ítem` (separando por espacio o `/`) y se mapea con un diccionario editable en JSON. Por ejemplo `ABRAZ→ABRAZADERAS`, `SOP→SOPORTES`, `GRA→GRAPAS`, `DIAGON→DIAGONALES`, `RETEN→RETENCIONES`, `CONEC→CONECTORES`.

- Los términos que no son producto (`PROYECTOS`, `ADMINISTRACION`, `IMPREVISTOS`, `UTILIDAD`, `GALVANIZADO`, `SERV`) se marcan `isProduct=false`. Cuentan en ventas y comisión, pero se excluyen por defecto de los rankings de producto, con un parámetro para incluirlos.
- Lo que no mapee cae en "OTROS" y se lista en `GET /api/families/unmapped` para completar el diccionario.

**Otros desgloses:** por bodega, por tipo de documento y concentración (porcentaje del total que concentran los N principales).

---

## 6. Motor de comisiones

La comisión **no depende de los filtros de vendedor, cliente ni producto**. Solo usa el periodo, porque "propia vs equipo" necesita ver a todos los vendedores. El anticipo no se guarda y no afecta ninguna métrica.

```ts
type CommissionProfile = {
  sellerKey: string;   // p. ej. "MONTES CUELLO JULIANA"
  ownRate: number;     // 0.02
  teamRate: number;    // 0.01
  // extensión futura: attribution?: (line: SaleLine) => "own" | "team"
};

function calcCommission(lines: SaleLine[], p: CommissionProfile, advanceCents = 0) {
  let own = 0, team = 0;
  for (const l of lines) {
    if (l.sellerKey === p.sellerKey) own += l.amountCents;
    else team += l.amountCents;
  }
  const ownCommission = Math.round(own * p.ownRate);
  const teamCommission = Math.round(team * p.teamRate);
  const total = ownCommission + teamCommission;
  return { own, team, ownCommission, teamCommission, total, netToPay: total - advanceCents };
}
```

- Los perfiles viven en un archivo de configuración tipado, uno por vendedor, lo que cubre "individual para cada vendedor".
- Hoy solo existe el perfil de Juliana. El motor ya recibe el perfil como parámetro.
- `netToPay` puede ser negativo y se devuelve tal cual.
- El redondeo se hace una sola vez por categoría, sobre el total ya sumado en centavos.
- Si la vendedora configurada no aparece en el rango, la respuesta lleva una advertencia.

---

## 7. API Routes

Filtros comunes (`GET`): `from`, `to`, `sellers[]`, `clients[]`, `families[]`, `items[]`, `warehouses[]`, `docTypes[]`. Todo se valida con Zod y cada respuesta incluye `meta`: rango real, datasets usados y filas excluidas.

| Endpoint | Función |
|---|---|
| `POST /api/datasets?dryRun=true` | Parsea y devuelve reporte de calidad, rango detectado y sugerencia del nombre de archivo, sin guardar |
| `POST /api/datasets` | Guarda (con `mode=replace` opcional) |
| `GET /api/datasets` · `DELETE /api/datasets/:id` | Listar y eliminar cargas |
| `GET /api/filters/options` | Valores disponibles y fechas mín/máx para llenar los selects |
| `GET /api/analytics/kpis` | KPIs (con `compare=prev`) |
| `GET /api/analytics/timeseries` | Serie temporal con `granularity` |
| `GET /api/analytics/rankings/{sellers\|clients\|products\|families}` | Rankings con `limit`, `order` y `metric` |
| `GET /api/analytics/breakdown?dimension=` | Bodega, tipo de documento, etc. |
| `GET /api/commissions?from&to&advance=` | Comisión de Juliana (perfil por defecto) |
| `GET /api/families/unmapped` | Ítems sin familia |

---

## 8. Estructura sugerida (adaptar al repo)

```
src/server/
  domain/        # tipos, normalización, métricas, comisiones (funciones puras, sin I/O)
  ingestion/     # lector xlsx, validación, reporte de calidad
  repositories/  # acceso a datos (interfaz + implementación)
  config/        # perfiles de comisión, mapa de familias
  schemas/       # Zod de entrada y salida
app/api/**/route.ts   # handlers delgados: validan → llaman al servicio → responden
```

---

## 9. Pruebas

Estas cifras salen de los archivos reales y sirven como pruebas de referencia.

- **Archivo de ventas:** venta neta aprobada = $2.702.612.375, propia = $57.930.769, equipo = $2.644.681.606. Con el perfil por defecto la comisión es $27.605.431,44. La línea "En elaboración" debe quedar excluida.
- **Archivo de gerencia** (fixture con adaptador de columnas):
  - total = $288.624.126;
  - regla por vendedor = $4.854.422,31;
  - con la atribución manual de la hoja (3 líneas de PALMACEITE al 1% y el resto al 2%) debe dar exactamente **$5.720.089,14**. Esto valida el motor contra el cálculo objetivo.
- **Ingesta:**
  - encabezado faltante;
  - fechas inválidas;
  - cero inicial de C.O.;
  - doble espacio en nombres;
  - archivo repetido (409);
  - solape de periodos (409).
- **Rankings:** que nunca sumen unidades distintas.

---

## 10. Fases

1. **Contratos:** tipos, Zod, fixtures con los dos Excel y mapa de familias inicial.
2. **Ingesta:** lector, normalizador, validador y reporte de calidad. *Hecha cuando* los tests de ingesta pasan y el dry-run devuelve el reporte esperado.
3. **Persistencia y datasets:** esquema, repositorio, reglas de 409 y endpoints de carga. *Hecha cuando* una carga duplicada o solapada se rechaza y una válida queda guardada.
4. **Métricas:** funciones puras, consultas agregadas y endpoints de analytics. *Hecha cuando* los totales coinciden con las cifras de la sección 9.
5. **Comisiones:** perfil configurable, endpoint y tests contra la hoja de referencia. *Hecha cuando* los tres escenarios de la sección 0 se reproducen.
6. **Endurecimiento:** límites, manejo de errores, logs, documentación de la API y prueba con un archivo grande.

---

## 11. Por confirmar antes de codificar

1. **Definición de "equipo":** ¿realmente todo el resto de vendedores al 1%, o aplica la lógica de la hoja de gerencia (solo ciertos clientes)? Es la diferencia entre ~$27,6M y cifras mucho menores.
2. **Base de datos y ORM del repo:** hay que adaptar la sección 4 (esquema e índices) a lo que ya use la arquitectura.
