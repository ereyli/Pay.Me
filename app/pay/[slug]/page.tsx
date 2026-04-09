"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Loader2, ExternalLink, AlertCircle, Clock } from "lucide-react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { ERC20_ABI, arcTestnet, getStablecoinByAddress } from "@/lib/chain";
import { getPayRouterAddress, PAY_ROUTER_ABI } from "@/lib/pay-router";
import { paymentRefFromRequestId } from "@/lib/payment-ref";
import { formatUSDC, grossAmountForRecipientNet, parseUSDC, shortenAddress } from "@/lib/token";
import type { PaymentRequest } from "@/types/database";
import { AmountDisplay } from "@/components/payments/amount-display";
import { UsdcCoin } from "@/components/brand/usdc-coin";
import { StablecoinMark } from "@/components/brand/stablecoin-mark";

export default function PayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [verifying, setVerifying] = useState(false);
  const [payerMessage, setPayerMessage] = useState("");

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;

  const { writeContractAsync, isPending: isSending } = useWriteContract();
  const publicClient = usePublicClient();

  const payRouter = getPayRouterAddress();
  const { data: feeBpsOnChain } = useReadContract({
    address: payRouter ?? "0x0000000000000000000000000000000000000000",
    abi: PAY_ROUTER_ABI,
    functionName: "feeBps",
    chainId: arcTestnet.id,
    query: { enabled: Boolean(payRouter && request) },
  });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    supabase
      .from("payment_requests")
      .select("*")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
      if (error || !data) {
        setNotFound(true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = data as any;
        setRequest(req);
        if (req.status === "paid") setIsPaid(true);
      }
        setLoading(false);
      });
  }, [slug]);

  // After tx confirmed, verify on backend
  useEffect(() => {
    if (!isConfirmed || !txHash || !request || !address) return;
    setVerifying(true);
    fetch(`/api/payment-requests/${request.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash,
        payerWallet: address,
        paymentRequestId: request.id,
        payerMessage: payerMessage.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setIsPaid(true);
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          toast.success("Payment confirmed!");
        } else {
          toast.error(data.error || "Payment verification failed");
        }
      })
      .catch(() => toast.error("Verification failed. Contact the recipient with your tx hash."))
      .finally(() => setVerifying(false));
  }, [isConfirmed, txHash, request, address]);

  const handlePay = async () => {
    if (!request || !address || !publicClient) return;

    const stable = getStablecoinByAddress(request.token_address);
    const netAmount = parseUSDC(request.amount_usdc);
    const paymentRef = paymentRefFromRequestId(request.id);

    try {
      if (payRouter) {
        const fb = Number(feeBpsOnChain ?? (await publicClient.readContract({
          address: payRouter,
          abi: PAY_ROUTER_ABI,
          functionName: "feeBps",
        })));
        const grossAmount = grossAmountForRecipientNet(netAmount, fb);

        toast.info("Step 1/2: Approve the router in your wallet…");
        const hashApprove = await writeContractAsync({
          chainId: arcTestnet.id,
          address: stable.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [payRouter, grossAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: hashApprove });

        toast.info("Step 2/2: Confirm payment…");
        const hashPay = await writeContractAsync({
          chainId: arcTestnet.id,
          address: payRouter,
          abi: PAY_ROUTER_ABI,
          functionName: "pay",
          args: [
            stable.address,
            request.recipient_wallet as `0x${string}`,
            grossAmount,
            paymentRef,
          ],
        });
        setTxHash(hashPay);
        toast.info("Transaction submitted! Waiting for confirmation…");
      } else {
        const hash = await writeContractAsync({
          chainId: arcTestnet.id,
          address: stable.address,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [request.recipient_wallet as `0x${string}`, netAmount],
        });
        setTxHash(hash);
        toast.info("Transaction submitted! Waiting for confirmation…");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("User rejected") || msg.includes("user rejected") ? "Transaction rejected" : "Transaction failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-lg text-center max-w-sm w-full">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Link Not Found</h2>
          <p className="text-muted-foreground">This payment link doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isExpired =
    request.expires_at && new Date(request.expires_at) < new Date();

  const stable = getStablecoinByAddress(request.token_address);
  const netForDisplay = parseUSDC(request.amount_usdc);
  const grossForDisplay =
    payRouter && feeBpsOnChain != null
      ? grossAmountForRecipientNet(netForDisplay, Number(feeBpsOnChain))
      : netForDisplay;
  const showFeeLine = Boolean(payRouter && grossForDisplay > netForDisplay);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!isPaid ? (
          <div className="bg-card rounded-3xl p-8 shadow-lg space-y-6">
            {/* Brand */}
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <UsdcCoin size={48} />
              </div>
              <div className="text-sm text-muted-foreground">pay.me</div>
            </div>

            {/* Status banners */}
            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <div className="font-medium text-red-700">Link Expired</div>
                  <div className="text-sm text-red-600">This payment link has expired.</div>
                </div>
              </div>
            )}

            {request.status === "cancelled" && (
              <div className="bg-muted/40 border border-border rounded-2xl p-4">
                <div className="font-medium text-foreground">Link Cancelled</div>
                <div className="text-sm text-muted-foreground">This payment request has been cancelled.</div>
              </div>
            )}

            {/* Recipient Info */}
            <div className="text-center py-4 border-y border-border">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2775CA] to-[#1A5FA0] flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {request.recipient_wallet.slice(2, 4).toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground mb-1">Payment to</div>
              <div className="text-base font-semibold font-mono">
                {shortenAddress(request.recipient_wallet)}
              </div>
            </div>

            {/* Amount */}
            <div className="text-center py-6">
              <div className="text-sm text-muted-foreground mb-2">How much?</div>
              <AmountDisplay
                amount={request.amount_usdc}
                token={stable.symbol}
                className="flex flex-col items-center"
                amountClassName="text-5xl sm:text-6xl font-bold text-primary tabular-nums"
              />
              <div className="text-sm text-muted-foreground mt-2">{stable.symbol} on Arc Testnet</div>
              {showFeeLine && (
                <p className="text-xs text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed">
                  Recipient receives{" "}
                  <span className="font-medium text-foreground">{request.amount_usdc}</span>{" "}
                  {stable.symbol}. You pay{" "}
                  <span className="font-medium text-foreground">{formatUSDC(grossForDisplay)}</span>{" "}
                  {stable.symbol} (includes protocol fee).
                </p>
              )}
            </div>

            {/* Payment Details */}
            <div className="bg-elevated rounded-2xl p-4 space-y-2">
              <div className="font-semibold">{request.title}</div>
              {request.description && (
                <div className="text-sm text-muted-foreground">{request.description}</div>
              )}
              {request.expires_at && !isExpired && (
                <div className="text-xs text-[#F59E0B] flex items-center gap-1 mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {new Date(request.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <textarea
                value={payerMessage}
                onChange={(e) => setPayerMessage(e.target.value.slice(0, 160))}
                placeholder="thanks, for design, coffee..."
                rows={2}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Wrong Network Warning */}
            {isWrongNetwork && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-4">
                <p className="text-sm text-[#F59E0B] font-medium mb-2">Wrong Network</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Switch to Arc Testnet to make this payment.
                </p>
                <button
                  onClick={() => switchChain({ chainId: arcTestnet.id })}
                  className="w-full h-10 bg-[#F59E0B] text-white rounded-xl text-sm font-semibold"
                >
                  Switch to Arc Testnet
                </button>
              </div>
            )}

            {/* Action Button */}
            {!isConnected ? (
              <div className="flex justify-center">
                <ConnectButton label="Connect Wallet to Pay" />
              </div>
            ) : isExpired || request.status === "cancelled" ? (
              <button
                disabled
                className="w-full h-14 bg-muted text-muted-foreground rounded-2xl text-lg font-semibold cursor-not-allowed"
              >
                {isExpired ? "Payment Expired" : "Payment Cancelled"}
              </button>
            ) : (
              <button
                onClick={handlePay}
                disabled={isSending || isConfirming || verifying || isWrongNetwork}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-lg font-semibold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirm in wallet...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming...
                  </>
                ) : verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <StablecoinMark symbol={stable.symbol} size={22} className="ring-2 ring-white/40" />
                    Pay ${Number(request.amount_usdc).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                )}
              </button>
            )}

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                Secure
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <UsdcCoin size={14} />
                <span>Powered on Arc</span>
              </div>
            </div>

            <div className="text-center">
              <Link
                href={`/pay/${slug}/print`}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Print QR poster (for counter or sticker)
              </Link>
            </div>

            {txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View transaction on ArcScan
              </a>
            )}
          </div>
        ) : (
          <div className="min-h-[78vh] bg-card rounded-3xl p-8 shadow-lg text-center space-y-8 flex flex-col justify-center">
            <div className="w-24 h-24 bg-[#10B981] rounded-full flex items-center justify-center mx-auto">
              <Check className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Paid</h2>
              <AmountDisplay
                amount={request.amount_usdc}
                token={stable.symbol}
                className="flex flex-col items-center"
                amountClassName="text-5xl font-bold text-primary tabular-nums"
              />
              <p className="text-muted-foreground">You sent {shortenAddress(request.recipient_wallet)}</p>
            </div>
            <div className="space-y-3">
              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View transaction
                </a>
              )}
              <Link
                href="/create"
                className="block w-full h-12 cta-primary text-primary-foreground rounded-2xl font-semibold leading-[3rem]"
              >
                Request money
              </Link>
              <a
                href="/"
                className="block w-full h-12 border border-border rounded-2xl font-semibold leading-[3rem] hover:bg-muted/40 transition-colors"
              >
                Done
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
