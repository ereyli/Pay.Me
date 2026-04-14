import { NextResponse } from "next/server";
import { getPlatformAgentMetadata } from "@/lib/payme-agent";
import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  return NextResponse.json(getPlatformAgentMetadata(getSiteUrl()), {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
