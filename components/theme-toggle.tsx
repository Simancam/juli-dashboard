"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { buttonVariants } from "@/components/ui/button"

const emptySubscribe = () => () => {}

// false en el servidor y durante la hidratación, true después en el cliente.
function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      />
    )
  }

  return (
    <AnimatedThemeToggler
      variant="circle"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onThemeChange={setTheme}
      className={buttonVariants({ variant: "ghost", size: "icon" })}
      aria-label="Cambiar tema"
    />
  )
}
