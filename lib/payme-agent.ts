import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/chain";
import { ERC8004_CONTRACTS } from "@/lib/erc8004";

export const PAYME_AGENT_SLUG = "payme-trust-agent";

function resolveAccountAddress(privateKeyEnv: string, fallbackLabel: string) {
  const value = process.env[privateKeyEnv];
  if (!value) {
    return `pending:${fallbackLabel}`;
  }

  try {
    return privateKeyToAccount(value as `0x${string}`).address;
  } catch {
    return `invalid:${fallbackLabel}`;
  }
}

export function getPlatformAgentMetadata(baseUrl: string) {
  const ownerWallet = resolveAccountAddress("PAYME_AGENT_OWNER_PRIVATE_KEY", "owner");
  const validatorWallet = resolveAccountAddress(
    "PAYME_AGENT_VALIDATOR_PRIVATE_KEY",
    "validator",
  );

  return {
    name: "Pay.Me Trust Agent",
    description:
      "Platform-owned payment trust agent for Pay.Me on Arc Testnet. It verifies payment flows, anchors onchain trust metadata, and is designed to support future reputation and validation automations.",
    image: `${baseUrl}/icon.png`,
    external_url: `${baseUrl}/agents`,
    agent_type: "payment_trust",
    version: "0.1.0",
    chain_id: arcTestnet.id,
    network: arcTestnet.name,
    owner_wallet: ownerWallet,
    validator_wallet: validatorWallet,
    capabilities: [
      "payment_verification",
      "reputation_writes_ready",
      "validation_requests_ready",
      "merchant_trust_badges_ready",
    ],
    registries: ERC8004_CONTRACTS,
  };
}
