import { NextResponse } from "next/server";
import { getAgentTrustSummary } from "@/lib/trust";

export async function GET() {
  try {
    const summary = await getAgentTrustSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
