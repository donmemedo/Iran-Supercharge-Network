import type { Locale } from "@/i18n";

const cache = new Map<string, Intl.NumberFormat>();
export function nf(l: Locale, o: Intl.NumberFormatOptions = {}) {
  const k = l + JSON.stringify(o);
  let f = cache.get(k);
  if (!f) cache.set(k, (f = new Intl.NumberFormat(l === "fa" ? "fa-IR" : "en-US", o)));
  return f;
}
export const num = (v: number, l: Locale, digits = 0) => nf(l, { maximumFractionDigits: digits }).format(v);
export const compact = (v: number, l: Locale) => nf(l, { notation: "compact", maximumFractionDigits: 1 }).format(v);
export const pct = (ratio: number, l: Locale) => nf(l, { style: "percent", maximumFractionDigits: 1 }).format(ratio);

const tf = new Map<Locale, Intl.DateTimeFormat>();
export function hhmm(iso: string, l: Locale) {
  let f = tf.get(l);
  if (!f) tf.set(l, (f = new Intl.DateTimeFormat(l === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" })));
  return f.format(new Date(iso));
}

/** Persian/Arabic-Indic digits -> ASCII, so "۰۹۱۲…" validates like "0912…". */
export const toAscii = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
