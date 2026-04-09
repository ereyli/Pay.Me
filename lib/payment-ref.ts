import { keccak256, stringToBytes } from "viem";

/** Stable bytes32 for PayRouter.pay — same bytes on client and API (UUID casing normalized). */
export function paymentRefFromRequestId(id: string): `0x${string}` {
  return keccak256(stringToBytes(id.trim().toLowerCase())) as `0x${string}`;
}
