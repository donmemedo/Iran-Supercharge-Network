"use client";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ArrowUpLeft, ArrowUpRight, BatteryCharging, CalendarClock, Check, Headset, Leaf, Plus, PlugZap, ReceiptText, Sun, Truck, WifiOff, Zap } from "lucide-react";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { api, usePoll, type Hub, type Network } from "@/lib/api";
import { compact, num, toAscii } from "@/lib/format";
import { Card } from "./ui";
import { ReserveSheet } from "./reserve";

export const Reveal = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`reveal ${className}`}>{children}</div>;

const H2 = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <Reveal className="mb-10 max-w-2xl">
    <h2 className="display tight text-4xl font-bold sm:text-5xl">{children}</h2>
    {sub && <p className="mt-3 text-lg text-muted">{sub}</p>}
  </Reveal>
);

export function Landing() {
  const { data, error } = usePoll<Network>("network", 5000);
  const [hub, setHub] = useState<Hub | null>(null);
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-32 md:pb-16">
        <Hero />
        <LiveStrip data={data} error={error} />
        <NetworkSection data={data} onReserve={setHub} />
        <Why />
        <Calc price={data?.price.toman_per_kwh ?? 6500} />
        <Plans />
        <Faq />
        <Footer />
      </main>
      <ReserveSheet hub={hub} onClose={() => setHub(null)} />
    </>
  );
}

/* ---------------- hero ---------------- */

function Orb() {
  const { locale, t } = useI18n();
  const id = useId();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="orb-glow absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,var(--a2),transparent)] blur-2xl" aria-hidden />
      <svg viewBox="0 0 120 120" className="relative size-full" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--g1)" />
            <stop offset=".5" stopColor="var(--g2)" />
            <stop offset="1" stopColor="var(--g3)" />
          </linearGradient>
        </defs>
        <g className="orb-spin">
          <circle cx="60" cy="60" r="57" fill="none" stroke="var(--line-strong)" strokeWidth=".6" strokeDasharray="1 3" />
          <circle cx="60" cy="3" r="1.6" fill="var(--g2)" />
          <circle cx="117" cy="60" r="1" fill="var(--g1)" />
        </g>
        <circle cx="60" cy="60" r="48" fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle className="orb-ring" cx="60" cy="60" r="48" fill="none" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" pathLength={100} transform="rotate(-90 60 60)" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <BatteryCharging className="mx-auto mb-1 size-7 text-accent" aria-hidden />
          <div className="num tight text-6xl font-bold sm:text-7xl">
            <span className="count" />
            <span className="text-3xl text-muted">{locale === "fa" ? "٪" : "%"}</span>
          </div>
          <div className="text-sm font-medium text-muted">{t.hero.orb}</div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { locale, t } = useI18n();
  const Arrow = locale === "fa" ? ArrowUpLeft : ArrowUpRight;
  return (
    <section className="grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr]">
      <div>
        <p className="rise glass-thin inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted">
          <span className="live-dot text-pos" />
          {t.hero.eyebrow}
        </p>
        <h1 style={{ animationDelay: "0.1s" }} className="rise display tight mt-6 text-5xl font-extrabold sm:text-7xl">
          {t.hero.title1}
          <br />
          <span className="grad-text">{t.hero.title2}</span>
        </h1>
        <p style={{ animationDelay: "0.25s" }} className="rise mt-6 max-w-xl text-lg text-muted sm:text-xl">
          {t.hero.sub}
        </p>
        <div style={{ animationDelay: "0.4s" }} className="rise mt-9 flex flex-wrap gap-3">
          <Link href="#network" className="press btn-primary inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-base font-semibold">
            <Zap className="size-5" aria-hidden />
            {t.hero.cta}
          </Link>
          <Link href={`/${locale}/investors`} className="press glass-thin inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-base font-semibold">
            {t.hero.cta2}
            <Arrow className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="rise" style={{ animationDelay: "0.15s" }}>
        <Orb />
      </div>
    </section>
  );
}

/* ---------------- live stats ---------------- */

function LiveStrip({ data, error }: { data: Network | null; error: boolean }) {
  const { locale, t } = useI18n();
  const s = data?.stats;
  const tiles = s && [
    { k: t.live.available, v: `${num(s.available, locale)}/${num(s.chargers, locale)}` },
    { k: t.live.charging, v: num(s.charging, locale) },
    { k: t.live.power, v: `${compact(s.power_kw, locale)} ${t.units.kw}` },
    { k: t.live.kwh, v: `${compact(s.kwh_today, locale)} ${t.units.kwh}` },
    { k: t.live.co2, v: `${compact(s.co2_kg_today, locale)} ${t.units.kg}` },
    { k: `${t.live.price} · ${t.live.tiers[data.price.tier]}`, v: num(data.price.toman_per_kwh, locale), unit: t.live.perKwh },
  ];
  return (
    <section className="-mt-4 mb-24">
      {error && !data && (
        <p className="mb-3 flex items-center gap-2 text-sm text-neg">
          <WifiOff className="size-4" aria-hidden /> {t.live.offline}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(tiles || Array.from({ length: 6 }, () => null)).map((x, i) =>
          x ? (
            <Card key={i} className="p-4">
              <div className="text-xs font-medium text-muted">{x.k}</div>
              <div className="num tight-sm mt-1 text-2xl font-bold">{x.v}</div>
              {x.unit && <div className="text-[11px] text-faint">{x.unit}</div>}
            </Card>
          ) : (
            <div key={i} className="skeleton h-[88px] rounded-[28px]" />
          ),
        )}
      </div>
    </section>
  );
}

/* ---------------- network ---------------- */

// Schematic (metro-map style) positions: roughly geographic, spread out so the Tehran cluster stays tappable.
const POS: Record<string, [number, number]> = {
  tabriz: [40, 48], rasht: [108, 52], tn: [168, 66], karaj: [112, 108], tehran: [172, 112], tq: [176, 158],
  qom: [128, 190], isfahan: [150, 248], yazd: [236, 240], shiraz: [196, 300], kish: [262, 338], mashhad: [362, 92],
};
const LINKS: [string, string][] = [
  ["tehran", "karaj"], ["tehran", "tn"], ["tn", "rasht"], ["karaj", "tabriz"], ["tehran", "tq"], ["tq", "qom"],
  ["qom", "isfahan"], ["isfahan", "shiraz"], ["shiraz", "kish"], ["isfahan", "yazd"], ["tehran", "mashhad"],
];

function placeStatus(hubs: Hub[]) {
  const live = hubs.filter((h) => h.live);
  if (!live.length) return { color: "var(--faint)", live: false, total: hubs.reduce((a, h) => a + h.total, 0) };
  const a = live.reduce((x, h) => x + h.available, 0);
  const total = live.reduce((x, h) => x + h.total, 0);
  return { color: a / total > 0.34 ? "var(--pos)" : a > 0 ? "var(--warn)" : "var(--neg)", live: true, total };
}

function NetMap({ data, place, onPlace }: { data: Network; place: string | null; onPlace: (p: string | null) => void }) {
  const { locale, t } = useI18n();
  const byPlace = (p: string) => data.hubs.filter((h) => h.place === p);
  const plannedPlace = (p: string) => !byPlace(p).some((h) => h.live);
  return (
    <svg viewBox="0 0 400 370" className="w-full" role="group" aria-label={t.network.map}>
      <defs>
        <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="var(--line-strong)" />
        </pattern>
      </defs>
      <rect width="400" height="370" fill="url(#dots)" rx="20" />
      {LINKS.map(([a, b]) => {
        const planned = plannedPlace(a) || plannedPlace(b);
        const [x1, y1] = POS[a], [x2, y2] = POS[b];
        return (
          <g key={a + b}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth={planned ? 1 : 3} strokeDasharray={planned ? "3 5" : undefined} strokeLinecap="round" />
            {!planned && <line className="flow" x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />}
          </g>
        );
      })}
      {data.places.map((p) => {
        const [x, y] = POS[p.id] ?? [0, 0];
        const s = placeStatus(byPlace(p.id));
        const r = 5 + Math.sqrt(s.total) * 1.1;
        const on = place === p.id;
        const name = locale === "fa" ? p.fa : p.en;
        return (
          <g
            key={p.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={name}
            className="cursor-pointer outline-none"
            onClick={() => onPlace(on ? null : p.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPlace(on ? null : p.id))}
          >
            <circle cx={x} cy={y} r={r + 14} fill="transparent" />
            {s.live && <circle className="node-pulse" cx={x} cy={y} r={r} fill={s.color} />}
            <circle cx={x} cy={y} r={r} fill={s.live ? s.color : "var(--bg)"} stroke={s.live ? "var(--bg)" : "var(--faint)"} strokeWidth={s.live ? 2 : 1.5} strokeDasharray={s.live ? undefined : "2 2"} />
            {on && <circle cx={x} cy={y} r={r + 5} fill="none" stroke="var(--fg)" strokeWidth="1.5" />}
            <text x={x} y={y + r + 13} textAnchor="middle" fontSize={p.id.length === 2 ? 8.5 : 10.5} fontWeight={on ? 700 : 500} fill={s.live ? "var(--fg)" : "var(--faint)"}>
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChargerPill({ c }: { c: Hub["chargers"][number] }) {
  const { locale, t } = useI18n();
  const label = `#${num(c.n, locale)} · ${t.state[c.state]}${c.soc ? ` ${num(c.soc, locale)}${locale === "fa" ? "٪" : "%"} · ${num(c.kw ?? 0, locale)} ${t.units.kw}` : ""}`;
  const tone = c.state === "available" ? "bg-pos/20 ring-pos/50" : c.state === "offline" ? "bg-neg/15 ring-neg/40" : "bg-c2/10 ring-c2/40";
  return (
    <span role="img" aria-label={label} title={label} className={`relative h-11 min-w-0 flex-1 overflow-hidden rounded-[10px] ring-1 ring-inset ${tone}`}>
      {c.state === "charging" && <span className="soc absolute inset-x-0 bottom-0 bg-c2/60" style={{ height: `${c.soc}%` }} />}
      {c.state === "offline" && <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--line-strong)_4px_6px)]" />}
    </span>
  );
}

function HubCard({ h, onReserve }: { h: Hub; onReserve: (h: Hub) => void }) {
  const { locale, t } = useI18n();
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="tight-sm truncate text-lg font-semibold">{locale === "fa" ? h.fa : h.en}</h3>
          <p className="num text-sm text-muted">
            {num(h.total, locale)} × {num(h.kw, locale)} {t.units.kw} · CCS2 / GB/T
          </p>
        </div>
        {h.live ? (
          <span className={`num shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${h.available ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"}`}>
            {h.available ? fill(t.network.free, { a: num(h.available, locale), t: num(h.total, locale) }) : t.network.full}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-muted dark:bg-white/10">{t.network.soon}</span>
        )}
      </div>
      {h.live && (
        <>
          <div className="mt-4 flex gap-1.5">
            {h.chargers.map((c) => (
              <ChargerPill key={c.n} c={c} />
            ))}
          </div>
          <button type="button" onClick={() => onReserve(h)} className="press btn-primary mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold">
            <CalendarClock className="size-4" aria-hidden />
            {t.network.reserve}
          </button>
        </>
      )}
    </Card>
  );
}

function NetworkSection({ data, onReserve }: { data: Network | null; onReserve: (h: Hub) => void }) {
  const { locale, t } = useI18n();
  const [place, setPlace] = useState<string | null>(null);
  const hubs = (data?.hubs ?? []).filter((h) => !place || h.place === place).sort((a, b) => Number(b.live) - Number(a.live));
  const Dot = ({ c, label, dashed }: { c: string; label: string; dashed?: boolean }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${dashed ? "border border-dashed border-faint" : ""}`} style={{ background: dashed ? undefined : c }} />
      {label}
    </span>
  );
  return (
    <section id="network" className="scroll-mt-20 py-16">
      <H2 sub={t.network.sub}>{t.network.title}</H2>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <Card className="p-4 lg:sticky lg:top-20">
            {data ? <NetMap data={data} place={place} onPlace={setPlace} /> : <div className="skeleton aspect-[400/370] rounded-[20px]" />}
            <div className="mt-3 flex flex-wrap gap-4 px-2 text-xs text-muted">
              <Dot c="var(--pos)" label={t.network.legend.available} />
              <Dot c="var(--warn)" label={t.network.legend.some} />
              <Dot c="var(--neg)" label={t.network.legend.none} />
              <Dot c="" dashed label={t.network.legend.planned} />
            </div>
          </Card>
        </Reveal>
        <div className="min-w-0">
          <div role="group" aria-label={t.network.map} className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
            {[{ id: null as string | null, name: t.network.all }, ...(data?.places ?? []).map((p) => ({ id: p.id as string | null, name: locale === "fa" ? p.fa : p.en }))].map((p) => (
              <button
                key={p.id ?? "all"}
                type="button"
                aria-pressed={place === p.id}
                onClick={() => setPlace(p.id)}
                className={`press min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium ${place === p.id ? "btn-primary" : "glass-thin text-muted hover:text-fg"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {data ? hubs.map((h) => <HubCard key={h.id} h={h} onReserve={onReserve} />) : [0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-[28px]" />)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- why ---------------- */

const WHY_ICONS = [CalendarClock, ReceiptText, PlugZap, Headset, Sun, Truck];

function Why() {
  const { t } = useI18n();
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

/* ---------------- calculator ---------------- */

function Slider({ label, value, set, min, max, step, unit }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; unit: string }) {
  const { locale } = useI18n();
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="font-medium text-muted">
          {label}
        </label>
        <output htmlFor={id} className="num shrink-0 font-semibold">
          {num(value, locale, 1)} <span className="text-xs text-faint">{unit}</span>
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} />
    </div>
  );
}

function Calc({ price }: { price: number }) {
  const { locale, t } = useI18n();
  const [km, setKm] = useState(1500);
  const [fp, setFp] = useState(15000);
  const [fu, setFu] = useState(8);
  const [eu, setEu] = useState(17);
  const [ep, setEp] = useState<number | null>(null);
  const elec = ep ?? price;
  const fuel = (km / 100) * fu * fp;
  const ev = (km / 100) * eu * elec;
  const save = fuel - ev;
  const co2 = Math.max(0, (km / 100) * (fu * 2.31 - eu * 0.6));
  const max = Math.max(fuel, ev, 1);
  const Bar = ({ label, v, cls }: { label: string; v: number; cls: string }) => (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num font-semibold">
          {num(v, locale)} {t.units.toman}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div className={`h-full rounded-full transition-[width] duration-700 ${cls}`} style={{ width: `${(v / max) * 100}%` }} />
      </div>
    </div>
  );
  return (
    <section id="calc" className="scroll-mt-20 py-16">
      <H2 sub={t.calc.sub}>{t.calc.title}</H2>
      <Reveal>
        <Card className="grid gap-8 p-6 sm:p-9 lg:grid-cols-2">
          <div className="grid gap-5">
            <Slider label={t.calc.km} value={km} set={setKm} min={200} max={6000} step={50} unit={t.units.km} />
            <Slider label={t.calc.fuelPrice} value={fp} set={setFp} min={1500} max={60000} step={500} unit={t.units.toman} />
            <Slider label={t.calc.fuelUse} value={fu} set={setFu} min={4} max={16} step={0.5} unit="L" />
            <Slider label={t.calc.evUse} value={eu} set={setEu} min={10} max={30} step={0.5} unit={t.units.kwh} />
            <Slider label={t.calc.elecPrice} value={elec} set={setEp} min={2000} max={15000} step={100} unit={t.units.toman} />
          </div>
          <div className="flex flex-col justify-center gap-6 rounded-[22px] bg-black/[0.03] p-6 dark:bg-white/[0.04]">
            <div aria-live="polite">
              <div className="text-sm font-medium text-muted">{save >= 0 ? t.calc.save : t.calc.more}</div>
              <div className={`num tight mt-1 text-5xl font-bold ${save >= 0 ? "grad-text" : "text-neg"}`}>{num(Math.abs(save), locale)}</div>
              <div className="text-sm text-faint">
                {t.units.toman} · {t.calc.perMonth}
              </div>
            </div>
            <Bar label={t.calc.fuel} v={fuel} cls="bg-warn" />
            <Bar label={t.calc.ev} v={ev} cls="bg-accent" />
            <div className="flex items-center gap-2 text-sm">
              <Leaf className="size-4 text-pos" aria-hidden />
              <span className="text-muted">{t.calc.co2}:</span>
              <span className="num font-semibold">
                {num(co2, locale)} {t.units.kg}
              </span>
            </div>
            <p className="text-xs text-faint">{t.calc.note}</p>
          </div>
        </Card>
      </Reveal>
    </section>
  );
}

/* ---------------- plans + fleet ---------------- */

function FleetForm() {
  const { locale, t } = useI18n();
  const f = t.plans.fleet;
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [phoneErr, setPhoneErr] = useState(false);
  const input = "min-h-12 w-full rounded-2xl border border-line bg-bg/60 px-4 text-base outline-none focus:border-accent";
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const phone = toAscii(String(d.get("phone"))).replace(/\D/g, "");
    if (!/^0\d{10}$/.test(phone)) return setPhoneErr(true);
    setPhoneErr(false);
    setState("sending");
    try {
      await api("leads", { company: String(d.get("company")).trim(), kind: d.get("kind"), fleet_size: Number(toAscii(String(d.get("size")))), phone });
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <Card className="p-6 sm:p-9 lg:col-span-3">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Truck className="size-9 text-accent" aria-hidden />
          <h3 className="tight mt-4 text-3xl font-bold">{f.title}</h3>
          <p className="mt-2 text-muted">{f.sub}</p>
        </div>
        {state === "done" ? (
          <p role="status" className="flex items-center gap-3 self-center text-lg font-medium text-pos">
            <Check className="size-6" aria-hidden /> {f.success}
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <input name="company" required minLength={2} maxLength={80} placeholder={f.company} aria-label={f.company} className={input} />
            <select name="kind" aria-label={f.kind} className={input} defaultValue="taxi">
              {Object.entries(f.kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input name="size" required type="number" min={1} max={100000} placeholder={f.size} aria-label={f.size} className={input} />
            <div>
              <input name="phone" required inputMode="tel" dir="ltr" placeholder={f.phone} aria-label={f.phone} aria-invalid={phoneErr} aria-describedby="fleet-phone-err" className={`${input} ${locale === "fa" ? "text-right" : ""}`} />
              {phoneErr && (
                <p id="fleet-phone-err" className="mt-1 text-xs text-neg">
                  {f.phoneError}
                </p>
              )}
            </div>
            <button disabled={state === "sending"} className="press btn-primary min-h-12 rounded-full font-semibold disabled:opacity-60 sm:col-span-2">
              {state === "sending" ? t.reserve.sending : f.submit}
            </button>
            {state === "error" && <p className="text-sm text-neg sm:col-span-2">{t.reserve.errors.generic}</p>}
          </form>
        )}
      </div>
    </Card>
  );
}

function Plans() {
  const { locale, t } = useI18n();
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <section id="plans" className="scroll-mt-20 py-16">
      <H2>{t.plans.title}</H2>
      <div className="grid gap-4 lg:grid-cols-3">
        {t.plans.items.map((p, i) => {
          const hot = p.id === "plus";
          return (
            <Reveal key={p.id}>
              <Card className={`flex h-full flex-col p-7 ${hot ? "ring-glow" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="tight text-2xl font-bold">{p.name}</h3>
                  {hot && <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg">{t.plans.popular}</span>}
                </div>
                <div className="mt-5">
                  <span className="num tight text-4xl font-bold">{p.price ? num(p.price, locale) : t.plans.free}</span>
                  {p.price > 0 && <span className="ms-2 text-sm text-muted">{t.plans.perMonth}</span>}
                </div>
                <ul className="mt-6 grid flex-1 gap-3">
                  {p.perks.map((k) => (
                    <li key={k} className="flex gap-3 text-[15px]">
                      <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                      {k}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setChosen(p.id)} className={`press mt-7 min-h-12 rounded-full font-semibold ${hot ? "btn-primary" : "glass-thin"}`}>
                  {t.plans.choose}
                </button>
                {chosen === p.id && (
                  <p role="status" className="mt-3 text-center text-sm text-muted">
                    {t.plans.chosen}
                  </p>
                )}
              </Card>
            </Reveal>
          );
        })}
        <FleetForm />
      </div>
    </section>
  );
}

/* ---------------- faq + footer ---------------- */

function Faq() {
  const { t } = useI18n();
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

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-line pt-8 text-sm text-faint">
      <p className="font-semibold text-muted">{t.brand}</p>
      <p className="mt-2 max-w-3xl">{t.footer.note}</p>
    </footer>
  );
}
