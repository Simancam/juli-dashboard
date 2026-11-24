---
name: nextjs-architecture
description: Estándar obligatorio de arquitectura, estructura de carpetas y convenciones para el proyecto Next.js (App Router, TypeScript, Supabase/Postgres). Proyecto basado en Client Components + API Routes: prohibido usar Server Components y Server Actions. Úsalo SIEMPRE antes de crear o mover archivos, desarrollar una funcionalidad, crear o modificar componentes, páginas, rutas, route handlers, servicios, hooks, contextos, utilidades, tipos, estilos o pruebas, y cuando se pregunte dónde debe ir algo, aunque el usuario no mencione "arquitectura". También aplica al refactorizar o revisar código para verificar que respeta la estructura.
---

# Arquitectura y estructura del proyecto Next.js

Guía permanente y obligatoria. Toda tarea que cree, mueva o modifique código debe respetar estas reglas. **No se crea código fuera de esta arquitectura sin una justificación técnica explícita.**

## Flujo obligatorio en cada tarea

Antes de escribir código, siempre:

1. **Consultar** este Skill (y `references/ejemplos.md` si hay dudas de ubicación).
2. **Identificar el directorio correcto** con la tabla de la sección "Dónde va cada cosa".
3. **Buscar si ya existe** algo reutilizable (componente, hook, servicio, util, tipo) con `grep`/búsqueda de archivos. Reutilizar o extender antes de crear.
4. **Respetar la separación de capas**: UI → hooks/contextos → services → API Routes (`app/api/`) → lib. Nunca saltarse capas hacia abajo.
5. **Mantener la estructura**: no crear carpetas principales nuevas (ver "Nuevas carpetas").
6. **Actualizar tipos y pruebas** (`types/`, `tests/`) cuando corresponda.
7. **Verificar al final** con el checklist de cierre.

## Estructura base

```text
/my-next-app
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── analytics/
│   │   ├── settings/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── <recurso>/route.ts      # [route-handler].ts del esquema = placeholder
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/            # Button.tsx
│   ├── shared/        # Navbar.tsx
│   └── dashboard/     # AnalyticsCard.tsx
├── lib/               # supabase.ts, auth.ts
├── services/          # apiClient.ts, userService.ts
├── hooks/             # useAuth.ts
├── contexts/          # AuthContext.tsx
├── utils/             # dateFormatter.ts, validators.ts
├── types/             # index.ts
├── styles/            # globals.css
├── public/            # images/, fonts/
└── tests/             # components/, integration/
```

Se pueden añadir **subcarpetas y archivos** cuando una funcionalidad lo requiera (p. ej. `components/dashboard/analytics/`, `services/`, `types/user.ts`). Las **carpetas principales** (primer nivel) no se tocan.

## Dónde va cada cosa

| Directorio | Responsabilidad | NO debe contener |
|---|---|---|
| `app/` | Rutas, páginas, layouts y Route Handlers (App Router). Route Groups `(auth)` y `(dashboard)` separan áreas. Las páginas son **Client Components** y solo componen; no contienen lógica compleja ni obtienen datos por su cuenta. | Lógica de negocio, consultas a Supabase, componentes reutilizables, Server Components |
| `components/ui/` | Componentes visuales genéricos y reutilizables (Button, Input, Modal, Card). Independientes del negocio. | Llamadas a servicios, lógica de dominio |
| `components/shared/` | Componentes compartidos entre módulos (Navbar, Sidebar, Header, Footer). | Componentes de un solo módulo |
| `components/dashboard/` | Componentes específicos del dashboard. Un módulo nuevo → su subcarpeta propia dentro de `components/`. | Componentes genéricos |
| `lib/` | Configuración/inicialización de infraestructura y librerías externas (cliente de Supabase, Auth). | Lógica de negocio, consultas de dominio |
| `services/` | Acceso a datos, consultas, operaciones CRUD, comunicación con APIs internas, servicios de negocio. **Único** lugar desde el cliente para hablar con `app/api/` (y para Supabase/Auth en el servidor). | JSX, estado de React |
| `hooks/` | Custom hooks que encapsulan lógica reutilizable de React (consumen services). | Inicialización de terceros |
| `contexts/` | Context Providers y estado global compartido. | Lógica de acceso a datos directa |
| `utils/` | Funciones puras e independientes (formateadores, validadores, helpers). | Dependencias de React, efectos secundarios |
| `types/` | Interfaces, tipos y contratos TypeScript compartidos. | Código ejecutable |
| `styles/` | CSS global y configuraciones CSS. | Estilos de un componente concreto (usar su método habitual: módulos/Tailwind) |
| `public/` | Recursos estáticos: `images/`, `fonts/`, iconos. | Código |
| `tests/` | Pruebas unitarias, de componentes (`components/`) e integración (`integration/`). | Código de producción |

### Flujo de dependencias (solo hacia abajo)

```
app/ (páginas, Client Components) → components/ → hooks/ · contexts/ → services/ → API Routes (app/api/) → lib/
                                      utils/ y types/ pueden usarse desde cualquier capa
```

- Un componente **nunca** importa `lib/supabase` ni `@supabase/supabase-js`.
- Un componente o página **nunca** hace `fetch` directo: llama a `services/`, que es quien se comunica con los Route Handlers.
- Un `service` **nunca** importa componentes ni hooks.
- Un Route Handler **nunca** importa componentes, hooks ni contextos.
- `utils/` **nunca** importa de `components/`, `hooks/` o `services/`.

### Renderizado y datos (obligatorio)

- **No se usan Server Components.** Todas las páginas, layouts y componentes son Client Components: declara `'use client'` en la parte superior de cada archivo de UI.
- **No se usan Server Actions.** Todo acceso a datos pasa por **API Routes** (`app/api/<recurso>/route.ts`).
- El cliente obtiene datos con `fetch` a los Route Handlers (siempre a través de `services/`); el handler valida, delega en `services/` y responde JSON.
- Las páginas nunca son `async`, no consultan Supabase ni bases de datos y no reciben datos por props desde el servidor.
- Estado de carga y error (`loading`, `error`) se gestiona en el cliente (hooks/contextos).

## Reglas obligatorias

### Organización del código
- Un archivo = una responsabilidad específica.
- No crear archivos innecesarios ni duplicar funcionalidad existente.
- Reutilizar componentes y funciones antes de escribir nuevas versiones.
- Separar interfaz, lógica de negocio, acceso a datos y configuración.
- Dividir componentes demasiado grandes (referencia: >150–200 líneas o varias responsabilidades) en subcomponentes, hooks o utilidades.

### Componentes
- Reutilizables en `components/`; genéricos en `components/ui/`; compartidos en `components/shared/`; específicos de una funcionalidad en su módulo (`components/<modulo>/`).
- TypeScript con tipado explícito de props.
- **Client Components siempre.** No existen Server Components en este proyecto: todo componente de UI lleva `'use client'`. No crear componentes `async` ni usar `await` de datos en render.

### Lógica y servicios
- Páginas sin lógica de negocio compleja.
- Cero consultas directas a Supabase desde componentes visuales: todo pasa por `services/`.
- Cero `fetch` directos a APIs externas desde componentes o páginas: todo pasa por `services/` → API Routes.
- Configuración/inicialización de terceros solo en `lib/`.
- Lógica reutilizable de React en `hooks/`.
- No duplicar llamadas HTTP, validaciones ni transformaciones de datos: centralizarlas en `services/` o `utils/`.

### Rutas y navegación
- Solo App Router (no crear `pages/`).
- Route Groups para separar áreas pública, autenticada y privada: `(auth)`, `(dashboard)`.
- Layouts para estructuras compartidas.
- Route Handlers en `app/api/<recurso>/route.ts` (nombre de archivo fijo `route.ts`, exportando `GET`, `POST`, etc.). El handler solo valida, delega en `services/` y responde con `NextResponse` en JSON.
- **Cualquier dato que necesite la UI requiere un Route Handler.** No se obtienen datos en el servidor ni se pasan a las páginas por props: la página (cliente) los pide a `app/api/` a través de `services/`.
- Los handlers tipan su entrada/salida y devuelven códigos de estado correctos; el cliente trata `loading` y `error`.

### Tipado y calidad
- Prohibido `any` (usar `unknown` + validación, genéricos o tipos específicos).
- Tipos compartidos centralizados en `types/` (tipos locales de un solo archivo pueden quedarse en él).
- Validaciones reutilizables en `utils/validators.ts`.
- Sin código muerto, imports sin uso ni dependencias redundantes.
- Nomenclatura consistente (ver abajo).

## Convenciones de nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | `PascalCase.tsx` | `AnalyticsCard.tsx` |
| Hooks | `useNombre.ts` | `useAuth.ts` |
| Servicios | `nombreService.ts` | `userService.ts` |
| Utilidades | `camelCase.ts` | `dateFormatter.ts` |
| Contextos | `NombreContext.tsx` | `AuthContext.tsx` |
| Tipos / interfaces | Nombre descriptivo en `PascalCase` | `UserProfile`, `AnalyticsMetric` |
| Estilos | `globals.css`; otros CSS con nombre descriptivo | `analytics-card.module.css` |
| Rutas y carpetas de `app/` | minúsculas con guiones | `forgot-password/` |
| Route Handlers | `route.ts` | `app/api/users/route.ts` |
| Pruebas | `<Nombre>.test.tsx` / `.test.ts` | `Button.test.tsx` |

## Procedimiento: agregar una funcionalidad nueva

1. Definir el alcance y buscar lo reutilizable existente.
2. **Tipos** → `types/` (nuevo archivo si el dominio es nuevo, p. ej. `types/order.ts`, y reexportar en `types/index.ts`).
3. **Datos** → `services/<nombre>Service.ts` (usa `lib/` para el cliente de Supabase/Auth y hace `fetch` a los Route Handlers).
4. **Lógica de React** → `hooks/use<Nombre>.ts` (y `contexts/` solo si el estado debe ser global).
5. **UI** → `components/ui/` (genérico), `components/shared/` (multi-módulo) o `components/<modulo>/` (específico). Todos con `'use client'`.
6. **Ruta** → `app/(grupo)/<ruta>/page.tsx` (Client Component) que solo compone; `layout.tsx` si necesita estructura propia.
7. **API (obligatorio si hay datos)** → `app/api/<recurso>/route.ts` delegando en el service. Sin Server Components ni Server Actions.
8. **Pruebas** → `tests/components/` o `tests/integration/`.
9. Pasar el checklist de cierre.

## Procedimiento: modificar o crear un elemento puntual

- **Componente nuevo**: ¿existe uno similar en `ui/` o `shared/`? → extenderlo con props. ¿Lo usa un solo módulo? → su carpeta de módulo. ¿Lo usan varios? → `shared/`. ¿Es puramente visual y sin negocio? → `ui/`.
- **Servicio nuevo**: ¿encaja en un `*Service.ts` existente del mismo dominio? → añadir ahí. Si no, crear uno nuevo.
- **Util nueva**: ¿es pura y sin dependencias de React? → `utils/`. Si usa estado/efectos → `hooks/`.
- **Ruta nueva**: ¿es pública, de autenticación o del dashboard? → elegir Route Group correspondiente.

## Nuevas carpetas

Si una funcionalidad parece requerir una carpeta nueva de primer nivel:

1. Evaluar primero si cabe en una existente (casi siempre cabe como subcarpeta).
2. Solo si realmente no encaja: crearla con la misma filosofía modular, y **documentar su responsabilidad** añadiéndola a la tabla "Dónde va cada cosa" de este SKILL y explicando la justificación al usuario.
3. Nunca crear carpetas genéricas tipo `misc/`, `helpers/`, `common/`, `stuff/`, `temp/`.

## Anti-duplicidad y desorden

- Antes de crear: buscar por nombre y por funcionalidad (`grep -r`, listar la carpeta).
- Prohibido: `ButtonNew.tsx`, `utils2.ts`, `userService-copy.ts`, archivos `index.tsx` gigantes que mezclen UI + datos.
- Una misma validación/formateo/llamada HTTP existe **una sola vez**.
- Si encuentras código existente fuera de la arquitectura: **no lo muevas en silencio**. Avisa al usuario y propón la migración; solo muévelo si la tarea lo pide o él lo aprueba.

## Checklist de cierre

- [ ] Cada archivo nuevo está en el directorio correcto y con el nombre correcto.
- [ ] No se duplicó nada existente.
- [ ] No hay Supabase/HTTP directo en componentes ni páginas (todo vía `services/` → `app/api/`).
- [ ] Sin Server Components ni Server Actions: todas las páginas/componentes llevan `'use client'` y los datos llegan por API Routes.
- [ ] Sin `any`, sin imports sin uso, sin código muerto.
- [ ] Tipos compartidos en `types/`; pruebas añadidas o actualizadas si correspondía.
- [ ] No se modificaron archivos ajenos a la tarea.
- [ ] Si se añadió una carpeta nueva, está justificada y documentada.

Para ejemplos concretos de ubicaciones correctas e incorrectas, ver `references/ejemplos.md`.
