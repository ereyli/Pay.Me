import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { createServerSupabase } from "@/lib/supabase";
import { arcTestnet, getStablecoinByAddress } from "@/lib/chain";
import { GIFT_DISTRIBUTOR_ABI, getGiftDistributorAddress } from "@/lib/gift-distributor";

type FeedItem = {
  id: string;
  kind: "payment_sent" | "request_completed" | "gift_claimed" | "gift_pool_claimed";
  message: string;
  subtext?: string;
  createdAt: string;
};

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const items: FeedItem[] = [];
    const shortWallet = (w: string) => `${w.slice(0, 2)}...${w.slice(-5)}`;

    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount_usdc, token_address, payer_wallet, recipient_wallet, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(8);

    for (const p of payments ?? []) {
      const token = getStablecoinByAddress(p.token_address).symbol;
      items.push({
        id: `pay-${p.id}`,
        kind: "payment_sent",
        message: `Someone sent ${p.amount_usdc} ${token}`,
        subtext: `${shortWallet(p.payer_wallet)} -> ${shortWallet(p.recipient_wallet)}`,
        createdAt: p.created_at,
      });
      items.push({
        id: `req-${p.id}`,
        kind: "request_completed",
        message: "A request was completed",
        subtext: `Paid by ${shortWallet(p.payer_wallet)}`,
        createdAt: p.created_at,
      });
    }

    const distributor = getGiftDistributorAddress();
    if (distributor) {
      const { data: gifts } = await supabase
        .from("gift_campaigns")
        .select("id, campaign_id, creator_wallet, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      for (const g of gifts ?? []) {
        try {
          const c = await publicClient.readContract({
            address: distributor,
            abi: GIFT_DISTRIBUTOR_ABI,
            functionName: "campaigns",
            args: [g.campaign_id as `0x${string}`],
          });
          const claimed = Array.isArray(c) ? Number(c[3] as bigint) : 0;
          if (claimed > 0) {
            items.push({
              id: `gift-claim-${g.id}`,
              kind: "gift_claimed",
              message: "A gift was claimed",
              subtext: `Gift pool by ${shortWallet(g.creator_wallet)}`,
              createdAt: g.created_at,
            });
          }
          if (claimed > 1) {
            items.push({
              id: `gift-pool-${g.id}`,
              kind: "gift_pool_claimed",
              message: `${claimed} people claimed a gift pool`,
              subtext: `Pool owner ${shortWallet(g.creator_wallet)}`,
              createdAt: g.created_at,
            });
          }
        } catch {
          // Ignore single campaign chain errors to keep feed resilient.
        }
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ items: items.slice(0, 20) });
  } catch (e) {
    console.error("feed error:", e);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
