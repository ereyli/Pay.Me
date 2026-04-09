/** Deployed PayRouter on Arc testnet — override with NEXT_PUBLIC_PAY_ROUTER_ADDRESS; set env to `false` to force direct transfer only. */
export const DEFAULT_PAY_ROUTER_ADDRESS =
  "0x49197480Afe1f6592324Fa0a5eE389b4C3EdC2b6" as const;

export function getPayRouterAddress(): `0x${string}` | undefined {
  const v = process.env.NEXT_PUBLIC_PAY_ROUTER_ADDRESS;
  if (v === "false" || v === "0" || v === "") return undefined;
  return (v ?? DEFAULT_PAY_ROUTER_ADDRESS) as `0x${string}`;
}

export const PAY_ROUTER_ABI = [
  {
    name: "pay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paymentRef", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "feeBps",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    name: "Paid",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "grossAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "netAmount", type: "uint256", indexed: false },
      { name: "paymentRef", type: "bytes32", indexed: false },
    ],
  },
] as const;
