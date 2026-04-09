"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";
import { ThemeProvider } from "@/components/theme-provider";
import { RainbowKitThemeSync } from "@/components/rainbow-kit-theme";
import { UsdcWatermark } from "@/components/brand/usdc-watermark";
import { Toaster } from "sonner";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitThemeSync>
            <UsdcWatermark />
            <div className="relative z-[1] min-h-screen isolate">{children}</div>
            <Toaster richColors position="top-center" closeButton />
          </RainbowKitThemeSync>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
