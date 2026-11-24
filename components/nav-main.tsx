"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon } from "lucide-react"

import { sidebarNavItemStyle } from "@/components/shared/hover-border"
import { useMounted } from "@/hooks/useMounted"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  items?: { title: string; url: string }[]
}

function isItemActive(url: string, pathname: string | null): boolean {
  if (pathname === null) return false
  if (url === "/dashboard") return pathname === url

  return pathname === url || pathname.startsWith(`${url}/`)
}

function NavList({
  items,
  pathname,
}: {
  items: NavItem[]
  pathname: string | null
}) {
  return (
    <SidebarMenu className="gap-3">
      {items.map((item) => {
        const active = isItemActive(item.url, pathname)

        return item.items?.length ? (
          <Collapsible
            key={item.title}
            defaultOpen={active}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  tooltip={item.title}
                  className={sidebarNavItemStyle}
                />
              }
            >
              {item.icon}
              <span>{item.title}</span>
              <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton render={<Link href={subItem.url} />}>
                      <span>{subItem.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={active}
              className={sidebarNavItemStyle}
              render={<Link href={item.url} />}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

/** usePathname solo se llama después de hidratar: evita mismatch en el layout. */
function NavListWithPathname({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return <NavList items={items} pathname={pathname} />
}

export function NavMain({ items }: { items: NavItem[] }) {
  const mounted = useMounted()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navegación</SidebarGroupLabel>
      {mounted ? (
        <NavListWithPathname items={items} />
      ) : (
        <NavList items={items} pathname={null} />
      )}
    </SidebarGroup>
  )
}
