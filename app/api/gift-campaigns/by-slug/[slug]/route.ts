import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getStablecoinByAddress } from "@/lib/chain";
import type { GiftCampaign } from "@/types/database";

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
    const { data, error } = await supabase.from("gift_campaigns").select("*").eq("slug", slug).maybeSingle();

    if (error) {
      console.error("gift by slug:", error);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = data as GiftCampaign;
    const stable = getStablecoinByAddress(row.token_address);

    return NextResponse.json({
      ...row,
      token_symbol: stable.symbol,
    });
  } catch (err) {
    console.error("gift by slug:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
