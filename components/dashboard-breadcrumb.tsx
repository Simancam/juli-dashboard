"use client"

import { usePathname } from "next/navigation"

import { useMounted } from "@/hooks/useMounted"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

function sectionTitle(pathname: string | null): string {
  if (pathname?.startsWith("/dashboard/comisiones/")) return "Ver comisión"
  if (pathname === "/dashboard/comisiones") return "Comisiones"
  if (pathname === "/dashboard/analizar/resultado") {
    return "Resultado del análisis"
  }
  if (pathname?.startsWith("/dashboard/analizar")) {
    return pathname.split("/")[3] ? "Ver informe" : "Analizar"
  }

  return "Panel histórico"
}

function BreadcrumbContent({ pathname }: { pathname: string | null }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{sectionTitle(pathname)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function BreadcrumbWithPathname() {
  const pathname = usePathname()

  return <BreadcrumbContent pathname={pathname} />
}

export function DashboardBreadcrumb() {
  const mounted = useMounted()

  return mounted ? <BreadcrumbWithPathname /> : <BreadcrumbContent pathname={null} />
}
