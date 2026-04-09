import { keccak256, stringToBytes } from "viem";

/** Deterministic `campaignId` (bytes32) from a UUID — must match on-chain `fundCampaign`. */
export function giftCampaignIdFromUuid(uuid: string): `0x${string}` {
  return keccak256(stringToBytes(`gift:${uuid}`));
}

/** Set after deploying GiftDistributor.sol; omit or `false` to disable gift UI until configured. */
export function getGiftDistributorAddress(): `0x${string}` | undefined {
  const v = process.env.NEXT_PUBLIC_GIFT_DISTRIBUTOR_ADDRESS;
  if (!v || v === "false" || v === "0" || v === "") return undefined;
  return v as `0x${string}`;
}

export const GIFT_DISTRIBUTOR_ABI = [
  {
    name: "fundCampaign",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amountPerClaim", type: "uint256" },
      { name: "maxClaims", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "campaigns",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "amountPerClaim", type: "uint256" },
      { name: "maxClaims", type: "uint256" },
      { name: "claimedCount", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    name: "hasClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "bytes32" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "creationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "feeRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "CampaignFunded",
    type: "event",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amountPerClaim", type: "uint256", indexed: false },
      { name: "maxClaims", type: "uint256", indexed: false },
      { name: "totalDeposited", type: "uint256", indexed: false },
    ],
  },
  {
    name: "GiftClaimed",
    type: "event",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "claimer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
