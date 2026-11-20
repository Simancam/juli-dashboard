"use client"

import * as React from "react"

import { AuthContext } from "@/contexts/AuthContext"

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }

  return context
}
