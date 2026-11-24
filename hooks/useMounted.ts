"use client"

import * as React from "react"

const emptySubscribe = () => () => {}

/** Server y primera render de cliente devuelven false; luego true tras hidratar. */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
