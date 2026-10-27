/**
 * Code shared with the website builder. The server validates and prices exactly as the builder does, from the
 * same source files, so the two can never drift apart. Only the DOM-free, React-free modules are imported.
 */
export { PROJECT_VERSION, LIMITS, type Project } from "../../website-builder/src/model/types";
export { parseProject } from "../../website-builder/src/model/validate";
export { isCountryCode, countryName, regionForCountry } from "../../website-builder/src/pricing/regions";
export { calculateEstimate, type Estimate } from "../../website-builder/src/pricing/estimate";
export { verifySubmission, type TrustedSubmission } from "../../website-builder/src/submission/verify";
export { SUBMISSION_SCHEMA, dataUrlBytes } from "../../website-builder/src/submission/snapshot";
export { validateClient } from "../../website-builder/src/submission/clientDetails";
