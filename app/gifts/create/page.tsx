"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, Gift, Loader2, Share2 } from "lucide-react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { EurcCoin, UsdcCoin } from "@/components/brand/usdc-coin";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { AppLayout } from "@/components/layout/app-layout";
import { AmountDisplay } from "@/components/payments/amount-display";
import { PayLinkQr } from "@/components/payments/pay-link-qr";
import { SocialShareActions } from "@/components/payments/social-share-actions";
import { createGiftCampaignFormSchema, type CreateGiftCampaignFormInput } from "@/types/validation";
import { generateSlug } from "@/lib/utils";
import { ERC20_ABI, arcTestnet, STABLECOINS } from "@/lib/chain";
import { GIFT_DISTRIBUTOR_ABI, getGiftDistributorAddress, giftCampaignIdFromUuid } from "@/lib/gift-distributor";
import { formatUSDC, parseUSDC } from "@/lib/token";

export default function CreateGiftPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const distributor = getGiftDistributorAddress();
  const { data: creationFeeWei, isLoading: feeLoading } = useReadContract({
    address: distributor ?? "0x0000000000000000000000000000000000000000",
    abi: GIFT_DISTRIBUTOR_ABI,
    functionName: "creationFee",
    chainId: arcTestnet.id,
    query: { enabled: Boolean(distributor) },
  });
  const uuidRef = useRef<string | null>(null);
  if (uuidRef.current === null) {
    uuidRef.current = crypto.randomUUID();
  }
  const campaignId = giftCampaignIdFromUuid(uuidRef.current) as `0x${string}`;

  const initialSlugRef = useRef<string | null>(null);
  if (initialSlugRef.current === null) {
    initialSlugRef.current = generateSlug();
  }

  const [created, setCreated] = useState<{
    url: string;
    slug: string;
    amountPerClaim: string;
    maxClaims: number;
    token: "USDC" | "EURC";
    title?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateGiftCampaignFormInput>({
    resolver: zodResolver(createGiftCampaignFormSchema),
    defaultValues: {
      token: "USDC",
      slug: initialSlugRef.current,
      maxClaims: 10,
    },
  });

  const token = watch("token") ?? "USDC";
  const amountPerClaim = watch("amountPerClaim");
  const maxClaims = watch("maxClaims");

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;

  const poolWei =
    amountPerClaim && maxClaims != null && !Number.isNaN(Number(maxClaims)) && Number(maxClaims) > 0
      ? (() => {
          try {
            const per = parseUSDC(String(amountPerClaim));
            return per * BigInt(Math.floor(Number(maxClaims)));
          } catch {
            return null;
          }
        })()
      : null;

  const feeWei = typeof creationFeeWei === "bigint" ? creationFeeWei : 0n;
  const approveTotalWei = poolWei !== null ? poolWei + feeWei : null;

  const poolDisplay = poolWei !== null ? formatUSDC(poolWei) : "—";
  const feeDisplay = feeLoading ? "…" : formatUSDC(feeWei);
  const approveDisplay =
    approveTotalWei !== null ? formatUSDC(approveTotalWei) : "—";

  const onSubmit = async (data: CreateGiftCampaignFormInput) => {
    if (!distributor) {
      toast.error("Gift contract address is not configured (NEXT_PUBLIC_GIFT_DISTRIBUTOR_ADDRESS).");
      return;
    }
    if (!address || !publicClient) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (isWrongNetwork) {
      try {
        await switchChain?.({ chainId: arcTestnet.id });
      } catch {
        toast.error("Please switch to Arc Testnet.");
      }
      return;
    }

    const slug = data.slug?.trim() || generateSlug();
    const tokenMeta = STABLECOINS.find((t) => t.symbol === data.token)!;
    const per = parseUSDC(data.amountPerClaim);
    const max = BigInt(Math.floor(data.maxClaims));
    const totalDeposit = per * max;
    const fee = typeof creationFeeWei === "bigint" ? creationFeeWei : 0n;
    const approveCap = totalDeposit + fee;

    setFunding(true);
    try {
      toast.info("Step 1/2: Approve gift pool + platform fee…");
      const hashApprove = await writeContractAsync({
        chainId: arcTestnet.id,
        address: tokenMeta.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [distributor, approveCap],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashApprove });

      toast.info("Step 2/2: Fund the gift pool…");
      const hashFund = await writeContractAsync({
        chainId: arcTestnet.id,
        address: distributor,
        abi: GIFT_DISTRIBUTOR_ABI,
        functionName: "fundCampaign",
        args: [campaignId, tokenMeta.address, per, max],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashFund });

      const res = await fetch("/api/gift-campaigns/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          campaignId,
          creatorWallet: address,
          token: data.token,
          amountPerClaim: data.amountPerClaim,
          maxClaims: data.maxClaims,
          fundTxHash: hashFund,
          title: data.title,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to register gift link");
        return;
      }

      const url = `${window.location.origin}/gift/${slug}`;
      setCreated({
        url,
        slug,
        amountPerClaim: data.amountPerClaim,
        maxClaims: data.maxClaims,
        token: data.token,
        title: data.title,
      });
      toast.success("Gift link is live!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("user rejected")) {
        toast.error(msg || "Transaction failed");
      }
    } finally {
      setFunding(false);
    }
  };

  const handleCopy = () => {
    if (created) {
      navigator.clipboard.writeText(created.url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share && created) {
      navigator
        .share({
          title: created.title || "Gift",
          text: `Claim ${created.amountPerClaim} ${created.token} — ${created.maxClaims} available`,
          url: created.url,
        })
        .catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  const resetForm = () => {
    setCreated(null);
    uuidRef.current = crypto.randomUUID();
    reset();
    setValue("token", "USDC");
    setValue("slug", generateSlug());
    setCopied(false);
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Gift className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-8">
              You need Arc Testnet USDC or EURC to fund a gift pool.
            </p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!distributor) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-10 text-center space-y-4">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Gift links not configured</h1>
          <p className="text-muted-foreground text-sm">
            Deploy <code className="text-xs bg-muted px-1 rounded">GiftDistributor</code> on Arc testnet and set{" "}
            <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_GIFT_DISTRIBUTOR_ADDRESS</code> in your
            environment.
          </p>
          <Link href="/create" className="text-primary font-medium hover:underline inline-block">
            Create a payment link instead
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {!created ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-1 flex items-center gap-2">
                <Gift className="w-8 h-8 text-primary shrink-0" />
                Send a gift
              </h1>
              <p className="text-muted-foreground">
                Fund once, then people claim one-by-one from your link.
              </p>
              <p className="text-sm text-muted-foreground">Each person gets {amountPerClaim || "0"} {token}.</p>
            </div>

            {isWrongNetwork && (
              <button
                type="button"
                onClick={() => switchChain?.({ chainId: arcTestnet.id })}
                className="w-full py-3 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200 text-sm font-medium"
              >
                Switch to Arc Testnet to continue
              </button>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-base font-medium">Stablecoin *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 h-14 rounded-2xl border-2 cursor-pointer transition-colors ${
                      token === "USDC"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-elevated hover:bg-muted/50"
                    }`}
                  >
                    <input type="radio" value="USDC" className="sr-only" {...register("token")} />
                    <UsdcCoin size={28} />
                    <span className="font-semibold">USDC</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 h-14 rounded-2xl border-2 cursor-pointer transition-colors ${
                      token === "EURC"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-elevated hover:bg-muted/50"
                    }`}
                  >
                    <input type="radio" value="EURC" className="sr-only" {...register("token")} />
                    <EurcCoin size={28} />
                    <span className="font-semibold">EURC</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-base font-medium">How much per person? ({token})</label>
                <div className="relative">
                  <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 flex items-center">
                    <StablecoinMark symbol={token} size={44} />
                  </span>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    {...register("amountPerClaim")}
                    placeholder="0"
                    className="w-full text-3xl md:text-5xl font-bold pl-[4.25rem] md:pl-24 pr-6 py-4 bg-transparent border-none outline-none"
                  />
                </div>
                {errors.amountPerClaim && (
                  <p className="text-sm text-red-500">{errors.amountPerClaim.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium">How many people?</label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  {...register("maxClaims", { valueAsNumber: true })}
                  className="w-full h-14 text-lg bg-elevated border-none rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <details className="rounded-2xl bg-elevated/80 border border-border/60 p-4 text-sm">
                  <summary className="cursor-pointer font-medium">Cost details</summary>
                  <div className="space-y-2 mt-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Total gift pool</span>
                    <span className="font-mono font-medium tabular-nums">
                      {poolDisplay} {token}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span className="font-mono font-medium tabular-nums">
                      {feeDisplay} {token}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between gap-4 font-medium">
                    <span>Total from wallet</span>
                    <span className="font-mono tabular-nums">
                      {approveDisplay} {token}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug pt-1">
                    The fee is sent to the protocol and can be changed on-chain by the owner. It uses the same
                    token you chose (e.g. 0.5 USDC or 0.5 EURC when the fee is 0.5 units).
                  </p>
                  </div>
                </details>
                {errors.maxClaims && <p className="text-sm text-red-500">{errors.maxClaims.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-muted-foreground">Title (optional)</label>
                <input
                  type="text"
                  {...register("title")}
                  placeholder="e.g., Happy launch day"
                  className="w-full h-14 text-base bg-elevated border-none rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-muted-foreground">Gift link path</label>
                <div className="flex items-center bg-elevated rounded-2xl px-4 h-14">
                  <span className="text-muted-foreground text-sm shrink-0 mr-1">…/gift/</span>
                  <input
                    type="text"
                    {...register("slug")}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono min-w-0"
                  />
                </div>
                {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
              </div>

              <button
                type="submit"
                disabled={funding || isWriting || isWrongNetwork || feeLoading}
                className="w-full h-14 cta-primary hover:opacity-95 disabled:opacity-60 text-primary-foreground rounded-2xl text-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {funding || isWriting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirm in wallet…
                  </>
                ) : feeLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading fee…
                  </>
                ) : (
                  "Approve & fund gift pool"
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Two transactions: approve pool + fee, then <code className="text-[10px]">fundCampaign</code> (fee is
                pulled first, then the pool).
              </p>
            </form>

            <p className="text-center text-sm">
              <Link href="/create" className="text-primary hover:underline">
                Regular payment link instead
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-1">Gift link ready</h1>
              <p className="text-muted-foreground">Share it — each address claims at most once</p>
            </div>

            <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Each claim</div>
                <AmountDisplay
                  amount={created.amountPerClaim}
                  token={created.token}
                  className="flex flex-col items-center"
                  amountClassName="text-4xl md:text-5xl font-bold text-primary tabular-nums"
                />
                <div className="text-sm text-muted-foreground">
                  {created.token} · {created.maxClaims} gifts
                </div>
              </div>

              {created.title && (
                <div className="text-center py-3 border-y border-border">
                  <div className="font-semibold">{created.title}</div>
                </div>
              )}

              <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3">
                <div className="flex-1 text-sm text-muted-foreground truncate">{created.url}</div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-card transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-center">
                <PayLinkQr
                  url={created.url}
                  size={180}
                  caption="Scan to open the gift page. The same QR stays on Stats after you leave this screen."
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Share gift link (QR and link open the same page)
                </p>
                <SocialShareActions
                  url={created.url}
                  title={created.title || "Gift link"}
                  text={`Claim ${created.amountPerClaim} ${created.token} - ${created.maxClaims} gifts available`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <a
                  href={created.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-14 border-2 border-border rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-muted/50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>

              <Link
                href={`/gifts/stats/${created.slug}`}
                className="block w-full h-12 rounded-2xl border border-border text-center text-sm font-medium leading-[3rem] hover:bg-muted/50 transition-colors"
              >
                Track opens and claims
              </Link>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="w-full h-14 border-2 border-border rounded-2xl font-semibold hover:bg-muted/50"
            >
              Create another gift link
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
