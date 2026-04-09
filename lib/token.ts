/**
 * Token amount utilities — all amounts kept as bigint to avoid float precision issues.
 * USDC and EURC on Arc testnet use 6 decimals on the ERC-20 interface.
 */

export const USDC_DECIMALS_NUMBER = 6;
const TEN = BigInt(10);
const USDC_DECIMALS = BigInt(USDC_DECIMALS_NUMBER);

const BPS_DENOM = 10000n;

/** Same math as PayRouter: fee = floor(gross * feeBps / 10000), net = gross - fee. */
export function netFromGross(gross: bigint, feeBps: number): bigint {
  const bps = BigInt(feeBps);
  const fee = (gross * bps) / BPS_DENOM;
  return gross - fee;
}

/**
 * Smallest gross such that on-chain net equals `targetNet` (matches OpenZeppelin mulDiv fee rounding).
 * The old ceil(net * 10000 / (10000 - fee)) formula can be off by wei and breaks verification.
 */
export function grossAmountForRecipientNet(targetNet: bigint, feeBps: number): bigint {
  if (feeBps === 0) return targetNet;
  const bps = BigInt(feeBps);
  // Upper bound: net if all gross were fees is impossible; safe cap for binary search
  const hiGuess = targetNet + (targetNet * bps + BPS_DENOM - bps - 1n) / (BPS_DENOM - bps) + 2n;
  let lo = targetNet;
  let hi = hiGuess;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const n = netFromGross(mid, feeBps);
    if (n < targetNet) lo = mid + 1n;
    else hi = mid;
  }
  if (netFromGross(lo, feeBps) === targetNet) return lo;
  // Scan forward (handles rare gaps / rounding at tiny amounts)
  for (let g = lo; g <= lo + 5000n; g++) {
    if (netFromGross(g, feeBps) === targetNet) return g;
  }
  return lo;
}

/** Convert human-readable USDC string (e.g. "10.5") to bigint with 6 decimals */
export function parseUSDC(amount: string): bigint {
  const [intPart, fracPart = ""] = amount.trim().split(".");
  const frac = fracPart.slice(0, 6).padEnd(6, "0");
  const decimals = TEN ** USDC_DECIMALS;
  return BigInt(intPart) * decimals + BigInt(frac);
}

/** Convert bigint amount (6 decimals) to human-readable string */
export function formatUSDC(amount: bigint): string {
  const decimals = TEN ** USDC_DECIMALS;
  const whole = amount / decimals;
  const frac = amount % decimals;
  if (frac === BigInt(0)) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

/** Shorten wallet address for display */
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
