"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "pay.me",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [arcTestnet],
  ssr: true,
});
