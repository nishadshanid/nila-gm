import { Dumbbell, Flame, House, Ruler, Settings, Utensils, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Shown in the mobile bottom bar; everything else lives under "More". */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: House },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/diet", label: "Diet", icon: Utensils },
  { href: "/body", label: "Body", icon: Ruler },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/habits", label: "Water & habits", icon: Flame },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
