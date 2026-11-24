import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { AuthGuard } from "@/components/shared/auth-guard"
import { hoverRoundedBorder } from "@/components/shared/hover-border"
import { DashboardDataProvider } from "@/contexts/DashboardDataContext"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <DashboardDataProvider>
        <SidebarProvider>
          <Toaster />
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className={cn("-ml-1", hoverRoundedBorder)} />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                />
                <DashboardBreadcrumb />
              </div>
              <div className="ml-auto flex items-center gap-2 px-4">
                <ThemeToggle />
              </div>
            </header>
            <div className="flex flex-1 flex-col">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </DashboardDataProvider>
    </AuthGuard>
  )
}
