import type { Region } from "./regions";

/** Formats integer minor units for a region, e.g. "$399", "₺19.900" or "€359.50". */
export function formatMoney(minor: number, region: Region): string {
  const whole = minor % 100 === 0;
  return new Intl.NumberFormat(region.locale, {
    style: "currency",
    currency: region.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/** Amount with its currency code beside it: "$399 USD". Used for totals. */
export function formatTotal(minor: number, region: Region): string {
  return `${formatMoney(minor, region)} ${region.currency}`;
}
