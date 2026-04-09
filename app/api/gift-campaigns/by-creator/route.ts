import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { GiftCampaign } from "@/types/database";

/** List gift campaigns funded by a wallet (for dashboard). */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
    if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: "Valid wallet query param required" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("gift_campaigns")
      .select("id, slug, title, amount_per_claim, max_claims, token_address, view_count, created_at, campaign_id")
      .eq("creator_wallet", wallet)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("gift by-creator:", error);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    return NextResponse.json({ campaigns: (data ?? []) as Partial<GiftCampaign>[] });
  } catch (e) {
    console.error("gift by-creator:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
