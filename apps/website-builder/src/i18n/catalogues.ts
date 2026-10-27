import type { LocaleCode } from "./locales";
import { en } from "./messages/en";
import { tr } from "./messages/tr";

/** One dictionary per language. English is complete; every other language may omit keys and falls back to English. */
export const CATALOGUES: Record<LocaleCode, Readonly<Partial<Record<string, string>>>> = { en, tr };
