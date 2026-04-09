"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { mainNavigation } from "@/lib/nav-config";

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-b border-border z-50">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3 h-14 lg:h-16">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <UsdcCoin size={28} />
            <span className="text-lg font-semibold tracking-tight">pay.me</span>
          </Link>

          <div
            className={cn(
              "flex items-center justify-center gap-0.5 min-w-0 flex-1 mx-2",
              "overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            )}
          >
            {mainNavigation.map(({ href, label, icon: Icon, isActive }) => {
              const active = isActive(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 py-1.5 px-2 lg:px-3 rounded-md transition-colors text-xs lg:text-sm font-medium whitespace-nowrap shrink-0",
                    active
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 opacity-80" strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/feed"
              className={cn(
                "h-9 px-3 rounded-md text-xs font-semibold border transition-colors inline-flex items-center justify-center",
                pathname.startsWith("/feed")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted/60"
              )}
            >
              Feed
            </Link>
            <ThemeToggle />
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </div>
    </nav>
  );
}
