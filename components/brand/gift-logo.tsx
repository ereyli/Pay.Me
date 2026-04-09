import Image from "next/image";
import { cn } from "@/lib/utils";

/** Width / height from `public/logo-gift.png`. */
const RATIO = 591 / 528;

type GiftLogoProps = {
  heightPx: number;
  className?: string;
  priority?: boolean;
};

export function GiftLogo({ heightPx, className, priority }: GiftLogoProps) {
  const w = Math.round(heightPx * RATIO);
  return (
    <Image
      src="/logo-gift.png"
      alt="Pay.Me gift"
      width={w}
      height={heightPx}
      className={cn("object-contain shrink-0", className)}
      priority={priority}
    />
  );
}
