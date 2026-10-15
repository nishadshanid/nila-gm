"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from "./nav-items";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active && "bg-accent text-accent-foreground",
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );
}

/**
 * Reads the address, so the layout wraps it in Suspense; the fallback draws the
 * same nav without the highlight (pages with an id in the address need this).
 */
export function Sidebar() {
  return <SidebarView pathname={usePathname()} />;
}

export function SidebarView({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {PRIMARY_NAV.map((item) => (
        <SidebarLink key={item.href} item={item} pathname={pathname} />
      ))}
      <div className="bg-border my-2 h-px" />
      {SECONDARY_NAV.map((item) => (
        <SidebarLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}
