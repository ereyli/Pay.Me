import type { LucideIcon } from "lucide-react";
import { Home, Plus, Gift, Clock, User } from "lucide-react";

/** Primary app navigation — shared by bottom (mobile) and top (desktop) bars. */
export const mainNavigation: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    isActive: (p) => p === "/dashboard" || p === "/",
  },
  {
    href: "/create",
    label: "Payment",
    icon: Plus,
    isActive: (p) =>
      (p === "/create" || p.startsWith("/create/")) && !p.startsWith("/gifts"),
  },
  {
    href: "/gifts/create",
    label: "Gifts",
    icon: Gift,
    isActive: (p) => p.startsWith("/gifts/create"),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: Clock,
    isActive: (p) =>
      p === "/activity" ||
      p.startsWith("/activity/") ||
      p === "/track" ||
      p.startsWith("/gifts/stats") ||
      (p.startsWith("/gift/") && !p.startsWith("/gifts")),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    isActive: (p) => p === "/profile" || p.startsWith("/profile/"),
  },
];
