"use client";

import Link from "next/link";
import { Copy, Check, ExternalLink, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AmountDisplay } from "@/components/payments/amount-display";
import { PayLinkQrThumb } from "@/components/payments/pay-link-qr";
import { cn } from "@/lib/utils";
import { getStablecoinByAddress } from "@/lib/chain";
import type { PaymentRequest } from "@/types/database";

const statusConfig = {
  paid: { label: "Paid", className: "bg-[#10B981]/10 text-[#10B981]" },
  pending: { label: "Pending", className: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-500" },
};

interface PaymentCardProps {
  request: PaymentRequest;
}

export function PaymentCard({ request }: PaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const stable = getStablecoinByAddress(request.token_address);
  const status = statusConfig[request.status];
  const paymentUrl = origin ? `${origin}/pay/${request.slug}` : "";

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/60 transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <PayLinkQrThumb url={paymentUrl} size={56} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{request.title}</h3>
          {request.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{request.description}</p>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(request.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <AmountDisplay
            amount={request.amount_usdc}
            token={stable.symbol}
            className="text-right"
            amountClassName="text-xl font-bold text-primary tabular-nums"
          />
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", status.className)}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#10B981]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>

        <Link
          href={`/pay/${request.slug}`}
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ml-3"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </Link>

        <Link
          href={`/pay/${request.slug}/print`}
          target="_blank"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Poster
        </Link>

        <Link
          href={`/dashboard/links/${request.id}`}
          className="ml-auto text-xs text-primary font-medium hover:underline"
        >
          Details →
        </Link>
      </div>
    </div>
  );
}
