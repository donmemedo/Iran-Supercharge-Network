"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Calculator, ChartNoAxesCombined, Crown, MapPin, Zap } from "lucide-react";
import { useI18n } from "@/i18n/use";
import { LangSwitch, Logo, ThemeToggle } from "./ui";

const SECTIONS = ["network", "calc", "plans"];

/** Which landing section sits in the middle of the viewport, so hash links can show where you are. */
function useSection() {
  const path = usePathname();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s)).filter((e): e is HTMLElement => !!e);
    setId(null);
    if (!els.length) return;
    // a thin band across the middle of the screen: whichever section crosses it is "current"
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setId((cur) => (e.isIntersecting ? e.target.id : cur === e.target.id ? null : cur))),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [path]);
  return id;
}

function useLinks() {
  const { locale, t } = useI18n();
  const path = usePathname();
  const section = useSection();
  const home = `/${locale}`;
  return [
    { href: home, label: t.nav.home, Icon: Zap, on: path === home && !section },
    { href: `${home}#network`, label: t.nav.network, Icon: MapPin, on: path === home && section === "network" },
    { href: `${home}#calc`, label: t.nav.calculator, Icon: Calculator, on: path === home && section === "calc" },
    { href: `${home}#plans`, label: t.nav.plans, Icon: Crown, on: path === home && section === "plans" },
    { href: `${home}/investors`, label: t.nav.investors, Icon: ChartNoAxesCombined, on: path === `${home}/investors` },
  ];
}

export function Nav() {
  const { locale, t } = useI18n();
  const links = useLinks().slice(1);
  return (
    <header className="glass-thin blur sticky top-0 z-40 border-x-0 border-t-0">
      <nav aria-label={t.nav.menu} className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Logo />
        <ul className="ms-6 hidden gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={l.on ? (l.href.includes("#") ? "location" : "page") : undefined} className={`press rounded-full px-4 py-2 text-sm font-medium hover:text-fg ${l.on ? "text-fg" : "text-muted"}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ms-auto flex items-center gap-1">
          <LangSwitch />
          <ThemeToggle />
          <Link href={`/${locale}#network`} className="press btn-primary ms-1 hidden min-h-10 items-center rounded-full px-5 text-sm font-semibold sm:flex">
            {t.nav.reserve}
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** iOS-style bottom tab bar on phones. */
export function TabBar() {
  const { t } = useI18n();
  return (
    <nav aria-label={t.nav.menu} className="glass-thin blur fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-[26px] md:hidden">
      <ul className="grid grid-cols-5">
        {useLinks().map(({ href, label, Icon, on }) => (
          <li key={href}>
            <Link href={href} aria-current={on ? (href.includes("#") ? "location" : "page") : undefined} className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium ${on ? "text-accent" : "text-muted"}`}>
              <Icon className="size-5" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
