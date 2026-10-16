import { dicts, type Locale } from "@/i18n";
import { Landing } from "@/components/landing";
import { Faq, Footer, Why } from "@/components/sections";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const t = dicts[(await params).locale as Locale]; // the layout already 404s unknown locales
  return <Landing why={<Why t={t} />} faq={<Faq t={t} />} footer={<Footer t={t} />} />;
}
