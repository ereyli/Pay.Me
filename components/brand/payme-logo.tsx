import Image from "next/image";
import { cn } from "@/lib/utils";

/** Width / height from `public/header-payme-logo.png`. */
const RATIO = 1536 / 1024;

type PayMeLogoProps = {
  /** Logo height in CSS pixels; width scales with aspect ratio. */
  heightPx: number;
  className?: string;
  priority?: boolean;
};

export function PayMeLogo({ heightPx, className, priority }: PayMeLogoProps) {
  const w = Math.round(heightPx * RATIO);
  return (
    <Image
      src="/header-payme-logo.png"
      alt="Pay.Me"
      width={w}
      height={heightPx}
      className={cn("object-contain shrink-0", className)}
      priority={priority}
    />
  );
}
