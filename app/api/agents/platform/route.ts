import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import {
  ERC8004_CONTRACTS,
  readAgentIdentity,
  registerPlatformAgentOnchain,
  requireAgentEnv,
} from "@/lib/erc8004";
import { getPlatformAgentMetadata, PAYME_AGENT_SLUG } from "@/lib/payme-agent";
import { getSiteUrl } from "@/lib/site-url";
import { arcTestnet } from "@/lib/chain";

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("erc8004_agents")
    .select("*")
    .eq("slug", PAYME_AGENT_SLUG)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      configured: false,
      slug: PAYME_AGENT_SLUG,
      metadata: getPlatformAgentMetadata(getSiteUrl()),
    });
  }

  let onchain: { owner: string; tokenURI: string } | null = null;
  if (data.agent_token_id) {
    try {
      onchain = await readAgentIdentity(data.agent_token_id);
    } catch {
      onchain = null;
    }
  }

  const { data: reputationEvents, error: reputationError } = await supabase
    .from("erc8004_reputation_events")
    .select("*")
    .eq("agent_slug", PAYME_AGENT_SLUG)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reputationError) {
    return NextResponse.json({ error: reputationError.message }, { status: 500 });
  }

  const { data: validationEvents, error: validationError } = await supabase
    .from("erc8004_validation_events")
    .select("*")
    .eq("agent_slug", PAYME_AGENT_SLUG)
    .order("created_at", { ascending: false })
    .limit(20);

  if (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: 500 });
  }

  const scores = (reputationEvents ?? []).map((event) => event.score);
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : null;

  return NextResponse.json({
    configured: true,
    agent: data,
    onchain,
    reputationEvents: reputationEvents ?? [],
    validationEvents: validationEvents ?? [],
    stats: {
      reputationCount: reputationEvents?.length ?? 0,
      validationCount: validationEvents?.length ?? 0,
      averageScore,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-payme-agent-secret");
    if (!secret || secret !== requireAgentEnv("PAYME_AGENT_ADMIN_SECRET")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabase();
    const existing = await supabase
      .from("erc8004_agents")
      .select("*")
      .eq("slug", PAYME_AGENT_SLUG)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    if (existing.data?.agent_token_id) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        agent: existing.data,
      });
    }

    const baseUrl = getSiteUrl();
    const metadata = getPlatformAgentMetadata(baseUrl);
    const metadataUri =
      process.env.PAYME_AGENT_METADATA_URI ||
      `${baseUrl}/api/agents/platform/metadata`;

    const registered = await registerPlatformAgentOnchain(metadataUri);

    const row = {
      slug: PAYME_AGENT_SLUG,
      name: metadata.name,
      kind: "platform",
      status: "registered" as const,
      description: metadata.description,
      owner_wallet: registered.ownerWallet.toLowerCase(),
      validator_wallet: metadata.validator_wallet.toLowerCase(),
      identity_registry: ERC8004_CONTRACTS.identityRegistry,
      reputation_registry: ERC8004_CONTRACTS.reputationRegistry,
      validation_registry: ERC8004_CONTRACTS.validationRegistry,
      metadata_uri: metadataUri,
      metadata_json: metadata,
      agent_token_id: registered.tokenId,
      register_tx_hash: registered.txHash,
      chain_id: arcTestnet.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("erc8004_agents")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: data,
      explorer: `https://testnet.arcscan.app/tx/${registered.txHash}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
