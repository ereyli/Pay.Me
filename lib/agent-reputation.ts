import { PAYME_AGENT_SLUG } from "@/lib/payme-agent";
import { writeAgentReputationOnchain } from "@/lib/erc8004";
import { createServerSupabase } from "@/lib/supabase";

export async function recordPaymentSuccessReputation(input: {
  paymentRequestId: string;
  paymentTxHash: string;
  payerWallet: string;
  recipientWallet: string;
  amountUsdc: string;
  tokenAddress: string;
}) {
  const supabase = createServerSupabase();

  const { data: agent, error: agentError } = await supabase
    .from("erc8004_agents")
    .select("*")
    .eq("slug", PAYME_AGENT_SLUG)
    .maybeSingle();

  if (agentError) {
    throw new Error(agentError.message);
  }

  if (!agent?.agent_token_id) {
    return { skipped: true as const, reason: "agent-not-registered" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("erc8004_reputation_events")
    .select("id, reputation_tx_hash, status")
    .eq("payment_tx_hash", input.paymentTxHash)
    .eq("agent_slug", PAYME_AGENT_SLUG)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.reputation_tx_hash) {
    return { skipped: true as const, reason: "already-recorded" };
  }

  const score = 95;
  const tag = "payment_verified";
  const comment = `Verified ${input.amountUsdc} payment from ${input.payerWallet} to ${input.recipientWallet}`;

  const onchain = await writeAgentReputationOnchain({
    agentTokenId: agent.agent_token_id,
    score,
    tag,
    comment,
    evidenceUri: `https://testnet.arcscan.app/tx/${input.paymentTxHash}`,
    metadataUri: agent.metadata_uri ?? undefined,
  });

  const payload = {
    agent_slug: PAYME_AGENT_SLUG,
    agent_token_id: agent.agent_token_id,
    payment_request_id: input.paymentRequestId,
    payment_tx_hash: input.paymentTxHash,
    reputation_tx_hash: onchain.txHash,
    score,
    tag,
    feedback_type: 0,
    comment,
    feedback_hash: onchain.feedbackHash,
    status: "confirmed" as const,
  };

  const { error: upsertError } = await supabase
    .from("erc8004_reputation_events")
    .upsert(payload, { onConflict: "payment_tx_hash" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return {
    skipped: false as const,
    reputationTxHash: onchain.txHash,
  };
}
