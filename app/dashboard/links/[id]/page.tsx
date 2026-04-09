"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink, ArrowLeft, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import type { PaymentRequest, Payment } from "@/types/database";
import { shortenAddress } from "@/lib/token";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { getStablecoinByAddress } from "@/lib/chain";
import { PayLinkQr } from "@/components/payments/pay-link-qr";
import { SocialShareActions } from "@/components/payments/social-share-actions";

const statusConfig = {
  paid: { label: "Paid", className: "bg-[#10B981]/10 text-[#10B981]" },
  pending: { label: "Pending", className: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-500" },
};

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from("payment_requests").select("*").eq("id", id).single(),
      supabase.from("payments").select("*").eq("payment_request_id", id).order("created_at", { ascending: false }),
    ]).then(([{ data: req }, { data: pmts }]) => {
      setRequest(req);
      setPayments(pmts || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Payment link not found.</p>
          <Link href="/dashboard/links" className="text-primary font-medium mt-4 inline-block">
            ← Back to links
          </Link>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[request.status];
  const stable = getStablecoinByAddress(request.token_address);
  const paymentUrl = origin ? `${origin}/pay/${request.slug}` : "";

  const handleCopy = () => {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/links" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{request.title}</h1>
            <p className="text-sm text-muted-foreground">Payment request details</p>
          </div>
        </div>

        {/* Overview Card */}
        <div className="bg-card rounded-3xl p-6 shadow-sm space-y-5">
          <div className="text-center pb-4 border-b border-border">
            <div className="text-sm text-muted-foreground mb-1">Amount</div>
            <div className="flex items-center justify-center gap-2 text-5xl font-bold text-primary mb-1">
              <StablecoinMark symbol={stable.symbol} size={44} />
              <span>{request.amount_usdc}</span>
            </div>
            <div className="text-sm text-muted-foreground">{stable.symbol}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Status</div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Created</div>
              <div className="font-medium">
                {new Date(request.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            {request.expires_at && (
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Expires</div>
                <div className="font-medium">
                  {new Date(request.expires_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-muted-foreground mb-1">Recipient</div>
              <div className="font-mono text-sm">{shortenAddress(request.recipient_wallet)}</div>
            </div>
          </div>

          {request.description && (
            <div className="bg-elevated rounded-2xl p-4">
              <div className="text-sm text-muted-foreground mb-1">Note</div>
              <div className="text-sm">{request.description}</div>
            </div>
          )}

          {/* Link */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Payment Link</div>
            <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 text-sm text-muted-foreground truncate">{paymentUrl}</div>
              <button
                onClick={handleCopy}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-card transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Share on social media</div>
            <SocialShareActions
              url={paymentUrl}
              title={request.title}
              text={`Pay me ${request.amount_usdc} ${stable.symbol} for ${request.title}`}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 border-2 border-border rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Pay Page
            </a>
            <a
              href={`/pay/${request.slug}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 border-2 border-border rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print poster
            </a>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground mb-3">QR code</div>
            <p className="text-xs text-muted-foreground mb-4">
              Same code on posters and stickers. Scanning opens this payment page.
            </p>
            {paymentUrl ? (
              <div className="flex justify-center">
                <PayLinkQr url={paymentUrl} size={220} showCaption={false} />
              </div>
            ) : (
              <div className="h-48 rounded-lg bg-muted/50 animate-pulse" />
            )}
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-card rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Payment History</h2>
            <div className="space-y-3">
              {payments.map((p) => {
                const pSym = getStablecoinByAddress(p.token_address).symbol;
                return (
                <div key={p.id} className="bg-elevated rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">{shortenAddress(p.payer_wallet)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#10B981] inline-flex items-center gap-1 justify-end">
                        <StablecoinMark symbol={pSym} size={18} />
                        {p.amount_usdc} {pSym}
                      </div>
                      <span className={`text-xs font-medium ${p.status === "confirmed" ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  {p.tx_hash && (
                    <a
                      href={`https://testnet.arcscan.app/tx/${p.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono flex items-center gap-1"
                    >
                      {p.tx_hash.slice(0, 18)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
