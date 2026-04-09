import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_address, username, display_name, bio, tip_jar_slug, links")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile: data });
}
