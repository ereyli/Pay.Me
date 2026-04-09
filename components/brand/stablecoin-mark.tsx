"use client";

import { EurcCoin, UsdcCoin } from "@/components/brand/usdc-coin";

type StablecoinMarkProps = {
  symbol: string;
  size?: number;
  className?: string;
};

/** Visual mark for USDC or EURC using official marks from `/usdc.png` and `/eurc.png`. */
export function StablecoinMark({ symbol, size = 22, className }: StablecoinMarkProps) {
  if (symbol === "EURC") {
    return <EurcCoin size={size} className={className} />;
  }
  return <UsdcCoin size={size} className={className} />;
}
