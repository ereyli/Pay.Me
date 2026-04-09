import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, http } from "viem";
import { createServerSupabase } from "@/lib/supabase";
import { activateGiftCampaignSchema } from "@/types/validation";
import { arcTestnet, STABLECOINS } from "@/lib/chain";
import { GIFT_DISTRIBUTOR_ABI, getGiftDistributorAddress } from "@/lib/gift-distributor";
import { parseUSDC } from "@/lib/token";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

export async function POST(req: NextRequest) {
  try {
    const distributor = getGiftDistributorAddress();
    if (!distributor) {
      return NextResponse.json(
        { error: "Gift distributor contract is not configured on this deployment" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = activateGiftCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { slug, campaignId, creatorWallet, token, amountPerClaim, maxClaims, fundTxHash, title } =
      parsed.data;

    const tokenMeta = STABLECOINS.find((t) => t.symbol === token)!;
    const amountPerClaimWei = parseUSDC(amountPerClaim);
    const expectedTotal = amountPerClaimWei * BigInt(maxClaims);

    const supabase = createServerSupabase();

    const { data: dupTx } = await supabase
      .from("gift_campaigns")
      .select("id")
      .eq("fund_tx_hash", fundTxHash)
      .maybeSingle();
    if (dupTx) {
      return NextResponse.json({ error: "This funding transaction was already registered" }, { status: 409 });
    }

    const { data: slugGift } = await supabase.from("gift_campaigns").select("id").eq("slug", slug).maybeSingle();
    if (slugGift) {
      return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
    }

    const { data: slugPay } = await supabase.from("payment_requests").select("id").eq("slug", slug).maybeSingle();
    if (slugPay) {
      return NextResponse.json({ error: "This slug is already used by a payment link" }, { status: 409 });
    }

    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: fundTxHash as `0x${string}` });
    } catch {
      return NextResponse.json({ error: "Transaction not found on Arc testnet" }, { status: 400 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    const distLower = distributor.toLowerCase();
    let found = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== distLower) continue;
      try {
        const decoded = decodeEventLog({
          abi: GIFT_DISTRIBUTOR_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "CampaignFunded") continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = decoded.args as any;
        const idMatch = a.campaignId?.toLowerCase?.() === campaignId.toLowerCase();
        const creatorMatch = a.creator?.toLowerCase?.() === creatorWallet.toLowerCase();
        const tokenMatch = a.token?.toLowerCase?.() === tokenMeta.address.toLowerCase();
        const perMatch = a.amountPerClaim === amountPerClaimWei;
        const maxMatch = a.maxClaims === BigInt(maxClaims);
        const totalMatch = a.totalDeposited === expectedTotal;
        if (idMatch && creatorMatch && tokenMatch && perMatch && maxMatch && totalMatch) {
          found = true;
          break;
        }
      } catch {
        // not this event
      }
    }

    if (!found) {
      return NextResponse.json(
        {
          error:
            "Could not verify CampaignFunded on this transaction. Check amount, token, campaign id, and that you used the gift distributor contract.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("gift_campaigns")
      .insert({
        slug,
        campaign_id: campaignId.toLowerCase(),
        creator_wallet: creatorWallet.toLowerCase(),
        token_address: tokenMeta.address.toLowerCase(),
        amount_per_claim: amountPerClaim,
        max_claims: maxClaims,
        chain_id: arcTestnet.id,
        fund_tx_hash: fundTxHash,
        title: title?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("gift_campaigns insert:", error);
      return NextResponse.json({ error: "Failed to save gift campaign" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("activate gift campaign:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
