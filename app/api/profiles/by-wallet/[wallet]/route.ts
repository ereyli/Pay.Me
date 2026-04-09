import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

type Body = {
  username?: string;
  displayName?: string;
  bio?: string;
  tipJarSlug?: string;
  links?: string[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const supabase = createServerSupabase();
  const normalized = wallet.toLowerCase();

  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_address, username, display_name, bio, tip_jar_slug, links")
    .eq("wallet_address", normalized)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const supabase = createServerSupabase();
  const normalized = wallet.toLowerCase();
  const body = (await req.json()) as Body;

  const username = body.username?.trim().toLowerCase();
  const reserved = new Set([
    "dashboard",
    "create",
    "activity",
    "profile",
    "pay",
    "gift",
    "gifts",
    "api",
    "track",
  ]);

  if (username && (!/^[a-z0-9-]{3,24}$/.test(username) || reserved.has(username))) {
    return NextResponse.json(
      {
        error:
          "Username only accepts English lowercase letters (a-z), numbers (0-9), and hyphen (-), 3-24 chars.",
      },
      { status: 400 }
    );
  }

  if (username) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("username", username)
      .maybeSingle();
    if (existing && existing.wallet_address !== normalized) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
  }

  const payload = {
    wallet_address: normalized,
    username: username ?? null,
    display_name: body.displayName?.trim() || null,
    bio: body.bio?.trim() || null,
    tip_jar_slug: body.tipJarSlug?.trim() || null,
    links: (body.links ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 5),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "wallet_address" })
    .select("wallet_address, username, display_name, bio, tip_jar_slug, links")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  return NextResponse.json({ profile: data });
}
