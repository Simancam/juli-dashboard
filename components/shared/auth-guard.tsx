"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, user, router])

  const isBlocked = isLoading || !user

  return (
    <>
      {children}
      {isBlocked ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          aria-busy="true"
        >
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <span className="sr-only">Cargando sesión</span>
        </div>
      ) : null}
    </>
  )
}
