import Image from "next/image";
import { cn } from "@/lib/utils";

/** Width / height from `public/logo-payme.png`. */
const RATIO = 590 / 529;

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
      src="/logo-payme.png"
      alt="Pay.Me"
      width={w}
      height={heightPx}
      className={cn("object-contain shrink-0", className)}
      priority={priority}
    />
  );
}
