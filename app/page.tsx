"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading) {
      router.replace(user ? "/dashboard" : "/login")
    }
  }, [isLoading, user, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Cargando</span>
    </div>
  )
}
