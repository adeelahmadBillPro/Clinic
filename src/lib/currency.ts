export type CurrencyCode = "PKR" | "USD" | "INR" | "AED" | "GBP" | "EUR";

export const CURRENCY_CATALOG: Record<
  CurrencyCode,
  { symbol: string; short: string; locale: string }
> = {
  PKR: { symbol: "₨", short: "Rs", locale: "en-PK" },
  USD: { symbol: "$", short: "US$", locale: "en-US" },
  INR: { symbol: "₹", short: "₹", locale: "en-IN" },
  AED: { symbol: "د.إ", short: "AED", locale: "en-AE" },
  GBP: { symbol: "£", short: "£", locale: "en-GB" },
  EUR: { symbol: "€", short: "€", locale: "en-IE" },
};

export function currencySymbol(code?: string | null): string {
  if (!code) return "₨";
  const k = code.toUpperCase() as CurrencyCode;
  return CURRENCY_CATALOG[k]?.symbol ?? code;
}

export function formatMoney(
  amount: number,
  code: string | null = "PKR",
  opts: { withSymbol?: boolean; decimals?: number } = {},
): string {
  const sym = currencySymbol(code);
  const decimals = opts.decimals ?? 0;
  const n = decimals > 0 ? amount.toFixed(decimals) : Math.round(amount).toString();
  const rounded = Number(n).toLocaleString();
  return opts.withSymbol === false ? rounded : `${sym} ${rounded}`;
}
