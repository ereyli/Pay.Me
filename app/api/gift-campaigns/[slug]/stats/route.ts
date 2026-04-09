import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { createServerSupabase } from "@/lib/supabase";
import { arcTestnet, getStablecoinByAddress } from "@/lib/chain";
import { GIFT_DISTRIBUTOR_ABI, getGiftDistributorAddress } from "@/lib/gift-distributor";
import { formatUSDC } from "@/lib/token";
import type { GiftCampaign } from "@/types/database";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug || slug.length < 3) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: row, error } = await supabase.from("gift_campaigns").select("*").eq("slug", slug).maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const g = row as GiftCampaign;
    const campaignId = g.campaign_id as `0x${string}`;
    const stable = getStablecoinByAddress(g.token_address);
    const distributor = getGiftDistributorAddress();

    let claimedCount: number | null = null;
    let maxClaimsOnChain: number | null = null;
    let remaining: number | null = null;
    const claims: { claimer: string; txHash: string; blockNumber: string; amount: string }[] = [];

    if (distributor) {
      try {
        const c = await publicClient.readContract({
          address: distributor,
          abi: GIFT_DISTRIBUTOR_ABI,
          functionName: "campaigns",
          args: [campaignId],
        });
        if (Array.isArray(c) && c.length >= 4) {
          maxClaimsOnChain = Number(c[2] as bigint);
          claimedCount = Number(c[3] as bigint);
          if (maxClaimsOnChain != null && claimedCount != null) {
            remaining = Math.max(0, maxClaimsOnChain - claimedCount);
          }
        }
      } catch (e) {
        console.error("gift stats readContract:", e);
      }

      try {
        const logs = await publicClient.getContractEvents({
          address: distributor,
          abi: GIFT_DISTRIBUTOR_ABI,
          eventName: "GiftClaimed",
          args: { campaignId },
          fromBlock: 0n,
          toBlock: "latest",
        });

        for (const log of logs) {
          const claimer = (log.args as { claimer?: string }).claimer;
          const amount = (log.args as { amount?: bigint }).amount;
          if (!claimer || amount === undefined) continue;
          claims.push({
            claimer: claimer.toLowerCase(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber.toString(),
            amount: formatUSDC(amount),
          });
        }
        claims.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));
      } catch (e) {
        console.error("gift stats getContractEvents:", e);
      }
    }

    return NextResponse.json({
      slug: g.slug,
      title: g.title,
      campaignId: g.campaign_id,
      creatorWallet: g.creator_wallet,
      tokenSymbol: stable.symbol,
      amountPerClaim: g.amount_per_claim,
      maxClaimsDb: g.max_claims,
      viewCount: g.view_count ?? 0,
      fundTxHash: g.fund_tx_hash,
      createdAt: g.created_at,
      claimedCount,
      maxClaimsOnChain,
      remaining,
      claims,
      chainConfigured: Boolean(distributor),
    });
  } catch (e) {
    console.error("gift stats:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
