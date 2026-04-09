"use client";

import { useEffect, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PaymentCard } from "@/components/payments/payment-card";
import { supabase } from "@/lib/supabase";
import type { PaymentRequest } from "@/types/database";

type StatusFilter = "all" | "pending" | "paid" | "expired" | "cancelled";

export default function LinksPage() {
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

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
        setLoading(false);
      });
  }, [address]);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-8">View your payment links</p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1">My Links</h1>
            <p className="text-muted-foreground">All your payment requests</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Link
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "pending", "paid", "expired", "cancelled"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all capitalize ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted/50 shadow-sm"
              }`}
            >
              {s === "all" ? `All (${requests.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${requests.filter((r) => r.status === s).length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No links found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {filter === "all"
                ? "Create your first payment link to get started"
                : `No ${filter} links`}
            </p>
            {filter === "all" && (
              <Link
                href="/create"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Link
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <PaymentCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
