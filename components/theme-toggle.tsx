"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={`h-10 w-[74px] rounded-full bg-muted animate-pulse ${className}`}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-10 w-[82px] items-center rounded-full border border-border bg-card px-1 shadow-sm transition-colors ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="absolute left-2 z-10 inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
        <Sun className="h-3.5 w-3.5" />
      </span>
      <span className="absolute right-2 z-10 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
        <Moon className="h-3.5 w-3.5" />
      </span>
      <span
        className={`relative z-0 h-8 w-8 rounded-full bg-primary shadow-sm transition-transform duration-200 ${
          isDark ? "translate-x-[42px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
