"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { getStablecoinByAddress } from "@/lib/chain";
import type { PaymentRequest } from "@/types/database";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";

/**
 * Print-friendly QR poster for a payment link (shop counter, event desk).
 * QR encodes the full https://…/pay/{slug} URL so any phone camera can open it.
 */
export default function PayLinkPrintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    supabase
      .from("payment_requests")
      .select("*")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setRequest(data as PaymentRequest);
        setLoading(false);
      });
  }, [slug]);

  const payUrl = origin ? `${origin}/pay/${slug}` : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
        Link not found.
      </div>
    );
  }

  const stable = getStablecoinByAddress(request.token_address);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-6 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href={`/pay/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Payment page
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/60"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 print:border-0 print:shadow-none print:rounded-none print:bg-white">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground print:text-neutral-600">
            Pay on Arc Testnet
          </p>
          <h1 className="text-center text-2xl font-semibold tracking-tight mt-2 print:text-black">
            pay.me
          </h1>

          <div className="flex justify-center my-8">
            <div className="rounded-lg border-2 border-neutral-200 bg-white p-4 print:border-neutral-300 min-h-[248px] min-w-[248px] flex items-center justify-center">
              {payUrl ? (
                <QRCodeSVG value={payUrl} size={240} level="M" marginSize={2} />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              )}
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-3xl font-bold tabular-nums print:text-black">
              <StablecoinMark symbol={stable.symbol} size={36} />
              <span>
                {request.amount_usdc} {stable.symbol}
              </span>
            </div>
            <p className="text-lg font-medium print:text-black">{request.title}</p>
            {request.description && (
              <p className="text-sm text-muted-foreground print:text-neutral-600 max-w-md mx-auto">
                {request.description}
              </p>
            )}
          </div>

          <p className="mt-8 text-center font-mono text-xs text-muted-foreground break-all print:text-neutral-700 print:mt-10">
            {payUrl || `…/pay/${slug}`}
          </p>
        </div>

      </div>
    </div>
  );
}
