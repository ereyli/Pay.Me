"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ExternalLink, Gift, Loader2, AlertCircle } from "lucide-react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { arcTestnet, getStablecoinByAddress } from "@/lib/chain";
import { GIFT_DISTRIBUTOR_ABI, getGiftDistributorAddress } from "@/lib/gift-distributor";
import { formatUSDC, parseUSDC, shortenAddress } from "@/lib/token";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { AmountDisplay } from "@/components/payments/amount-display";
import { PayLinkQr } from "@/components/payments/pay-link-qr";

type GiftApiRow = {
  campaign_id: string;
  creator_wallet: string;
  token_address: string;
  amount_per_claim: string;
  max_claims: number;
  title: string | null;
  token_symbol: string;
};

export default function GiftClaimPage() {
  const { slug } = useParams<{ slug: string }>();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [row, setRow] = useState<GiftApiRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [origin, setOrigin] = useState("");
  const viewRecordedRef = useRef(false);

  const distributor = getGiftDistributorAddress();
  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;

  const campaignId = (row?.campaign_id ?? "0x" + "0".repeat(64)) as `0x${string}`;

  const { data: onChain, refetch: refetchCampaign } = useReadContract({
    address: distributor ?? "0x0000000000000000000000000000000000000000",
    abi: GIFT_DISTRIBUTOR_ABI,
    functionName: "campaigns",
    args: [campaignId],
    chainId: arcTestnet.id,
    query: {
      enabled: Boolean(distributor && row && campaignId.length === 66),
    },
  });

  const { data: userClaimed, refetch: refetchClaimed } = useReadContract({
    address: distributor ?? "0x0000000000000000000000000000000000000000",
    abi: GIFT_DISTRIBUTOR_ABI,
    functionName: "hasClaimed",
    args: address ? [campaignId, address] : undefined,
    chainId: arcTestnet.id,
    query: {
      enabled: Boolean(distributor && row && address && campaignId.length === 66),
    },
  });

  const { writeContractAsync, isPending: isSending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    fetch(`/api/gift-campaigns/by-slug/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setRow(data as GiftApiRow);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug || loading || notFound) return;
    if (viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    fetch(`/api/gift-campaigns/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => {});
  }, [slug, loading, notFound]);

  useEffect(() => {
    if (isConfirmed && txHash) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success("Gift claimed!");
      refetchCampaign();
      refetchClaimed();
    }
  }, [isConfirmed, txHash, refetchCampaign, refetchClaimed]);

  const stable = row ? getStablecoinByAddress(row.token_address) : null;

  const claimedCount =
    onChain && Array.isArray(onChain) ? Number(onChain[3] as bigint) : null;
  const maxClaims = onChain && Array.isArray(onChain) ? Number(onChain[2] as bigint) : row?.max_claims ?? null;
  const exists = onChain && Array.isArray(onChain) ? Boolean(onChain[5]) : true;

  const soldOut =
    claimedCount != null && maxClaims != null ? claimedCount >= maxClaims : false;
  const alreadyClaimed = Boolean(userClaimed);

  const handleClaim = async () => {
    if (!distributor || !row || !address) return;
    try {
      if (isWrongNetwork) {
        await switchChain?.({ chainId: arcTestnet.id });
        return;
      }
      const hash = await writeContractAsync({
        chainId: arcTestnet.id,
        address: distributor,
        abi: GIFT_DISTRIBUTOR_ABI,
        functionName: "claim",
        args: [campaignId],
      });
      setTxHash(hash);
      toast.info("Transaction submitted…");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("user rejected")) {
        toast.error(msg || "Claim failed");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notFound || !row || !stable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-lg text-center max-w-sm w-full">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Gift not found</h2>
          <p className="text-muted-foreground">This gift link does not exist or was not registered.</p>
        </div>
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-lg text-center max-w-sm w-full space-y-3">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Gifts unavailable</h2>
          <p className="text-sm text-muted-foreground">
            This app is not configured with a gift contract address.
          </p>
        </div>
      </div>
    );
  }

  const remaining =
    claimedCount != null && maxClaims != null ? Math.max(0, maxClaims - claimedCount) : null;

  const showSuccess = Boolean(isConfirmed && txHash);
  const giftPageUrl = origin && slug ? `${origin}/gift/${slug}` : "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!showSuccess ? (
          <div className="bg-card rounded-3xl p-8 shadow-lg space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">pay.me gift</div>
            </div>

            {row.title && (
              <div className="text-center">
                <h2 className="text-xl font-semibold">{row.title}</h2>
              </div>
            )}

            <div className="text-center py-4 border-y border-border space-y-2">
              <div className="text-sm text-muted-foreground">From</div>
              <div className="font-mono text-sm font-semibold">{shortenAddress(row.creator_wallet)}</div>
            </div>

            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-2">You can claim</div>
              <AmountDisplay
                amount={row.amount_per_claim}
                token={stable.symbol}
                className="flex flex-col items-center"
                amountClassName="text-5xl font-bold text-primary tabular-nums"
              />
              <div className="text-sm text-muted-foreground mt-2">{stable.symbol} · one per wallet</div>
            </div>

            {remaining !== null && (
              <div className="text-center text-sm text-muted-foreground">
                {soldOut || !exists ? (
                  <span className="text-amber-600 font-medium">All gifts have been claimed</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{remaining}</span> left of {maxClaims}
                  </>
                )}
              </div>
            )}

            {isWrongNetwork && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-sm font-medium mb-2">Wrong network</p>
                <button
                  type="button"
                  onClick={() => switchChain?.({ chainId: arcTestnet.id })}
                  className="w-full h-10 bg-amber-500 text-white rounded-xl text-sm font-semibold"
                >
                  Switch to Arc Testnet
                </button>
              </div>
            )}

            {!isConnected ? (
              <div className="flex justify-center">
                <ConnectButton label="Connect wallet to claim" />
              </div>
            ) : soldOut || !exists ? (
              <button type="button" disabled className="w-full h-14 bg-muted text-muted-foreground rounded-2xl font-semibold cursor-not-allowed">
                Nothing left to claim
              </button>
            ) : alreadyClaimed ? (
              <div className="space-y-3">
                <div className="text-center text-sm text-[#10B981] font-medium">You already claimed this gift.</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClaim}
                disabled={isSending || isConfirming || isWrongNetwork}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirm in wallet…
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <StablecoinMark symbol={stable.symbol} size={22} />
                    Claim ${Number(row.amount_per_claim).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                )}
              </button>
            )}

            {txHash && !isConfirmed && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-primary"
              >
                <ExternalLink className="w-3 h-3" />
                View on ArcScan
              </a>
            )}

            {giftPageUrl && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground">Share this gift</p>
                <PayLinkQr
                  url={giftPageUrl}
                  size={168}
                  caption="Scan to open this gift page on another phone or for a printed poster."
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <UsdcCoin size={14} />
                <span>Powered on Arc</span>
              </div>
              {address &&
                row &&
                address.toLowerCase() === row.creator_wallet.toLowerCase() && (
                  <Link href={`/gifts/stats/${slug}`} className="text-primary text-sm font-medium hover:underline">
                    Creator statistics
                  </Link>
                )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-3xl p-8 shadow-lg text-center space-y-6">
            <div className="w-24 h-24 bg-[#10B981] rounded-full flex items-center justify-center mx-auto">
              <Check className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re set!</h2>
              <AmountDisplay
                amount={row.amount_per_claim}
                token={stable.symbol}
                className="flex flex-col items-center"
                amountClassName="text-4xl font-bold text-primary tabular-nums"
              />
              <p className="text-muted-foreground mt-2">is on the way to your wallet.</p>
            </div>
            {txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary"
              >
                <ExternalLink className="w-4 h-4" />
                View transaction
              </a>
            )}
            <a
              href="/"
              className="block w-full h-14 border-2 border-border rounded-2xl font-semibold flex items-center justify-center hover:bg-muted/50"
            >
              Done
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
