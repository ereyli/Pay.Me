import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const preset = { xs: 14, sm: 18, md: 24, lg: 32, xl: 40, "2xl": 56, "3xl": 72 } as const;

export type UsdcCoinSize = keyof typeof preset | number;

function toPx(size: UsdcCoinSize): number {
  return typeof size === "number" ? size : preset[size];
}

/** Official USDC mark — use wherever the USDC currency is shown. */
export function UsdcCoin({
  size = "md",
  className,
  priority,
}: {
  size?: UsdcCoinSize;
  className?: string;
  priority?: boolean;
}) {
  const px = toPx(size);
  return (
    <Image
      src="/usdc.png"
      alt="USDC"
      width={px}
      height={px}
      className={cn("rounded-full object-cover shrink-0", className)}
      priority={priority}
    />
  );
}

/** Official EURC mark — Circle euro stablecoin; pair with {@link UsdcCoin} for USDC. */
export function EurcCoin({
  size = "md",
  className,
  priority,
}: {
  size?: UsdcCoinSize;
  className?: string;
  priority?: boolean;
}) {
  const px = toPx(size);
  return (
    <Image
      src="/eurc.png"
      alt="EURC"
      width={px}
      height={px}
      className={cn("rounded-full object-cover shrink-0", className)}
      priority={priority}
    />
  );
}

/** Inline amount row: coin + numeric value (no redundant “$” when icon is present). */
export function UsdcAmountRow({
  amount,
  amountClassName,
  coinSize = "md",
}: {
  amount: ReactNode;
  amountClassName?: string;
  coinSize?: UsdcCoinSize;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <UsdcCoin size={coinSize} />
      <span className={amountClassName}>{amount}</span>
    </span>
  );
}
