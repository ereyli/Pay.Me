import { PAYME_AGENT_SLUG } from "@/lib/payme-agent";
import { createServerSupabase } from "@/lib/supabase";
import { writeAgentValidationOnchain } from "@/lib/erc8004";

export async function recordPaymentValidation(input: {
  paymentRequestId: string;
  paymentTxHash: string;
}) {
  const supabase = createServerSupabase();

  const { data: agent, error: agentError } = await supabase
    .from("erc8004_agents")
    .select("*")
    .eq("slug", PAYME_AGENT_SLUG)
    .maybeSingle();

  if (agentError) throw new Error(agentError.message);
  if (!agent?.agent_token_id) {
    return { skipped: true as const, reason: "agent-not-registered" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("erc8004_validation_events")
    .select("id, response_tx_hash")
    .eq("payment_tx_hash", input.paymentTxHash)
    .eq("agent_slug", PAYME_AGENT_SLUG)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.response_tx_hash) {
    return { skipped: true as const, reason: "already-recorded" };
  }

  const tag = "trusted_payment";
  const requestSeed = `trusted_payment:${input.paymentTxHash}:${input.paymentRequestId}`;
  const onchain = await writeAgentValidationOnchain({
    agentTokenId: agent.agent_token_id,
    tag,
    requestSeed,
    requestUri: agent.metadata_uri ?? undefined,
    responseUri: agent.metadata_uri ?? undefined,
  });

  const { error: upsertError } = await supabase
    .from("erc8004_validation_events")
    .upsert(
      {
        agent_slug: PAYME_AGENT_SLUG,
        agent_token_id: agent.agent_token_id,
        payment_request_id: input.paymentRequestId,
        payment_tx_hash: input.paymentTxHash,
        request_hash: onchain.requestHash,
        request_tx_hash: onchain.requestTxHash,
        response_tx_hash: onchain.responseTxHash,
        tag,
        response: 100,
        status: "confirmed",
      },
      { onConflict: "payment_tx_hash" },
    );

  if (upsertError) throw new Error(upsertError.message);

  return {
    skipped: false as const,
    responseTxHash: onchain.responseTxHash,
    requestTxHash: onchain.requestTxHash,
  };
}
