import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

/** Count a page open of /gift/[slug] (best-effort; not unique visitors). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug || slug.length < 3) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: row, error: selErr } = await supabase
      .from("gift_campaigns")
      .select("view_count")
      .eq("slug", slug)
      .maybeSingle();

    if (selErr || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const next = (row.view_count ?? 0) + 1;
    const { error: upErr } = await supabase.from("gift_campaigns").update({ view_count: next }).eq("slug", slug);

    if (upErr) {
      console.error("gift view_count update:", upErr);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ viewCount: next });
  } catch (e) {
    console.error("gift view:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
