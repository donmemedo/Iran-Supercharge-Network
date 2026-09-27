import { useParams } from "next/navigation";
import { dicts, type Locale } from ".";

/** Client hook: current locale + dictionary from the [locale] segment. */
export function useI18n() {
  const { locale } = useParams<{ locale: Locale }>();
  return { locale, t: dicts[locale] };
}
