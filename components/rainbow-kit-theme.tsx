"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";

const light = lightTheme({
  accentColor: "#2775CA",
  accentColorForeground: "white",
  borderRadius: "large",
  fontStack: "system",
});

const dark = darkTheme({
  accentColor: "#3b82f6",
  accentColorForeground: "white",
  borderRadius: "large",
  fontStack: "system",
});

export function RainbowKitThemeSync({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted && resolvedTheme === "dark" ? dark : light;

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}
