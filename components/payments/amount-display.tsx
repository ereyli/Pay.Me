"use client";

type AmountDisplayProps = {
  amount: string | number;
  token: string;
  className?: string;
  amountClassName?: string;
};

export function AmountDisplay({ amount, token, className, amountClassName }: AmountDisplayProps) {
  const numeric = Number(amount || 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const fiat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: safe >= 100 ? 0 : 2,
  }).format(safe);

  return (
    <div className={className}>
      <div className={amountClassName}>{fiat}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{token}</div>
    </div>
  );
}
