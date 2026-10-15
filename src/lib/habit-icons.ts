import {
  Apple,
  Ban,
  Bike,
  BookOpen,
  Brain,
  CandyOff,
  CircleCheck,
  Citrus,
  Dumbbell,
  Footprints,
  Heart,
  Leaf,
  Moon,
  PhoneOff,
  Pill,
  Salad,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** Icons a habit can have, by the name stored in `habits.icon`. */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  check: CircleCheck,
  footprints: Footprints,
  pill: Pill,
  moon: Moon,
  citrus: Citrus,
  ban: Ban,
  "candy-off": CandyOff,
  dumbbell: Dumbbell,
  bike: Bike,
  book: BookOpen,
  brain: Brain,
  salad: Salad,
  apple: Apple,
  leaf: Leaf,
  sun: Sun,
  heart: Heart,
  sparkles: Sparkles,
  "phone-off": PhoneOff,
};

export function habitIcon(name: string): LucideIcon {
  return HABIT_ICONS[name] ?? CircleCheck;
}
