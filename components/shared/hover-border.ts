/**
 * Borde redondeado que aparece al pasar el cursor sobre los controles del
 * dashboard. El borde es transparente en reposo para no alterar el layout,
 * pero no se anima: aparece de golpe en el hover.
 */
export const hoverRoundedBorder =
  "border border-transparent transition-none hover:rounded-lg hover:border-border"

/**
 * Variante para los botones del sidebar. No declares `transition-*`: el
 * componente base ya tiene `transition-[width,height,padding]`, que no incluye
 * `border-color` ni `border-radius`, así que el borde no se transforma.
 */
export const hoverRoundedSidebarBorder =
  "border border-transparent hover:rounded-lg hover:border-sidebar-border"

/**
 * Estilo de los ítems de navegación del sidebar. El fondo lo aplica el
 * componente base solo cuando el ítem está activo, para que los demás no
 * parezcan seleccionados.
 */
export const sidebarNavItemStyle =
  "rounded-lg border border-transparent data-active:border-sidebar-border"
