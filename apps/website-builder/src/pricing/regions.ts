export type RegionId = "us" | "tr" | "intl";
export type CurrencyCode = "USD" | "TRY" | "EUR";

export interface Region {
  id: RegionId;
  /** Short name shown next to the currency. */
  label: string;
  currency: CurrencyCode;
  /** Fixed formatting locale for the region. It never follows the browser language. */
  locale: string;
}

export const REGIONS: Record<RegionId, Region> = {
  us: { id: "us", label: "United States", currency: "USD", locale: "en-US" },
  tr: { id: "tr", label: "Türkiye", currency: "TRY", locale: "tr-TR" },
  intl: { id: "intl", label: "All other countries", currency: "EUR", locale: "en-IE" },
};

/** ISO 3166-1 alpha-2 country codes (249). */
export const COUNTRY_CODES: readonly string[] = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ " +
  "BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY " +
  "HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY " +
  "MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM " +
  "PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ " +
  "TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const KNOWN = new Set(COUNTRY_CODES);

export function isCountryCode(value: string): boolean {
  return KNOWN.has(value);
}

/**
 * The price catalogue for a business, decided only by its selected country:
 * the United States uses USD, Türkiye uses TRY, every other country uses EUR.
 * Browser language and IP address are deliberately never consulted.
 */
export function regionForCountry(country: string | null): Region | null {
  if (country === null || !KNOWN.has(country)) return null;
  if (country === "US") return REGIONS.us;
  if (country === "TR") return REGIONS.tr;
  return REGIONS.intl;
}

export function countryName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries named and sorted in the given interface language, for the selector. */
export function countryOptions(locale = "en"): { code: string; name: string }[] {
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => collator.compare(a.name, b.name));
}
