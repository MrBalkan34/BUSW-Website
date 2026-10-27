import { english, type TranslateFn } from "../i18n/translate";
import { LIMITS, type ClientDetails } from "../model/types";
import { isEmail } from "../model/urls";

export type ClientField = "businessName" | "contactName" | "email" | "notes";
export type ClientErrors = Partial<Record<ClientField, string>>;

/** The same rules run in the browser and on any server that receives a submission. */
export function validateClient(client: ClientDetails, t: TranslateFn = english.t): ClientErrors {
  const errors: ClientErrors = {};
  if (client.businessName.trim() === "") errors.businessName = t("validation.businessName.required");
  else if (client.businessName.length > LIMITS.name) errors.businessName = t("validation.tooLong", { max: LIMITS.name });

  if (client.contactName.trim() === "") errors.contactName = t("validation.contactName.required");
  else if (client.contactName.length > LIMITS.name) errors.contactName = t("validation.tooLong", { max: LIMITS.name });

  if (client.email.trim() === "") errors.email = t("validation.email.required");
  else if (!isEmail(client.email) || client.email.length > LIMITS.short) errors.email = t("validation.email.invalid");

  if (client.notes.length > LIMITS.notes) errors.notes = t("validation.tooLong", { max: LIMITS.notes });
  return errors;
}

/** The fields in display order. Their visible names are in the translation files under `field.<name>`. */
export const CLIENT_FIELDS: readonly ClientField[] = ["businessName", "contactName", "email", "notes"];
