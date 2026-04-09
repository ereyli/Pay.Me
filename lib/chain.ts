import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

// Arc testnet — see https://docs.arc.network/arc/references/contract-addresses
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

/** Supported Circle stables on Arc testnet (6 decimals). */
export const STABLECOINS = [
  {
    symbol: "USDC" as const,
    name: "USD Coin",
    address: USDC_ADDRESS,
    decimals: 6 as const,
  },
  {
    symbol: "EURC" as const,
    name: "Euro Coin",
    address: EURC_ADDRESS,
    decimals: 6 as const,
  },
] as const;

export type StablecoinSymbol = (typeof STABLECOINS)[number]["symbol"];

export function getStablecoinByAddress(addr: string | null | undefined) {
  const normalized = (addr || USDC_ADDRESS).toLowerCase();
  const found = STABLECOINS.find((t) => t.address.toLowerCase() === normalized);
  return found ?? STABLECOINS[0];
}

export function isSupportedTokenAddress(addr: string) {
  return STABLECOINS.some((t) => t.address.toLowerCase() === addr.toLowerCase());
}

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

/** @deprecated Use ERC20_ABI — kept for existing imports */
export const USDC_ABI = ERC20_ABI;
