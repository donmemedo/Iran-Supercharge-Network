import type { ReactNode } from "react";
import { CalendarClock, Headset, Plus, PlugZap, ReceiptText, Sun, Truck } from "lucide-react";
import type { Dict } from "@/i18n";
import { Card } from "./ui";

// Static sections render on the server: no hydration, and their icons stay out of the client bundle.

export const Reveal = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`reveal ${className}`}>{children}</div>;

export const H2 = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <Reveal className="mb-10 max-w-2xl">
    <h2 className="display tight text-4xl font-bold sm:text-5xl">{children}</h2>
    {sub && <p className="mt-3 text-lg text-muted">{sub}</p>}
  </Reveal>
);

const WHY_ICONS = [CalendarClock, ReceiptText, PlugZap, Headset, Sun, Truck];

export function Why({ t }: { t: Dict }) {
  return (
    <section className="py-16">
      <H2>{t.why.title}</H2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.why.items.map((it, i) => {
          const Icon = WHY_ICONS[i];
          return (
            <Reveal key={it.t}>
              <Card className={`h-full p-7 ${i === 0 ? "ring-glow" : ""}`}>
                <span className="grid size-12 place-items-center rounded-2xl bg-accent/12 text-accent">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="tight-sm mt-5 text-xl font-semibold">{it.t}</h3>
                <p className="mt-2 text-muted">{it.d}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function Faq({ t }: { t: Dict }) {
  return (
    <section className="py-16">
      <H2>{t.faq.title}</H2>
      <div className="grid gap-3">
        {t.faq.items.map((it) => (
          <details key={it.q} className="faq glass rounded-[22px] px-6">
            <summary className="flex min-h-16 items-center justify-between gap-4 text-lg font-semibold">
              {it.q}
              <Plus className="chev size-5 shrink-0 text-muted" aria-hidden />
            </summary>
            <p className="pb-6 text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dict }) {
  return (
    <footer className="mt-16 border-t border-line pt-8 text-sm text-faint">
      <p className="font-semibold text-muted">{t.brand}</p>
      <p className="mt-2 max-w-3xl">{t.footer.note}</p>
    </footer>
  );
}
