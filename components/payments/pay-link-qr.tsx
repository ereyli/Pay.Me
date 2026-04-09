"use client";

import { QRCodeSVG } from "qrcode.react";

type PayLinkQrProps = {
  /** Full HTTPS URL encoded in the QR (opens in the phone browser). */
  url: string;
  size?: number;
  /** Extra helper text under the QR (hidden on detail pages that already explain). */
  showCaption?: boolean;
  /** Overrides default payment caption when showCaption is true. */
  caption?: string;
};

export function PayLinkQr({ url, size = 200, showCaption = true, caption }: PayLinkQrProps) {
  if (!url) return null;
  const defaultCaption =
    "Scan to open this payment page. Use a printed poster or sticker with the same link.";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
        <QRCodeSVG value={url} size={size} level="M" marginSize={2} />
      </div>
      {showCaption && (
        <p className="text-[11px] text-muted-foreground text-center max-w-[260px] leading-snug">
          {caption ?? defaultCaption}
        </p>
      )}
    </div>
  );
}

type PayLinkQrThumbProps = { url: string; size?: number; title?: string };

/** Compact QR for list rows (dashboard, activity). Same URL as full poster. */
export function PayLinkQrThumb({ url, size = 56, title = "Payment link QR" }: PayLinkQrThumbProps) {
  if (!url) {
    return <div className="rounded-md border border-border bg-muted/50 shrink-0" style={{ width: size + 8, height: size + 8 }} aria-hidden />;
  }
  return (
    <div className="rounded-md border border-border bg-white p-1 shadow-sm shrink-0" title={title}>
      <QRCodeSVG value={url} size={size} level="M" marginSize={1} />
    </div>
  );
}
