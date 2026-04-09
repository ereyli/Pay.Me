"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Gift,
  Loader2,
  MousePointerClick,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PayLinkQr } from "@/components/payments/pay-link-qr";
import { SocialShareActions } from "@/components/payments/social-share-actions";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { shortenAddress } from "@/lib/token";
import { formatDate } from "@/lib/utils";

type StatsPayload = {
  slug: string;
  title: string | null;
  tokenSymbol: string;
  amountPerClaim: string;
  maxClaimsDb: number;
  viewCount: number;
  claimedCount: number | null;
  maxClaimsOnChain: number | null;
  remaining: number | null;
  claims: { claimer: string; txHash: string; blockNumber: string; amount: string }[];
  chainConfigured: boolean;
  createdAt: string;
  fundTxHash: string;
};

export default function GiftStatsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/gift-campaigns/${encodeURIComponent(slug)}/stats`)
      .then((r) => {
        if (!r.ok) {
          setError("Gift not found");
          return null;
        }
        return r.json();
      })
      .then((j) => {
        if (j) setData(j as StatsPayload);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-muted-foreground">{error || "Not found"}</div>
      </AppLayout>
    );
  }

  const claimPath = `/gift/${data.slug}`;
  const giftUrl = origin ? `${origin}${claimPath}` : "";
  const claimed = data.claimedCount ?? 0;
  const cap = data.maxClaimsOnChain ?? data.maxClaimsDb;
  const remaining = data.remaining ?? Math.max(0, cap - claimed);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <Link
            href="/activity"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to activity
          </Link>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Gift stats</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {data.title || "Untitled"} ·{" "}
                <span className="inline-flex items-center gap-1">
                  <StablecoinMark symbol={data.tokenSymbol} size={14} />
                  {data.amountPerClaim} {data.tokenSymbol} × {cap}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-elevated rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 flex-1 min-w-0">
            <PayLinkQr
              url={giftUrl}
              size={160}
              showCaption={false}
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Claim link</div>
              <div className="text-sm break-all font-mono text-foreground">{giftUrl || claimPath}</div>
              <a
                href={claimPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                Open claim page
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Scan the QR to open the same gift page — useful for posters and in-person sharing.
        </p>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">Share this gift link</div>
          <SocialShareActions
            url={giftUrl || claimPath}
            title={data.title || "Gift link"}
            text={`Claim ${data.amountPerClaim} ${data.tokenSymbol} — ${cap} total gifts`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Eye className="w-4 h-4" />
              Page opens
            </div>
            <div className="text-2xl font-semibold tabular-nums">{data.viewCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Loads of /gift/{data.slug} (not unique users)</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MousePointerClick className="w-4 h-4" />
              Claims
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {data.chainConfigured ? `${claimed} / ${cap}` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {data.chainConfigured ? `${remaining} left` : "Configure gift contract"}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 font-medium text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            Who claimed (on-chain)
          </div>
          {data.claims.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No claims yet.</div>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {data.claims.map((c) => (
                <li key={c.txHash} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="font-mono">{shortenAddress(c.claimer)}</span>
                  <span className="text-muted-foreground">
                    {c.amount} {data.tokenSymbol}
                  </span>
                  <a
                    href={`https://testnet.arcscan.app/tx/${c.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:ml-auto text-primary inline-flex items-center gap-1 text-xs"
                  >
                    Tx <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created {formatDate(data.createdAt)}</div>
          <a
            href={`https://testnet.arcscan.app/tx/${data.fundTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1"
          >
            Funding transaction
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
