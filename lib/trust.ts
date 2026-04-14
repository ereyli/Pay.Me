import { createServerSupabase } from "@/lib/supabase";
import { PAYME_AGENT_SLUG } from "@/lib/payme-agent";

export async function getAgentTrustSummary() {
  const supabase = createServerSupabase();

  const [{ data: reputationEvents }, { data: validationEvents }] = await Promise.all([
    supabase
      .from("erc8004_reputation_events")
      .select("score, tag, created_at")
      .eq("agent_slug", PAYME_AGENT_SLUG)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("erc8004_validation_events")
      .select("tag, response, created_at")
      .eq("agent_slug", PAYME_AGENT_SLUG)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const scores = reputationEvents ?? [];
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((acc, item) => acc + item.score, 0) / scores.length)
      : null;

  const tags = [...new Set((validationEvents ?? []).map((item) => item.tag))];

  return {
    agentSlug: PAYME_AGENT_SLUG,
    reputationCount: scores.length,
    averageScore: avgScore,
    validationCount: (validationEvents ?? []).length,
    validationTags: tags,
    isTrusted: Boolean(avgScore && avgScore >= 90),
  };
}
