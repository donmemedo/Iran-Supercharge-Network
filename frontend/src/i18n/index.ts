import { fa } from "./fa";
import { en } from "./en";

export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const dicts = { fa, en };
export const isLocale = (l: string): l is Locale => (locales as readonly string[]).includes(l);
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
