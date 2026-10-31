// Regions, currencies and money formatting are the Website Builder's, reused unchanged so that one set of rules
// serves both products. If the estimator is ever extracted into a shared package, only this file changes.
export { REGIONS, COUNTRY_CODES, regionForCountry, type Region, type RegionId, type CurrencyCode } from "../../../website-builder/src/pricing/regions";
export { formatMoney, formatTotal } from "../../../website-builder/src/pricing/format";
