"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSelect({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={`h-10 rounded-xl bg-muted animate-pulse ${className}`} aria-hidden />
    );
  }

  return (
    <select
      value={theme ?? "system"}
      onChange={(e) => setTheme(e.target.value)}
      className={`h-10 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
      aria-label="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
