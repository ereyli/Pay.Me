"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mainNavigation } from "@/lib/nav-config";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-0 right-0 md:hidden z-50 safe-area-pb px-3">
      <div className="max-w-lg mx-auto rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-[0_10px_30px_-16px_rgba(15,23,42,0.45)] px-1.5 py-1.5">
        <div className="flex items-stretch justify-between gap-1">
          {mainNavigation.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-colors min-w-0 flex-1",
                  active
                    ? "text-foreground bg-primary/12 shadow-[0_0_0_1px_rgba(39,117,202,0.12)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px] shrink-0", active && "text-foreground")} strokeWidth={1.75} />
                <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
