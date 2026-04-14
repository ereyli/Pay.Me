"use client";

import { useEffect, useState } from "react";
import { Bot, ExternalLink, ShieldCheck, Wallet, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

type AgentPayload =
  | {
      configured: false;
      slug: string;
      metadata: {
        name: string;
        description: string;
        owner_wallet: string;
        validator_wallet: string;
        capabilities: string[];
      };
    }
  | {
      configured: true;
      agent: {
        name: string;
        description: string | null;
        status: string;
        owner_wallet: string;
        validator_wallet: string;
        metadata_uri: string | null;
        agent_token_id: string | null;
        register_tx_hash: string | null;
      };
      onchain: {
        owner: string;
        tokenURI: string;
      } | null;
      reputationEvents: {
        id: string;
        payment_tx_hash: string | null;
        reputation_tx_hash: string | null;
        score: number;
        tag: string;
        comment: string | null;
        status: string;
        created_at: string;
      }[];
      validationEvents: {
        id: string;
        request_tx_hash: string | null;
        response_tx_hash: string | null;
        tag: string;
        response: number;
        status: string;
        created_at: string;
      }[];
      stats: {
        reputationCount: number;
        validationCount: number;
        averageScore: number | null;
      };
    };

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ipfsGatewayUrl(uri: string) {
  if (!uri.startsWith("ipfs://")) return uri;
  return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
}

export default function AgentsPage() {
  const [data, setData] = useState<AgentPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/platform")
      .then((r) => r.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ERC-8004</p>
          <h1 className="text-2xl font-semibold tracking-tight">Pay.Me Agent</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This is the smallest useful ERC-8004 layer for Pay.Me: a platform-owned trust agent that can
            hold onchain identity now and grow into reputation and validation automations later.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold">
                {loading
                  ? "Loading…"
                  : data?.configured
                    ? data.agent.name
                    : data?.metadata.name}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {loading
                  ? "Checking platform agent state on Supabase and Arc."
                  : data?.configured
                    ? data.agent.description
                    : data?.metadata.description}
              </p>
            </div>
          </div>

          {!loading && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {data.configured ? data.agent.status : "draft"}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/30 p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Agent Token ID</div>
                  <div className="text-sm font-medium">{data.configured ? data.agent.agent_token_id || "Pending" : "Not registered yet"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                    <Wallet className="w-4 h-4" />
                    Owner wallet
                  </div>
                  <div className="font-mono text-sm">
                    {short(data.configured ? data.agent.owner_wallet : data.metadata.owner_wallet)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                    <Wallet className="w-4 h-4" />
                    Validator wallet
                  </div>
                  <div className="font-mono text-sm">
                    {short(data.configured ? data.agent.validator_wallet : data.metadata.validator_wallet)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg Reputation</div>
                  <div className="text-2xl font-semibold">
                    {data.stats.averageScore ?? "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Reputation Events</div>
                  <div className="text-2xl font-semibold">{data.stats.reputationCount}</div>
                </div>
                <div className="rounded-xl border border-border/60 p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Validation Events</div>
                  <div className="text-2xl font-semibold">{data.stats.validationCount}</div>
                </div>
              </div>

              {data.configured ? (
                <div className="space-y-3">
                  {data.agent.metadata_uri && (
                    <a
                      href={ipfsGatewayUrl(data.agent.metadata_uri)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Open metadata
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {data.agent.agent_token_id && (
                    <a
                      href={`https://testnet.arcscan.app/address/0x8004A818BFB912233c491871b3d84c89A494BD9e`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Open identity registry
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {data.agent.register_tx_hash && (
                    <a
                      href={`https://testnet.arcscan.app/tx/${data.agent.register_tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View registration transaction
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Registration has not been triggered yet. After you set the owner key, validator key, and admin
                  secret, call the registration endpoint once and this page will switch to the live onchain state.
                </div>
              )}
            </>
          )}
        </div>

        {!loading && data?.configured && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Recent Reputation Events</h2>
            </div>

            {data.reputationEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No reputation events yet. Once a payment is verified, the platform validator can write an
                ERC-8004 feedback event and it will show up here.
              </div>
            ) : (
              <div className="space-y-3">
                {data.reputationEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-border/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{event.tag}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{event.score}</div>
                        <div className="text-xs text-muted-foreground">{event.status}</div>
                      </div>
                    </div>

                    {event.comment && (
                      <p className="text-sm text-muted-foreground">{event.comment}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs">
                      {event.payment_tx_hash && (
                        <a
                          href={`https://testnet.arcscan.app/tx/${event.payment_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Payment tx
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {event.reputation_tx_hash && (
                        <a
                          href={`https://testnet.arcscan.app/tx/${event.reputation_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Reputation tx
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && data?.configured && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Recent Validations</h2>
            </div>

            {data.validationEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No validation events yet. Trusted and reviewed tags will appear here after verified payments.
              </div>
            ) : (
              <div className="space-y-3">
                {data.validationEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{event.tag}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{event.response}</div>
                        <div className="text-xs text-muted-foreground">{event.status}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">
                      {event.request_tx_hash && (
                        <a
                          href={`https://testnet.arcscan.app/tx/${event.request_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Validation request tx
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {event.response_tx_hash && (
                        <a
                          href={`https://testnet.arcscan.app/tx/${event.response_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Validation response tx
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
