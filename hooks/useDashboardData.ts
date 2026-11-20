"use client"

import * as React from "react"

import { DashboardDataContext } from "@/contexts/DashboardDataContext"

export function useDashboardData() {
  const context = React.useContext(DashboardDataContext)

  if (!context) {
    throw new Error(
      "useDashboardData debe usarse dentro de DashboardDataProvider"
    )
  }

  return context
}
