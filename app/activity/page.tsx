"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, Gift, Loader2, Plus, Search, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { AppLayout } from "@/components/layout/app-layout";
import { PaymentCard } from "@/components/payments/payment-card";
import { PayLinkQrThumb } from "@/components/payments/pay-link-qr";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { getStablecoinByAddress } from "@/lib/chain";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Payment, PaymentRequest } from "@/types/database";
import { shortenAddress } from "@/lib/token";

type GiftRow = {
  id: string;
  slug: string;
  title: string | null;
  amount_per_claim: string;
  max_claims: number;
  view_count: number;
  created_at: string;
};

type ActivityPayment = Payment & { payment_requests: Pick<PaymentRequest, "title" | "slug"> | null };

function isPendingReceivable(r: PaymentRequest): boolean {
  if (r.status !== "pending") return false;
  if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
  return true;
}

export default function ActivityPage() {
  const PAGE_SIZE = 15;
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [payments, setPayments] = useState<ActivityPayment[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [giftsPage, setGiftsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!address) {
      setRequests([]);
      return;
    }
    setReqLoading(true);
    supabase
      .from("payment_requests")
      .select("*")
      .eq("recipient_wallet", address.toLowerCase())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setPendingPage(1);
        setReqLoading(false);
      });
  }, [address]);

  useEffect(() => {
    if (!address) {
      setGifts([]);
      return;
    }
    setGiftsLoading(true);
    fetch(`/api/gift-campaigns/by-creator?wallet=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => setGifts(data.campaigns ?? []))
      .catch(() => setGifts([]))
      .finally(() => {
        setGiftsPage(1);
        setGiftsLoading(false);
      });
  }, [address]);

  useEffect(() => {
    if (!address) {
      setPayments([]);
      return;
    }
    setPayLoading(true);
    supabase
      .from("payments")
      .select("*, payment_requests(title, slug)")
      .eq("recipient_wallet", address.toLowerCase())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayments((data as ActivityPayment[]) || []);
        setPaymentsPage(1);
        setPayLoading(false);
      });
  }, [address]);

  const pending = useMemo(() => requests.filter(isPendingReceivable), [requests]);

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (a) =>
          a.payment_requests?.title?.toLowerCase().includes(search.toLowerCase()) ||
          a.payer_wallet.toLowerCase().includes(search.toLowerCase())
      ),
    [payments, search]
  );
  useEffect(() => {
    setPaymentsPage(1);
  }, [search]);
  const pendingTotalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const giftsTotalPages = Math.max(1, Math.ceil(gifts.length / PAGE_SIZE));
  const paymentsTotalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const pendingPageItems = pending.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE);
  const giftsPageItems = gifts.slice((giftsPage - 1) * PAGE_SIZE, giftsPage * PAGE_SIZE);
  const paymentsPageItems = filteredPayments.slice((paymentsPage - 1) * PAGE_SIZE, paymentsPage * PAGE_SIZE);

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center max-w-sm space-y-4">
            <Wallet className="w-10 h-10 mx-auto text-muted-foreground" strokeWidth={1.5} />
            <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connect your wallet for pending receivables, gifts, and received payment history.
            </p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</p>
            <h1 className="text-xl font-semibold tracking-tight mt-1">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pending links, gift pools, and confirmed incoming payments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/create"
              className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              Payment link
            </Link>
            <Link
              href="/gifts/create"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New gift
            </Link>
          </div>
        </div>

        {/* Pending receivables */}
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold">Pending receivables</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{pending.length} open</span>
          </div>
          {reqLoading ? (
            <div className="rounded-lg border border-border bg-card p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No pending incoming payments.
            </div>
          ) : (
            <ul className="space-y-3">
              {pendingPageItems.map((req) => (
                <li key={req.id}>
                  <PaymentCard request={req} />
                </li>
              ))}
            </ul>
          )}
          {pending.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: pendingTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPendingPage(page)}
                  className={`h-8 min-w-8 px-2 rounded-lg border text-sm ${
                    page === pendingPage
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Gifts */}
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold">Gift campaigns</h2>
            <Link href="/gifts/create" className="text-xs font-medium text-primary hover:underline">
              Create
            </Link>
          </div>
          {giftsLoading ? (
            <div className="rounded-lg border border-border bg-card p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : gifts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
              <UsdcCoin size={40} className="mx-auto mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground mb-4">No gift pools yet.</p>
              <Link
                href="/gifts/create"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                <Gift className="w-4 h-4" />
                Create gift link
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {giftsPageItems.map((g) => (
                <li
                  key={g.id}
                  className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <PayLinkQrThumb
                      url={origin ? `${origin}/gift/${g.slug}` : ""}
                      size={52}
                      title="Gift link QR"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{g.title || "Gift pool"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {g.amount_per_claim} × {g.max_claims} · {g.view_count} page views · {formatDate(g.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/gift/${g.slug}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/50"
                    >
                      Public link
                    </Link>
                    <Link
                      href={`/gifts/stats/${g.slug}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-muted hover:bg-muted/80"
                    >
                      Stats
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {gifts.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: giftsTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setGiftsPage(page)}
                  className={`h-8 min-w-8 px-2 rounded-lg border text-sm ${
                    page === giftsPage
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Received payments */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold mb-1">Received payments</h2>
            <p className="text-xs text-muted-foreground">Confirmed transfers to your wallet</p>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or payer…"
              className="w-full h-10 pl-10 pr-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {payLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              {search ? "No results match your filter." : "No received payments yet."}
            </div>
          ) : (
            <ul className="space-y-2">
              {paymentsPageItems.map((activity) => {
                const sym = getStablecoinByAddress(activity.token_address).symbol;
                return (
                  <li key={activity.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-muted">
                        <ArrowDownLeft className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {activity.payment_requests?.title || "Payment"}
                        </h3>
                        <div className="text-xs text-muted-foreground truncate">
                          From {shortenAddress(activity.payer_wallet)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(activity.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {activity.payer_message && (
                          <div className="text-xs text-muted-foreground mt-1 italic truncate">
                            "{activity.payer_message}"
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                          <StablecoinMark symbol={sym} size={18} />
                          <span>
                            {activity.amount_usdc} {sym}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            activity.status === "confirmed"
                              ? "bg-muted text-foreground"
                              : activity.status === "submitted"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {activity.status === "confirmed"
                            ? "Confirmed"
                            : activity.status === "submitted"
                            ? "Submitted"
                            : "Failed"}
                        </span>
                      </div>
                    </div>
                    {activity.tx_hash && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <a
                          href={`https://testnet.arcscan.app/tx/${activity.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-mono"
                        >
                          {activity.tx_hash.slice(0, 18)}…
                        </a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {filteredPayments.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: paymentsTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPaymentsPage(page)}
                  className={`h-8 min-w-8 px-2 rounded-lg border text-sm ${
                    page === paymentsPage
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
