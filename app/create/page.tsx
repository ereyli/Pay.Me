"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Share2, ExternalLink, Loader2, Printer } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { EurcCoin, UsdcCoin } from "@/components/brand/usdc-coin";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";
import { AppLayout } from "@/components/layout/app-layout";
import { AmountDisplay } from "@/components/payments/amount-display";
import { NumericKeypad } from "@/components/payments/numeric-keypad";
import { PayLinkQr } from "@/components/payments/pay-link-qr";
import { SocialShareActions } from "@/components/payments/social-share-actions";
import { createPaymentRequestSchema, type CreatePaymentRequestInput } from "@/types/validation";
import { generateSlug } from "@/lib/utils";

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const [createdLink, setCreatedLink] = useState<{
    id: string;
    url: string;
    slug: string;
    amount: string;
    title: string;
    note?: string;
    token: "USDC" | "EURC";
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialSlugRef = useRef<string | null>(null);
  if (initialSlugRef.current === null) {
    initialSlugRef.current = generateSlug();
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreatePaymentRequestInput>({
    resolver: zodResolver(createPaymentRequestSchema),
    defaultValues: {
      recipientWallet: address || "",
      token: "USDC",
      slug: initialSlugRef.current,
    },
  });

  const amount = watch("amount");
  const title = watch("title");
  const token = watch("token") ?? "USDC";
  const amountValue = watch("amount") ?? "";

  const onSubmit = async (data: CreatePaymentRequestInput) => {
    setIsSubmitting(true);
    try {
      const slug = data.slug?.trim() || generateSlug();
      const res = await fetch("/api/payment-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create payment link");
        return;
      }

      const result = await res.json();
      const url = `${window.location.origin}/pay/${result.slug}`;
      setCreatedLink({
        id: result.id,
        url,
        slug: result.slug,
        amount: data.amount,
        title: data.title,
        note: data.description,
        token: data.token ?? "USDC",
      });
      toast.success("Payment link created!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink.url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share && createdLink) {
      navigator.share({
        title: createdLink.title,
        text: `Pay me ${createdLink.amount} ${createdLink.token} for ${createdLink.title}`,
        url: createdLink.url,
      }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  const resetForm = () => {
    setCreatedLink(null);
    reset();
    setValue("recipientWallet", address || "");
    setValue("slug", generateSlug());
    setCopied(false);
  };

  const handleAmountChange = (next: string) => {
    setValue("amount", next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex justify-center">
              <UsdcCoin size={64} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-8">
              You need to connect your wallet to create payment links.
            </p>
            <ConnectButton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {!createdLink ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-1">Request money</h1>
              <p className="text-muted-foreground">Create a USDC or EURC link in seconds</p>
              <p className="text-sm mt-2">
                <a href="/gifts/create" className="text-primary font-medium hover:underline">
                  Create a gift link
                </a>{" "}
                (share a pool; each wallet claims once)
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              {/* Token */}
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

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-base font-medium">How much? ({token})</label>
                <div className="rounded-2xl border border-border/60 bg-elevated/60 p-4 space-y-3">
                  <AmountDisplay
                    amount={amountValue || "0"}
                    token={token}
                    className="text-center"
                    amountClassName="text-4xl md:text-5xl font-bold text-primary tabular-nums"
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Or type amount manually</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountValue}
                      onChange={(e) =>
                        handleAmountChange(
                          e.target.value
                            .replace(",", ".")
                            .replace(/[^0-9.]/g, "")
                        )
                      }
                      placeholder="0"
                      className="w-full h-10 rounded-lg border border-border/70 bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <NumericKeypad value={amountValue} onChange={handleAmountChange} />
                  <input type="hidden" {...register("amount")} />
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-base font-medium">What is this for?</label>
                <input
                  type="text"
                  {...register("title")}
                  placeholder="e.g., Design Payment"
                  className="w-full h-14 text-base bg-elevated border-none rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-base font-medium text-muted-foreground">Add a note (optional)</label>
                <textarea
                  {...register("description")}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="w-full text-base bg-elevated border-none rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Recipient Wallet */}
              <div className="space-y-2">
                <label className="text-base font-medium">Who gets paid?</label>
                <input
                  type="text"
                  {...register("recipientWallet")}
                  placeholder="0x..."
                  className="w-full h-14 text-sm font-mono bg-elevated border-none rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {address && (
                  <button
                    type="button"
                    onClick={() => setValue("recipientWallet", address)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Use my wallet ({address.slice(0, 6)}...{address.slice(-4)})
                  </button>
                )}
                {errors.recipientWallet && (
                  <p className="text-sm text-red-500">{errors.recipientWallet.message}</p>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <label className="text-base font-medium text-muted-foreground">Expires (optional)</label>
                <input
                  type="datetime-local"
                  {...register("expiresAt")}
                  className="w-full h-14 text-base bg-elevated border-none rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Link slug — auto-filled, editable */}
              <div className="space-y-2">
                <label className="text-base font-medium text-muted-foreground">
                  Link path
                </label>
                <p className="text-xs text-muted-foreground -mt-1 mb-1">
                  A unique path is generated automatically. Change it if you want a custom URL.
                </p>
                <div className="flex items-center bg-elevated rounded-2xl px-4 h-14">
                  <span className="text-muted-foreground text-sm shrink-0 mr-1">…/pay/</span>
                  <input
                    type="text"
                    {...register("slug")}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono min-w-0"
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 cta-primary hover:opacity-95 disabled:opacity-60 text-primary-foreground rounded-2xl text-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create request link"
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-1">Link Created!</h1>
              <p className="text-muted-foreground">Share this link to receive payment</p>
            </div>

            {/* Preview Card */}
            <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Requesting</div>
                <AmountDisplay
                  amount={createdLink.amount}
                  token={createdLink.token}
                  className="flex flex-col items-center"
                  amountClassName="text-5xl md:text-6xl font-bold text-primary tabular-nums"
                />
              </div>

              <div className="text-center py-4 border-y border-border">
                <div className="text-sm text-muted-foreground mb-1">For</div>
                <div className="text-xl font-semibold">{createdLink.title}</div>
                {createdLink.note && (
                  <div className="text-sm text-muted-foreground mt-2">{createdLink.note}</div>
                )}
              </div>

              {/* Link Display */}
              <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3">
                <div className="flex-1 text-sm text-muted-foreground truncate">{createdLink.url}</div>
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

              <div className="flex justify-center pt-2 pb-1">
                <PayLinkQr url={createdLink.url} size={192} />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Share your link or QR destination on social platforms
                </p>
                <SocialShareActions
                  url={createdLink.url}
                  title={createdLink.title}
                  text={`Pay me ${createdLink.amount} ${createdLink.token} for ${createdLink.title}`}
                />
              </div>

              <a
                href={`/pay/${createdLink.slug}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Open print poster
              </a>
              <p className="text-center text-[11px] text-muted-foreground px-2">
                QR stays on{" "}
                <a
                  href={`/dashboard/links/${createdLink.id}`}
                  className="text-primary font-medium hover:underline"
                >
                  this link&apos;s detail page
                </a>{" "}
                and in My Links.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <a
                  href={createdLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-14 border-2 border-border rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </a>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="w-full h-14 border-2 border-border rounded-2xl font-semibold hover:bg-muted/50 transition-colors"
            >
              Create Another Link
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
