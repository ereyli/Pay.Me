import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createPaymentRequestSchema } from "@/types/validation";
import { generateSlug } from "@/lib/utils";
import { STABLECOINS } from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPaymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, amount, recipientWallet, expiresAt, slug: customSlug, token } =
      parsed.data;

    const tokenSymbol = token ?? "USDC";
    const tokenMeta = STABLECOINS.find((t) => t.symbol === tokenSymbol) ?? STABLECOINS[0];

    const supabase = createServerSupabase();
    const slug = customSlug || generateSlug();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("payment_requests")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This slug is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("payment_requests")
      .insert({
        title,
        description: description || null,
        amount_usdc: amount,
        token_address: tokenMeta.address.toLowerCase(),
        recipient_wallet: recipientWallet.toLowerCase(),
        slug,
        status: "pending",
        expires_at: expiresAt || null,
        allow_partial_payment: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create payment request" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Create payment request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
