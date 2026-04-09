"use client";

import { useEffect, useState } from "react";
import { Link2, CheckCircle2, ArrowRight, Gift, Copy, Check } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { toast } from "sonner";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { getStablecoinByAddress } from "@/lib/chain";
import { AppLayout } from "@/components/layout/app-layout";
import { AmountDisplay } from "@/components/payments/amount-display";
import { PaymentCard } from "@/components/payments/payment-card";
import { StatsCard } from "@/components/payments/stats-card";
import { supabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/utils";
import type { PaymentRequest } from "@/types/database";

export default function DashboardPage() {
  const PAGE_SIZE = 15;
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState("");
  const [quickCopied, setQuickCopied] = useState(false);
  const [recentPage, setRecentPage] = useState(1);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    supabase
      .from("payment_requests")
      .select("*")
      .eq("recipient_wallet", address.toLowerCase())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setRecentPage(1);
        setLoading(false);
      });
  }, [address]);

  const paidRequests = requests.filter((r) => r.status === "paid");
  const totalsBySymbol = paidRequests.reduce(
    (acc, r) => {
      const sym = getStablecoinByAddress(r.token_address).symbol;
      acc[sym] = (acc[sym] || 0) + parseFloat(r.amount_usdc);
      return acc;
    },
    {} as Record<string, number>
  );
  const totalSymbols = Object.keys(totalsBySymbol);
  const paidCount = paidRequests.length;
  const recentTotalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const recentPageItems = requests.slice((recentPage - 1) * PAGE_SIZE, recentPage * PAGE_SIZE);

  const createQuickRequest = async (amount: string) => {
    if (!address) return;
    setQuickLoading(amount);
    try {
      const response = await fetch("/api/payment-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          title: `Quick request ${amount} USDC`,
          recipientWallet: address,
          token: "USDC",
          slug: generateSlug(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create quick request");
      const url = `${window.location.origin}/pay/${data.slug}`;
      setQuickUrl(url);
      setRequests((prev) => [data as PaymentRequest, ...prev]);
      toast.success("Quick request ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Quick request failed";
      toast.error(message);
    } finally {
      setQuickLoading(null);
    }
  };

  const copyQuickUrl = async () => {
    if (!quickUrl) return;
    await navigator.clipboard.writeText(quickUrl);
    setQuickCopied(true);
    setTimeout(() => setQuickCopied(false), 1400);
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-6">
              <UsdcCoin size={64} />
            </div>
            <h2 className="text-xl font-semibold mb-2 tracking-tight">Connect your wallet</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Connect to view payment requests and balances.
            </p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dashboard</p>
            <h1 className="text-xl md:text-2xl font-semibold mt-1 tracking-tight">What do you want to do?</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[30vh]">
            <Link
              href="/create"
              className="cta-primary text-white rounded-2xl p-5 min-h-[112px] flex flex-col justify-between"
            >
              <span className="text-sm/5 text-white/90">Request money</span>
              <span className="inline-flex items-center gap-1.5 text-base font-semibold">
                Create link
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              href="/gifts/create"
              className="rounded-2xl p-5 min-h-[112px] border border-border bg-card hover:bg-muted/30 transition-colors flex flex-col justify-between"
            >
              <span className="text-sm/5 text-muted-foreground">Send gift</span>
              <span className="inline-flex items-center gap-1.5 text-base font-semibold">
                Create gift link
                <Gift className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-sm border border-border/60 space-y-3">
            <p className="text-sm font-medium">Quick Request</p>
            <div className="flex gap-2">
              {["1", "5", "10"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => createQuickRequest(value)}
                  disabled={quickLoading !== null}
                  className="h-10 px-4 rounded-xl border border-border/60 bg-muted/30 text-sm font-semibold disabled:opacity-60"
                >
                  {quickLoading === value ? "..." : `+${value} USDC`}
                </button>
              ))}
            </div>
            {quickUrl && (
              <div className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1">{quickUrl}</span>
                <button type="button" onClick={copyQuickUrl} className="text-xs text-primary inline-flex items-center gap-1">
                  {quickCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {quickCopied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-sm">2 taps: create, share, get paid.</p>
        </div>

        <div className="rounded-2xl bg-card p-5 md:p-6 shadow-sm border border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <UsdcCoin size={20} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total received
            </span>
          </div>
          {totalSymbols.length === 0 ? (
            <AmountDisplay amount="0" token="USDC" amountClassName="text-3xl md:text-4xl font-semibold tabular-nums tracking-tight" />
          ) : totalSymbols.length === 1 ? (
            <AmountDisplay amount={totalsBySymbol[totalSymbols[0]]} token={totalSymbols[0]} amountClassName="text-3xl md:text-4xl font-semibold tabular-nums tracking-tight" />
          ) : (
            <div className="space-y-2">
              {totalSymbols.map((sym) => (
                <div key={sym} className="flex items-baseline justify-between gap-4">
                  <span className="text-2xl font-semibold tabular-nums">
                    {totalsBySymbol[sym].toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">{sym}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            icon={<Link2 className="w-5 h-5 text-foreground" strokeWidth={1.5} />}
            label="Total links"
            value={requests.length}
          />
          <StatsCard
            icon={<CheckCircle2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />}
            label="Paid"
            value={paidCount}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent links</h2>
            <Link href="/activity" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse h-[5.5rem]" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
              <Link2 className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-60" strokeWidth={1.5} />
              <h3 className="text-sm font-medium mb-1">No payment links</h3>
              <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto leading-relaxed">
                Create a link to request USDC or EURC on Arc.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                Create link
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPageItems.map((req) => (
                <PaymentCard key={req.id} request={req} />
              ))}
            </div>
          )}
          {requests.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: recentTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setRecentPage(page)}
                  className={`h-8 min-w-8 px-2 rounded-lg border text-sm ${
                    page === recentPage
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
