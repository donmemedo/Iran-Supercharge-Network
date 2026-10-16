import { dicts, type Locale } from "@/i18n";
import { Investors } from "@/components/investors";
import { Footer } from "@/components/sections";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const t = dicts[(await params).locale as Locale];
  return <Investors footer={<Footer t={t} />} />;
}
